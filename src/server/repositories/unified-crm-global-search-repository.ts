import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import type { UnifiedCrmGlobalSearchEntity } from "@/server/unified-crm/global-search-contract";

export type UnifiedCrmGlobalSearchRepositoryRow = {
  entity: UnifiedCrmGlobalSearchEntity;
  id: string;
  label: string;
  secondary: string | null;
  href: string;
  matchedOn: string;
  updatedAt: Date | null;
};

export type UnifiedCrmGlobalSearchRepositoryQuery = {
  limit: number;
  organizationId: string;
  q: string;
  recordScope: UnifiedCrmCustomerRecordScope;
  viewerUserId: string;
};

export type UnifiedCrmGlobalSearchRepository = {
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
  search(input: UnifiedCrmGlobalSearchRepositoryQuery): Promise<UnifiedCrmGlobalSearchRepositoryRow[]>;
};

type UnifiedCrmGlobalSearchDatabase = Pick<PrismaClient, "$queryRaw" | "userLocationAccess">;

function scopePredicate(alias: string, scope: UnifiedCrmCustomerRecordScope, viewerUserId: string) {
  if (scope.kind === "ORGANIZATION") return Prisma.sql`TRUE`;
  return Prisma.sql`(${Prisma.raw(alias)}."ownerUserId" = ${viewerUserId})`;
}

function searchPattern(q: string) {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`;
}

function matchPredicate(fields: Prisma.Sql[], pattern: string) {
  return Prisma.join(fields.map((field) => Prisma.sql`${field} ILIKE ${pattern} ESCAPE '\'`), " OR ");
}

