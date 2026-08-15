import { Prisma, WorkflowArea, type PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  createTaskCreateRepository
} from "@/server/repositories/task-create-repository";
import { createManualTask } from "@/server/services/task-create-service";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

type SubjectRecord = {
  customerNumber: string;
  displayName: string;
  id: string;
  organizationId: string;
};

type TaskBridgeCommandInput = {
  actorUserId: string;
  brief: string;
  commandType: string;
  correlationId: string;
  customerId: string;
  domain: string;
  dueAt: Date;
  idempotencyKey: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  title: string;
};

type TaskBridgeDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function resultSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as {
    customerId?: unknown;
    task?: {
      dueAt?: unknown;
      id?: unknown;
      title?: unknown;
    };
  };
  if (
    typeof snapshot.customerId !== "string" ||
    !snapshot.task ||
    typeof snapshot.task !== "object" ||
    typeof snapshot.task.id !== "string" ||
    typeof snapshot.task.title !== "string" ||
    typeof snapshot.task.dueAt !== "string"
  ) {
    return null;
  }
  return {
    customerId: snapshot.customerId,
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

export type UnifiedCrmCustomerTaskBridgeRepository = {
  commitTaskBridge(input: {
    actor: AuthenticatedUser;
    command: TaskBridgeCommandInput;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<{
    customerId: string;
    duplicate: boolean;
    task: {
      dueAt: Date;
      id: string;
      title: string;
    };
  }>;
};

export function createUnifiedCrmCustomerTaskBridgeRepository(
  database: TaskBridgeDatabase
): UnifiedCrmCustomerTaskBridgeRepository {
  return {
    commitTaskBridge(input) {
      return database.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({
          where: {
            id: input.command.customerId,
            organizationId: input.command.organizationId,
            archivedAt: null,
            mergedIntoCustomerId: null,
            ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
          },
          select: {
            customerNumber: true,
            displayName: true,
            id: true,
            organizationId: true
          }
        }) as SubjectRecord | null;

        if (!customer) {
          throw new Error("Customer not available.");
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
          if (existing.subjectType !== "CUSTOMER" || existing.subjectId !== customer.id) {
            throw new Error("Customer task bridge idempotency scope is unavailable.");
          }
          if (existing.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM task handoff.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = resultSnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.customerId !== customer.id) {
            throw new Error("Stored customer task bridge replay is invalid.");
          }
          return {
            customerId: snapshot.customerId,
            duplicate: true,
            task: {
              dueAt: new Date(snapshot.task.dueAt),
              id: snapshot.task.id,
              title: snapshot.task.title
            }
          };
        }

        const task = await createManualTask(
          input.actor,
          {
            assignedUserId: input.actor.id,
            boardDate: boardDateInChicago(input.command.dueAt),
            customerReference: `${customer.displayName} · ${customer.customerNumber}`,
            description: input.command.brief,
            dueAt: input.command.dueAt.toISOString(),
            intakeMetadata: {
              channel: "Unified CRM",
              expectedOutcome: "The customer follow-up is completed and the resulting next step is recorded in the Dispatch Board.",
              intakeType: "Customer Issue",
              requiredUpdates: [
                "Record the customer outcome.",
                "Record the next agreed step.",
                "Close or hand off the follow-up in the source workflow when done."
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
            subjectType: "CUSTOMER",
            subjectId: customer.id
          }
        } as const;
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: aggregateKey });
        const version = (aggregate?.version ?? 0) + 1;
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
              subjectId: customer.id,
              subjectType: "CUSTOMER",
              version
            }
          });
        }

        const snapshot = {
          customerId: customer.id,
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
            expectedVersion: aggregate?.version ?? 0,
            idempotencyKey: input.command.idempotencyKey,
            locationId: null,
            organizationId: input.command.organizationId,
            requestHash: input.command.requestHash,
            resultingVersion: version,
            resultSnapshot: json(snapshot),
            status: "SUCCEEDED",
            subjectId: customer.id,
            subjectType: "CUSTOMER"
          }
        });

        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: customer.id,
            aggregateType: "CUSTOMER",
            aggregateVersion: version,
            commandId: ledger.id,
            domain: input.command.domain,
            eventType: "CRM_CUSTOMER_TASK_BRIDGE_CREATED",
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
            eventType: "CRM_CUSTOMER_TASK_BRIDGE_CREATED",
            locationId: null,
            metadata: json({
              requestHash: input.command.requestHash
            }),
            newValue: json(snapshot),
            organizationId: input.command.organizationId,
            priorValue: undefined,
            reason: input.command.reason,
            subjectId: customer.id,
            subjectType: "CUSTOMER"
          }
        });

        await tx.enterpriseOutboxMessage.create({
          data: {
            domainEventId: event.id,
            locationId: null,
            messageKey: customer.id,
            organizationId: input.command.organizationId,
            payload: json({
              aggregateId: customer.id,
              aggregateVersion: version,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_CUSTOMER_TASK_BRIDGE_CREATED",
              taskId: task.id
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          customerId: customer.id,
          duplicate: false,
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
