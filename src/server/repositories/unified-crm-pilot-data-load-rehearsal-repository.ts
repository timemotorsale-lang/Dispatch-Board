import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

export type UnifiedCrmPilotExistingKeySet = {
  customerNumbers: Set<string>;
  emails: Set<string>;
  opportunityTitles: Set<string>;
  phones: Set<string>;
  sourceReferences: Set<string>;
  stockNumbers: Set<string>;
  vins: Set<string>;
};

export type UnifiedCrmPilotDataLoadRehearsalRepository = {
  findExistingKeys(input: { organizationId: string; keys: string[] }): Promise<UnifiedCrmPilotExistingKeySet>;
  listActiveOrganizationIds(userId: string, at: Date): Promise<string[]>;
};

type UnifiedCrmPilotDataLoadRehearsalDatabase = Pick<PrismaClient, "$queryRaw" | "userLocationAccess">;

type ExistingKeyRow = {
  kind: keyof UnifiedCrmPilotExistingKeySet;
  value: string;
};

function emptyKeys(): UnifiedCrmPilotExistingKeySet {
  return {
    customerNumbers: new Set(),
    emails: new Set(),
    opportunityTitles: new Set(),
    phones: new Set(),
    sourceReferences: new Set(),
    stockNumbers: new Set(),
    vins: new Set()
  };
}

export function createUnifiedCrmPilotDataLoadRehearsalRepository(
  database: UnifiedCrmPilotDataLoadRehearsalDatabase = prisma
): UnifiedCrmPilotDataLoadRehearsalRepository {
  return {
    async findExistingKeys(input) {
      const keys = [...new Set(input.keys.filter(Boolean))];
      if (keys.length === 0) return emptyKeys();
      const rows = await database.$queryRaw<ExistingKeyRow[]>(Prisma.sql`
        WITH requested(value) AS (
          SELECT UNNEST(${keys}::text[])
        )
        SELECT 'customerNumbers'::text AS kind, c."customerNumber" AS value
        FROM "Customer" c
        JOIN requested r ON UPPER(c."customerNumber") = r.value
        WHERE c."organizationId" = ${input.organizationId}

        UNION ALL

        SELECT 'emails'::text AS kind, cp."normalizedValue" AS value
        FROM "CustomerContactPoint" cp
        JOIN "Customer" c ON c.id = cp."customerId"
        JOIN requested r ON UPPER(cp."normalizedValue") = r.value
        WHERE c."organizationId" = ${input.organizationId}
          AND cp.type = 'EMAIL'

        UNION ALL

        SELECT 'phones'::text AS kind, cp."normalizedValue" AS value
        FROM "CustomerContactPoint" cp
        JOIN "Customer" c ON c.id = cp."customerId"
        JOIN requested r ON cp."normalizedValue" = r.value
        WHERE c."organizationId" = ${input.organizationId}
          AND cp.type = 'PHONE'

        UNION ALL

        SELECT 'opportunityTitles'::text AS kind, UPPER(o.title) AS value
        FROM "UnifiedCrmOpportunityRecord" o
        JOIN requested r ON UPPER(o.title) = r.value
        WHERE o."organizationId" = ${input.organizationId}

        UNION ALL

        SELECT 'sourceReferences'::text AS kind, UPPER(o."opportunityNumber") AS value
        FROM "UnifiedCrmOpportunityRecord" o
        JOIN requested r ON UPPER(o."opportunityNumber") = r.value
        WHERE o."organizationId" = ${input.organizationId}

        UNION ALL

        SELECT 'stockNumbers'::text AS kind, UPPER(v."stockNumber") AS value
        FROM "Vehicle" v
        JOIN requested r ON UPPER(v."stockNumber") = r.value
        WHERE v."organizationId" = ${input.organizationId}
          AND v."stockNumber" IS NOT NULL

        UNION ALL

        SELECT 'vins'::text AS kind, UPPER(v.vin) AS value
        FROM "Vehicle" v
        JOIN requested r ON UPPER(v.vin) = r.value
        WHERE v."organizationId" = ${input.organizationId}
          AND v.vin IS NOT NULL
      `);
      return rows.reduce((sets, row) => {
        sets[row.kind].add(row.value);
        return sets;
      }, emptyKeys());
    },
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
    }
  };
}
