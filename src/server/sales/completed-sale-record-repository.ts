import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

import type { NormalizedCompletedSaleRecordRequest } from "./completed-sale-record-validation";

type CompletedSaleRecordDatabase = Pick<
  PrismaClient,
  "$transaction" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent"
>;

export type CompletedSaleRecordPersistInput = {
  actorUserId: string;
  commandType: "RECORD_COMPLETED_SALE";
  correlationId: string;
  idempotencyKey: string;
  organizationId: string;
  request: NormalizedCompletedSaleRecordRequest;
  requestHash: string;
};

export type CompletedSaleRecordPersistResult = {
  auditEventId: string | null;
  commandId: string;
  correlationId: string;
  duplicate: boolean;
  idempotencyKey: string;
  saleRecord: {
    id: string;
    customerId: string;
    customerName: string;
    grossEstimateCents: number;
    productLabel: string;
    reconciliationStatus: "pending";
    revenueLane: string;
    saleDate: string;
    sourceRecordLinks: string[];
  };
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function saleRecordSnapshot(commandId: string, request: NormalizedCompletedSaleRecordRequest): CompletedSaleRecordPersistResult["saleRecord"] {
  return {
    id: commandId,
    customerId: request.customerId,
    customerName: request.customerName,
    grossEstimateCents: request.grossEstimateCents,
    productLabel: request.productLabel,
    reconciliationStatus: "pending",
    revenueLane: request.revenueLane,
    saleDate: request.saleDate,
    sourceRecordLinks: request.sourceRecordLinks
  };
}

export function createCompletedSaleRecordRepository(database: CompletedSaleRecordDatabase = prisma) {
  return {
    async persist(input: CompletedSaleRecordPersistInput): Promise<CompletedSaleRecordPersistResult> {
      return database.$transaction(async (tx) => {
        const existing = await tx.enterpriseCommandLedger.findUnique({
          where: {
            organizationId_domain_commandType_idempotencyKey: {
              commandType: input.commandType,
              domain: "SALES_CONSOLE",
              idempotencyKey: input.idempotencyKey,
              organizationId: input.organizationId
            }
          }
        });

        if (existing) {
          if (existing.requestHash !== input.requestHash) {
            throw new EnterpriseCommandConflictError(
              "Idempotency key was already used with a different completed-sale request.",
              "IDEMPOTENCY_KEY_REUSED"
            );
          }

          const snapshot = existing.resultSnapshot as { auditEventId?: string | null; saleRecord?: CompletedSaleRecordPersistResult["saleRecord"] } | null;
          if (!snapshot?.saleRecord) {
            throw new Error("Existing completed sale record is missing its result snapshot.");
          }

          return {
            auditEventId: snapshot.auditEventId ?? null,
            commandId: existing.id,
            correlationId: existing.correlationId,
            duplicate: true,
            idempotencyKey: existing.idempotencyKey,
            saleRecord: snapshot.saleRecord
          };
        }

        const command = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.actorUserId,
            commandType: input.commandType,
            completedAt: new Date(),
            correlationId: input.correlationId,
            domain: "SALES_CONSOLE",
            expectedVersion: 0,
            idempotencyKey: input.idempotencyKey,
            organizationId: input.organizationId,
            requestHash: input.requestHash,
            resultSnapshot: json({ auditEventId: null, request: input.request }),
            resultingVersion: 1,
            status: "SUCCEEDED",
            subjectId: input.request.salesOpportunityId,
            subjectType: "COMPLETED_SALE_RECORD"
          }
        });
        const saleRecord = saleRecordSnapshot(command.id, input.request);

        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: saleRecord.id,
            aggregateType: "COMPLETED_SALE_RECORD",
            aggregateVersion: 1,
            commandId: command.id,
            domain: "SALES_CONSOLE",
            eventType: "RECORD_COMPLETED_SALE_CREATED",
            organizationId: input.organizationId,
            payload: json({ saleRecord, sourceSystemsMutated: false })
          }
        });

        const auditEvent = await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.actorUserId,
            commandId: command.id,
            correlationId: input.correlationId,
            domain: "SALES_CONSOLE",
            eventType: "RECORD_COMPLETED_SALE_CREATED",
            metadata: json({
              domainEventId: event.id,
              idempotencyKey: input.idempotencyKey,
              requestHash: input.requestHash,
              sourceSystemsMutated: false
            }),
            newValue: json(saleRecord),
            organizationId: input.organizationId,
            reason: input.request.reason,
            subjectId: saleRecord.id,
            subjectType: "COMPLETED_SALE_RECORD"
          }
        });

        await tx.enterpriseCommandLedger.update({
          data: {
            resultSnapshot: json({ auditEventId: auditEvent.id, saleRecord })
          },
          where: { id: command.id }
        });

        return {
          auditEventId: auditEvent.id,
          commandId: command.id,
          correlationId: input.correlationId,
          duplicate: false,
          idempotencyKey: input.idempotencyKey,
          saleRecord
        };
      });
    }
  };
}
