import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";

function customer360Select(
  organizationId: string,
  recordScope: UnifiedCrmCustomerRecordScope
) {
  const ownerUserId = recordScope.kind === "OWNER" ? recordScope.ownerUserId : undefined;
  return {
    id: true,
    customerNumber: true,
    displayName: true,
    phoneNumber: true,
    email: true,
    status: true,
    preferredContactMethod: true,
    preferredContactTime: true,
    languageCode: true,
    lastInteractionAt: true,
    nextActionAt: true,
    createdAt: true,
    updatedAt: true,
    ownerUser: { select: { id: true, name: true } },
    contactPoints: {
      select: { type: true, value: true, isPrimary: true },
      orderBy: [{ isPrimary: "desc" as const }, { updatedAt: "desc" as const }, { id: "asc" as const }]
    },
    notes: {
      take: 10,
      orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
      select: {
        id: true,
        body: true,
        createdAt: true,
        visibility: true,
        authorUser: { select: { name: true } }
      }
    },
    vehicleRelationships: {
      where: { vehicle: { organizationId } },
      take: 12,
      orderBy: [{ effectiveFrom: "desc" as const }, { id: "desc" as const }],
      select: {
        relationshipType: true,
        effectiveFrom: true,
        effectiveTo: true,
        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            year: true,
            make: true,
            model: true,
            status: true
          }
        }
      }
    },
    appointmentParticipants: {
      where: { appointment: { organizationId } },
      take: 12,
      orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
      select: {
        appointment: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            bookingStatus: true,
            confirmationStatus: true,
            attendanceStatus: true
          }
        }
      }
    },
    leads: {
      where: { organizationId, ...(ownerUserId ? { ownerUserId } : {}) },
      take: 12,
      orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
      select: {
        id: true,
        leadNumber: true,
        stage: true,
        sourceCode: true,
        vehicleInterest: true,
        nextActionCode: true,
        nextActionAt: true,
        ownerUser: { select: { id: true, name: true } }
      }
    },
    concernCases: {
      where: { organizationId, ...(ownerUserId ? { assignedOwnerId: ownerUserId } : {}) },
      take: 12,
      orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
      select: {
        id: true,
        concernNumber: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        dueAt: true,
        resolutionDueAt: true,
        slaStage: true,
        assignedOwner: { select: { id: true, name: true } }
      }
    },
    unifiedCrmOpportunities: {
      where: {
        organizationId,
        archivedAt: null,
        ...(ownerUserId ? { ownerUserId } : {})
      },
      take: 5,
      orderBy: [{ updatedAt: "desc" as const }, { opportunityNumber: "asc" as const }],
      select: {
        opportunityNumber: true,
        stage: true,
        title: true,
        summary: true,
        organizationId: true,
        updatedAt: true,
        ownerUser: { select: { id: true, name: true } }
      }
    }
  } satisfies Prisma.CustomerSelect;
}

export type UnifiedCrmCustomer360Record = Prisma.CustomerGetPayload<{
  select: ReturnType<typeof customer360Select>;
}>;

export type UnifiedCrmCustomer360RepositoryInput = {
  customerId: string;
  organizationId: string;
  recordScope: UnifiedCrmCustomerRecordScope;
};

export type UnifiedCrmCustomer360OpportunityDispatchLinkRecord = {
  archivedAt: Date | null;
  opportunityNumber: string;
  repairJobId: string | null;
  repairJobNumberSnapshot: string | null;
  repairOrderId: string | null;
  repairOrderNumberSnapshot: string | null;
  targetKind: string;
  targetVersionSnapshot: number;
  titleSnapshot: string;
};

export type UnifiedCrmCustomer360OpportunityQuoteLinkRecord = {
  approvalAmountCents: number | null;
  approvalDiscountCents: number | null;
  approvalStatus: "PENDING" | "APPROVED" | "RETURNED" | "DENIED" | null;
  latestVersionNumber: number;
  opportunityNumber: string;
  quoteId: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
};

