import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  EnterpriseCommandConflictError,
  hashEnterpriseCommand
} from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

export type TimeCardCorrectionManagerDecision =
  | "APPROVE"
  | "RETURN"
  | "DENY"
  | "APPLY";

export type TimeCardCorrectionManagerDecisionResult = {
  duplicate: boolean;
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
};

type TimeCardCorrectionDecisionDatabase = {
  timeCardCorrectionRequest: {
    findFirst(input: { where: Record<string, unknown> }): Promise<CorrectionDecisionRecord | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<CorrectionDecisionRecord>;
  };
};

export type TimeCardCorrectionDecisionRepository = {
  decide(input: NormalizedCorrectionDecision): Promise<TimeCardCorrectionManagerDecisionResult>;
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
    async decide(input) {
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

      return toResult(updated, false);
    }
  };
}

export async function decideTimeCardCorrectionRequest(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: {
    organizationId?: string;
    repository?: TimeCardCorrectionDecisionRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) {
    throw new Error("Only managers can decide time card correction requests.");
  }
  const normalized = normalizeTimeCardCorrectionManagerDecision(user, value, {
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const repository = input.repository ?? createTimeCardCorrectionDecisionRepository();

  return repository.decide(normalized);
}
