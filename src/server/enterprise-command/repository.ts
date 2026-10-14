import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError, type EnterpriseCommandInput } from "./domain";

export type EnterpriseCommandRecord = {
  id: string;
  organizationId: string;
  domain: string;
  commandType: string;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  resultingVersion: number | null;
  resultSnapshot: unknown;
};

export type EnterpriseCommandCommitInput = EnterpriseCommandInput & {
  correlationId: string;
  requestHash: string;
};

export type VehicleFeatureFlagRecord = {
  id: string;
  organizationId: string;
  locationId: string | null;
  code: string;
  mode: "OFF" | "SHADOW" | "PILOT" | "GENERAL";
  rolloutPercent: number;
  allowedUserIds: Prisma.JsonValue;
  targetAt: Date | null;
  version: number;
  updatedAt: Date;
};

export type EnterpriseCommandRepository = {
  commit(input: EnterpriseCommandCommitInput): Promise<{ command: EnterpriseCommandRecord; duplicate: boolean; version: number }>;
  listCapabilityGrants(userId: string, organizationId: string): Promise<Array<{ capability: string; constraints: Prisma.JsonValue; effect: "ALLOW" | "DENY"; locationId: string | null; validFrom: Date; validTo: Date | null }>>;
  listFeatureFlags(organizationId: string): Promise<VehicleFeatureFlagRecord[]>;
  updateFeatureFlag(input: { actorUserId: string; allowedUserIds: string[]; code: string; correlationId: string; expectedVersion: number; locationId: string | null; mode: VehicleFeatureFlagRecord["mode"]; organizationId: string; reason: string; rolloutPercent: number; targetAt: Date | null }): Promise<VehicleFeatureFlagRecord>;
  rollbackFeatureFlag?(input: { actorUserId: string; code: string; correlationId: string; expectedVersion: number; locationId: string | null; organizationId: string; reason: string }): Promise<VehicleFeatureFlagRecord>;
  readHealth(organizationId: string, now: Date): Promise<{ commands24h: number; failedCommands24h: number; pendingOutbox: number; deadLetters: number; oldestPendingAt: Date | null; projectionFailures: number; maxProjectionLagSeconds: number }>;
  claimReadyOutbox(now: Date, limit: number): Promise<Array<{ id: string; attemptCount: number; maxAttempts: number; payload: Prisma.JsonValue; topic: string }>>;
  markOutboxPublished(id: string, now: Date): Promise<void>;
  markOutboxFailed(id: string, error: string, retryAt: Date): Promise<void>;
};

function json(value: unknown) { return value as Prisma.InputJsonValue; }

