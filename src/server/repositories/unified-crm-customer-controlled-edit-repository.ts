import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

type ControlledEditCommandInput = {
  actorUserId: string;
  changedFields: string[];
  commandType: string;
  correlationId: string;
  customerId: string;
  displayName?: string;
  domain: string;
  email?: string | null;
  expectedVersion: number;
  idempotencyKey: string;
  normalizedEmail?: string | null;
  normalizedPhoneNumber?: string | null;
  organizationId: string;
  phoneNumber?: string | null;
  preferredContactMethod?: string | null;
  reason: string;
  requestHash: string;
};

export type UnifiedCrmCustomerControlledEditRepository = {
  updateCustomer(input: {
    command: ControlledEditCommandInput;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<{
    changedFields: string[];
    customerId: string;
    duplicate: boolean;
    version: number;
  }>;
};

type ControlledEditDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "customerContactPoint" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function replaySnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as { changedFields?: unknown; customerId?: unknown };
  if (typeof snapshot.customerId !== "string" || !Array.isArray(snapshot.changedFields)) return null;
  const changedFields = snapshot.changedFields.filter((field): field is string => typeof field === "string");
  return { changedFields, customerId: snapshot.customerId };
}

export function createUnifiedCrmCustomerControlledEditRepository(
  database: ControlledEditDatabase = prisma
): UnifiedCrmCustomerControlledEditRepository {
  return {
    updateCustomer(input) {
      return database.$transaction(async (tx) => {
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
            throw new Error("Customer edit idempotency scope is unavailable.");
          }
          if (existing.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = replaySnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.customerId !== customer.id) throw new Error("Stored customer edit replay is invalid.");
          return {
            changedFields: snapshot.changedFields,
            customerId: snapshot.customerId,
            duplicate: true,
            version: existing.resultingVersion ?? 0
          };
        }

        const aggregateKey = {
          organizationId_domain_subjectType_subjectId: {
            organizationId: input.command.organizationId,
            domain: input.command.domain,
            subjectType: "CUSTOMER",
            subjectId: customer.id
          }
        } as const;
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: aggregateKey });
        const currentVersion = aggregate?.version ?? 0;
        if (currentVersion !== input.command.expectedVersion) {
          throw new EnterpriseCommandConflictError("Customer version is stale.", "VERSION_CONFLICT");
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            ...(input.command.displayName !== undefined ? { displayName: input.command.displayName } : {}),
            ...(input.command.email !== undefined ? { email: input.command.email } : {}),
            ...(input.command.phoneNumber !== undefined ? { phoneNumber: input.command.phoneNumber } : {}),
            ...(input.command.preferredContactMethod !== undefined
              ? { preferredContactMethod: input.command.preferredContactMethod }
              : {})
          },
          select: { id: true }
        });

        if (input.command.email !== undefined && input.command.email && input.command.normalizedEmail) {
          await tx.customerContactPoint.upsert({
            where: {
              customerId_type_normalizedValue: {
                customerId: customer.id,
                normalizedValue: input.command.normalizedEmail,
                type: "EMAIL"
              }
            },
            create: {
              customerId: customer.id,
              isPrimary: true,
              normalizedValue: input.command.normalizedEmail,
              type: "EMAIL",
              value: input.command.email
            },
            update: { isPrimary: true, value: input.command.email }
          });
        }
        if (input.command.phoneNumber !== undefined && input.command.phoneNumber && input.command.normalizedPhoneNumber) {
          await tx.customerContactPoint.upsert({
            where: {
              customerId_type_normalizedValue: {
                customerId: customer.id,
                normalizedValue: input.command.normalizedPhoneNumber,
                type: "PHONE"
              }
            },
            create: {
              customerId: customer.id,
              isPrimary: true,
              normalizedValue: input.command.normalizedPhoneNumber,
              type: "PHONE",
              value: input.command.phoneNumber
            },
            update: { isPrimary: true, value: input.command.phoneNumber }
          });
        }

        const version = currentVersion + 1;
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
          changedFields: input.command.changedFields,
          customerId: customer.id
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
            resultSnapshot: json(resultSnapshot),
            status: "SUCCEEDED",
            subjectId: customer.id,
            subjectType: "CUSTOMER"
          }
        });
        const eventType = `${input.command.commandType}_COMPLETED`;
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
            payload: json({ changedFields: input.command.changedFields, reason: input.command.reason })
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
            metadata: json({ changedFields: input.command.changedFields, requestHash: input.command.requestHash }),
            newValue: json(resultSnapshot),
            organizationId: input.command.organizationId,
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

        return { changedFields: input.command.changedFields, customerId: customer.id, duplicate: false, version };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
