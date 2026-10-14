import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityDispatchTargetKind } from "@/server/unified-crm/opportunity-dispatch-bridge-command";

type OpportunitySubject = {
  id: string;
  opportunityNumber: string;
  organizationId: string;
  ownerUserId: string | null;
  title: string;
  version: number;
};

type DispatchTarget = {
  repairJobId: string | null;
  repairJobNumber: string | null;
  repairOrderId: string;
  repairOrderNumber: string;
  targetKind: UnifiedCrmOpportunityDispatchTargetKind;
  title: string;
  version: number;
};

type DispatchBridgeCommandInput = {
  actorUserId: string;
  commandType: string;
  correlationId: string;
  domain: string;
  expectedTargetVersion: number;
  expectedVersion: number;
  idempotencyKey: string;
  opportunityId: string;
  organizationId: string;
  reason: string;
  requestHash: string;
  targetId: string;
  targetKind: UnifiedCrmOpportunityDispatchTargetKind;
};

type DispatchBridgeDatabase = Pick<
  PrismaClient,
  "$executeRaw" | "$queryRaw" | "$transaction" | "enterpriseAggregateVersion" | "enterpriseAuditEvent" | "enterpriseCommandLedger" | "enterpriseDomainEvent" | "enterpriseOutboxMessage"
>;

type OpportunityRow = OpportunitySubject;

type RepairOrderRow = {
  repairOrderId: string;
  repairOrderNumber: string;
  title: string;
  version: number;
};

type RepairJobRow = {
  repairJobId: string;
  repairJobNumber: string;
  repairOrderId: string;
  repairOrderNumber: string;
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
    target?: {
      repairJobId?: unknown;
      repairJobNumber?: unknown;
      repairOrderId?: unknown;
      repairOrderNumber?: unknown;
      targetKind?: unknown;
      title?: unknown;
      version?: unknown;
    };
  };
  if (
    typeof snapshot.opportunityId !== "string" ||
    !snapshot.target ||
    typeof snapshot.target.repairOrderId !== "string" ||
    typeof snapshot.target.repairOrderNumber !== "string" ||
    typeof snapshot.target.targetKind !== "string" ||
    typeof snapshot.target.title !== "string" ||
    typeof snapshot.target.version !== "number"
  ) {
    return null;
  }
  return {
    opportunityId: snapshot.opportunityId,
    target: {
      repairJobId: typeof snapshot.target.repairJobId === "string" ? snapshot.target.repairJobId : null,
      repairJobNumber: typeof snapshot.target.repairJobNumber === "string" ? snapshot.target.repairJobNumber : null,
      repairOrderId: snapshot.target.repairOrderId,
      repairOrderNumber: snapshot.target.repairOrderNumber,
      targetKind: snapshot.target.targetKind as UnifiedCrmOpportunityDispatchTargetKind,
      title: snapshot.target.title,
      version: snapshot.target.version
    }
  };
}

function targetHref(target: DispatchTarget) {
  if (target.targetKind === "REPAIR_JOB" && target.repairJobId) {
    return `/vehicles/shop-dispatch?repairJobId=${encodeURIComponent(target.repairJobId)}`;
  }
  return `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(target.repairOrderId)}`;
}

