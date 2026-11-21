import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { notifyTimeAttendanceReviewers, recordRestrictedTimeAttendanceAccess, recordSafeInternalTimeAttendanceNotification } from "./notification-service";
import { projectTimeCardAfterAttendanceChange, resolveTimeCardProjectionPeriod } from "./projection-service";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import { storedTimeOffWindows, timeOffEvidence, type TimeOffWindow } from "./time-off-windows";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

type TimeOffDecision = "APPROVE_COVERAGE" | "APPROVE" | "DENY" | "RETURN";

function payload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Time-off decision payload must be an object.");
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function resolveAffectedPeriods(
  database: Prisma.TransactionClient,
  request: TimeOffWindow & { organizationId: string; requesterUserId: string; locationId: string; evidence: unknown }
) {
  const periods = new Map<string, { start: string; end: string; timeZone: string; occurredAt: Date }>();
  for (const window of storedTimeOffWindows(request)) {
    let occurredAt = window.startsAt;
    while (occurredAt < window.endsAt) {
      const resolved = await resolveTimeCardProjectionPeriod({
        organizationId: request.organizationId, locationId: request.locationId, staffUserId: request.requesterUserId, occurredAt
      }, database);
      if (!resolved.input) throw new Error(resolved.blockedReason ?? "The employee's pay period could not be resolved.");
      const { period, timeZone, assignment, policy, payPeriodDefinition } = resolved.input;
      const key = `${period.periodStartKey}_${period.periodEndKey}`;
      const previous = periods.get(key);
      if (previous && previous.timeZone !== timeZone) throw new Error("Multiple pay-period time zones cover this request. Ask payroll to review it.");
      if (!previous) periods.set(key, { start: period.periodStartKey, end: period.periodEndKey, timeZone, occurredAt });
      const end = locationLocalDateMinuteToInstant({ localDate: period.periodEndKey, minuteOfDay: 1440, timezone: timeZone });
      const boundaries = [end, assignment.effectiveTo, policy.effectiveTo, payPeriodDefinition?.effectiveTo];
      const following = boundaries.filter((value): value is Date => Boolean(value && value > occurredAt)).sort((a, b) => a.getTime() - b.getTime())[0];
      if (!following) throw new Error("The employee's pay-period boundary could not be resolved.");
      occurredAt = following;
    }
  }
  return [...periods.values()];
}

