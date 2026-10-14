import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmQuoteRecordScope } from "@/server/unified-crm/quote-contract";

type QuoteOperationalHandoffDatabase = Pick<PrismaClient, "$queryRaw">;

export type UnifiedCrmQuoteOperationalHandoffRecord = {
  approvalAmountCents: number;
  approvalDiscountCents: number;
  approvalRequestId: string;
  approvalVersion: number;
  customerDisplayName: string | null;
  customerNumber: string | null;
  latestVersionNumber: number;
  opportunityNumber: string | null;
  quoteId: string;
  quoteNumber: string;
};

export type UnifiedCrmQuoteOperationalHandoffRepository = {
  loadApprovedQuote(input: {
    organizationId: string;
    quoteId: string;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmQuoteOperationalHandoffRecord | null>;
};

function visibleQuoteFilter(recordScope: UnifiedCrmQuoteRecordScope) {
  return recordScope.kind === "OWNER"
    ? Prisma.sql`AND (quote."createdByUserId" = ${recordScope.ownerUserId} OR opportunity."ownerUserId" = ${recordScope.ownerUserId})`
    : Prisma.empty;
}

export function createUnifiedCrmQuoteOperationalHandoffRepository(
  database: QuoteOperationalHandoffDatabase = prisma
): UnifiedCrmQuoteOperationalHandoffRepository {
  return {
    async loadApprovedQuote(input) {
      const rows = await database.$queryRaw<UnifiedCrmQuoteOperationalHandoffRecord[]>(Prisma.sql`
        SELECT
          quote."id" AS "quoteId",
          quote."quoteNumber",
          quote."latestVersionNumber",
          opportunity."opportunityNumber",
          customer."displayName" AS "customerDisplayName",
          customer."customerNumber",
          approval."id" AS "approvalRequestId",
          approval."amountCents" AS "approvalAmountCents",
          approval."discountCents" AS "approvalDiscountCents",
          approval."version" AS "approvalVersion"
        FROM "UnifiedCrmQuoteRecord" AS quote
        LEFT JOIN "UnifiedCrmOpportunityRecord" AS opportunity
          ON opportunity."id" = quote."opportunityId"
         AND opportunity."organizationId" = quote."organizationId"
        LEFT JOIN "Customer" AS customer
          ON customer."id" = quote."customerId"
         AND customer."organizationId" = quote."organizationId"
        INNER JOIN "UnifiedCrmCommercialApprovalRequest" AS approval
          ON approval."quoteId" = quote."id"
         AND approval."organizationId" = quote."organizationId"
         AND approval."quoteVersionNumber" = quote."latestVersionNumber"
         AND approval."status" = 'APPROVED'
        WHERE quote."id" = ${input.quoteId}
          AND quote."organizationId" = ${input.organizationId}
          AND quote."archivedAt" IS NULL
          ${visibleQuoteFilter(input.recordScope)}
        ORDER BY approval."updatedAt" DESC, approval."id" DESC
        LIMIT 1
      `);
      return rows[0] ?? null;
    }
  };
}
