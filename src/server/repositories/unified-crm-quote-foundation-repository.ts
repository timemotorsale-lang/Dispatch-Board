import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmQuoteRecordScope } from "@/server/unified-crm/quote-contract";

export type UnifiedCrmQuoteFoundationRecord = {
  customerId: string | null;
  id: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  latestVersionNumber: number;
  organizationId: string;
  priceSource: string;
  opportunityNumber: string | null;
  opportunityId: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  latestDraftSnapshot: Prisma.JsonValue;
  termsSnapshot: Prisma.JsonValue;
  currency: string;
  updatedAt: Date;
};

export type UnifiedCrmQuoteFoundationRepository = {
  loadVisibleDraftWorkspace(input: {
    organizationId: string;
    quoteId: string | null;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmQuoteVisibleDraftWorkspace | null>;
  listRecentQuotes(input: {
    limit: number;
    organizationId: string;
    recordScope: UnifiedCrmQuoteRecordScope;
  }): Promise<UnifiedCrmQuoteFoundationRecord[]>;
};

export type UnifiedCrmQuoteVisibleDraftVersionRecord = {
  id: string;
  versionNumber: number;
  state: "DRAFT" | "PRESENTED" | "SUPERSEDED";
  createdAt: Date;
  presentedAt: Date | null;
  lineItemsSnapshot: Prisma.JsonValue;
  totalsSnapshot: Prisma.JsonValue;
};

export type UnifiedCrmQuoteVisibleDraftWorkspace = {
  currency: string;
  customerId: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  id: string;
  latestDraftSnapshot: Prisma.JsonValue;
  latestVersionNumber: number;
  opportunityId: string | null;
  opportunityNumber: string | null;
  presentedVersionId: string | null;
  priceSource: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  termsSnapshot: Prisma.JsonValue;
  updatedAt: Date;
  versions: UnifiedCrmQuoteVisibleDraftVersionRecord[];
};

type UnifiedCrmQuoteFoundationDatabase = Pick<PrismaClient, "$queryRaw" | "unifiedCrmQuoteRecord">;

type QuoteRow = {
  customerId: string | null;
  id: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  latestVersionNumber: number;
  organizationId: string;
  priceSource: string;
  opportunityNumber: string | null;
  opportunityId: string | null;
  customerDisplayName: string | null;
  customerNumber: string | null;
  latestDraftSnapshot: Prisma.JsonValue;
  termsSnapshot: Prisma.JsonValue;
  currency: string;
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
      record."id",
      record."customerId",
      record."opportunityId",
      record."currency",
      record."priceSource",
      record."termsSnapshot",
      record."latestDraftSnapshot",
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
    async loadVisibleDraftWorkspace(input) {
      const record = await database.unifiedCrmQuoteRecord.findFirst({
        where: {
          organizationId: input.organizationId,
          archivedAt: null,
          ...(input.quoteId ? { id: input.quoteId } : {}),
          ...(input.recordScope.kind === "OWNER"
            ? {
                OR: [
                  { createdByUserId: input.recordScope.ownerUserId },
                  {
                    opportunity: {
                      is: {
                        ownerUserId: input.recordScope.ownerUserId,
                        organizationId: input.organizationId
                      }
                    }
                  }
                ]
              }
            : {})
        },
        include: {
          customer: {
            select: {
              customerNumber: true,
              displayName: true,
              id: true
            }
          },
          opportunity: {
            select: {
              id: true,
              opportunityNumber: true
            }
          },
          versions: {
            orderBy: [{ versionNumber: "desc" }],
            select: {
              id: true,
              versionNumber: true,
              state: true,
              createdAt: true,
              presentedAt: true,
              lineItemsSnapshot: true,
              totalsSnapshot: true
            },
            take: 8
          }
        },
        orderBy: [{ updatedAt: "desc" }, { quoteNumber: "asc" }]
      });
      if (!record) return null;
      return {
        currency: record.currency,
        customerDisplayName: record.customer?.displayName ?? null,
        customerId: record.customerId,
        customerNumber: record.customer?.customerNumber ?? null,
        id: record.id,
        latestDraftSnapshot: record.latestDraftSnapshot,
        latestVersionNumber: record.latestVersionNumber,
        opportunityId: record.opportunityId,
        opportunityNumber: record.opportunity?.opportunityNumber ?? null,
        presentedVersionId: record.presentedVersionId,
        priceSource: record.priceSource,
        quoteNumber: record.quoteNumber,
        state: record.state === "PRESENTED" ? "PRESENTED" : "DRAFT",
        termsSnapshot: record.termsSnapshot,
        updatedAt: record.updatedAt,
        versions: record.versions
      };
    },
    async listRecentQuotes(input) {
      const safeLimit = Math.max(1, Math.min(8, Math.trunc(input.limit)));
      return database.$queryRaw<QuoteRow[]>(buildQuery({ ...input, limit: safeLimit }));
    }
  };
}
