import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";

export function createR11IntegrationRepository(database: PrismaClient = prisma) {
  return {
    overview(organizationId: string) {
      return Promise.all([
        database.enterpriseIntegrationExchange.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" }, take: 250, include: { conflicts: { orderBy: { detectedAt: "desc" } } } }),
        database.enterpriseIntegrationConflict.findMany({ where: { organizationId }, orderBy: [{ status: "asc" }, { detectedAt: "desc" }], take: 250, include: { exchange: { select: { id: true, version: true, state: true, correlationId: true } } } }),
        database.enterpriseOutboxMessage.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
        database.enterpriseProjectionCheckpoint.findMany({ where: { organizationId }, orderBy: { lagSeconds: "desc" } })
      ]).then(([exchanges, conflicts, outbox, checkpoints]) => ({ checkpoints, conflicts, exchanges, outbox }));
    },
    create(command: EnterpriseCommandCommitInput, data: { adapterVersion: string; direction: "INBOUND" | "OUTBOUND"; environment: "SANDBOX"; externalReference: string | null; externalSnapshot: Record<string, unknown>; internalRecordId: string | null; internalSnapshot: Record<string, unknown>; mappingVersion: string; occurredAt: Date; payload: Record<string, unknown>; requestHash: string; resourceType: string; systemCode: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.integration", async (tx, version) => {
        const record = await tx.enterpriseIntegrationExchange.create({ data: { id: command.subjectId, organizationId: command.organizationId, systemCode: data.systemCode, adapterVersion: data.adapterVersion, mappingVersion: data.mappingVersion, environment: data.environment, direction: data.direction, resourceType: data.resourceType, internalRecordId: data.internalRecordId, externalReference: data.externalReference, idempotencyKey: command.idempotencyKey, requestHash: data.requestHash, correlationId: command.correlationId, state: data.direction === "INBOUND" ? "RECEIVED" : "REQUESTED", acknowledgementSnapshot: toJson({}), lineageSnapshot: toJson({ actorUserId: command.actorUserId, externalSnapshot: data.externalSnapshot, internalSnapshot: data.internalSnapshot, payload: data.payload, recordedAt: data.occurredAt }), attemptCount: data.direction === "OUTBOUND" ? 1 : 0, requestedAt: data.direction === "OUTBOUND" ? data.occurredAt : null, version, occurredAt: data.occurredAt } });
        return { result: { id: record.id, correlationId: record.correlationId, direction: record.direction, environment: record.environment, state: record.state, version } };
      });
    },
    acknowledge(command: EnterpriseCommandCommitInput, data: { acknowledgementCode: string; actual: Record<string, unknown>; conflict: { kind: "MISSING" | "DUPLICATE" | "MISMATCHED" | "STALE" | "REJECTED" | "OUT_OF_BALANCE"; summary: string } | null; expected: Record<string, unknown>; occurredAt: Date; status: "ACKNOWLEDGED" | "REJECTED" | "FAILED_RETRYABLE" | "FAILED_FINAL" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.integration", async (tx, version) => {
        const current = await tx.enterpriseIntegrationExchange.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!current) throw new Error("Integration exchange was not found.");
        if (["RECONCILED", "CANCELLED"].includes(current.state)) throw new Error("Closed integration exchange cannot be acknowledged again.");
        const state = data.conflict ? "RECONCILIATION_REQUIRED" : data.status;
        const next = await tx.enterpriseIntegrationExchange.update({ where: { id: current.id }, data: { state, acknowledgementCode: data.acknowledgementCode, acknowledgementSnapshot: toJson({ actual: data.actual, expected: data.expected, status: data.status }), acknowledgedAt: data.status === "ACKNOWLEDGED" ? data.occurredAt : null, attemptCount: { increment: 1 }, nextAttemptAt: data.status === "FAILED_RETRYABLE" ? new Date(data.occurredAt.getTime() + Math.min(3_600_000, 30_000 * 2 ** Math.min(current.attemptCount, 6))) : null, lastErrorCode: data.status.startsWith("FAILED") || data.status === "REJECTED" ? data.acknowledgementCode : null, lastErrorMessage: data.status.startsWith("FAILED") || data.status === "REJECTED" ? data.conflict?.summary ?? data.status : null, version } });
        let conflictId: string | null = null;
        if (data.conflict) { const conflict = await tx.enterpriseIntegrationConflict.create({ data: { organizationId: command.organizationId, exchangeId: current.id, systemCode: current.systemCode, kind: data.conflict.kind, entityType: current.resourceType, entityId: current.internalRecordId ?? current.id, externalReference: current.externalReference, summary: data.conflict.summary, internalSnapshot: toJson(data.expected), externalSnapshot: toJson(data.actual), ownerUserId: command.actorUserId } }); conflictId = conflict.id; }
        return { previous: current, result: { conflictId, id: next.id, state: next.state, version } };
      });
    },
    resolve(command: EnterpriseCommandCommitInput, data: { conflictId: string; occurredAt: Date; resolutionCode: string; resolutionNotes: string; status: "RESOLVED" | "ACCEPTED_DIFFERENCE" | "CANCELLED" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.integration", async (tx, version) => {
        const current = await tx.enterpriseIntegrationExchange.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        const conflict = await tx.enterpriseIntegrationConflict.findFirst({ where: { id: data.conflictId, organizationId: command.organizationId, exchangeId: command.subjectId, status: { in: ["OPEN", "INVESTIGATING"] } } });
        if (!current || !conflict) throw new Error("Open integration conflict and exchange were not found.");
        if (conflict.ownerUserId === command.actorUserId) throw new Error("Conflict verification requires a different authorized user than the conflict owner.");
        const resolved = await tx.enterpriseIntegrationConflict.update({ where: { id: conflict.id }, data: { status: data.status, resolutionCode: data.resolutionCode, resolutionNotes: data.resolutionNotes, verifiedByUserId: command.actorUserId, resolvedAt: data.occurredAt, version: { increment: 1 } } });
        const nextState = data.status === "CANCELLED" ? "CANCELLED" : "RECONCILED";
        const next = await tx.enterpriseIntegrationExchange.update({ where: { id: current.id }, data: { state: nextState, version } });
        return { previous: { conflict, exchange: current }, result: { conflictId: resolved.id, conflictStatus: resolved.status, id: next.id, state: next.state, version } };
      });
    }
  };
}

export type R11IntegrationRepository = ReturnType<typeof createR11IntegrationRepository>;
