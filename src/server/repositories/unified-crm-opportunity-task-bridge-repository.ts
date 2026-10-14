import { randomUUID } from "node:crypto";

import { Prisma, WorkflowArea, type PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  createTaskCreateRepository
} from "@/server/repositories/task-create-repository";
import { createManualTask } from "@/server/services/task-create-service";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";

type OpportunitySubject = {
  customerDisplayName: string | null;
  customerNumber: string | null;
  id: string;
  opportunityNumber: string;
  organizationId: string;
  ownerUserId: string | null;
  title: string;
  version: number;
};

type TaskBridgeCommandInput = {
  actorUserId: string;
  brief: string;
  commandType: string;
  correlationId: string;
  domain: string;
  dueAt: Date;
  expectedVersion: number;
  idempotencyKey: string;
  opportunityId: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  title: string;
};

type TaskBridgeDatabase = Pick<
  PrismaClient,
  "$executeRaw" | "$queryRaw" | "$transaction" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

type OpportunityRow = {
  customerDisplayName: string | null;
  customerNumber: string | null;
  id: string;
  opportunityNumber: string;
  organizationId: string;
  ownerUserId: string | null;
  title: string;
  version: number;
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function resultSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as {
    opportunityId?: unknown;
    task?: {
      dueAt?: unknown;
      id?: unknown;
      title?: unknown;
    };
  };
  if (
    typeof snapshot.opportunityId !== "string" ||
    !snapshot.task ||
    typeof snapshot.task !== "object" ||
    typeof snapshot.task.id !== "string" ||
    typeof snapshot.task.title !== "string" ||
    typeof snapshot.task.dueAt !== "string"
  ) {
    return null;
  }
  return {
    opportunityId: snapshot.opportunityId,
    task: {
      dueAt: snapshot.task.dueAt,
      id: snapshot.task.id,
      title: snapshot.task.title
    }
  };
}

