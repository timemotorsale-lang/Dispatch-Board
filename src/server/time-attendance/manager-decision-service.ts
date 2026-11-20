import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  EnterpriseCommandConflictError,
  hashEnterpriseCommand
} from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { createTimeCardProjectionService, type TimeCardProjectionService, type TimeCardProjectionOutcome } from "./projection-service";
import { recordSafeInternalTimeAttendanceNotification } from "./notification-service";
import { localDateKey } from "./period";

export type TimeCardCorrectionManagerDecision =
  | "APPROVE"
  | "RETURN"
  | "DENY"
  | "APPLY";

export type TimeCardCorrectionManagerDecisionResult = {
  duplicate: boolean;
  projection?: TimeCardProjectionOutcome;
  request: {
    id: string;
    managerDecision: string | null;
    managerReason: string | null;
    status: string;
  };
};

type NormalizedCorrectionDecision = {
  decision: TimeCardCorrectionManagerDecision;
  idempotencyKey: string;
  managerReason: string;
  managerUserId: string;
  organizationId: string;
  requestHash: string;
  requestId: string;
};

type CorrectionDecisionRecord = {
  evidence: unknown;
  id: string;
  managerDecision: string | null;
  managerReason: string | null;
  status: string;
  locationId?: string;
  organizationId?: string;
  staffUserId?: string;
  relatedEventId?: string | null;
  requestedChangeType?: string;
  requestedStartAt?: Date | null;
  requestedEndAt?: Date | null;
  managerUserId?: string | null;
  managerDecisionAt?: Date | null;
};

