import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmManagerExceptionKind } from "@/server/unified-crm/manager-exception-queue-contract";

export type UnifiedCrmManagerExceptionQueueRow = {
  id: string;
  kind: UnifiedCrmManagerExceptionKind;
  label: string;
  detail: string;
  ownerName: string | null;
  href: string;
  recommendedAction: string;
  updatedAt: Date;
};

export type UnifiedCrmManagerExceptionQueueRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  listExceptions(input: {
    limit: number;
    offset: number;
    organizationId: string;
    stalledBefore: Date;
    now: Date;
  }): Promise<UnifiedCrmManagerExceptionQueueRow[]>;
  summarize(input: {
    organizationId: string;
    stalledBefore: Date;
    now: Date;
  }): Promise<Record<UnifiedCrmManagerExceptionKind, number>>;
};

type UnifiedCrmManagerExceptionQueueDatabase = Pick<PrismaClient, "$queryRaw" | "userLocationAccess">;

type SummaryRow = {
  approval: bigint | number;
  dispatchHandoff: bigint | number;
  overdue: bigint | number;
  stalled: bigint | number;
  unassigned: bigint | number;
};

function numberValue(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

function summaryFrom(row: SummaryRow | undefined): Record<UnifiedCrmManagerExceptionKind, number> {
  return {
    approval: numberValue(row?.approval ?? 0),
    dispatchHandoff: numberValue(row?.dispatchHandoff ?? 0),
    overdue: numberValue(row?.overdue ?? 0),
    stalled: numberValue(row?.stalled ?? 0),
    unassigned: numberValue(row?.unassigned ?? 0)
  };
}

export function createUnifiedCrmManagerExceptionQueueRepository(
  database: UnifiedCrmManagerExceptionQueueDatabase = prisma
): UnifiedCrmManagerExceptionQueueRepository {
  return {
    async listActiveOrganizationIds(userId, at) {
      const grants = await database.userLocationAccess.findMany({
        where: {
          userId,
          validFrom: { lte: at },
          OR: [{ validTo: null }, { validTo: { gte: at } }]
        },
        select: { location: { select: { organizationId: true } } }
      });
      return [...new Set(grants.map((grant) => grant.location.organizationId))].sort();
    },
    async listExceptions(input) {
      return database.$queryRaw<UnifiedCrmManagerExceptionQueueRow[]>(Prisma.sql`
        WITH exceptions AS (
          SELECT
            o.id,
            'unassigned'::text AS kind,
            o.title AS label,
            'Opportunity has no owner assigned.' AS detail,
            NULL::text AS "ownerName",
            '/crm/opportunities/' || o.id AS href,
            'Assign an owner before more customer follow-up is promised.' AS "recommendedAction",
            o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')
            AND o."ownerUserId" IS NULL

          UNION ALL

          SELECT
            o.id,
            'stalled'::text AS kind,
            o.title AS label,
            'Opportunity has not changed recently.' AS detail,
            u.name AS "ownerName",
            '/crm/opportunities/' || o.id AS href,
            'Review the next action and refresh ownership or stage evidence.' AS "recommendedAction",
            o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          LEFT JOIN "User" u ON u.id = o."ownerUserId"
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')
            AND o."updatedAt" < ${input.stalledBefore}

          UNION ALL

          SELECT
            o.id,
            'overdue'::text AS kind,
            o.title AS label,
            'Opportunity next action is overdue.' AS detail,
            u.name AS "ownerName",
            '/crm/opportunities/' || o.id AS href,
            'Protect the customer promise and record the next action.' AS "recommendedAction",
            o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          LEFT JOIN "User" u ON u.id = o."ownerUserId"
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')
            AND o."nextActionDueAt" IS NOT NULL
            AND o."nextActionDueAt" < ${input.now}

          UNION ALL

          SELECT
            r.id,
            'approval'::text AS kind,
            q."quoteNumber" AS label,
            'Commercial approval is waiting for manager decision.' AS detail,
            u.name AS "ownerName",
            '/crm/quotes?quoteId=' || q.id AS href,
            'Review approve, return, or deny decision evidence.' AS "recommendedAction",
            r."updatedAt"
          FROM "UnifiedCrmCommercialApprovalRequest" r
          JOIN "UnifiedCrmQuoteRecord" q ON q.id = r."quoteId"
          LEFT JOIN "User" u ON u.id = r."requestedByUserId"
          WHERE r."organizationId" = ${input.organizationId}
            AND r.status = 'PENDING'

          UNION ALL

          SELECT
            l.id,
            'dispatchHandoff'::text AS kind,
            l."titleSnapshot" AS label,
            'CRM opportunity is linked to dispatch work that needs handoff review.' AS detail,
            u.name AS "ownerName",
            '/crm/opportunities/' || o.id AS href,
            'Confirm the handoff context before operational completion.' AS "recommendedAction",
            l."updatedAt"
          FROM "UnifiedCrmOpportunityDispatchLink" l
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = l."opportunityId"
          LEFT JOIN "User" u ON u.id = o."ownerUserId"
          WHERE l."organizationId" = ${input.organizationId}
            AND l."archivedAt" IS NULL
        )
        SELECT id, kind, label, detail, "ownerName", href, "recommendedAction", "updatedAt"
        FROM exceptions
        ORDER BY "updatedAt" ASC, kind ASC, id ASC
        OFFSET ${input.offset}
        LIMIT ${input.limit}
      `);
    },
    async summarize(input) {
      const rows = await database.$queryRaw<SummaryRow[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityRecord" o WHERE o."organizationId" = ${input.organizationId} AND o."archivedAt" IS NULL AND o.stage NOT IN ('WON', 'LOST') AND o."ownerUserId" IS NULL) AS unassigned,
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityRecord" o WHERE o."organizationId" = ${input.organizationId} AND o."archivedAt" IS NULL AND o.stage NOT IN ('WON', 'LOST') AND o."updatedAt" < ${input.stalledBefore}) AS stalled,
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityRecord" o WHERE o."organizationId" = ${input.organizationId} AND o."archivedAt" IS NULL AND o.stage NOT IN ('WON', 'LOST') AND o."nextActionDueAt" IS NOT NULL AND o."nextActionDueAt" < ${input.now}) AS overdue,
          (SELECT COUNT(*) FROM "UnifiedCrmCommercialApprovalRequest" r WHERE r."organizationId" = ${input.organizationId} AND r.status = 'PENDING') AS approval,
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityDispatchLink" l WHERE l."organizationId" = ${input.organizationId} AND l."archivedAt" IS NULL) AS "dispatchHandoff"
      `);
      return summaryFrom(rows[0]);
    }
  };
}
