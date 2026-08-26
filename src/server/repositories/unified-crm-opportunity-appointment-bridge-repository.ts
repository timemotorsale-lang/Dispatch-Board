import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";

type OpportunitySubject = {
  id: string;
  opportunityNumber: string;
  organizationId: string;
  ownerUserId: string | null;
  title: string;
  version: number;
};

type AppointmentReference = {
  appointmentNumber: string;
  endsAt: Date | null;
  id: string;
  startsAt: Date | null;
  title: string;
  version: number;
};

type AppointmentBridgeCommandInput = {
  actorUserId: string;
  appointment: AppointmentReference;
  commandType: string;
  correlationId: string;
  domain: string;
  expectedVersion: number;
  idempotencyKey: string;
  opportunityId: string;
  organizationId: string;
  reason: string;
  requestHash: string;
};

type AppointmentBridgeDatabase = Pick<
  PrismaClient,
  "$executeRaw" | "$queryRaw" | "$transaction" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

type OpportunityRow = OpportunitySubject;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function resultSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as {
    appointment?: {
      appointmentNumber?: unknown;
      id?: unknown;
      version?: unknown;
    };
    opportunityId?: unknown;
  };
  if (
    typeof snapshot.opportunityId !== "string" ||
    !snapshot.appointment ||
    typeof snapshot.appointment.id !== "string" ||
    typeof snapshot.appointment.appointmentNumber !== "string" ||
    typeof snapshot.appointment.version !== "number"
  ) {
    return null;
  }
  return {
    appointment: {
      appointmentNumber: snapshot.appointment.appointmentNumber,
      id: snapshot.appointment.id,
      version: snapshot.appointment.version
    },
    opportunityId: snapshot.opportunityId
  };
}

export type UnifiedCrmOpportunityAppointmentBridgeRepository = {
  commitAppointmentBridge(input: {
    command: AppointmentBridgeCommandInput;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<{
    appointment: AppointmentReference;
    duplicate: boolean;
    opportunityId: string;
  }>;
};

export function createUnifiedCrmOpportunityAppointmentBridgeRepository(
  database: AppointmentBridgeDatabase
): UnifiedCrmOpportunityAppointmentBridgeRepository {
  return {
    commitAppointmentBridge(input) {
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
            record."version"
          FROM "UnifiedCrmOpportunityRecord" AS record
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
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity appointment bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          if (existing.subjectType !== "OPPORTUNITY" || existing.subjectId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity appointment bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = resultSnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.opportunityId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity appointment bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          return {
            appointment: {
              ...input.command.appointment,
              appointmentNumber: snapshot.appointment.appointmentNumber,
              id: snapshot.appointment.id,
              version: snapshot.appointment.version
            },
            duplicate: true,
            opportunityId: snapshot.opportunityId
          };
        }

        if (opportunity.version !== input.command.expectedVersion) {
          throw new Error("Opportunity version conflict.");
        }

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
          appointment: {
            appointmentNumber: input.command.appointment.appointmentNumber,
            id: input.command.appointment.id,
            version: input.command.appointment.version
          },
          opportunityId: opportunity.opportunityNumber
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
          INSERT INTO "UnifiedCrmOpportunityAppointmentLink" (
            "id",
            "opportunityId",
            "organizationId",
            "appointmentId",
            "relationship",
            "titleSnapshot",
            "startsAtSnapshot",
            "endsAtSnapshot",
            "createdByUserId",
            "commandId"
          ) VALUES (
            ${randomUUID()},
            ${opportunity.id},
            ${input.command.organizationId},
            ${input.command.appointment.id},
            ${"DRAFT_APPOINTMENT"},
            ${input.command.appointment.title},
            ${input.command.appointment.startsAt},
            ${input.command.appointment.endsAt},
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
            eventType: "CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATED",
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json({
              appointmentId: input.command.appointment.id,
              appointmentNumber: input.command.appointment.appointmentNumber,
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
            eventType: "CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATED",
            locationId: null,
            metadata: json({ requestHash: input.command.requestHash }),
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
              appointmentId: input.command.appointment.id,
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATED"
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          appointment: input.command.appointment,
          duplicate: false,
          opportunityId: opportunity.opportunityNumber
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
