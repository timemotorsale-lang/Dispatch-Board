import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  EnterpriseCommandConflictError,
  hashEnterpriseCommand
} from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser } from "@/server/policies/access";

export type TimeCardAttestationDecision = "ATTEST" | "DISPUTE";

export type TimeCardAttestationResult = {
  duplicate: boolean;
  attestation: {
    cardChecksum: string;
    decision: TimeCardAttestationDecision;
    id: string;
    statement: string;
    timeCardId: string;
    timeCardVersion: number;
  };
};

type NormalizedAttestationRequest = {
  cardChecksum: string;
  decision: TimeCardAttestationDecision;
  disputeExplanation: string | null;
  idempotencyKey: string;
  organizationId: string;
  requestHash: string;
  staffUserId: string;
  statement: string;
  timeCardId: string;
  timeCardVersion: number;
};

type AttestationRecord = {
  cardChecksum: string;
  id: string;
  statement: string;
  timeCardId: string;
  timeCardVersion: number;
};

type TimeCardAttestationDatabase = {
  timeCard: {
    findFirst(input: { where: Record<string, unknown>; select: { id: true; staffUserId: true; version: true } }): Promise<{ id: string; staffUserId: string; version: number } | null>;
  };
  timeCardAttestation: {
    create(input: { data: Record<string, unknown> }): Promise<AttestationRecord>;
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string> }): Promise<AttestationRecord | null>;
  };
};

export type TimeCardAttestationRepository = {
  submit(input: NormalizedAttestationRequest): Promise<TimeCardAttestationResult>;
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Time card attestation payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function decisionStatement(input: {
  decision: TimeCardAttestationDecision;
  disputeExplanation: string | null;
}) {
  if (input.decision === "DISPUTE") {
    return `Employee disputes this time card and requests review. Explanation: ${input.disputeExplanation}`;
  }

  return "Employee reviewed this time card and confirms it is accurate to the best of their knowledge. This statement does not waive any wage, legal, correction, or payroll review rights.";
}

function decisionFromStatement(statement: string): TimeCardAttestationDecision {
  return statement.toLowerCase().includes("disputes") ? "DISPUTE" : "ATTEST";
}

function toResult(record: AttestationRecord, duplicate: boolean): TimeCardAttestationResult {
  return {
    duplicate,
    attestation: {
      cardChecksum: record.cardChecksum,
      decision: decisionFromStatement(record.statement),
      id: record.id,
      statement: record.statement,
      timeCardId: record.timeCardId,
      timeCardVersion: record.timeCardVersion
    }
  };
}

export function normalizeTimeCardAttestationRequest(
  actor: AuthenticatedUser,
  value: unknown,
  defaults: {
    organizationId: string;
  }
): NormalizedAttestationRequest {
  const raw = requireObject(value);
  const decision = stringValue(raw.decision).toUpperCase() as TimeCardAttestationDecision;
  const disputeExplanation = stringValue(raw.disputeExplanation) || null;
  const idempotencyKey = stringValue(raw.idempotencyKey);
  const timeCardId = stringValue(raw.timeCardId);
  const timeCardVersion = numberValue(raw.timeCardVersion);
  const cardChecksum = stringValue(raw.cardChecksum);

  if (!idempotencyKey) throw new Error("Idempotency key is required.");
  if (!timeCardId) throw new Error("Time card is required.");
  if (!Number.isInteger(timeCardVersion) || timeCardVersion < 0) {
    throw new Error("Time card version must be a nonnegative integer.");
  }
  if (!cardChecksum.startsWith("sha256:")) {
    throw new Error("Card checksum must be a SHA-256 checksum.");
  }
  if (decision !== "ATTEST" && decision !== "DISPUTE") {
    throw new Error("Attestation decision is invalid.");
  }
  if (decision === "DISPUTE" && (!disputeExplanation || disputeExplanation.length < 15)) {
    throw new Error("Dispute explanation must be at least 15 characters.");
  }

  const statement = decisionStatement({ decision, disputeExplanation });
  const payload = {
    cardChecksum,
    decision,
    disputeExplanation,
    organizationId: defaults.organizationId,
    staffUserId: actor.id,
    statement,
    timeCardId,
    timeCardVersion
  };

  return {
    ...payload,
    idempotencyKey,
    requestHash: hashEnterpriseCommand(payload)
  };
}

export function createTimeCardAttestationRepository(
  database: TimeCardAttestationDatabase = prisma as unknown as TimeCardAttestationDatabase
): TimeCardAttestationRepository {
  return {
    async submit(input) {
      const existing = await database.timeCardAttestation.findFirst({
        where: {
          organizationId: input.organizationId,
          staffUserId: input.staffUserId,
          timeCardId: input.timeCardId,
          timeCardVersion: input.timeCardVersion
        },
        orderBy: { createdAt: "desc" }
      });
      if (existing) {
        if (existing.cardChecksum !== input.cardChecksum || existing.statement !== input.statement) {
          throw new EnterpriseCommandConflictError(
            "This card version already has a different employee attestation.",
            "VERSION_CONFLICT"
          );
        }
        return toResult(existing, true);
      }

      const card = await database.timeCard.findFirst({
        where: {
          id: input.timeCardId,
          organizationId: input.organizationId,
          staffUserId: input.staffUserId,
          version: input.timeCardVersion
        },
        select: { id: true, staffUserId: true, version: true }
      });
      if (!card) {
        throw new Error("Time card version was not found for this employee.");
      }

      const record = await database.timeCardAttestation.create({
        data: {
          organizationId: input.organizationId,
          timeCardId: input.timeCardId,
          staffUserId: input.staffUserId,
          timeCardVersion: input.timeCardVersion,
          statement: input.statement,
          cardChecksum: input.cardChecksum,
          evidence: json({
            decision: input.decision,
            disputeExplanation: input.disputeExplanation,
            idempotencyKey: input.idempotencyKey,
            requestHash: input.requestHash,
            rightsWaiver: false
          })
        }
      });

      return toResult(record, false);
    }
  };
}

export async function submitTimeCardAttestation(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: {
    organizationId?: string;
    repository?: TimeCardAttestationRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const normalized = normalizeTimeCardAttestationRequest(user, value, {
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const repository = input.repository ?? createTimeCardAttestationRepository();

  return repository.submit(normalized);
}
