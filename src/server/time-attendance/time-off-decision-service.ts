import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { recordRestrictedTimeAttendanceAccess, recordSafeInternalTimeAttendanceNotification } from "./notification-service";
import { projectTimeCardAfterAttendanceChange } from "./projection-service";

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
  const capability = decision === "APPROVE_COVERAGE" || decision === "RETURN"
    ? "TIME_ATTENDANCE_MANAGER" as const
    : "TIME_LEAVE_ADMIN" as const;
  try {
    await requireTimeAttendanceCapability({
      actor: user,
      capability,
      organizationId: request.organizationId,
      locationId: request.locationId,
      priorActorUserId: request.requesterUserId === user.id ? user.id : null
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
  if (["APPROVED", "DENIED", "WITHDRAWN", "CANCELLED"].includes(request.status)) {
    throw new Error(`This request is already ${request.status.toLowerCase()}.`);
  }
  const nextStatus = decision === "APPROVE"
    ? "APPROVED"
    : decision === "DENY"
      ? "DENIED"
      : decision === "RETURN"
        ? request.protectedRouting ? "LEAVE_ADMIN_REVIEW" : "SUBMITTED"
        : request.protectedRouting ? "LEAVE_ADMIN_REVIEW" : "MANAGER_APPROVED";
  const correlationId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    if (decision === "APPROVE" && request.requestType !== "UNPAID" && request.requestType !== "HOLIDAY") {
      const year = request.startsAt.getUTCFullYear();
      const balance = await tx.timeOffBalance.findUnique({
        where: { organizationId_userId_balanceType_balanceYear: {
          organizationId: request.organizationId,
          userId: request.requesterUserId,
          balanceType: request.requestType,
          balanceYear: year
        } }
      });
      if (!balance) throw new Error(`No approved ${request.requestType} balance exists for ${year}.`);
      if (balance.availableMinutes < request.requestedMinutes) throw new Error(`Insufficient ${request.requestType} balance for this request.`);
      await tx.timeOffBalance.update({
        where: { id: balance.id },
        data: {
          usedMinutes: { increment: request.requestedMinutes },
          availableMinutes: { decrement: request.requestedMinutes },
          sourceSnapshot: json({
            previous: balance.sourceSnapshot,
            approvedRequestId: request.id,
            approvedMinutes: request.requestedMinutes,
            approvedByUserId: user.id,
            approvedAt: new Date().toISOString()
          })
        }
      });
    }
    const changed = await tx.timeOffRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: {
        status: nextStatus,
        decisionActorUserId: user.id,
        decidedAt: new Date(),
        decisionReason: reason,
        evidence: json({
          priorEvidence: request.evidence,
          decision,
          nextStatus,
          decisionActorUserId: user.id,
          protectedReasonViewed: false,
          earningCode: request.requestType === "UNPAID" ? "UNPAID" : request.requestType,
          availabilityEffect: nextStatus === "APPROVED" ? "APPROVED_ABSENCE" : "NONE",
          correlationId
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
        newValue: json({ status: nextStatus }),
        metadata: json({ protectedRouting: request.protectedRouting, privateReasonExposed: false, correlationId }),
        correlationId
      }
    });
    return tx.timeOffRequest.findUniqueOrThrow({ where: { id: request.id } });
  });

  let projection = null;
  if (nextStatus === "APPROVED") {
    projection = await projectTimeCardAfterAttendanceChange({
      organizationId: request.organizationId,
      locationId: request.locationId,
      staffUserId: request.requesterUserId,
      occurredAt: request.startsAt,
      trigger: "TIME_OFF_DECISION"
    });
  }
  await recordSafeInternalTimeAttendanceNotification({
    organizationId: request.organizationId,
    locationId: request.locationId,
    recipientUserId: request.requesterUserId,
    notificationType: "TIME_OFF_DECISION",
    severity: nextStatus === "DENIED" || nextStatus === "LEAVE_ADMIN_REVIEW" ? "WARNING" : "INFO",
    title: `Time-off request ${nextStatus.toLowerCase().replaceAll("_", " ")}`,
    body: reason,
    sourceType: "TimeOffRequest",
    sourceId: request.id,
    payload: { decision, status: nextStatus, protectedDetailsIncluded: false }
  });
  return {
    projection,
    request: {
      id: result.id,
      protectedRouting: result.protectedRouting,
      requestType: result.requestType,
      status: result.status
    }
  };
}