type TimeCardCorrectionDecisionDatabase = {
  $transaction?<T>(work: (tx: TimeCardCorrectionDecisionDatabase) => Promise<T>): Promise<T>;
  enterpriseAuditEvent?: { create(input: { data: Record<string, unknown> }): Promise<unknown> };
  enterpriseCommandLedger?: { create(input: { data: Record<string, unknown> }): Promise<{ id: string }> };
  enterpriseDomainEvent?: { create(input: { data: Record<string, unknown> }): Promise<{ id: string }> };
  enterpriseOutboxMessage?: { create(input: { data: Record<string, unknown> }): Promise<unknown> };
  location?: { findFirst(input: Record<string, unknown>): Promise<{ timezone: string } | null> };
  timeCard?: {
    findFirst(input: Record<string, unknown>): Promise<{ id: string; status: string; lockedAt: Date | null; periodStart: Date; periodEnd: Date; payrollReady: boolean } | null>;
    updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
  };
  timeAttendanceEvent?: {
    create(input: { data: Record<string, unknown> }): Promise<{ id: string }>;
    findFirst(input: Record<string, unknown>): Promise<{ id: string; eventType: string; occurredAt: Date; sessionId: string | null; timezone: string; evidence?: unknown } | null>;
    update(input: { where: { id: string; correctedByEventId?: null }; data: Record<string, unknown> }): Promise<unknown>;
  };
  timeCardCorrectionRequest: {
    findFirst(input: { where: Record<string, unknown> }): Promise<CorrectionDecisionRecord | null>;
    updateMany?(input: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<CorrectionDecisionRecord>;
  };
};

type CorrectionDecisionRepositoryOutcome = TimeCardCorrectionManagerDecisionResult & {
    projectionTarget?: { locationId: string; organizationId: string; staffUserId: string; occurredAt: Date };
};

function pendingProjection(record: CorrectionDecisionRecord) {
  const evidence = evidenceObject(record.evidence);
  if (record.status !== "APPLIED" || evidence.projectionPending !== true ||
      !record.organizationId || !record.locationId || !record.staffUserId) return undefined;
  const occurredAt = new Date(stringValue(evidence.projectionOccurredAt));
  if (!Number.isFinite(occurredAt.getTime())) return undefined;
  return { organizationId: record.organizationId, locationId: record.locationId, staffUserId: record.staffUserId, occurredAt };
}

export type TimeCardCorrectionDecisionRepository = {
  decide(input: NormalizedCorrectionDecision): Promise<CorrectionDecisionRepositoryOutcome>;
};

const decisionStatus: Record<TimeCardCorrectionManagerDecision, string> = {
  APPLY: "APPLIED",
  APPROVE: "APPROVED",
  DENY: "DENIED",
  RETURN: "RETURNED"
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Manager correction decision payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function evidenceObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function decisionHistory(value: unknown) {
  const evidence = evidenceObject(value);
  return Array.isArray(evidence.managerDecisionHistory)
    ? evidence.managerDecisionHistory as Record<string, unknown>[]
    : [];
}

function toResult(
  record: CorrectionDecisionRecord,
  duplicate: boolean
): TimeCardCorrectionManagerDecisionResult {
  return {
    duplicate,
    request: {
      id: record.id,
      managerDecision: record.managerDecision,
      managerReason: record.managerReason,
      status: record.status
    }
  };
}

function correctionEvidenceTarget(record: CorrectionDecisionRecord, related: {
  eventType: string;
  occurredAt: Date;
  sessionId: string | null;
  timezone: string;
} | null) {
  const changeType = record.requestedChangeType ?? "";
  if (changeType === "MISSING_CLOCK_IN") {
    if (!record.requestedStartAt) throw new Error("A requested clock-in time is required before applying this correction.");
    return { eventType: "CLOCK_IN", occurredAt: record.requestedStartAt, sessionId: related?.sessionId ?? null, timezone: related?.timezone ?? null };
  }
  if (changeType === "MISSING_CLOCK_OUT") {
    const occurredAt = record.requestedEndAt ?? record.requestedStartAt;
    if (!occurredAt) throw new Error("A requested clock-out time is required before applying this correction.");
    return { eventType: "CLOCK_OUT", occurredAt, sessionId: related?.sessionId ?? null, timezone: related?.timezone ?? null };
  }
  if (changeType === "WRONG_TIME" || changeType === "MEAL_TIME") {
    if (!related || !["CLOCK_IN", "START_MEAL", "END_MEAL", "CLOCK_OUT"].includes(related.eventType)) {
      throw new Error("The original punch must be linked before applying this correction.");
    }
    const occurredAt = related.eventType === "CLOCK_OUT" || related.eventType === "END_MEAL"
      ? record.requestedEndAt ?? record.requestedStartAt
      : record.requestedStartAt ?? record.requestedEndAt;
    if (!occurredAt) throw new Error("A replacement punch time is required before applying this correction.");
    return { eventType: related.eventType, occurredAt, sessionId: related.sessionId, timezone: related.timezone };
  }
  throw new Error("This correction type requires a documented replacement punch before it can be applied.");
}

async function applyCorrectionEvidence(
  database: TimeCardCorrectionDecisionDatabase,
  existing: CorrectionDecisionRecord,
  input: NormalizedCorrectionDecision,
  nextEvidence: Record<string, unknown>
) {
  if (
    !database.timeAttendanceEvent || !database.location || !database.enterpriseAuditEvent ||
    !database.enterpriseCommandLedger || !database.enterpriseDomainEvent || !database.enterpriseOutboxMessage || !database.timeCard
  ) {
    throw new Error("Correction evidence repository is unavailable.");
  }
  if (!existing.organizationId || !existing.locationId || !existing.staffUserId) {
    throw new Error("Correction request is missing required attendance identity.");
  }
  const requiresIndependentApproval = evidenceObject(existing.evidence).requiresIndependentApproval === true;
  if (requiresIndependentApproval && existing.managerUserId === input.managerUserId) {
    throw new Error("Independent review is required; the approving manager cannot also apply this correction.");
  }
  const related = existing.relatedEventId
    ? await database.timeAttendanceEvent.findFirst({ where: { id: existing.relatedEventId, organizationId: input.organizationId, locationId: existing.locationId, staffUserId: existing.staffUserId, correctedByEventId: null } })
    : null;
  if (existing.relatedEventId && !related) throw new Error("The original punch is unavailable or already corrected. Return this request for review.");
  const location = await database.location.findFirst({
    where: { id: existing.locationId, organizationId: input.organizationId },
    select: { timezone: true }
  });
  if (!location) throw new Error("Correction location was not found.");
  const target = correctionEvidenceTarget(existing, related);
  const timezone = target.timezone ?? location.timezone;
  const cardForDate = (dateKey: string) => {
    const date = new Date(dateKey + "T00:00:00Z");
    return database.timeCard!.findFirst({
      where: {
        organizationId: existing.organizationId, staffUserId: existing.staffUserId,
        periodStart: { lte: date }, periodEnd: { gte: date }, status: { not: "VOID" }
      },
      orderBy: { version: "desc" }, select: { id: true, status: true, lockedAt: true, periodStart: true, periodEnd: true, payrollReady: true }
    });
  };
  const targetDate = localDateKey(target.occurredAt, timezone);
  const card = await cardForDate(targetDate);
  if (related && localDateKey(related.occurredAt, timezone) !== targetDate) {
    const original = await cardForDate(localDateKey(related.occurredAt, timezone));
    if (!card || !original || card.periodStart.getTime() !== original.periodStart.getTime() || card.periodEnd.getTime() !== original.periodEnd.getTime()) {
      throw new Error("This correction would move a punch between pay periods. Return the request for payroll review.");
    }
  }
  if (card?.lockedAt || card?.status === "LOCKED" || card?.status === "EXPORTED") throw new Error("Payroll must reopen the locked or exported period before this correction can be applied.");
  if (card) {
    const reserved = await database.timeCard.updateMany({
      where: { id: card.id, status: card.status, lockedAt: null, payrollReady: card.payrollReady },
      data: { status: "REOPENED", payrollReady: false }
    });
    if (reserved.count !== 1) throw new EnterpriseCommandConflictError("The pay-period card changed during correction review.", "VERSION_CONFLICT");
  }
  const correlationId = randomUUID();
  const version = decisionHistory(nextEvidence).length;
  const command = await database.enterpriseCommandLedger.create({ data: {
    organizationId: existing.organizationId, locationId: existing.locationId, actorUserId: input.managerUserId,
    domain: "TIME_ATTENDANCE", subjectType: "TIME_CARD_CORRECTION", subjectId: existing.id,
    commandType: "APPLY_TIME_CARD_CORRECTION", status: "SUCCEEDED", idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash, correlationId, expectedVersion: version - 1, resultingVersion: version, completedAt: new Date()
  } });
  const originalEvidence = evidenceObject(related?.evidence);
  const correction = await database.timeAttendanceEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      staffUserId: existing.staffUserId,
      sessionId: target.sessionId,
      actorUserId: input.managerUserId,
      commandId: command.id,
      eventType: "MANAGER_CORRECTION",
      source: "MANAGER",
      occurredAt: target.occurredAt,
      timezone,
      reason: input.managerReason,
      evidence: json({
        correctionRequestId: existing.id,
        replacementEventType: target.eventType,
        replacementOccurredAt: target.occurredAt.toISOString(),
        originalEventId: related?.id ?? null,
        paid: typeof originalEvidence.paid === "boolean" ? originalEvidence.paid : null,
        completelyRelieved: typeof originalEvidence.completelyRelieved === "boolean" ? originalEvidence.completelyRelieved : null,
        managerDecisionHistory: decisionHistory(nextEvidence),
        originalPunchTrailUnchanged: true
      }),
      correctionOfEventId: related?.id ?? null
    }
  });
  if (related) {
    await database.timeAttendanceEvent.update({ where: { id: related.id, correctedByEventId: null }, data: { correctedByEventId: correction.id } });
  }
  const domainEvent = await database.enterpriseDomainEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      commandId: command.id,
      domain: "TIME_ATTENDANCE",
      aggregateType: "TIME_CARD_CORRECTION",
      aggregateId: existing.id,
      aggregateVersion: version,
      eventType: "TIME_CARD_CORRECTION_APPLIED",
      payload: json({ correctionEventId: correction.id, originalEventId: related?.id ?? null, replacementEventType: target.eventType })
    }
  });
  await database.enterpriseAuditEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      actorUserId: input.managerUserId,
      commandId: command.id,
      domain: "TIME_ATTENDANCE",
      subjectType: "TIME_CARD_CORRECTION",
      subjectId: existing.id,
      eventType: "TIME_CARD_CORRECTION_APPLIED",
      reason: input.managerReason,
      newValue: json({ correctionEventId: correction.id, replacementEventType: target.eventType, replacementOccurredAt: target.occurredAt.toISOString() }),
      metadata: json({ originalPunchTrailUnchanged: true, requestHash: input.requestHash }),
      correlationId
    }
  });
  await database.enterpriseOutboxMessage.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      domainEventId: domainEvent.id,
      topic: "time-attendance.correction",
      messageKey: existing.staffUserId,
      payload: json({ correctionEventId: correction.id, correctionRequestId: existing.id, correlationId })
    }
  });
  return { locationId: existing.locationId, organizationId: existing.organizationId, staffUserId: existing.staffUserId, occurredAt: target.occurredAt, invalidatedCardId: card?.id ?? null };
}

