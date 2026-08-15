import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmQuoteRecordScope } from "@/server/unified-crm/quote-contract";

export type UnifiedCrmQuoteFoundationRecord = {
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  latestVersionNumber: number;
  organizationId: string;
  opportunityNumber: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  updatedAt: Date;
};

export type UnifiedCrmQuoteFoundationRepository = {
  listRecentQuotes(input: {
    limit: number;
    organizationId: string;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmQuoteFoundationRecord[]>;
};

type UnifiedCrmQuoteFoundationDatabase = Pick<PrismaClient, "$queryRaw">;

type QuoteRow = {
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  latestVersionNumber: number;
  organizationId: string;
  opportunityNumber: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  updatedAt: Date;
};

function buildQuery(input: {
  limit: number;
  organizationId: string;
  recordScope: UnifiedCrmQuoteRecordScope;
}) {
  const scopeFilter = input.recordScope.kind === "OWNER"
    ? Prisma.sql`AND (record."createdByUserId" = ${input.recordScope.ownerUserId} OR opportunity."ownerUserId" = ${input.recordScope.ownerUserId})`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      record."quoteNumber",
      record."state",
      record."latestVersionNumber",
      record."organizationId",
      opportunity."opportunityNumber",
      customer."displayName" AS "customerDisplayName",
      customer."customerNumber" AS "customerNumber",
      record."updatedAt"
    FROM "UnifiedCrmQuoteRecord" AS record
    LEFT JOIN "UnifiedCrmOpportunityRecord" AS opportunity
      ON opportunity."id" = record."opportunityId"
     AND opportunity."organizationId" = record."organizationId"
    LEFT JOIN "Customer" AS customer
      ON customer."id" = record."customerId"
     AND customer."organizationId" = record."organizationId"
    WHERE record."organizationId" = ${input.organizationId}
      AND record."archivedAt" IS NULL
      ${scopeFilter}
    ORDER BY record."updatedAt" DESC, record."quoteNumber" ASC
    LIMIT ${input.limit}
  `;
}

export function createUnifiedCrmQuoteFoundationRepository(
  database: UnifiedCrmQuoteFoundationDatabase = prisma
): UnifiedCrmQuoteFoundationRepository {
  return {
    async listRecentQuotes(input) {
      const safeLimit = Math.max(1, Math.min(8, Math.trunc(input.limit)));
      return database.$queryRaw<QuoteRow[]>(buildQuery({ ...input, limit: safeLimit }));
    }
  };
}
