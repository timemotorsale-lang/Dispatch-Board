import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

type NoteCommandInput = {
  actorUserId: string;
  body: string;
  commandType: string;
  correlationId: string;
  customerId: string;
  domain: string;
  idempotencyKey: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  visibility: string;
};

export type UnifiedCrmCustomerNoteRepository = {
  createNote(input: {
    command: NoteCommandInput;
    recordScope: UnifiedCrmCustomerRecordScope;
  }): Promise<{
    customerId: string;
    duplicate: boolean;
    noteId: string;
    version: number;
    visibility: string;
  }>;
};

type NoteDatabase = Pick<
  PrismaClient,
  "$transaction" | "customer" | "customerNote" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export function createUnifiedCrmCustomerNoteRepository(
  database: NoteDatabase = prisma
): UnifiedCrmCustomerNoteRepository {
  return {
    createNote(input) {
      return database.$transaction(async (tx) => {
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
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = existing.resultSnapshot as {
            customerId: string;
            noteId: string;
            visibility: string;
          };
          return {
            customerId: snapshot.customerId,
            duplicate: true,
            noteId: snapshot.noteId,
            version: existing.resultingVersion ?? 0,
            visibility: snapshot.visibility
          };
        }

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
            organizationId: true
          }
        });
        if (!customer) {
          throw new Error("Customer not available.");
        }

        const note = await tx.customerNote.create({
          data: {
            authorUserId: input.command.actorUserId,
            body: input.command.body,
            customerId: customer.id,
            visibility: input.command.visibility
          },
          select: { id: true }
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
          noteId: note.id,
          visibility: input.command.visibility
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
            payload: json({
              noteId: note.id,
              reason: input.command.reason,
              visibility: input.command.visibility
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
          noteId: note.id,
          version,
          visibility: input.command.visibility
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
