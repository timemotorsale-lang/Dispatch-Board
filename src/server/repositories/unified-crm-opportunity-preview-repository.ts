import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmOpportunityRecordScope } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export type UnifiedCrmOpportunityPreviewRecord = {
  opportunityNumber: string;
  title: string;
  summary: string | null;
  organizationId: string;
  stage: UnifiedCrmOpportunityStage;
  nextActionLabel: string | null;
  nextActionDueAt: Date | null;
  version: number;
  ownerUser: { id: string; name: string } | null;
  customer: { id: string; displayName: string; customerNumber: string } | null;
  updatedAt: Date;
};

export type UnifiedCrmOpportunityPreviewRepository = {
  findPrimaryOpportunityPreview(input: {
    organizationId: string;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<UnifiedCrmOpportunityPreviewRecord | null>;
  listOpportunityPreviews(input: {
    customerId?: string | null;
    limit: number;
    organizationId: string;
    recordScope: UnifiedCrmOpportunityRecordScope;
  }): Promise<UnifiedCrmOpportunityPreviewRecord[]>;
};

type UnifiedCrmOpportunityPreviewDatabase = Pick<PrismaClient, "$queryRaw">;

type OpportunityPreviewRow = {
  opportunityNumber: string;
  title: string;
  summary: string | null;
  organizationId: string;
  stage: UnifiedCrmOpportunityStage;
  nextActionLabel: string | null;
  nextActionDueAt: Date | null;
  version: number;
  ownerUserId: string | null;
  ownerUserName: string | null;
  customerId: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  updatedAt: Date;
};

function mapRow(row: OpportunityPreviewRow): UnifiedCrmOpportunityPreviewRecord {
  return {
    opportunityNumber: row.opportunityNumber,
    title: row.title,
    summary: row.summary,
    organizationId: row.organizationId,
    stage: row.stage,
    nextActionLabel: row.nextActionLabel,
    nextActionDueAt: row.nextActionDueAt,
    version: row.version,
    ownerUser: row.ownerUserId && row.ownerUserName
      ? { id: row.ownerUserId, name: row.ownerUserName }
      : null,
    customer: row.customerId && row.customerDisplayName && row.customerNumber
      ? {
          id: row.customerId,
          displayName: row.customerDisplayName,
          customerNumber: row.customerNumber
        }
      : null,
    updatedAt: row.updatedAt
  };
}

function buildPreviewQuery(input: {
  customerId?: string | null;
  limit: number;
  organizationId: string;
  recordScope: UnifiedCrmOpportunityRecordScope;
}) {
  const scopeFilter = input.recordScope.kind === "OWNER"
    ? Prisma.sql`AND record."ownerUserId" = ${input.recordScope.ownerUserId}`
    : Prisma.empty;
  const customerFilter = input.customerId
    ? Prisma.sql`AND record."customerId" = ${input.customerId}`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      record."opportunityNumber",
      record."title",
      record."summary",
      record."organizationId",
      record."stage"::text AS "stage",
      record."nextActionLabel",
      record."nextActionDueAt",
      record."version",
      owner_user."id" AS "ownerUserId",
      owner_user."name" AS "ownerUserName",
      customer."id" AS "customerId",
      customer."displayName" AS "customerDisplayName",
      customer."customerNumber" AS "customerNumber",
      record."updatedAt"
    FROM "UnifiedCrmOpportunityRecord" AS record
    LEFT JOIN "User" AS owner_user
      ON owner_user."id" = record."ownerUserId"
    LEFT JOIN "Customer" AS customer
      ON customer."id" = record."customerId"
     AND customer."organizationId" = record."organizationId"
    WHERE record."organizationId" = ${input.organizationId}
      AND record."archivedAt" IS NULL
      ${scopeFilter}
      ${customerFilter}
    ORDER BY record."updatedAt" DESC, record."opportunityNumber" ASC
    LIMIT ${input.limit}
  `;
}

export function createUnifiedCrmOpportunityPreviewRepository(
  database: UnifiedCrmOpportunityPreviewDatabase = prisma
): UnifiedCrmOpportunityPreviewRepository {
  return {
    async findPrimaryOpportunityPreview(input) {
      const rows = await database.$queryRaw<OpportunityPreviewRow[]>(
        buildPreviewQuery({ ...input, limit: 1 })
      );

      const row = rows[0];
      return row ? mapRow(row) : null;
    },

    async listOpportunityPreviews(input) {
      const safeLimit = Math.max(1, Math.min(10, Math.trunc(input.limit)));
      const rows = await database.$queryRaw<OpportunityPreviewRow[]>(
        buildPreviewQuery({ ...input, limit: safeLimit })
      );
      return rows.map(mapRow);
    }
  };
}