export async function decideTimeOffRequest(actor: AuthenticatedUser | null, value: unknown) {
  const user = assertAuthenticatedUser(actor);
  const raw = payload(value);
  const requestId = text(raw.requestId);
  const decision = text(raw.decision).toUpperCase() as TimeOffDecision;
  const reason = text(raw.reason);
  if (!requestId) throw new Error("Time-off request is required.");
  if (!(["APPROVE_COVERAGE", "APPROVE", "DENY", "RETURN"] as string[]).includes(decision)) throw new Error("Time-off decision is invalid.");
  if (reason.length < 15) throw new Error("Time-off decision reason must be at least 15 characters.");

  const request = await prisma.timeOffRequest.findFirst({ where: { id: requestId, organizationId: INITIAL_ORGANIZATION.id } });
  if (!request) throw new Error("Time-off request was not found.");
  const capability = decision === "APPROVE_COVERAGE" || (decision === "RETURN" && !request.protectedRouting)
    ? "TIME_ATTENDANCE_MANAGER" as const : "TIME_LEAVE_ADMIN" as const;
  try {
    const authority = {
      actor: user,
      capability,
      organizationId: request.organizationId,
      locationId: request.locationId,
      priorActorUserId: decision === "APPROVE" && request.status === "MANAGER_APPROVED" ? request.decisionActorUserId : null
    };
    await requireTimeAttendanceCapability(authority).catch(error => {
      if (decision === "RETURN" && !request.protectedRouting) return requireTimeAttendanceCapability({ ...authority, capability: "TIME_LEAVE_ADMIN" });
      throw error;
    });
  } catch (error) {
    if (request.protectedRouting) await recordRestrictedTimeAttendanceAccess({
      actor: user,
      organizationId: request.organizationId,
      locationId: request.locationId,
      subjectType: "TimeOffRequest",
      subjectId: request.id,
      reason: error instanceof Error ? error.message : "Protected leave authority denied."
    });
    throw error;
  }
  if (request.requesterUserId === user.id) throw new Error("A reviewer cannot decide their own time-off request.");
  if (raw.expectedUpdatedAt !== undefined && raw.expectedUpdatedAt !== request.updatedAt.toISOString()) {
    throw new EnterpriseCommandConflictError("This request changed during review. Refresh and try again.", "VERSION_CONFLICT");
  }
  const priorEvidence = timeOffEvidence(request.evidence);
  const referral = request.requestType === "PROTECTED_REFERRAL";
  const retryProjection = decision === "APPROVE" && request.status === "APPROVED" && priorEvidence.projectionPending === true;
  if (!retryProjection && (["DRAFT", "APPROVED", "DENIED", "WITHDRAWN", "CANCELLED"].includes(request.status) ||
      (decision === "APPROVE_COVERAGE" && (request.protectedRouting || request.status !== "SUBMITTED")))) {
    throw new Error(`This request is already ${request.status.toLowerCase()}.`);
  }
  const nextStatus = decision === "APPROVE"
    ? "APPROVED"
    : decision === "DENY"
      ? "DENIED"
      : decision === "RETURN"
        ? "DRAFT"
        : "MANAGER_APPROVED";
  const correlationId = randomUUID();
  const { record: result, periods } = await prisma.$transaction(async (tx) => {
    const periods = decision === "APPROVE" && !referral ? await resolveAffectedPeriods(tx, request) : [];
    if (retryProjection) {
      const stored = priorEvidence.projectionPeriods;
      if (!Array.isArray(stored) || stored.length !== periods.length || periods.some(period => !stored.some(value => {
        const saved = timeOffEvidence(value);
        return saved.start === period.start && saved.end === period.end && saved.timeZone === period.timeZone;
      }))) throw new Error("The pay-period definition changed. Ask payroll to reconcile the original affected periods.");
      return { record: request, periods };
    }
    if (periods.length) {
      const overlaps = periods.map(period => ({ periodStart: new Date(period.start), periodEnd: new Date(period.end) }));
      const [cards, batch] = await Promise.all([
        tx.timeCard.findMany({
          where: { organizationId: request.organizationId, staffUserId: request.requesterUserId, status: { not: "VOID" }, OR: overlaps },
          orderBy: { version: "desc" }, distinct: ["periodStart", "periodEnd"],
          select: { status: true, lockedAt: true }
        }),
        tx.timeAttendanceExportBatch.findFirst({
          where: { organizationId: request.organizationId, locationId: request.locationId,
            status: { in: ["LOCKED", "EXPORTED", "ACKNOWLEDGED", "REJECTED", "RECONCILED"] }, OR: overlaps },
          select: { id: true }
        })
      ]);
      if (batch || cards.some(card => card.lockedAt || card.status === "LOCKED" || card.status === "EXPORTED")) {
        throw new Error("A requested day is in a locked or exported pay period. Have payroll reopen it before approval.");
      }
    }
    let esstDebitedBalanceYear: number | undefined;
    if (decision === "APPROVE" && !referral && request.requestType !== "UNPAID" && request.requestType !== "HOLIDAY") {
      const year = typeof priorEvidence.balanceYear === "number" ? priorEvidence.balanceYear : request.startsAt.getUTCFullYear();
      if (request.requestType === "ESST") {
        const newer = await tx.timeOffBalance.findFirst({
          where: { organizationId: request.organizationId, userId: request.requesterUserId, balanceType: "ESST", balanceYear: { gt: year } },
          select: { id: true }
        });
        if (newer) throw new Error("This ESST year has been carried forward. Payroll must reconcile the prior-year usage.");
      }
      const exactBalance = await tx.timeOffBalance.findUnique({
        where: { organizationId_userId_balanceType_balanceYear: {
          organizationId: request.organizationId,
          userId: request.requesterUserId,
          balanceType: request.requestType,
          balanceYear: year
        } }
      });
      // January leave can use the verified carryover before the first payday creates the new year's row.
      const prior = !exactBalance && request.requestType === "ESST" ? await tx.timeOffBalance.findUnique({
        where: { organizationId_userId_balanceType_balanceYear: {
          organizationId: request.organizationId, userId: request.requesterUserId, balanceType: "ESST", balanceYear: year - 1
        } }
      }) : null;
      const balance = exactBalance ?? (timeOffEvidence(timeOffEvidence(prior?.sourceSnapshot).esstAccrual).through ? prior : null);
      if (!balance) throw new Error(`No approved ${request.requestType} balance exists for ${year}.`);
      if (balance.availableMinutes < request.requestedMinutes) throw new Error(`Insufficient ${request.requestType} balance for this request.`);
      if (request.requestType === "ESST") esstDebitedBalanceYear = balance.balanceYear;
      const debit = await tx.timeOffBalance.updateMany({
        where: { id: balance.id, availableMinutes: { gte: request.requestedMinutes } },
        data: {
          ...(balance.balanceYear === year ? { usedMinutes: { increment: request.requestedMinutes } } : {}),
          availableMinutes: { decrement: request.requestedMinutes },
          sourceSnapshot: json({
            ...timeOffEvidence(balance.sourceSnapshot),
            approvedRequestId: request.id,
            approvedMinutes: request.requestedMinutes,
            approvedByUserId: user.id,
            approvedAt: new Date().toISOString()
          })
        }
      });
      if (debit.count !== 1) throw new Error("The balance changed during review. Refresh and try again.");
    }
    const changed = await tx.timeOffRequest.updateMany({
      where: { id: request.id, status: request.status, updatedAt: request.updatedAt },
      data: {
        status: nextStatus,
        decisionActorUserId: user.id,
        decidedAt: new Date(),
        decisionReason: reason,
        evidence: json({
          ...priorEvidence,
          decision,
          nextStatus,
          decisionActorUserId: user.id,
          protectedReasonViewed: false,
          earningCode: referral ? null : request.requestType,
          availabilityEffect: nextStatus === "APPROVED" && !referral ? "APPROVED_ABSENCE" : "NONE",
          correlationId,
          returnedForRevision: decision === "RETURN",
          projectionPending: decision === "APPROVE" && !referral,
          ...(esstDebitedBalanceYear !== undefined ? { esstDebitedBalanceYear } : {}),
          ...(periods.length ? { projectionPeriods: periods.map(({ start, end, timeZone }) => ({ start, end, timeZone })) } : {})
        })
      }
    });
    if (changed.count !== 1) throw new Error("Time-off request changed during review. Refresh and try again.");
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId: request.organizationId,
        locationId: request.locationId,
        actorUserId: user.id,
        domain: "TIME_ATTENDANCE",
        subjectType: "TimeOffRequest",
        subjectId: request.id,
        eventType: `TIME_OFF_${decision}`,
        reason,
        priorValue: json({ status: request.status }),
        newValue: json({ status: nextStatus, returnedForRevision: decision === "RETURN" }),
        metadata: json({ protectedRouting: request.protectedRouting, privateReasonExposed: false, correlationId }),
        correlationId
      }
    });
    return { record: await tx.timeOffRequest.findUniqueOrThrow({ where: { id: request.id } }), periods };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  let projection = null;
  const rebuiltPeriods: { start: string; end: string }[] = [];
  if (nextStatus === "APPROVED" && !referral) {
    try {
      for (const period of periods) {
        projection = await projectTimeCardAfterAttendanceChange({
          organizationId: request.organizationId, locationId: request.locationId, staffUserId: request.requesterUserId,
          occurredAt: period.occurredAt, trigger: "TIME_OFF_DECISION", expectedPeriod: period
        });
        if (projection.state === "BLOCKED") break;
        const card = projection.cardId ? await prisma.timeCard.findUnique({ where: { id: projection.cardId }, select: { periodStart: true, periodEnd: true } }) : null;
        if (card?.periodStart.toISOString().slice(0, 10) !== period.start || card.periodEnd.toISOString().slice(0, 10) !== period.end) {
          throw new Error("The pay-period definition changed during the card update.");
        }
        rebuiltPeriods.push({ start: period.start, end: period.end });
      }
      if (projection && projection.state !== "BLOCKED") {
        await prisma.timeOffRequest.updateMany({
          where: { id: request.id, status: "APPROVED", evidence: { path: ["projectionPending"], equals: true } },
          data: { evidence: json({ ...timeOffEvidence(result.evidence), projectionPending: false, rebuiltPeriods }) }
        });
      }
    } catch (error) {
      console.error("Time-off card rebuild failed", request.id, error);
      projection = { state: "BLOCKED", cardId: null, cardVersion: null, checksum: null, payrollReady: false, reason: "The request was approved. Retry updating the pay periods from Manager Review." } as const;
    }
  }
  if (!retryProjection) await recordSafeInternalTimeAttendanceNotification({
    organizationId: request.organizationId,
    locationId: request.locationId,
    recipientUserId: request.requesterUserId,
    notificationType: "TIME_OFF_DECISION",
    severity: nextStatus === "DENIED" || nextStatus === "DRAFT" ? "WARNING" : "INFO",
    title: decision === "RETURN" ? "Time-off request returned for revision" : referral && nextStatus === "APPROVED"
      ? "Protected leave referral reviewed" : `Time-off request ${nextStatus.toLowerCase().replaceAll("_", " ")}`,
    body: reason,
    sourceType: "TimeOffRequest",
    sourceId: request.id,
    payload: { decision, status: nextStatus, protectedDetailsIncluded: false }
  });
  if (nextStatus === "MANAGER_APPROVED") {
    await notifyTimeAttendanceReviewers({
      organizationId: request.organizationId, locationId: request.locationId, capability: "TIME_LEAVE_ADMIN",
      notificationType: "TIME_OFF_DECISION", severity: "INFO", title: "Time off ready for final approval",
      body: "Coverage review is complete.", sourceType: "TimeOffRequest", sourceId: request.id,
      payload: { protectedDetailsIncluded: false }
    });
  }
  return {
    projection,
    rebuiltPeriods,
    request: {
      id: result.id,
      protectedRouting: result.protectedRouting,
      requestType: result.requestType,
      status: result.status
    }
  };
}