async function findDispatchTarget(
  tx: Pick<PrismaClient, "$queryRaw">,
  command: DispatchBridgeCommandInput
): Promise<DispatchTarget> {
  if (command.targetKind === "REPAIR_ORDER") {
    const rows = await tx.$queryRaw<RepairOrderRow[]>(Prisma.sql`
      SELECT
        ro."id" AS "repairOrderId",
        ro."repairOrderNumber",
        CONCAT('Repair order ', ro."repairOrderNumber") AS "title",
        ro."version"
      FROM "RepairOrder" AS ro
      WHERE ro."organizationId" = ${command.organizationId}
        AND ro."id" = ${command.targetId}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) throw new Error("Dispatch target not available.");
    return {
      repairJobId: null,
      repairJobNumber: null,
      repairOrderId: row.repairOrderId,
      repairOrderNumber: row.repairOrderNumber,
      targetKind: "REPAIR_ORDER",
      title: row.title,
      version: row.version
    };
  }

  const rows = await tx.$queryRaw<RepairJobRow[]>(Prisma.sql`
    SELECT
      job."id" AS "repairJobId",
      job."jobNumber" AS "repairJobNumber",
      job."description" AS "title",
      job."version",
      ro."id" AS "repairOrderId",
      ro."repairOrderNumber"
    FROM "RepairJob" AS job
    INNER JOIN "RepairOrder" AS ro
      ON ro."id" = job."repairOrderId"
     AND ro."organizationId" = job."organizationId"
    WHERE job."organizationId" = ${command.organizationId}
      AND job."id" = ${command.targetId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) throw new Error("Dispatch target not available.");
  return {
    repairJobId: row.repairJobId,
    repairJobNumber: row.repairJobNumber,
    repairOrderId: row.repairOrderId,
    repairOrderNumber: row.repairOrderNumber,
    targetKind: "REPAIR_JOB",
    title: row.title,
    version: row.version
  };
}

export type UnifiedCrmOpportunityDispatchBridgeRepository = {
  commitDispatchBridge(input: {
    command: DispatchBridgeCommandInput;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<{
    duplicate: boolean;
    opportunityId: string;
    target: DispatchTarget & { href: string };
  }>;
};

export function createUnifiedCrmOpportunityDispatchBridgeRepository(
  database: DispatchBridgeDatabase
): UnifiedCrmOpportunityDispatchBridgeRepository {
  return {
    commitDispatchBridge(input) {
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
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity dispatch bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          if (existing.subjectType !== "OPPORTUNITY" || existing.subjectId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity dispatch bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          const snapshot = resultSnapshot(existing.resultSnapshot);
          if (!snapshot || snapshot.opportunityId !== opportunity.opportunityNumber) {
            throw new EnterpriseCommandConflictError("Idempotency key was already used with a different CRM opportunity dispatch bridge.", "IDEMPOTENCY_KEY_REUSED");
          }
          return {
            duplicate: true,
            opportunityId: snapshot.opportunityId,
            target: {
              ...snapshot.target,
              href: targetHref(snapshot.target)
            }
          };
        }

        if (opportunity.version !== input.command.expectedVersion) {
          throw new Error("Opportunity version conflict.");
        }

        const target = await findDispatchTarget(tx, input.command);
        if (target.version !== input.command.expectedTargetVersion) {
          throw new Error("Dispatch target version conflict.");
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
          opportunityId: opportunity.opportunityNumber,
          target
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
          INSERT INTO "UnifiedCrmOpportunityDispatchLink" (
            "id",
            "opportunityId",
            "organizationId",
            "targetKind",
            "repairOrderId",
            "repairJobId",
            "repairOrderNumberSnapshot",
            "repairJobNumberSnapshot",
            "titleSnapshot",
            "targetVersionSnapshot",
            "createdByUserId",
            "commandId"
          ) VALUES (
            ${randomUUID()},
            ${opportunity.id},
            ${input.command.organizationId},
            ${target.targetKind},
            ${target.repairOrderId},
            ${target.repairJobId},
            ${target.repairOrderNumber},
            ${target.repairJobNumber},
            ${target.title},
            ${target.version},
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
            eventType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINKED",
            locationId: null,
            organizationId: input.command.organizationId,
            payload: json({
              reason: input.command.reason,
              target
            })
          }
        });

        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.command.actorUserId,
            commandId: ledger.id,
            correlationId: input.command.correlationId,
            domain: input.command.domain,
            eventType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINKED",
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
              correlationId: input.command.correlationId,
              eventId: event.id,
              eventType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINKED",
              target
            }),
            topic: "vehicle-operations.unified_crm"
          }
        });

        return {
          duplicate: false,
          opportunityId: opportunity.opportunityNumber,
          target: {
            ...target,
            href: targetHref(target)
          }
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}
