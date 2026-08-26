import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

export type UnifiedCrmHomeDashboardCounts = {
  dispatchHandoffCount: number;
  newestRecordUpdatedAt: Date | null;
  openOpportunityCount: number;
  overdueFollowUpCount: number;
  quoteCount: number;
};

export type UnifiedCrmHomeDashboardRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  loadCounts(input: {
    organizationId: string;
    recordScope: UnifiedCrmCustomerRecordScope;
    viewerUserId: string;
    now: Date;
  }): Promise<UnifiedCrmHomeDashboardCounts>;
};

type UnifiedCrmHomeDashboardDatabase = Pick<PrismaClient, "$queryRaw" | "userLocationAccess">;

type CountRow = {
  dispatchHandoffCount: bigint | number;
  newestRecordUpdatedAt: Date | null;
  openOpportunityCount: bigint | number;
  overdueFollowUpCount: bigint | number;
  quoteCount: bigint | number;
};

function scopePredicate(alias: string, scope: UnifiedCrmCustomerRecordScope, viewerUserId: string) {
  if (scope.kind === "ORGANIZATION") return Prisma.sql`TRUE`;
  return Prisma.sql`(${Prisma.raw(alias)}."ownerUserId" = ${viewerUserId})`;
}

function numberValue(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

export function createUnifiedCrmHomeDashboardRepository(
  database: UnifiedCrmHomeDashboardDatabase = prisma
): UnifiedCrmHomeDashboardRepository {
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
    async loadCounts(input) {
      const opportunityScope = scopePredicate("o", input.recordScope, input.viewerUserId);
      const quoteScope = input.recordScope.kind === "ORGANIZATION"
        ? Prisma.sql`TRUE`
        : Prisma.sql`(o."ownerUserId" = ${input.viewerUserId} OR c."ownerUserId" = ${input.viewerUserId} OR q."createdByUserId" = ${input.viewerUserId})`;
      const rows = await database.$queryRaw<CountRow[]>(Prisma.sql`
        WITH visible_opportunities AS (
          SELECT o.id, o."nextActionDueAt", o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')
            AND ${opportunityScope}
        ),
        visible_quotes AS (
          SELECT q.id, q."updatedAt"
          FROM "UnifiedCrmQuoteRecord" q
          LEFT JOIN "UnifiedCrmOpportunityRecord" o ON o.id = q."opportunityId"
          LEFT JOIN "Customer" c ON c.id = q."customerId"
          WHERE q."organizationId" = ${input.organizationId}
            AND q."archivedAt" IS NULL
            AND ${quoteScope}
        ),
        visible_dispatch AS (
          SELECT l.id, l."updatedAt"
          FROM "UnifiedCrmOpportunityDispatchLink" l
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = l."opportunityId"
          WHERE l."organizationId" = ${input.organizationId}
            AND l."archivedAt" IS NULL
            AND ${opportunityScope}
        ),
        newest AS (
          SELECT "updatedAt" FROM visible_opportunities
          UNION ALL SELECT "updatedAt" FROM visible_quotes
          UNION ALL SELECT "updatedAt" FROM visible_dispatch
        )
        SELECT
          (SELECT COUNT(*) FROM visible_opportunities) AS "openOpportunityCount",
          (SELECT COUNT(*) FROM visible_opportunities WHERE "nextActionDueAt" IS NOT NULL AND "nextActionDueAt" < ${input.now}) AS "overdueFollowUpCount",
          (SELECT COUNT(*) FROM visible_quotes) AS "quoteCount",
          (SELECT COUNT(*) FROM visible_dispatch) AS "dispatchHandoffCount",
          (SELECT MAX("updatedAt") FROM newest) AS "newestRecordUpdatedAt"
      `);
      const row = rows[0] ?? {
        dispatchHandoffCount: 0,
        newestRecordUpdatedAt: null,
        openOpportunityCount: 0,
        overdueFollowUpCount: 0,
        quoteCount: 0
      };
      return {
        dispatchHandoffCount: numberValue(row.dispatchHandoffCount),
        newestRecordUpdatedAt: row.newestRecordUpdatedAt,
        openOpportunityCount: numberValue(row.openOpportunityCount),
        overdueFollowUpCount: numberValue(row.overdueFollowUpCount),
        quoteCount: numberValue(row.quoteCount)
      };
    }
  };
}