export function createUnifiedCrmGlobalSearchRepository(
  database: UnifiedCrmGlobalSearchDatabase = prisma
): UnifiedCrmGlobalSearchRepository {
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
    async search(input) {
      const pattern = searchPattern(input.q);
      const customerScope = scopePredicate("c", input.recordScope, input.viewerUserId);
      const opportunityScope = scopePredicate("o", input.recordScope, input.viewerUserId);
      const quoteScope = input.recordScope.kind === "ORGANIZATION"
        ? Prisma.sql`TRUE`
        : Prisma.sql`(o."ownerUserId" = ${input.viewerUserId} OR c."ownerUserId" = ${input.viewerUserId} OR q."createdByUserId" = ${input.viewerUserId})`;
      const vehicleScope = input.recordScope.kind === "ORGANIZATION"
        ? Prisma.sql`TRUE`
        : Prisma.sql`(c."ownerUserId" = ${input.viewerUserId} OR o."ownerUserId" = ${input.viewerUserId})`;
      const linkScope = input.recordScope.kind === "ORGANIZATION"
        ? Prisma.sql`TRUE`
        : Prisma.sql`(o."ownerUserId" = ${input.viewerUserId})`;

      return database.$queryRaw<UnifiedCrmGlobalSearchRepositoryRow[]>(Prisma.sql`
        WITH results AS (
          SELECT
            'customer'::text AS entity,
            c.id,
            c."displayName" AS label,
            c."customerNumber" AS secondary,
            '/crm/customers/' || c.id AS href,
            CASE
              WHEN c."customerNumber" ILIKE ${pattern} ESCAPE '\' THEN 'customer number'
              ELSE 'customer name'
            END AS "matchedOn",
            c."updatedAt"
          FROM "Customer" c
          WHERE c."organizationId" = ${input.organizationId}
            AND c."archivedAt" IS NULL
            AND c."mergedIntoCustomerId" IS NULL
            AND ${customerScope}
            AND (${matchPredicate([Prisma.sql`c."displayName"`, Prisma.sql`c."customerNumber"`], pattern)})

          UNION ALL

          SELECT
            'contact'::text AS entity,
            cp.id,
            c."displayName" AS label,
            cp.type || ' contact' AS secondary,
            '/crm/customers/' || c.id AS href,
            lower(cp.type) || ' contact' AS "matchedOn",
            cp."updatedAt"
          FROM "CustomerContactPoint" cp
          JOIN "Customer" c ON c.id = cp."customerId"
          WHERE c."organizationId" = ${input.organizationId}
            AND c."archivedAt" IS NULL
            AND c."mergedIntoCustomerId" IS NULL
            AND ${customerScope}
            AND cp."normalizedValue" ILIKE ${pattern} ESCAPE '\'

          UNION ALL

          SELECT
            'opportunity'::text AS entity,
            o.id,
            o.title AS label,
            o."opportunityNumber" AS secondary,
            '/crm/opportunities/' || o.id AS href,
            CASE
              WHEN o."opportunityNumber" ILIKE ${pattern} ESCAPE '\' THEN 'opportunity number'
              ELSE 'opportunity title'
            END AS "matchedOn",
            o."updatedAt"
          FROM "UnifiedCrmOpportunityRecord" o
          WHERE o."organizationId" = ${input.organizationId}
            AND o."archivedAt" IS NULL
            AND ${opportunityScope}
            AND (${matchPredicate([Prisma.sql`o.title`, Prisma.sql`o."opportunityNumber"`], pattern)})

          UNION ALL

          SELECT
            'quote'::text AS entity,
            q.id,
            q."quoteNumber" AS label,
            COALESCE(o."opportunityNumber", c."customerNumber", q.state::text) AS secondary,
            '/crm/quotes?quoteId=' || q.id AS href,
            'quote number' AS "matchedOn",
            q."updatedAt"
          FROM "UnifiedCrmQuoteRecord" q
          LEFT JOIN "UnifiedCrmOpportunityRecord" o ON o.id = q."opportunityId"
          LEFT JOIN "Customer" c ON c.id = q."customerId"
          WHERE q."organizationId" = ${input.organizationId}
            AND q."archivedAt" IS NULL
            AND ${quoteScope}
            AND q."quoteNumber" ILIKE ${pattern} ESCAPE '\'

          UNION ALL

          SELECT
            'task'::text AS entity,
            t.id,
            t.title AS label,
            l."titleSnapshot" AS secondary,
            '/tasks/' || t.id AS href,
            'task' AS "matchedOn",
            GREATEST(t."updatedAt", l."updatedAt") AS "updatedAt"
          FROM "UnifiedCrmOpportunityTaskLink" l
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = l."opportunityId"
          JOIN "Task" t ON t.id = l."taskId"
          WHERE l."organizationId" = ${input.organizationId}
            AND l."archivedAt" IS NULL
            AND ${linkScope}
            AND (${matchPredicate([Prisma.sql`t.title`, Prisma.sql`l."titleSnapshot"`, Prisma.sql`t."vehicleReference"`, Prisma.sql`t."customerReference"`], pattern)})

          UNION ALL

          SELECT
            'appointment'::text AS entity,
            a.id,
            a.title AS label,
            a."appointmentNumber" AS secondary,
            '/appointments/' || a.id AS href,
            'appointment' AS "matchedOn",
            GREATEST(a."updatedAt", l."updatedAt") AS "updatedAt"
          FROM "UnifiedCrmOpportunityAppointmentLink" l
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = l."opportunityId"
          JOIN "Appointment" a ON a.id = l."appointmentId"
          WHERE l."organizationId" = ${input.organizationId}
            AND l."archivedAt" IS NULL
            AND ${linkScope}
            AND (${matchPredicate([Prisma.sql`a.title`, Prisma.sql`a."appointmentNumber"`, Prisma.sql`l."titleSnapshot"`], pattern)})

          UNION ALL

          SELECT
            'vehicle'::text AS entity,
            v.id,
            trim(COALESCE(v.year::text || ' ', '') || COALESCE(v.make || ' ', '') || COALESCE(v.model, 'Vehicle')) AS label,
            COALESCE(v."stockNumber", v.vin, v."vehicleNumber") AS secondary,
            '/vehicles/' || v.id AS href,
            'vehicle identifier' AS "matchedOn",
            v."updatedAt"
          FROM "Vehicle" v
          LEFT JOIN "CustomerVehicle" cv ON cv."vehicleId" = v.id AND cv."effectiveTo" IS NULL
          LEFT JOIN "Customer" c ON c.id = cv."customerId"
          LEFT JOIN "UnifiedCrmOpportunityRecord" o ON o."customerId" = c.id
          WHERE v."organizationId" = ${input.organizationId}
            AND v."mergedIntoVehicleId" IS NULL
            AND ${vehicleScope}
            AND (${matchPredicate([Prisma.sql`v."vehicleNumber"`, Prisma.sql`v.vin`, Prisma.sql`v."stockNumber"`, Prisma.sql`v.make`, Prisma.sql`v.model`], pattern)})

          UNION ALL

          SELECT
            'dispatch'::text AS entity,
            l.id,
            l."titleSnapshot" AS label,
            COALESCE(l."repairOrderNumberSnapshot", l."repairJobNumberSnapshot", l."targetKind") AS secondary,
            COALESCE('/repair-orders/' || l."repairOrderId", '/repair-jobs/' || l."repairJobId", '/crm/opportunities/' || o.id) AS href,
            'dispatch identifier' AS "matchedOn",
            l."updatedAt"
          FROM "UnifiedCrmOpportunityDispatchLink" l
          JOIN "UnifiedCrmOpportunityRecord" o ON o.id = l."opportunityId"
          WHERE l."organizationId" = ${input.organizationId}
            AND l."archivedAt" IS NULL
            AND ${linkScope}
            AND (${matchPredicate([Prisma.sql`l."titleSnapshot"`, Prisma.sql`l."repairOrderNumberSnapshot"`, Prisma.sql`l."repairJobNumberSnapshot"`], pattern)})
        )
        SELECT entity, id, label, secondary, href, "matchedOn", "updatedAt"
        FROM results
        ORDER BY
          CASE entity
            WHEN 'customer' THEN 1
            WHEN 'contact' THEN 2
            WHEN 'opportunity' THEN 3
            WHEN 'quote' THEN 4
            WHEN 'task' THEN 5
            WHEN 'appointment' THEN 6
            WHEN 'vehicle' THEN 7
            ELSE 8
          END,
          "updatedAt" DESC NULLS LAST,
          id ASC
        LIMIT ${input.limit}
      `);
    }
  };
}
