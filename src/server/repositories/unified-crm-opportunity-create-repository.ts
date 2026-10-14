import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

type OpportunityCreateCommand = {
  actorUserId: string;
  commandType: string;
  correlationId: string;
  customerId: string | null;
  estimatedValueCents: number | null;
  expectedCloseAt: Date | null;
  idempotencyKey: string;
  nextActionDueAt: Date;
  nextActionLabel: string;
  opportunityNumber: string;
  organizationId: string;
  ownerUserId: string;
  reason: string;
  requestHash: string;
  sourceLeadId: string | null;
  stage: UnifiedCrmOpportunityStage;
  summary: string | null;
  title: string;
};

export type UnifiedCrmOpportunityCreateRecord = {
  customerId: string | null;
  duplicate: boolean;
  estimatedValueCents: number | null;
  expectedCloseAt: Date | null;
  id: string;
  nextActionDueAt: Date;
  nextActionLabel: string;
  opportunityNumber: string;
  ownerUserId: string;
  sourceLeadId: string | null;
  stage: UnifiedCrmOpportunityStage;
  summary: string | null;
  title: string;
  version: number;
};

export type UnifiedCrmOpportunityCreateRepository = {
  createOpportunity(input: {
    command: OpportunityCreateCommand;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<UnifiedCrmOpportunityCreateRecord>;
};

type OpportunityCreateDatabase = Pick<
  PrismaClient,
  "$executeRaw" | "$queryRaw" | "$transaction" | "customer" | "customerLead" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage" | "user"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function snapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.opportunityNumber !== "string" ||
    typeof record.title !== "string" ||
    typeof record.ownerUserId !== "string" ||
    typeof record.nextActionLabel !== "string" ||
    typeof record.nextActionDueAt !== "string" ||
    typeof record.stage !== "string"
  ) {
    return null;
  }
  return {
    customerId: typeof record.customerId === "string" ? record.customerId : null,
    estimatedValueCents: typeof record.estimatedValueCents === "number" ? record.estimatedValueCents : null,
    expectedCloseAt: typeof record.expectedCloseAt === "string" ? record.expectedCloseAt : null,
    id: record.id,
    nextActionDueAt: record.nextActionDueAt,
    nextActionLabel: record.nextActionLabel,
    opportunityNumber: record.opportunityNumber,
    ownerUserId: record.ownerUserId,
    sourceLeadId: typeof record.sourceLeadId === "string" ? record.sourceLeadId : null,
    stage: record.stage as UnifiedCrmOpportunityStage,
    summary: typeof record.summary === "string" ? record.summary : null,
    title: record.title,
    version: typeof record.version === "number" ? record.version : 0
  };
}

