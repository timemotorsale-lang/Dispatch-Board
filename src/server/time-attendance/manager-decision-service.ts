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
};

type TimeCardCorrectionDecisionDatabase = {
  $transaction?<T>(work: (tx: TimeCardCorrectionDecisionDatabase) => Promise<T>): Promise<T>;
  enterpriseAuditEvent?: { create(input: { data: Record<string, unknown> }): Promise<unknown> };
  enterpriseDomainEvent?: { create(input: { data: Record<string, unknown> }): Promise<{ id: string }> };
  enterpriseOutboxMessage?: { create(input: { data: Record<string, unknown> }): Promise<unknown> };
  location?: { findFirst(input: Record<string, unknown>): Promise<{ timezone: string } | null> };
  timeAttendanceEvent?: {
    create(input: { data: Record<string, unknown> }): Promise<{ id: string }>;
    findFirst(input: Record<string, unknown>): Promise<{ id: string; eventType: string; occurredAt: Date; sessionId: string | null; timezone: string } | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  timeCardCorrectionRequest: {
    findFirst(input: { where: Record<string, unknown> }): Promise<CorrectionDecisionRecord | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<CorrectionDecisionRecord>;
  };
};

type CorrectionDecisionRepositoryOutcome = TimeCardCorrectionManagerDecisionResult & {
    projectionTarget?: { locationId: string; organizationId: string; staffUserId: string; occurredAt: Date };
};

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
    !database.enterpriseDomainEvent || !database.enterpriseOutboxMessage
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
    ? await database.timeAttendanceEvent.findFirst({ where: { id: existing.relatedEventId, organizationId: input.organizationId } })
    : null;
  const location = await database.location.findFirst({
    where: { id: existing.locationId, organizationId: input.organizationId },
    select: { timezone: true }
  });
  if (!location) throw new Error("Correction location was not found.");
  const target = correctionEvidenceTarget(existing, related);
  const correction = await database.timeAttendanceEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      staffUserId: existing.staffUserId,
      sessionId: target.sessionId,
      actorUserId: input.managerUserId,
      eventType: "MANAGER_CORRECTION",
      source: "MANAGER",
      occurredAt: target.occurredAt,
      timezone: target.timezone ?? location.timezone,
      reason: input.managerReason,
      evidence: json({
        correctionRequestId: existing.id,
        replacementEventType: target.eventType,
        replacementOccurredAt: target.occurredAt.toISOString(),
        originalEventId: related?.id ?? null,
        managerDecisionHistory: decisionHistory(nextEvidence),
        originalPunchTrailUnchanged: true
      }),
      correctionOfEventId: related?.id ?? null
    }
  });
  if (related) {
    await database.timeAttendanceEvent.update({ where: { id: related.id }, data: { correctedByEventId: correction.id } });
  }
  const correlationId = randomUUID();
  const domainEvent = await database.enterpriseDomainEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      domain: "TIME_ATTENDANCE",
      aggregateType: "TIME_CARD_CORRECTION",
      aggregateId: existing.id,
      aggregateVersion: decisionHistory(nextEvidence).length,
      eventType: "TIME_CARD_CORRECTION_APPLIED",
      payload: json({ correctionEventId: correction.id, originalEventId: related?.id ?? null, replacementEventType: target.eventType })
    }
  });
  await database.enterpriseAuditEvent.create({
    data: {
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      actorUserId: input.managerUserId,
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
  return { locationId: existing.locationId, organizationId: existing.organizationId, staffUserId: existing.staffUserId, occurredAt: target.occurredAt };
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
        return toResult(existing, true);
      }

      if (["DENIED", "WITHDRAWN", "APPLIED"].includes(existing.status)) {
        throw new Error("Correction request is already closed.");
      }
      if (input.decision === "APPLY" && existing.status !== "APPROVED") {
        throw new Error("Correction request must be approved before it can be applied.");
      }

      const status = decisionStatus[input.decision];
      const now = new Date();
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
          evidence: json(nextEvidence)
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

  const result = await repository.decide(normalized);
  const projection = normalized.decision === "APPLY" && result.projectionTarget
    ? await (input.projectionService ?? createTimeCardProjectionService()).project({ ...result.projectionTarget, trigger: "CORRECTION" })
    : undefined;
  if (!input.repository) {
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