export function createEnterpriseCommandRepository(database: PrismaClient = prisma): EnterpriseCommandRepository {
  return {
    async commit(input) {
      return database.$transaction(async (tx) => {
        const existing = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: input.organizationId, domain: input.domain, commandType: input.commandType, idempotencyKey: input.idempotencyKey } } });
        if (existing) {
          if (existing.requestHash !== input.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          return { command: existing, duplicate: true, version: existing.resultingVersion ?? input.expectedVersion };
        }
        if (input.locationId) {
          const location = await tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId }, select: { id: true } });
          if (!location) throw new Error("Location does not belong to the command organization.");
        }
        const key = { organizationId_domain_subjectType_subjectId: { organizationId: input.organizationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId } };
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
        const currentVersion = aggregate?.version ?? 0;
        if (currentVersion !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${input.expectedVersion}, but current version is ${currentVersion}.`, "VERSION_CONFLICT");
        const version = currentVersion + 1;
        if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: input.locationId } });
        else await tx.enterpriseAggregateVersion.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, version } });
        const resultSnapshot = { subjectId: input.subjectId, subjectType: input.subjectType, version };
        const command = await tx.enterpriseCommandLedger.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, commandType: input.commandType, status: "SUCCEEDED", idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, correlationId: input.correlationId, expectedVersion: input.expectedVersion, resultingVersion: version, resultSnapshot, completedAt: new Date() } });
        const eventType = `${input.commandType}_COMPLETED`;
        const event = await tx.enterpriseDomainEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, commandId: command.id, domain: input.domain, aggregateType: input.subjectType, aggregateId: input.subjectId, aggregateVersion: version, eventType, payload: json({ ...input.payload, reason: input.reason }) } });
        await tx.enterpriseAuditEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, commandId: command.id, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, eventType, reason: input.reason, newValue: json(resultSnapshot), metadata: json({ requestHash: input.requestHash }), correlationId: input.correlationId } });
        await tx.enterpriseOutboxMessage.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domainEventId: event.id, topic: `vehicle-operations.${input.domain.toLowerCase()}`, messageKey: input.subjectId, payload: json({ eventId: event.id, eventType, aggregateId: input.subjectId, aggregateVersion: version, correlationId: input.correlationId }) } });
        return { command, duplicate: false, version };
      });
    },
    listCapabilityGrants(userId, organizationId) {
      return database.vehicleCapabilityGrant.findMany({ where: { userId, organizationId }, select: { capability: true, constraints: true, effect: true, locationId: true, validFrom: true, validTo: true } });
    },
    listFeatureFlags(organizationId) {
      return database.vehicleOperationsFeatureFlag.findMany({ where: { organizationId }, orderBy: [{ code: "asc" }], select: { id: true, organizationId: true, locationId: true, code: true, mode: true, rolloutPercent: true, allowedUserIds: true, targetAt: true, version: true, updatedAt: true } });
    },
    updateFeatureFlag(input) {
      return database.$transaction(async (tx) => {
        const prior = await tx.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId: input.organizationId, locationId: input.locationId, code: input.code } });
        if (!prior) throw new Error("Vehicle Operations feature flag was not found.");
        if (prior.version !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected feature version ${input.expectedVersion}, but current version is ${prior.version}.`, "VERSION_CONFLICT");
        const next = await tx.vehicleOperationsFeatureFlag.update({ where: { id: prior.id }, data: { mode: input.mode, rolloutPercent: input.rolloutPercent, allowedUserIds: input.allowedUserIds, targetAt: input.targetAt, version: { increment: 1 }, updatedByUserId: input.actorUserId }, select: { id: true, organizationId: true, locationId: true, code: true, mode: true, rolloutPercent: true, allowedUserIds: true, targetAt: true, version: true, updatedAt: true } });
        await tx.vehicleOperationsRolloutEvent.create({ data: { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "FEATURE_FLAG_UPDATED", reason: input.reason, priorState: json(prior), nextState: json(next), correlationId: input.correlationId } });
        return next;
      });
    },
    rollbackFeatureFlag(input) {
      return database.$transaction(async (tx) => {
        const prior = await tx.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId: input.organizationId, locationId: input.locationId, code: input.code } });
        if (!prior) throw new Error("Vehicle Operations feature flag was not found.");
        if (prior.version !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected feature version ${input.expectedVersion}, but current version is ${prior.version}.`, "VERSION_CONFLICT");
        const events = await tx.vehicleOperationsRolloutEvent.findMany({ where: { organizationId: input.organizationId, nextState: { path: ["id"], equals: prior.id } }, orderBy: { createdAt: "desc" }, take: 20 });
        const object = (value: Prisma.JsonValue) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue> : null;
        const event = events.find(candidate => { const next = object(candidate.nextState); return next?.id === prior.id && Number(next.version) === prior.version; }), target = event ? object(event.priorState) : null, mode = target?.mode;
        if (!target || !["OFF", "SHADOW", "PILOT", "GENERAL"].includes(String(mode))) throw new Error("No prior rollout state is available for exact rollback.");
        const allowedUserIds = Array.isArray(target.allowedUserIds) ? target.allowedUserIds.filter((value): value is string => typeof value === "string") : [], rolloutPercent = Number(target.rolloutPercent ?? 0);
        const targetAt = typeof target.targetAt === "string" || target.targetAt instanceof Date ? new Date(String(target.targetAt)) : null;
        const next = await tx.vehicleOperationsFeatureFlag.update({ where: { id: prior.id }, data: { mode: mode as VehicleFeatureFlagRecord["mode"], rolloutPercent, allowedUserIds, targetAt: targetAt && !Number.isNaN(targetAt.getTime()) ? targetAt : null, version: { increment: 1 }, updatedByUserId: input.actorUserId }, select: { id: true, organizationId: true, locationId: true, code: true, mode: true, rolloutPercent: true, allowedUserIds: true, targetAt: true, version: true, updatedAt: true } });
        await tx.vehicleOperationsRolloutEvent.create({ data: { organizationId: input.organizationId, actorUserId: input.actorUserId, action: "FEATURE_FLAG_ROLLED_BACK", reason: input.reason, priorState: json(prior), nextState: json(next), correlationId: input.correlationId } });
        return next;
      });
    },
    async readHealth(organizationId, now) {
      const since = new Date(now.getTime() - 24 * 60 * 60_000);
      const [commands24h, failedCommands24h, pendingOutbox, deadLetters, oldest, checkpoints] = await Promise.all([
        database.enterpriseCommandLedger.count({ where: { organizationId, createdAt: { gte: since } } }),
        database.enterpriseCommandLedger.count({ where: { organizationId, status: "FAILED", createdAt: { gte: since } } }),
        database.enterpriseOutboxMessage.count({ where: { organizationId, status: { in: ["PENDING", "PROCESSING"] } } }),
        database.enterpriseOutboxMessage.count({ where: { organizationId, status: "DEAD_LETTER" } }),
        database.enterpriseOutboxMessage.findFirst({ where: { organizationId, status: { in: ["PENDING", "PROCESSING"] } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        database.enterpriseProjectionCheckpoint.findMany({ where: { organizationId }, select: { lagSeconds: true, lastFailureAt: true, lastSuccessAt: true } })
      ]);
      return { commands24h, failedCommands24h, pendingOutbox, deadLetters, oldestPendingAt: oldest?.createdAt ?? null, projectionFailures: checkpoints.filter((item) => item.lastFailureAt && (!item.lastSuccessAt || item.lastFailureAt > item.lastSuccessAt)).length, maxProjectionLagSeconds: Math.max(0, ...checkpoints.map((item) => item.lagSeconds)) };
    },
    claimReadyOutbox(now, limit) {
      return database.$transaction(async (tx) => {
        const candidates = await tx.enterpriseOutboxMessage.findMany({
          where: { status: "PENDING", nextAttemptAt: { lte: now } },
          orderBy: { createdAt: "asc" },
          take: limit,
          select: { id: true, attemptCount: true, maxAttempts: true, payload: true, topic: true }
        });
        const claimed = [];
        for (const candidate of candidates) {
          const result = await tx.enterpriseOutboxMessage.updateMany({
            where: { id: candidate.id, status: "PENDING" },
            data: { status: "PROCESSING", lockedAt: now }
          });
          if (result.count === 1) claimed.push(candidate);
        }
        return claimed;
      });
    },
    async markOutboxPublished(id, now) { await database.enterpriseOutboxMessage.update({ where: { id }, data: { status: "PUBLISHED", attemptCount: { increment: 1 }, publishedAt: now, lockedAt: null, lastError: null } }); },
    async markOutboxFailed(id, error, retryAt) {
      const record = await database.enterpriseOutboxMessage.findUniqueOrThrow({ where: { id }, select: { attemptCount: true, maxAttempts: true } });
      const nextCount = record.attemptCount + 1;
      await database.enterpriseOutboxMessage.update({ where: { id }, data: { attemptCount: nextCount, status: nextCount >= record.maxAttempts ? "DEAD_LETTER" : "PENDING", nextAttemptAt: retryAt, lastError: error.slice(0, 500), lockedAt: null } });
    }
  };
}
