import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmCommercialApprovalDecision, UnifiedCrmCommercialApprovalStatus } from "@/server/unified-crm/commercial-approval-command";
import type { UnifiedCrmQuoteRecordScope } from "@/server/unified-crm/quote-contract";

type CommercialApprovalDatabase = Pick<PrismaClient, "$transaction">;
type CommercialApprovalQueryable = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;

type CommercialApprovalCommand = {
  actorUserId: string;
  amountCents: number;
  commandType: string;
  correlationId: string;
  discountCents: number;
  domain: string;
  expectedVersion: number;
  idempotencyKey: string;
  organizationId: string;
  purpose: string;
  quoteId: string;
  reason: string;
  requestHash: string;
};

type CommercialApprovalDecisionCommand = {
  actorUserId: string;
  commandType: string;
  correlationId: string;
  decision: UnifiedCrmCommercialApprovalDecision;
  domain: string;
  expectedVersion: number;
  idempotencyKey: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  requestId: string;
};

export type UnifiedCrmCommercialApprovalRecord = {
  amountCents: number;
  decision: UnifiedCrmCommercialApprovalDecision | null;
  discountCents: number;
  duplicate: boolean;
  purpose: string;
  quoteId: string;
  quoteNumber: string;
  quoteVersionNumber: number;
  requestId: string;
  requestedByUserId: string;
  status: UnifiedCrmCommercialApprovalStatus;
  version: number;
};

