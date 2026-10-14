import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";
import {
  isAllowedUnifiedCrmOpportunityTransition,
  type UnifiedCrmOpportunityStage
} from "@/server/unified-crm/opportunity-lifecycle";
import { UnifiedCrmOpportunityTransitionError } from "@/server/unified-crm/opportunity-transition-command";

type OpportunityTransitionCommand = {
  actorUserId: string;
  commandType: string;
  correlationId: string;
  expectedVersion: number;
  handoffTarget: string | null;
  idempotencyKey: string;
  lostReason: string | null;
  nextActionDueAt: Date | null;
  nextActionLabel: string | null;
  opportunityId: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  toStage: UnifiedCrmOpportunityStage;
  wonEvidence: string | null;
};

export type UnifiedCrmOpportunityTransitionRecord = {
  duplicate: boolean;
  fromStage: UnifiedCrmOpportunityStage;
  id: string;
  nextActionDueAt: Date | null;
  nextActionLabel: string | null;
  opportunityNumber: string;
  stage: UnifiedCrmOpportunityStage;
  version: number;
};

export type UnifiedCrmOpportunityTransitionRepository = {
  transitionOpportunity(input: {
    command: OpportunityTransitionCommand;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<UnifiedCrmOpportunityTransitionRecord>;
};

type OpportunityTransitionDatabase = Pick<
  PrismaClient,
  "$executeRaw" | "$queryRaw" | "$transaction" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

type OpportunityRow = {
  id: string;
  nextActionDueAt: Date | null;
  nextActionLabel: string | null;
  opportunityNumber: string;
  ownerUserId: string;
  stage: UnifiedCrmOpportunityStage;
  version: number;
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function snapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.opportunityNumber !== "string" ||
    typeof record.stage !== "string" ||
    typeof record.fromStage !== "string" ||
    typeof record.version !== "number"
  ) {
    return null;
  }
  return {
    fromStage: record.fromStage as UnifiedCrmOpportunityStage,
    id: record.id,
    nextActionDueAt: typeof record.nextActionDueAt === "string" ? record.nextActionDueAt : null,
    nextActionLabel: typeof record.nextActionLabel === "string" ? record.nextActionLabel : null,
    opportunityNumber: record.opportunityNumber,
    stage: record.stage as UnifiedCrmOpportunityStage,
    version: record.version
  };
}

export function createUnifiedCrmOpportunityTransitionRepository(
  database: OpportunityTransitionDatabase = prisma
): UnifiedCrmOpportunityTransitionRepository {
  return {
    transitionOpportunity(input) {
      return database.$transaction(async (tx) => {
        const existing = await tx.enterpriseCommandLedger.findUnique({
          where: {
            organizationId_domain_commandType_idempotencyKey: {
              organizationId: input.command.organizationId,
              domain: "UNIFIED_CRM",
              commandType: input.command.commandType,
              idempotencyKey: input.command.idempotencyKey
            }
          }
        });
        if (existing) {
          if (existing.requestHash !== input.command.requestHash || existing.subjectType !== "OPPORTUNITY") {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different opportunity transition request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const replay = snapshot(existing.resultSnapshot);
          if (!replay || replay.opportunityNumber !== existing.subjectId) {
            throw new EnterpriseCommandConflictError("Stored opportunity transition replay is invalid.", "IDEMPOTENCY_KEY_REUSED");
          }
          return {
            ...replay,
            duplicate: true,
            nextActionDueAt: replay.nextActionDueAt ? new Date(replay.nextActionDueAt) : null
          };
        }

        const scopeFilter = input.recordScope.kind === "OWNER"
          ? Prisma.sql`AND "ownerUserId" = ${input.recordScope.ownerUserId}`
          : Prisma.empty;
        const rows = await tx.$queryRaw<OpportunityRow[]>(Prisma.sql`
          SELECT
            "id",
            "opportunityNumber",
            "ownerUserId",
            "stage"::text AS "stage",
            "nextActionLabel",
            "nextActionDueAt",
            "version"
          FROM "UnifiedCrmOpportunityRecord"
          WHERE "organizationId" = ${input.command.organizationId}
            AND "opportunityNumber" = ${input.command.opportunityId}
            AND "archivedAt" IS NULL
            ${scopeFilter}
          LIMIT 1
        `);
        const current = rows[0];
        if (!current) throw new Error("Opportunity not available.");
        if (current.version !== input.command.expectedVersion) {
          throw new EnterpriseCommandConflictError("Opportunity was updated by another command. Reload and try again.", "VERSION_CONFLICT");
        }
        if (!isAllowedUnifiedCrmOpportunityTransition(current.stage, input.command.toStage)) {
          throw new UnifiedCrmOpportunityTransitionError("OPPORTUNITY_TRANSITION_NOT_ALLOWED", `Opportunity cannot move from ${current.stage} to ${input.command.toStage}.`);
        }

        const nextVersion = current.version + 1;
        const updateCount = await tx.$executeRaw(Prisma.sql`
          UPDATE "UnifiedCrmOpportunityRecord"
          SET
            "stage" = ${input.command.toStage}::"UnifiedCrmOpportunityStage",
            "nextActionLabel" = ${input.command.nextActionLabel},
            "nextActionDueAt" = ${input.command.nextActionDueAt},
            "wonEvidence" = ${input.command.wonEvidence},
            "lostReason" = ${input.command.lostReason},
            "handoffTarget" = ${input.command.handoffTarget},
            "version" = ${nextVersion},
            "updatedAt" = NOW()
          WHERE "organizationId" = ${input.command.organizationId}
            AND "opportunityNumber" = ${input.command.opportunityId}
            AND "version" = ${input.command.expectedVersion}
        `);
        if (updateCount !== 1) {
          throw new EnterpriseCommandConflictError("Opportunity was updated by another command. Reload and try again.", "VERSION_CONFLICT");
        }

        const resultSnapshot = {
          fromStage: current.stage,
          id: current.id,
          nextActionDueAt: input.command.nextActionDueAt?.toISOString() ?? null,
          nextActionLabel: input.command.nextActionLabel,
          opportunityNumber: current.opportunityNumber,
          stage: input.command.toStage,
          version: nextVersion
        };

        await tx.enterpriseAggregateVersion.upsert({
          create: {
            domain: "UNIFIED_CRM",
            locationId: null,
            organizationId: input.command.organizationId,
            subjectId: current.opportunityNumber,
            subjectType: "OPPORTUNITY",
            version: nextVersion
          },
          update: { version: nextVersion },
          where: {
            organizationId_domain_subjectType_subjectId: {
              domain: "UNIFIED_CRM",
              organizationId: input.command.organizationId,
              subjectId: current.opportunityNumber,
              subjectType: "OPPORTUNITY"
            }
          }
        });
        const ledger = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandType: input.command.commandType,
            completedAt: new Date(),
            correlationId: input.command.correlationId,
            domain: "UNIFIED_CRM",
            expectedVersion: input.command.expectedVersion,
            idempotencyKey: input.command.idempotencyKey,
            locationId: null,
            organizationId: input.command.organizationId,
            requestHash: input.command.requestHash,
            resultingVersion: nextVersion,
            resultSnapshot: json(resultSnapshot),
            status: "SUCCEEDED",
            subjectId: current.opportunityNumber,
            subjectType: "OPPORTUNITY"
          }
        });
        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: current.opportunityNumber,
            aggregateType: "OPPORTUNITY",
            aggregateVersion: nextVersion,
            commandId: ledger.id,
            domain: "UNIFIED_CRM",
            eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json(resultSnapshot)
          }
        });
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "UnifiedCrmOpportunityStageEvent" (
            "id",
            "opportunityId",
            "organizationId",
            "actorUserId",
            "fromStage",
            "toStage",
            "reason",
            "evidence",
            "commandId"
          ) VALUES (
            ${randomUUID()},
            ${current.id},
            ${input.command.organizationId},
            ${input.command.actorUserId},
            ${current.stage}::"UnifiedCrmOpportunityStage",
            ${input.command.toStage}::"UnifiedCrmOpportunityStage",
            ${input.command.reason},
            ${JSON.stringify({
              handoffTarget: input.command.handoffTarget,
              lostReason: input.command.lostReason,
              nextActionDueAt: input.command.nextActionDueAt?.toISOString() ?? null,
              nextActionLabel: input.command.nextActionLabel,
              reason: input.command.reason,
              wonEvidence: input.command.wonEvidence
            })}::jsonb,
            ${ledger.id}
          )
        `);
        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            correlationId: input.command.correlationId,
            domain: "UNIFIED_CRM",
            eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
            locationId: null,
            metadata: json({ requestHash: input.command.requestHash }),
            newValue: json(resultSnapshot),
            organizationId: input.command.organizationId,
            priorValue: json({
              id: current.id,
              nextActionDueAt: current.nextActionDueAt?.toISOString() ?? null,
              nextActionLabel: current.nextActionLabel,
              opportunityNumber: current.opportunityNumber,
              stage: current.stage,
              version: current.version
            }),
            reason: input.command.reason,
            subjectId: current.opportunityNumber,
            subjectType: "OPPORTUNITY"
          }
        });
        await tx.enterpriseOutboxMessage.create({
          data: {
            domainEventId: event.id,
            locationId: null,
            messageKey: current.opportunityNumber,
            organizationId: input.command.organizationId,
            payload: json({
              aggregateId: current.opportunityNumber,
              aggregateVersion: nextVersion,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_OPPORTUNITY_STAGE_CHANGED"
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          duplicate: false,
          fromStage: current.stage,
          id: current.id,
          nextActionDueAt: input.command.nextActionDueAt,
          nextActionLabel: input.command.nextActionLabel,
          opportunityNumber: current.opportunityNumber,
          stage: input.command.toStage,
          version: nextVersion
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