export function normalizeTimeCardCorrectionManagerDecision(
  actor: AuthenticatedUser,
  value: unknown,
  defaults: { organizationId: string }
): NormalizedCorrectionDecision {
  const raw = requireObject(value);
  const decision = stringValue(raw.decision).toUpperCase() as TimeCardCorrectionManagerDecision;
  const idempotencyKey = stringValue(raw.idempotencyKey);
  const managerReason = stringValue(raw.managerReason);
  const requestId = stringValue(raw.requestId);

  if (!requestId) throw new Error("Correction request is required.");
  if (!idempotencyKey) throw new Error("Idempotency key is required.");
  if (!Object.hasOwn(decisionStatus, decision)) {
    throw new Error("Manager correction decision is invalid.");
  }
  if (managerReason.length < 15) {
    throw new Error("Manager reason must be at least 15 characters.");
  }

  const payload = {
    decision,
    managerReason,
    managerUserId: actor.id,
    organizationId: defaults.organizationId,
    requestId
  };

  return {
    ...payload,
    idempotencyKey,
    requestHash: hashEnterpriseCommand(payload)
  };
}

export function createTimeCardCorrectionDecisionRepository(
  database: TimeCardCorrectionDecisionDatabase = prisma as unknown as TimeCardCorrectionDecisionDatabase
): TimeCardCorrectionDecisionRepository {
  return {
    async decide(input): Promise<CorrectionDecisionRepositoryOutcome> {
      if (database.$transaction) {
        return database.$transaction((tx) => createTimeCardCorrectionDecisionRepository(tx).decide(input));
      }
      const existing = await database.timeCardCorrectionRequest.findFirst({
        where: {
          id: input.requestId,
          organizationId: input.organizationId
        }
      });
      if (!existing) {
        throw new Error("Correction request was not found.");
      }

      const evidence = evidenceObject(existing.evidence);
      const history = decisionHistory(existing.evidence);
      const priorDecision = history.find((entry) => entry.idempotencyKey === input.idempotencyKey);
      if (priorDecision) {
        if (priorDecision.requestHash !== input.requestHash) {
          throw new EnterpriseCommandConflictError(
            "Idempotency key was already used with a different manager decision.",
            "IDEMPOTENCY_KEY_REUSED"
          );
        }
        return { ...toResult(existing, true), projectionTarget: input.decision === "APPLY" ? pendingProjection(existing) : undefined };
      }

      const pending = input.decision === "APPLY" ? pendingProjection(existing) : undefined;
      if (pending) return { ...toResult(existing, true), projectionTarget: pending };

      if (["DENIED", "WITHDRAWN", "APPLIED"].includes(existing.status)) {
        throw new Error("Correction request is already closed.");
      }
      if (input.decision === "APPLY" && existing.status !== "APPROVED") {
        throw new Error("Correction request must be approved before it can be applied.");
      }

      const status = decisionStatus[input.decision];
      const now = new Date();
      if (database.timeCardCorrectionRequest.updateMany) {
        const reserved = await database.timeCardCorrectionRequest.updateMany({
          where: { id: existing.id, status: existing.status, managerDecisionAt: existing.managerDecisionAt ?? null },
          data: { managerDecisionAt: now }
        });
        if (reserved.count !== 1) throw new EnterpriseCommandConflictError("This correction changed during review. Refresh the queue before retrying.", "VERSION_CONFLICT");
      }
      const nextEvidence = {
        ...evidence,
        managerDecisionHistory: [
          ...history,
          {
            decidedAt: now.toISOString(),
            decision: input.decision,
            idempotencyKey: input.idempotencyKey,
            managerReason: input.managerReason,
            managerUserId: input.managerUserId,
            originalPunchTrailUnchanged: true,
            payrollRecalculationRequired: input.decision === "APPLY",
            requestHash: input.requestHash
          }
        ]
      };

      const projectionTarget = input.decision === "APPLY"
        ? await applyCorrectionEvidence(database, existing, input, nextEvidence)
        : undefined;
      const updated = await database.timeCardCorrectionRequest.update({
        where: { id: input.requestId },
        data: {
          status,
          managerUserId: input.managerUserId,
          managerDecisionAt: now,
          managerDecision: input.decision,
          managerReason: input.managerReason,
          evidence: json(projectionTarget ? {
            ...nextEvidence,
            projectionPending: true,
            projectionOccurredAt: projectionTarget.occurredAt.toISOString(),
            projectionCardId: projectionTarget.invalidatedCardId
          } : nextEvidence)
        }
      });

      return { ...toResult(updated, false), ...(projectionTarget ? { projectionTarget } : {}) };
    }
  };
}

