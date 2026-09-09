import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

type InteractionCommandInput = {
  actorUserId: string;
  channel: string;
  commandType: string;
  completeCurrentFollowUp: boolean;
  consentState: string;
  correlationId: string;
  customerId: string;
  direction: string;
  domain: string;
  idempotencyKey: string;
  nextActionAt: Date | null;
  nextStep: string | null;
  occurredAt: Date;
  organizationId: string;
  outcome: string | null;
  relatedDealId: string | null;
  relatedRepairOrderId: string | null;
  relatedStaffMemberId: string | null;
  relatedVehicleId: string | null;
  reason: string;
  reportWorthy: boolean;
  requestHash: string;
  summary: string;
};

const customerSelect = {
  id: true,
  organizationId: true,
  ownerUserId: true,
  lastInteractionAt: true,
  nextActionAt: true,
  contactPoints: {
    select: {
      type: true,
      consentStatus: true
    }
  }
} satisfies Prisma.CustomerSelect;

export type UnifiedCrmCustomerInteractionSubject = Prisma.CustomerGetPayload<{
  select: typeof customerSelect;
}>;

export type UnifiedCrmCustomerInteractionRepository = {
  createInteraction(input: {
    command: InteractionCommandInput;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<{
    customerId: string;
    duplicate: boolean;
    followUpCompleted: boolean;
    interactionId: string;
    nextActionAt: Date | null;
    occurredAt: Date;
    version: number;
  }>;
};

type InteractionDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "customerInteraction" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function canonicalContactType(channel: string) {
  if (channel === "PHONE" || channel === "TEXT") return "PHONE";
  if (channel === "EMAIL") return "EMAIL";
  return null;
}

function hasConfirmedCanonicalConsent(customer: UnifiedCrmCustomerInteractionSubject, channel: string) {
  const contactType = canonicalContactType(channel);
  if (!contactType) return true;
  const statuses = customer.contactPoints
    .filter((point) => point.type.trim().toUpperCase() === contactType)
    .map((point) => point.consentStatus.trim().toUpperCase());
  if (statuses.length === 0) return false;
  return statuses.some((status) =>
    status === "GRANTED" ||
    status === "CONFIRMED" ||
    status === "OPTED_IN"
  );
}

export function createUnifiedCrmCustomerInteractionRepository(
  database: InteractionDatabase = prisma
): UnifiedCrmCustomerInteractionRepository {
  return {
    createInteraction(input) {
      return database.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({
          where: {
            id: input.command.customerId,
            organizationId: input.command.organizationId,
            archivedAt: null,
            mergedIntoCustomerId: null,
            ...(input.recordScope.kind === "OWNER" ? { ownerUserId: input.recordScope.ownerUserId } : {})
          },
          select: customerSelect
        });
        if (!customer) {
          throw new Error("Customer not available.");
        }
        if (input.command.direction === "OUTBOUND" && !hasConfirmedCanonicalConsent(customer, input.command.channel)) {
          throw new Error("Outbound canonical consent is required.");
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
            throw new Error("Interaction idempotency scope is unavailable.");
          }
          if (existing.requestHash !== input.command.requestHash) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = existing.resultSnapshot as {
            customerId: string;
            followUpCompleted?: boolean;
            interactionId: string;
            nextActionAt: string | null;
            occurredAt: string;
          };
          if (
            snapshot.customerId !== customer.id ||
            typeof snapshot.interactionId !== "string" ||
            typeof snapshot.occurredAt !== "string" ||
            (snapshot.nextActionAt !== null && typeof snapshot.nextActionAt !== "string")
          ) {
            throw new Error("Stored interaction replay is invalid.");
          }
          return {
            customerId: snapshot.customerId,
            duplicate: true,
            followUpCompleted: snapshot.followUpCompleted === true,
            interactionId: snapshot.interactionId,
            nextActionAt: snapshot.nextActionAt ? new Date(snapshot.nextActionAt) : null,
            occurredAt: new Date(snapshot.occurredAt),
            version: existing.resultingVersion ?? 0
          };
        }

        const interaction = await tx.customerInteraction.create({
          data: {
            customerId: customer.id,
            actorUserId: input.command.actorUserId,
            channel: input.command.channel,
            direction: input.command.direction,
            summary: input.command.summary,
            outcome: input.command.outcome,
            nextStep: input.command.nextStep,
            occurredAt: input.command.occurredAt
          },
          select: { id: true }
        });

        const nextLastInteractionAt = customer.lastInteractionAt && customer.lastInteractionAt.getTime() > input.command.occurredAt.getTime()
          ? customer.lastInteractionAt
          : input.command.occurredAt;
        const followUpCompleted = input.command.completeCurrentFollowUp && Boolean(customer.nextActionAt);
        const nextActionAt = input.command.completeCurrentFollowUp ? null : input.command.nextActionAt ?? customer.nextActionAt;

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            lastInteractionAt: nextLastInteractionAt,
            nextActionAt
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
            data: { version, locationId: null }
          });
        } else {
          await tx.enterpriseAggregateVersion.create({
            data: {
              organizationId: input.command.organizationId,
              locationId: null,
              domain: input.command.domain,
              subjectType: "CUSTOMER",
              subjectId: customer.id,
              version
            }
          });
        }

        const resultSnapshot = {
          customerId: customer.id,
          followUpCompleted,
          interactionId: interaction.id,
          occurredAt: input.command.occurredAt.toISOString(),
          nextActionAt: nextActionAt?.toISOString() ?? null
        };
        const ledger = await tx.enterpriseCommandLedger.create({
          data: {
            organizationId: input.command.organizationId,
            locationId: null,
            actorUserId: input.command.actorUserId,
            domain: input.command.domain,
            subjectType: "CUSTOMER",
            subjectId: customer.id,
            commandType: input.command.commandType,
            status: "SUCCEEDED",
            idempotencyKey: input.command.idempotencyKey,
            requestHash: input.command.requestHash,
            correlationId: input.command.correlationId,
            expectedVersion: aggregate?.version ?? 0,
            resultingVersion: version,
            resultSnapshot: json(resultSnapshot),
            completedAt: new Date()
          }
        });
        const eventType = `${input.command.commandType}_COMPLETED`;
        const event = await tx.enterpriseDomainEvent.create({
          data: {
            organizationId: input.command.organizationId,
            locationId: null,
            commandId: ledger.id,
            domain: input.command.domain,
            aggregateType: "CUSTOMER",
            aggregateId: customer.id,
            aggregateVersion: version,
            eventType,
            payload: json({
              channel: input.command.channel,
              consentState: input.command.consentState,
              direction: input.command.direction,
              interactionId: interaction.id,
              occurredAt: input.command.occurredAt.toISOString(),
              relatedDealId: input.command.relatedDealId,
              relatedRepairOrderId: input.command.relatedRepairOrderId,
              relatedStaffMemberId: input.command.relatedStaffMemberId,
              relatedVehicleId: input.command.relatedVehicleId,
              reportWorthy: input.command.reportWorthy,
              followUpCompleted,
              reason: input.command.reason
            })
          }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            organizationId: input.command.organizationId,
            locationId: null,
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            domain: input.command.domain,
            subjectType: "CUSTOMER",
            subjectId: customer.id,
            eventType,
            reason: input.command.reason,
            newValue: json(resultSnapshot),
            metadata: json({
              relatedDealId: input.command.relatedDealId,
              relatedRepairOrderId: input.command.relatedRepairOrderId,
              relatedStaffMemberId: input.command.relatedStaffMemberId,
              relatedVehicleId: input.command.relatedVehicleId,
              reportWorthy: input.command.reportWorthy,
              requestHash: input.command.requestHash
            }),
            correlationId: input.command.correlationId
          }
        });
        await tx.enterpriseOutboxMessage.create({
          data: {
            organizationId: input.command.organizationId,
            locationId: null,
            domainEventId: event.id,
            topic: "vehicle-operations.unified_crm",
            messageKey: customer.id,
            payload: json({
              aggregateId: customer.id,
              aggregateVersion: version,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType
            })
          }
        });

        return {
          customerId: customer.id,
          duplicate: false,
          followUpCompleted,
          interactionId: interaction.id,
          nextActionAt,
          occurredAt: input.command.occurredAt,
          version
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
