import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export type UnifiedCrmOpportunityDetailRecord = {
  id: string;
  organizationId: string;
  opportunityNumber: string;
  title: string;
  summary: string | null;
  customer: {
    id: string;
    displayName: string;
    customerNumber: string;
  } | null;
  ownerUser: {
    id: string;
    name: string;
  } | null;
  stage: UnifiedCrmOpportunityStage;
  nextActionLabel: string | null;
  nextActionDueAt: Date | null;
  version: number;
  sourceLead: {
    id: string;
    leadNumber: string;
    stage: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UnifiedCrmOpportunityDetailRepository = {
  findOpportunityDetail(input: {
    opportunityId: string;
    organizationId: string;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<UnifiedCrmOpportunityDetailRecord | null>;
};

type UnifiedCrmOpportunityDetailDatabase = Pick<PrismaClient, "$queryRaw">;

type OpportunityRow = {
  id: string;
  organizationId: string;
  opportunityNumber: string;
  title: string;
  summary: string | null;
  customerId: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  ownerUserId: string | null;
  ownerUserName: string | null;
  sourceLeadId: string | null;
  sourceLeadNumber: string | null;
  sourceLeadStage: string | null;
  stage: UnifiedCrmOpportunityStage;
  nextActionLabel: string | null;
  nextActionDueAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: OpportunityRow): UnifiedCrmOpportunityDetailRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityNumber: row.opportunityNumber,
    title: row.title,
    summary: row.summary,
    customer: row.customerId && row.customerDisplayName && row.customerNumber
      ? {
          id: row.customerId,
          displayName: row.customerDisplayName,
          customerNumber: row.customerNumber
        }
      : null,
    ownerUser: row.ownerUserId && row.ownerUserName
      ? {
          id: row.ownerUserId,
          name: row.ownerUserName
        }
      : null,
    stage: row.stage,
    nextActionLabel: row.nextActionLabel,
    nextActionDueAt: row.nextActionDueAt,
    version: row.version,
    sourceLead: row.sourceLeadId && row.sourceLeadNumber && row.sourceLeadStage
      ? {
          id: row.sourceLeadId,
          leadNumber: row.sourceLeadNumber,
          stage: row.sourceLeadStage
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function createUnifiedCrmOpportunityDetailRepository(
  database: UnifiedCrmOpportunityDetailDatabase = prisma
): UnifiedCrmOpportunityDetailRepository {
  return {
    async findOpportunityDetail(input) {
      const scopeFilter = input.recordScope.kind === "OWNER"
        ? Prisma.sql`AND record."ownerUserId" = ${input.recordScope.ownerUserId}`
        : Prisma.empty;

      const rows = await database.$queryRaw<OpportunityRow[]>(Prisma.sql`
        SELECT
          record."id",
          record."organizationId",
          record."opportunityNumber",
          record."title",
          record."summary",
          record."stage"::text AS "stage",
          record."nextActionLabel",
          record."nextActionDueAt",
          record."version",
          customer."id" AS "customerId",
          customer."displayName" AS "customerDisplayName",
          customer."customerNumber" AS "customerNumber",
          owner_user."id" AS "ownerUserId",
          owner_user."name" AS "ownerUserName",
          source_lead."id" AS "sourceLeadId",
          source_lead."leadNumber" AS "sourceLeadNumber",
          source_lead."stage"::text AS "sourceLeadStage",
          record."createdAt",
          record."updatedAt"
        FROM "UnifiedCrmOpportunityRecord" AS record
        LEFT JOIN "Customer" AS customer
          ON customer."id" = record."customerId"
         AND customer."organizationId" = record."organizationId"
        LEFT JOIN "User" AS owner_user
          ON owner_user."id" = record."ownerUserId"
        LEFT JOIN "CustomerLead" AS source_lead
          ON source_lead."id" = record."sourceLeadId"
         AND source_lead."organizationId" = record."organizationId"
        WHERE record."organizationId" = ${input.organizationId}
          AND record."opportunityNumber" = ${input.opportunityId}
          AND record."archivedAt" IS NULL
          ${scopeFilter}
        LIMIT 1
      `);

      const row = rows[0];
      return row ? mapRow(row) : null;
    }
  };
}