function boardDateInChicago(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function opportunityCustomerReference(opportunity: OpportunitySubject) {
  if (opportunity.customerDisplayName && opportunity.customerNumber) {
    return `${opportunity.customerDisplayName} · ${opportunity.customerNumber} · ${opportunity.opportunityNumber}`;
  }
  return `Opportunity ${opportunity.opportunityNumber}`;
}

export type UnifiedCrmOpportunityTaskBridgeRepository = {
  commitTaskBridge(input: {
    actor: AuthenticatedUser;
    command: TaskBridgeCommandInput;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<{
    duplicate: boolean;
    opportunityId: string;
    task: {
      dueAt: Date;
      id: string;
      title: string;
    };
  }>;
};

export function createUnifiedCrmOpportunityTaskBridgeRepository(
  database: TaskBridgeDatabase
): UnifiedCrmOpportunityTaskBridgeRepository {
  return {
    commitTaskBridge(input) {
      return database.$transaction(async (tx) => {
        const scopeFilter = input.recordScope.kind === "OWNER"
          ? Prisma.sql`AND record."ownerUserId" = ${input.recordScope.ownerUserId}`
          : Prisma.empty;
        const rows = await tx.$queryRaw<OpportunityRow[]>(Prisma.sql`
          SELECT
            record."id",
            record."organizationId",
            record."opportunityNumber",
            record."title",
            record."ownerUserId",
            record."version",
            customer."displayName" AS "customerDisplayName",
            customer."customerNumber" AS "customerNumber"
          FROM "UnifiedCrmOpportunityRecord" AS record
          LEFT JOIN "Customer" AS customer
            ON customer."id" = record."customerId"
           AND customer."organizationId" = record."organizationId"
          WHERE record."organizationId" = ${input.command.organizationId}
            AND record."opportunityNumber" = ${input.command.opportunityId}
            AND record."archivedAt" IS NULL
            ${scopeFilter}
          LIMIT 1
        `);
        const opportunity = rows[0] as OpportunitySubject | undefined;
        if (!opportunity) {
          throw new Error("Opportunity not available.");
        }
        const existing = await tx.enterpriseCommandLedger.findUnique({
          where: {
            organizationId_domain_commandType_idempotencyKey: {
              organizationId: input.command.organizationId,
              domain: input.command.domain,
              commandType: input.command.commandType,
              idempotencyKey: input.command.idempotencyKey
            }
          }
        });

        if (existing) {
          if (existing.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity task handoff.", "IDEMPOTENCY_KEY_REUSED");
          }
          if (existing.subjectType !== "OPPORTUNITY" || existing.subjectId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity task handoff.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = resultSnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.opportunityId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity task handoff.", "IDEMPOTENCY_KEY_REUSED");
          }
          return {
            duplicate: true,
            opportunityId: snapshot.opportunityId,
            task: {
              dueAt: new Date(snapshot.task.dueAt),
              id: snapshot.task.id,
              title: snapshot.task.title
            }
          };
        }

        if (opportunity.version !== input.command.expectedVersion) {
          throw new Error("Opportunity version conflict.");
        }

        const task = await createManualTask(
          input.actor,
          {
            assignedUserId: input.actor.id,
            boardDate: boardDateInChicago(input.command.dueAt),
            customerReference: opportunityCustomerReference(opportunity),
            description: `${input.command.brief}\n\nCRM opportunity: ${opportunity.opportunityNumber} · ${opportunity.title}`,
            dueAt: input.command.dueAt.toISOString(),
            intakeMetadata: {
              channel: "Unified CRM",
              expectedOutcome: "The opportunity follow-up is completed and the resulting next step is recorded on the CRM opportunity.",
              intakeType: "Opportunity Follow-up",
              requiredUpdates: [
                "Record the opportunity outcome.",
                "Record any customer commitment or next action.",
                "Return to the CRM opportunity before closing or handing off the task."
              ]
            },
            requiresManagerApproval: false,
            status: "NOT_STARTED",
            title: input.command.title,
            workflowArea: WorkflowArea.SALES
          },
          createTaskCreateRepository(tx)
        );

        const aggregateKey = {
          organizationId_domain_subjectType_subjectId: {
            organizationId: input.command.organizationId,
            domain: input.command.domain,
            subjectType: "OPPORTUNITY",
            subjectId: opportunity.opportunityNumber
          }
        } as const;
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: aggregateKey });
        const version = (aggregate?.version ?? opportunity.version) + 1;
        if (aggregate) {
          await tx.enterpriseAggregateVersion.update({
            where: { id: aggregate.id },
            data: { locationId: null, version }
          });
        } else {
          await tx.enterpriseAggregateVersion.create({
            data: {
              domain: input.command.domain,
              locationId: null,
              organizationId: input.command.organizationId,
              subjectId: opportunity.opportunityNumber,
              subjectType: "OPPORTUNITY",
              version
            }
          });
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE "UnifiedCrmOpportunityRecord"
             SET "version" = ${version},
                 "updatedAt" = NOW()
           WHERE "id" = ${opportunity.id}
        `);

        const snapshot = {
          opportunityId: opportunity.opportunityNumber,
          task: {
            dueAt: task.dueAt,
            id: task.id,
            title: task.title
          }
        };

        const ledger = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandType: input.command.commandType,
            completedAt: new Date(),
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            expectedVersion: input.command.expectedVersion,
            idempotencyKey: input.command.idempotencyKey,
            locationId: null,
            organizationId: input.command.organizationId,
            requestHash: input.command.requestHash,
            resultingVersion: version,
            resultSnapshot: json(snapshot),
            status: "SUCCEEDED",
            subjectId: opportunity.opportunityNumber,
            subjectType: "OPPORTUNITY"
          }
        });

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "UnifiedCrmOpportunityTaskLink" (
            "id",
            "opportunityId",
            "organizationId",
            "taskId",
            "relationship",
            "titleSnapshot",
            "briefSnapshot",
            "dueAtSnapshot",
            "createdByUserId",
            "commandId"
          ) VALUES (
            ${randomUUID()},
            ${opportunity.id},
            ${input.command.organizationId},
            ${task.id},
            ${"FOLLOW_UP"},
            ${task.title},
            ${input.command.brief},
            ${input.command.dueAt},
            ${input.command.actorUserId},
            ${ledger.id}
          )
        `);

        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: opportunity.opportunityNumber,
            aggregateType: "OPPORTUNITY",
            aggregateVersion: version,
            commandId: ledger.id,
            domain: input.command.domain,
            eventType: "CRM_OPPORTUNITY_TASK_BRIDGE_CREATED",
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json({
              dueAt: task.dueAt,
              reason: input.command.reason,
              taskId: task.id,
              title: task.title
            })
          }
        });

        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            eventType: "CRM_OPPORTUNITY_TASK_BRIDGE_CREATED",
            locationId: null,
            metadata: json({
              requestHash: input.command.requestHash
            }),
            newValue: json(snapshot),
            organizationId: input.command.organizationId,
            priorValue: undefined,
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
              aggregateVersion: version,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_OPPORTUNITY_TASK_BRIDGE_CREATED",
              taskId: task.id
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          duplicate: false,
          opportunityId: opportunity.opportunityNumber,
          task: {
            dueAt: new Date(task.dueAt),
            id: task.id,
            title: task.title
          }
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