export type UnifiedCrmCommercialApprovalRepository = {
  decide(input: {
    command: CommercialApprovalDecisionCommand;
    decisionActorMayManage: boolean;
  }): Promise<UnifiedCrmCommercialApprovalRecord>;
  request(input: {
    command: CommercialApprovalCommand;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmCommercialApprovalRecord>;
};

type LedgerRow = {
  requestHash: string;
  resultSnapshot: Prisma.JsonValue | null;
  resultingVersion: number | null;
  subjectType: string;
};

type QuoteRow = {
  createdByUserId: string;
  latestVersionNumber: number;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED" | "ARCHIVED";
};

type RequestRow = {
  amountCents: number;
  discountCents: number;
  purpose: string;
  quoteId: string;
  quoteNumber: string;
  quoteVersionNumber: number;
  requestedByUserId: string;
  status: UnifiedCrmCommercialApprovalStatus;
  version: number;
};

function json(value: unknown) {
  return JSON.stringify(value);
}

function objectValue(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function snapshotRecord(snapshot: Prisma.JsonValue | null, duplicate: boolean): UnifiedCrmCommercialApprovalRecord {
  const value = objectValue(snapshot);
  return {
    amountCents: typeof value.amountCents === "number" ? value.amountCents : 0,
    decision: value.decision === "APPROVED" || value.decision === "RETURNED" || value.decision === "DENIED" ? value.decision : null,
    discountCents: typeof value.discountCents === "number" ? value.discountCents : 0,
    duplicate,
    purpose: typeof value.purpose === "string" ? value.purpose : "",
    quoteId: typeof value.quoteId === "string" ? value.quoteId : "",
    quoteNumber: typeof value.quoteNumber === "string" ? value.quoteNumber : "",
    quoteVersionNumber: typeof value.quoteVersionNumber === "number" ? value.quoteVersionNumber : 0,
    requestId: typeof value.requestId === "string" ? value.requestId : "",
    requestedByUserId: typeof value.requestedByUserId === "string" ? value.requestedByUserId : "",
    status: value.status === "APPROVED" || value.status === "RETURNED" || value.status === "DENIED" ? value.status : "PENDING",
    version: typeof value.version === "number" ? value.version : 0
  };
}

function visibleQuoteFilter(recordScope: UnifiedCrmQuoteRecordScope) {
  return recordScope.kind === "OWNER"
    ? Prisma.sql`AND (quote."createdByUserId" = ${recordScope.ownerUserId} OR opportunity."ownerUserId" = ${recordScope.ownerUserId})`
    : Prisma.empty;
}

async function readLedger(tx: CommercialApprovalQueryable, input: { commandType: string; domain: string; idempotencyKey: string; organizationId: string }) {
  const rows = await tx.$queryRaw<LedgerRow[]>`
    SELECT "requestHash", "resultSnapshot", "resultingVersion", "subjectType"
    FROM "EnterpriseCommandLedger"
    WHERE "organizationId" = ${input.organizationId}
      AND "domain" = ${input.domain}
      AND "commandType" = ${input.commandType}
      AND "idempotencyKey" = ${input.idempotencyKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function replayOrConflict(existing: LedgerRow | null, requestHash: string) {
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new EnterpriseCommandConflictError("Idempotency key was already used with a different commercial approval command.", "IDEMPOTENCY_KEY_REUSED");
  }
  return snapshotRecord(existing.resultSnapshot, true);
}

async function readQuote(
  tx: CommercialApprovalQueryable,
  input: { organizationId: string; quoteId: string; recordScope: UnifiedCrmQuoteRecordScope }
) {
  const rows = await tx.$queryRaw<QuoteRow[]>`
    SELECT quote."quoteNumber", quote."latestVersionNumber", quote."state", quote."createdByUserId"
    FROM "UnifiedCrmQuoteRecord" AS quote
    LEFT JOIN "UnifiedCrmOpportunityRecord" AS opportunity
      ON opportunity."id" = quote."opportunityId"
     AND opportunity."organizationId" = quote."organizationId"
    WHERE quote."id" = ${input.quoteId}
      AND quote."organizationId" = ${input.organizationId}
      AND quote."archivedAt" IS NULL
      ${visibleQuoteFilter(input.recordScope)}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function readRequest(tx: CommercialApprovalQueryable, input: { organizationId: string; requestId: string }) {
  const rows = await tx.$queryRaw<RequestRow[]>`
    SELECT
      request."amountCents",
      request."discountCents",
      request."purpose",
      request."quoteId",
      quote."quoteNumber",
      request."quoteVersionNumber",
      request."requestedByUserId",
      request."status",
      request."version"
    FROM "UnifiedCrmCommercialApprovalRequest" AS request
    INNER JOIN "UnifiedCrmQuoteRecord" AS quote
      ON quote."id" = request."quoteId"
     AND quote."organizationId" = request."organizationId"
    WHERE request."id" = ${input.requestId}
      AND request."organizationId" = ${input.organizationId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function writeAggregateVersion(
  tx: CommercialApprovalQueryable,
  input: { organizationId: string; previousVersion: number; requestId: string }
) {
  const nextVersion = input.previousVersion + 1;
  await tx.$executeRaw`
    INSERT INTO "EnterpriseAggregateVersion" (
      "id", "organizationId", "locationId", "domain", "subjectType", "subjectId", "version", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${input.organizationId}, NULL, 'UNIFIED_CRM', 'COMMERCIAL_APPROVAL', ${input.requestId}, ${nextVersion}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("organizationId", "domain", "subjectType", "subjectId")
    DO UPDATE SET "version" = ${nextVersion}, "updatedAt" = CURRENT_TIMESTAMP
  `;
  return nextVersion;
}

async function writeEvidence(
  tx: CommercialApprovalQueryable,
  input: {
    actorUserId: string;
    commandType: string;
    correlationId: string;
    eventType: "crm.approval.requested.v1" | "crm.approval.decided.v1";
    expectedVersion: number;
    idempotencyKey: string;
    newValue: Record<string, unknown>;
    organizationId: string;
    payload: Record<string, unknown>;
    priorValue?: Record<string, unknown> | null;
    reason: string;
    requestHash: string;
    requestId: string;
    version: number;
  }
) {
  const commandId = randomUUID();
  const eventId = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "EnterpriseCommandLedger" (
      "id", "organizationId", "locationId", "actorUserId", "domain", "subjectType", "subjectId", "commandType", "status",
      "idempotencyKey", "requestHash", "correlationId", "expectedVersion", "resultingVersion", "resultSnapshot", "completedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${commandId}, ${input.organizationId}, NULL, ${input.actorUserId}, 'UNIFIED_CRM', 'COMMERCIAL_APPROVAL', ${input.requestId}, ${input.commandType}, 'SUCCEEDED',
      ${input.idempotencyKey}, ${input.requestHash}, ${input.correlationId}, ${input.expectedVersion}, ${input.version}, CAST(${json(input.newValue)} AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  await tx.$executeRaw`
    INSERT INTO "EnterpriseDomainEvent" (
      "id", "organizationId", "locationId", "commandId", "domain", "aggregateType", "aggregateId", "aggregateVersion", "eventType", "payload", "occurredAt", "createdAt"
    )
    VALUES (
      ${eventId}, ${input.organizationId}, NULL, ${commandId}, 'UNIFIED_CRM', 'COMMERCIAL_APPROVAL', ${input.requestId}, ${input.version}, ${input.eventType}, CAST(${json(input.payload)} AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  await tx.$executeRaw`
    INSERT INTO "EnterpriseAuditEvent" (
      "id", "organizationId", "locationId", "actorUserId", "commandId", "domain", "subjectType", "subjectId", "eventType",
      "reason", "priorValue", "newValue", "metadata", "correlationId", "occurredAt", "createdAt"
    )
    VALUES (
      ${randomUUID()}, ${input.organizationId}, NULL, ${input.actorUserId}, ${commandId}, 'UNIFIED_CRM', 'COMMERCIAL_APPROVAL', ${input.requestId}, ${input.eventType},
      ${input.reason}, ${input.priorValue ? Prisma.sql`CAST(${json(input.priorValue)} AS jsonb)` : Prisma.sql`NULL`}, CAST(${json(input.newValue)} AS jsonb),
      CAST(${json({ requestHash: input.requestHash })} AS jsonb), ${input.correlationId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  await tx.$executeRaw`
    INSERT INTO "EnterpriseOutboxMessage" (
      "id", "organizationId", "locationId", "domainEventId", "topic", "messageKey", "payload", "status", "attemptCount", "maxAttempts", "nextAttemptAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${input.organizationId}, NULL, ${eventId}, 'vehicle-operations.unified_crm', ${input.requestId},
      CAST(${json({ aggregateId: input.requestId, aggregateVersion: input.version, correlationId: input.correlationId, eventId, eventType: input.eventType })} AS jsonb),
      'PENDING', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
}

export function createUnifiedCrmCommercialApprovalRepository(
  database: CommercialApprovalDatabase = prisma
): UnifiedCrmCommercialApprovalRepository {
  return {
    request(input) {
      return database.$transaction(async (tx) => {
        const existing = replayOrConflict(await readLedger(tx, input.command), input.command.requestHash);
        if (existing) return existing;
        const quote = await readQuote(tx, {
          organizationId: input.command.organizationId,
          quoteId: input.command.quoteId,
          recordScope: input.recordScope
        });
        if (!quote || quote.state !== "DRAFT") throw new Error("Quote not available.");
        if (quote.latestVersionNumber !== input.command.expectedVersion) {
          throw new EnterpriseCommandConflictError("Commercial approval request is stale.", "VERSION_CONFLICT");
        }

        const requestId = randomUUID();
        const policySnapshot = {
          baselineDecision: "UCRM-DEC-004",
          deferredThresholdDecision: "UCRM-DEC-013",
          noNumericThresholdInferred: true,
          selfApprovalAllowed: false
        };
        const requestSnapshot = {
          amountCents: input.command.amountCents,
          discountCents: input.command.discountCents,
          purpose: input.command.purpose,
          quoteId: input.command.quoteId,
          quoteNumber: quote.quoteNumber,
          quoteVersionNumber: quote.latestVersionNumber,
          reason: input.command.reason
        };
        await tx.$executeRaw`
          INSERT INTO "UnifiedCrmCommercialApprovalRequest" (
            "id", "organizationId", "quoteId", "quoteVersionNumber", "requestedByUserId", "status", "purpose",
            "amountCents", "discountCents", "reason", "policySnapshot", "requestSnapshot", "version", "createdAt", "updatedAt"
          )
          VALUES (
            ${requestId}, ${input.command.organizationId}, ${input.command.quoteId}, ${quote.latestVersionNumber}, ${input.command.actorUserId}, 'PENDING',
            ${input.command.purpose}, ${input.command.amountCents}, ${input.command.discountCents}, ${input.command.reason},
            CAST(${json(policySnapshot)} AS jsonb), CAST(${json(requestSnapshot)} AS jsonb), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        const version = await writeAggregateVersion(tx, {
          organizationId: input.command.organizationId,
          previousVersion: 0,
          requestId
        });
        const resultSnapshot = {
          amountCents: input.command.amountCents,
          decision: null,
          discountCents: input.command.discountCents,
          purpose: input.command.purpose,
          quoteId: input.command.quoteId,
          quoteNumber: quote.quoteNumber,
          quoteVersionNumber: quote.latestVersionNumber,
          requestId,
          requestedByUserId: input.command.actorUserId,
          status: "PENDING" as const,
          version
        };
        await writeEvidence(tx, {
          actorUserId: input.command.actorUserId,
          commandType: input.command.commandType,
          correlationId: input.command.correlationId,
          eventType: "crm.approval.requested.v1",
          expectedVersion: 0,
          idempotencyKey: input.command.idempotencyKey,
          newValue: resultSnapshot,
          organizationId: input.command.organizationId,
          payload: { requestSnapshot },
          reason: input.command.reason,
          requestHash: input.command.requestHash,
          requestId,
          version
        });
        return { ...resultSnapshot, duplicate: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    decide(input) {
      return database.$transaction(async (tx) => {
        const existing = replayOrConflict(await readLedger(tx, input.command), input.command.requestHash);
        if (existing) return existing;
        if (!input.decisionActorMayManage) throw new Error("Commercial approval decision requires sales management authority.");
        const request = await readRequest(tx, {
          organizationId: input.command.organizationId,
          requestId: input.command.requestId
        });
        if (!request) throw new Error("Commercial approval request not available.");
        if (request.status !== "PENDING") throw new Error("Commercial approval request is not pending.");
        if (request.requestedByUserId === input.command.actorUserId) {
          throw new Error("Commercial approval requires a different authorized user than the requester.");
        }
        if (request.version !== input.command.expectedVersion) {
          throw new EnterpriseCommandConflictError("Commercial approval decision is stale.", "VERSION_CONFLICT");
        }

        const decisionId = randomUUID();
        const nextVersion = await writeAggregateVersion(tx, {
          organizationId: input.command.organizationId,
          previousVersion: request.version,
          requestId: input.command.requestId
        });
        const decisionSnapshot = {
          decision: input.command.decision,
          decidedByUserId: input.command.actorUserId,
          reason: input.command.reason,
          requestId: input.command.requestId
        };
        await tx.$executeRaw`
          INSERT INTO "UnifiedCrmCommercialApprovalDecision" (
            "id", "organizationId", "requestId", "decision", "decidedByUserId", "reason", "decisionSnapshot", "createdAt"
          )
          VALUES (
            ${decisionId}, ${input.command.organizationId}, ${input.command.requestId},
            CAST(${input.command.decision} AS "UnifiedCrmCommercialApprovalDecisionType"), ${input.command.actorUserId},
            ${input.command.reason}, CAST(${json(decisionSnapshot)} AS jsonb), CURRENT_TIMESTAMP
          )
        `;
        await tx.$executeRaw`
          UPDATE "UnifiedCrmCommercialApprovalRequest"
          SET "status" = CAST(${input.command.decision} AS "UnifiedCrmCommercialApprovalStatus"),
              "latestDecisionId" = ${decisionId},
              "version" = ${nextVersion},
              "closedAt" = CURRENT_TIMESTAMP,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${input.command.requestId}
            AND "organizationId" = ${input.command.organizationId}
        `;
        const resultSnapshot = {
          amountCents: request.amountCents,
          decision: input.command.decision,
          discountCents: request.discountCents,
          purpose: request.purpose,
          quoteId: request.quoteId,
          quoteNumber: request.quoteNumber,
          quoteVersionNumber: request.quoteVersionNumber,
          requestId: input.command.requestId,
          requestedByUserId: request.requestedByUserId,
          status: input.command.decision,
          version: nextVersion
        };
        await writeEvidence(tx, {
          actorUserId: input.command.actorUserId,
          commandType: input.command.commandType,
          correlationId: input.command.correlationId,
          eventType: "crm.approval.decided.v1",
          expectedVersion: input.command.expectedVersion,
          idempotencyKey: input.command.idempotencyKey,
          newValue: resultSnapshot,
          organizationId: input.command.organizationId,
          payload: { decisionSnapshot },
          priorValue: {
            amountCents: request.amountCents,
            discountCents: request.discountCents,
            purpose: request.purpose,
            quoteId: request.quoteId,
            quoteNumber: request.quoteNumber,
            quoteVersionNumber: request.quoteVersionNumber,
            requestId: input.command.requestId,
            requestedByUserId: request.requestedByUserId,
            status: request.status,
            version: request.version
          },
          reason: input.command.reason,
          requestHash: input.command.requestHash,
          requestId: input.command.requestId,
          version: nextVersion
        });
        return { ...resultSnapshot, duplicate: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
