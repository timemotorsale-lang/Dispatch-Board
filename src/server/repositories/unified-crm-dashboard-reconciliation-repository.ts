import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmDashboardReconciliationMetricId } from "@/server/unified-crm/dashboard-reconciliation-contract";

export type UnifiedCrmDashboardReconciliationRow = {
  entity: "opportunity" | "quote" | "dispatch";
  href: string;
  id: string;
  label: string;
  metricId: UnifiedCrmDashboardReconciliationMetricId;
  updatedAt: Date;
};

export type UnifiedCrmDashboardReconciliationRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  listRows(input: { now: Date; organizationId: string; sampleLimit: number }): Promise<UnifiedCrmDashboardReconciliationRow[]>;
};

type UnifiedCrmDashboardReconciliationDatabase = Pick<PrismaClient, "$queryRaw" | "userLocationAccess">;

export function createUnifiedCrmDashboardReconciliationRepository(
  database: UnifiedCrmDashboardReconciliationDatabase = prisma
): UnifiedCrmDashboardReconciliationRepository {
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
    async listRows(input) {
      return database.$queryRaw<UnifiedCrmDashboardReconciliationRow[]>(Prisma.sql`
        WITH metric_rows AS (
          SELECT 'ownedWork'::text AS "metricId", 'opportunity'::text AS entity, o.id, o.title AS label, '/crm/opportunities/' || o.id AS href, o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')

          UNION ALL

          SELECT 'overdueFollowUp'::text AS "metricId", 'opportunity'::text AS entity, o.id, o.title AS label, '/crm/opportunities/' || o.id AS href, o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')
            AND o."nextActionDueAt" IS NOT NULL
            AND o."nextActionDueAt" < ${input.now}

          UNION ALL

          SELECT 'pipeline'::text AS "metricId", 'opportunity'::text AS entity, o.id, o.title AS label, '/crm/opportunities/' || o.id AS href, o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND o.stage NOT IN ('WON', 'LOST')

          UNION ALL

          SELECT 'quotes'::text AS "metricId", 'quote'::text AS entity, q.id, q."quoteNumber" AS label, '/crm/quotes/' || q.id AS href, q."updatedAt"
          FROM "UnifiedCrmQuoteRecord" q
          WHERE q."organizationId" = ${input.organizationId}
            AND q."archivedAt" IS NULL

          UNION ALL

          SELECT 'dispatchHandoffs'::text AS "metricId", 'dispatch'::text AS entity, d.id, COALESCE(d."titleSnapshot", d."repairOrderNumberSnapshot", d.id) AS label, '/crm/opportunities/' || d."opportunityId" AS href, d."updatedAt"
          FROM "UnifiedCrmOpportunityDispatchLink" d
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = d."opportunityId"
          WHERE d."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
        ),
        ranked AS (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY "metricId" ORDER BY "updatedAt" DESC, id ASC) AS rank
          FROM metric_rows
        )
        SELECT "metricId", entity, id, label, href, "updatedAt"
        FROM ranked
        WHERE rank <= ${input.sampleLimit}
        ORDER BY "metricId" ASC, "updatedAt" DESC, id ASC
      `);
    }
  };
}
