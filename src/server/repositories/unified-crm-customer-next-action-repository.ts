import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

type NextActionCommandInput = {
  actorUserId: string;
  commandType: string;
  correlationId: string;
  customerId: string;
  domain: string;
  dueAt: Date | null;
  expectedCurrentNextActionAt: Date | null;
  idempotencyKey: string;
  note: string | null;
  operation: "SET" | "COMPLETE";
  organizationId: string;
  reason: string;
  requestHash: string;
};

type SubjectRecord = {
  id: string;
  nextActionAt: Date | null;
  organizationId: string;
  ownerUserId: string | null;
};

function nextActionSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as {
    customerId?: unknown;
    nextActionAt?: unknown;
    operation?: unknown;
  };
  const operation = typeof snapshot.operation === "string" ? snapshot.operation.trim().toUpperCase() : "";
  if (
    typeof snapshot.customerId !== "string" ||
    (snapshot.nextActionAt !== null && snapshot.nextActionAt !== undefined && typeof snapshot.nextActionAt !== "string") ||
    (operation !== "SET" && operation !== "COMPLETE")
  ) {
    return null;
  }
  return {
    customerId: snapshot.customerId,
    nextActionAt: typeof snapshot.nextActionAt === "string" ? snapshot.nextActionAt : null,
    operation: operation as "SET" | "COMPLETE"
  };
}

export type UnifiedCrmCustomerNextActionRepository = {
  commitNextAction(input: {
    command: NextActionCommandInput;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<{
    customerId: string;
    duplicate: boolean;
    nextActionAt: Date | null;
    operation: "SET" | "COMPLETE";
    version: number;
  }>;
};

type NextActionDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function sameTimestamp(left: Date | null, right: Date | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.getTime() === right.getTime();
}

export function createUnifiedCrmCustomerNextActionRepository(
  database: NextActionDatabase = prisma
): UnifiedCrmCustomerNextActionRepository {
  return {
    commitNextAction(input) {
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
            id: true,
            nextActionAt: true,
            organizationId: true,
            ownerUserId: true
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
            throw new Error("Customer next action idempotency scope is unavailable.");
          }
          if (existing.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = nextActionSnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.customerId !== customer.id) {
            throw new Error("Stored customer next action replay is invalid.");
          }
          return {
            customerId: snapshot.customerId,
            duplicate: true,
            nextActionAt: snapshot.nextActionAt ? new Date(snapshot.nextActionAt) : null,
            operation: snapshot.operation,
            version: existing.resultingVersion ?? 0
          };
        }
        if (!customer.ownerUserId) {
          throw new Error("Customer owner required.");
        }
        if (input.command.operation === "COMPLETE" && !customer.nextActionAt) {
          throw new Error("No next action available.");
        }
        if (!sameTimestamp(customer.nextActionAt, input.command.expectedCurrentNextActionAt)) {
          throw new Error("Stale next action.");
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            nextActionAt: input.command.operation === "COMPLETE" ? null : input.command.dueAt
          }
        });

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

        const resultSnapshot = {
          customerId: customer.id,
          nextActionAt: (input.command.operation === "COMPLETE" ? null : input.command.dueAt)?.toISOString() ?? null,
          operation: input.command.operation
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
            resultSnapshot: json(resultSnapshot),
            status: "SUCCEEDED",
            subjectId: customer.id,
            subjectType: "CUSTOMER"
          }
        });
        const eventType = input.command.operation === "COMPLETE"
          ? "CRM_CUSTOMER_NEXT_ACTION_COMPLETED"
          : customer.nextActionAt
            ? "CRM_CUSTOMER_NEXT_ACTION_RESCHEDULED"
            : "CRM_CUSTOMER_NEXT_ACTION_SET";
        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: customer.id,
            aggregateType: "CUSTOMER",
            aggregateVersion: version,
            commandId: ledger.id,
            domain: input.command.domain,
            eventType,
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json({
              dueAt: input.command.dueAt?.toISOString() ?? null,
              note: input.command.note,
              operation: input.command.operation,
              previousNextActionAt: customer.nextActionAt?.toISOString() ?? null,
              reason: input.command.reason
            })
          }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            eventType,
            locationId: null,
            metadata: json({ requestHash: input.command.requestHash }),
            newValue: json(resultSnapshot),
            organizationId: input.command.organizationId,
            priorValue: json({ nextActionAt: customer.nextActionAt?.toISOString() ?? null }),
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
              eventType
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          customerId: customer.id,
          duplicate: false,
          nextActionAt: input.command.operation === "COMPLETE" ? null : input.command.dueAt,
          operation: input.command.operation,
          version
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