export type UnifiedCrmCustomer360Repository = {
  findCustomer(input: UnifiedCrmCustomer360RepositoryInput): Promise<UnifiedCrmCustomer360Record | null>;
  listOpportunityDispatchLinks(input: UnifiedCrmCustomer360RepositoryInput): Promise<UnifiedCrmCustomer360OpportunityDispatchLinkRecord[]>;
  listOpportunityQuoteLinks(input: UnifiedCrmCustomer360RepositoryInput): Promise<UnifiedCrmCustomer360OpportunityQuoteLinkRecord[]>;
};

export function createUnifiedCrmCustomer360Repository(
  database: Pick<PrismaClient, "$queryRaw" | "customer"> = prisma
): UnifiedCrmCustomer360Repository {
  return {
    findCustomer(input) {
      return database.customer.findFirst({
        where: {
          id: input.customerId,
          organizationId: input.organizationId,
          archivedAt: null,
          mergedIntoCustomerId: null,
          status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] },
          ...(input.recordScope.kind === "OWNER"
            ? { ownerUserId: input.recordScope.ownerUserId }
            : {})
        },
        select: customer360Select(input.organizationId, input.recordScope)
      });
    },
    listOpportunityDispatchLinks(input) {
      const ownerFilter = input.recordScope.kind === "OWNER"
        ? Prisma.sql`AND opportunity."ownerUserId" = ${input.recordScope.ownerUserId}`
        : Prisma.empty;
      return database.$queryRaw<UnifiedCrmCustomer360OpportunityDispatchLinkRecord[]>(Prisma.sql`
        SELECT
          opportunity."opportunityNumber",
          link."targetKind",
          link."repairOrderId",
          link."repairJobId",
          link."repairOrderNumberSnapshot",
          link."repairJobNumberSnapshot",
          link."titleSnapshot",
          link."targetVersionSnapshot",
          link."archivedAt"
        FROM "UnifiedCrmOpportunityDispatchLink" AS link
        INNER JOIN "UnifiedCrmOpportunityRecord" AS opportunity
          ON opportunity."id" = link."opportunityId"
         AND opportunity."organizationId" = link."organizationId"
        WHERE opportunity."organizationId" = ${input.organizationId}
          AND opportunity."customerId" = ${input.customerId}
          AND opportunity."archivedAt" IS NULL
          ${ownerFilter}
        ORDER BY link."createdAt" DESC, link."id" DESC
        LIMIT 40
      `);
    },
    listOpportunityQuoteLinks(input) {
      const ownerFilter = input.recordScope.kind === "OWNER"
        ? Prisma.sql`AND opportunity."ownerUserId" = ${input.recordScope.ownerUserId}`
        : Prisma.empty;
      return database.$queryRaw<UnifiedCrmCustomer360OpportunityQuoteLinkRecord[]>(Prisma.sql`
        SELECT
          opportunity."opportunityNumber",
          quote."id" AS "quoteId",
          quote."quoteNumber",
          quote."state"::text AS "state",
          quote."latestVersionNumber",
          approval."status"::text AS "approvalStatus",
          approval."amountCents" AS "approvalAmountCents",
          approval."discountCents" AS "approvalDiscountCents"
        FROM "UnifiedCrmQuoteRecord" AS quote
        INNER JOIN "UnifiedCrmOpportunityRecord" AS opportunity
          ON opportunity."id" = quote."opportunityId"
         AND opportunity."organizationId" = quote."organizationId"
        LEFT JOIN LATERAL (
          SELECT request."status", request."amountCents", request."discountCents"
          FROM "UnifiedCrmCommercialApprovalRequest" AS request
          WHERE request."organizationId" = quote."organizationId"
            AND request."quoteId" = quote."id"
          ORDER BY request."updatedAt" DESC, request."id" DESC
          LIMIT 1
        ) AS approval ON TRUE
        WHERE opportunity."organizationId" = ${input.organizationId}
          AND opportunity."customerId" = ${input.customerId}
          AND opportunity."archivedAt" IS NULL
          AND quote."archivedAt" IS NULL
          ${ownerFilter}
        ORDER BY quote."updatedAt" DESC, quote."quoteNumber" ASC
        LIMIT 40
      `);
    }
  };
}