export async function decideTimeCardCorrectionRequest(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: {
    organizationId?: string;
    repository?: TimeCardCorrectionDecisionRepository;
    projectionService?: TimeCardProjectionService;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  try {
    await requireTimeAttendanceCapability({
      actor: user,
      capability: "TIME_ATTENDANCE_MANAGER",
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
    });
  } catch {
    throw new Error("Only managers with time attendance review authority can decide correction requests.");
  }
  const normalized = normalizeTimeCardCorrectionManagerDecision(user, value, {
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const repository = input.repository ?? createTimeCardCorrectionDecisionRepository();

  const { projectionTarget, ...result } = await repository.decide(normalized).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" &&
        Array.isArray(error.meta?.target) && error.meta.target.includes("occurredAt")) {
      throw new EnterpriseCommandConflictError(
        "A correction already recorded a punch at this time. Review the existing punch before applying another request.",
        "VERSION_CONFLICT"
      );
    }
    throw error;
  });
  let projection: TimeCardProjectionOutcome | undefined;
  if (normalized.decision === "APPLY" && projectionTarget) {
    try {
      const { locationId, organizationId, staffUserId, occurredAt } = projectionTarget;
      projection = await (input.projectionService ?? createTimeCardProjectionService()).project({ locationId, organizationId, staffUserId, occurredAt, trigger: "CORRECTION" });
      if (projection.state !== "BLOCKED" && !input.repository) {
        const where = { id: normalized.requestId, organizationId: normalized.organizationId, status: "APPLIED" as const,
          evidence: { path: ["projectionPending"], equals: true } };
        const request = await prisma.timeCardCorrectionRequest.findFirst({ where, select: { evidence: true } });
        if (request) {
          await prisma.timeCardCorrectionRequest.updateMany({
            where,
            data: { evidence: json({ ...evidenceObject(request.evidence), projectionPending: false }) }
          });
        }
      }
    } catch (error) {
      console.error("Time card rebuild failed for correction", normalized.requestId, error);
      projection = {
        state: "BLOCKED", cardId: null, cardVersion: null, checksum: null, payrollReady: false,
        reason: "The correction was saved. Retry rebuilding the time card from Manager review."
      };
    }
  }
  if (!input.repository && !result.duplicate) {
    const request = await prisma.timeCardCorrectionRequest.findUnique({ where: { id: normalized.requestId }, select: { staffUserId: true, locationId: true } });
    if (request) await recordSafeInternalTimeAttendanceNotification({
      organizationId: normalized.organizationId,
      locationId: request.locationId,
      recipientUserId: request.staffUserId,
      notificationType: "CORRECTION_DECISION",
      severity: ["DENY", "RETURN"].includes(normalized.decision) ? "WARNING" : "INFO",
      title: `Correction ${result.request.status.toLowerCase()}`,
      body: normalized.managerReason,
      sourceType: "TimeCardCorrectionRequest",
      sourceId: normalized.requestId,
      payload: { decision: normalized.decision, projectionState: projection?.state ?? null }
    });
  }
  return projection ? { ...result, projection } : result;
}