export function createUnifiedCrmOpportunityCreateRepository(
  database: OpportunityCreateDatabase = prisma
): UnifiedCrmOpportunityCreateRepository {
  return {
    createOpportunity(input) {
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
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different opportunity create request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const replay = snapshot(existing.resultSnapshot);
          if (!replay || replay.opportunityNumber !== existing.subjectId) {
            throw new EnterpriseCommandConflictError("Stored opportunity create replay is invalid.", "IDEMPOTENCY_KEY_REUSED");
          }
          return {
            ...replay,
            duplicate: true,
            expectedCloseAt: replay.expectedCloseAt ? new Date(replay.expectedCloseAt) : null,
            nextActionDueAt: new Date(replay.nextActionDueAt)
          };
        }

        const owner = await tx.user.findFirst({
          where: { id: input.command.ownerUserId, isActive: true },
          select: { id: true }
        });
        if (!owner) throw new Error("Owner not available.");
        if (input.recordScope.kind === "OWNER" && input.command.ownerUserId !== input.recordScope.ownerUserId) {
          throw new Error("Owner not available.");
        }

        if (input.command.customerId) {
          const customer = await tx.customer.findFirst({
            where: {
              id: input.command.customerId,
              organizationId: input.command.organizationId,
              archivedAt: null,
              mergedIntoCustomerId: null,
              ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
            },
            select: { id: true }
          });
          if (!customer) throw new Error("Customer not available.");
        }

        if (input.command.sourceLeadId) {
          const lead = await tx.customerLead.findFirst({
            where: {
              id: input.command.sourceLeadId,
              organizationId: input.command.organizationId,
              ...(input.command.customerId ? { customerId: input.command.customerId } : {}),
              ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
            },
            select: { id: true, customerId: true }
          });
          if (!lead) throw new Error("Source lead not available.");
          if (!input.command.customerId && !lead.customerId) throw new Error("Customer not available.");
        }

        const opportunity: UnifiedCrmOpportunityCreateRecord = {
          customerId: input.command.customerId,
          duplicate: false,
          estimatedValueCents: input.command.estimatedValueCents,
          expectedCloseAt: input.command.expectedCloseAt,
          id: randomUUID(),
          nextActionDueAt: input.command.nextActionDueAt,
          nextActionLabel: input.command.nextActionLabel,
          opportunityNumber: input.command.opportunityNumber,
          ownerUserId: input.command.ownerUserId,
          sourceLeadId: input.command.sourceLeadId,
          stage: input.command.stage,
          summary: input.command.summary,
          title: input.command.title,
          version: 1
        };

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "UnifiedCrmOpportunityRecord" (
            "id",
            "organizationId",
            "opportunityNumber",
            "title",
            "summary",
            "stage",
            "nextActionLabel",
            "nextActionDueAt",
            "estimatedValueCents",
            "expectedCloseAt",
            "createdByUserId",
            "createdReason",
            "customerId",
            "ownerUserId",
            "sourceLeadId",
            "version"
          ) VALUES (
            ${opportunity.id},
            ${input.command.organizationId},
            ${opportunity.opportunityNumber},
            ${opportunity.title},
            ${opportunity.summary},
            ${opportunity.stage}::"UnifiedCrmOpportunityStage",
            ${opportunity.nextActionLabel},
            ${opportunity.nextActionDueAt},
            ${opportunity.estimatedValueCents},
            ${opportunity.expectedCloseAt},
            ${input.command.actorUserId},
            ${input.command.reason},
            ${opportunity.customerId},
            ${opportunity.ownerUserId},
            ${opportunity.sourceLeadId},
            ${opportunity.version}
          )
        `);

        const resultSnapshot = {
          customerId: opportunity.customerId,
          estimatedValueCents: opportunity.estimatedValueCents,
          expectedCloseAt: opportunity.expectedCloseAt?.toISOString() ?? null,
          id: opportunity.id,
          nextActionDueAt: opportunity.nextActionDueAt.toISOString(),
          nextActionLabel: opportunity.nextActionLabel,
          opportunityNumber: opportunity.opportunityNumber,
          ownerUserId: opportunity.ownerUserId,
          sourceLeadId: opportunity.sourceLeadId,
          stage: opportunity.stage,
          summary: opportunity.summary,
          title: opportunity.title,
          version: opportunity.version
        };

        const aggregate = await tx.enterpriseAggregateVersion.create({
          data: {
            domain: "UNIFIED_CRM",
            locationId: null,
            organizationId: input.command.organizationId,
            subjectId: opportunity.opportunityNumber,
            subjectType: "OPPORTUNITY",
            version: opportunity.version
          }
        });
        const ledger = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandType: input.command.commandType,
            completedAt: new Date(),
            correlationId: input.command.correlationId,
            domain: "UNIFIED_CRM",
            expectedVersion: 0,
            idempotencyKey: input.command.idempotencyKey,
            locationId: null,
            organizationId: input.command.organizationId,
            requestHash: input.command.requestHash,
            resultingVersion: aggregate.version,
            resultSnapshot: json(resultSnapshot),
            status: "SUCCEEDED",
            subjectId: opportunity.opportunityNumber,
            subjectType: "OPPORTUNITY"
          }
        });
        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: opportunity.opportunityNumber,
            aggregateType: "OPPORTUNITY",
            aggregateVersion: opportunity.version,
            commandId: ledger.id,
            domain: "UNIFIED_CRM",
            eventType: "CRM_OPPORTUNITY_CREATED",
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
            ${opportunity.id},
            ${input.command.organizationId},
            ${input.command.actorUserId},
            NULL,
            ${input.command.stage}::"UnifiedCrmOpportunityStage",
            ${input.command.reason},
            ${JSON.stringify({
              nextActionDueAt: opportunity.nextActionDueAt.toISOString(),
              nextActionLabel: opportunity.nextActionLabel,
              reason: input.command.reason
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
            eventType: "CRM_OPPORTUNITY_CREATED",
            locationId: null,
            metadata: json({ requestHash: input.command.requestHash }),
            newValue: json(resultSnapshot),
            organizationId: input.command.organizationId,
            reason: input.command.reason,
            subjectId: opportunity.opportunityNumber,
            subjectType: "OPPORTUNITY"
          }
        });
        await tx.enterpriseOutboxMessage.create({
          data: {
            domainEventId: event.id,
            locationId: null,
            messageKey: opportunity.opportunityNumber,
            organizationId: input.command.organizationId,
            payload: json({
              aggregateId: opportunity.opportunityNumber,
              aggregateVersion: opportunity.version,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_OPPORTUNITY_CREATED"
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return opportunity;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
