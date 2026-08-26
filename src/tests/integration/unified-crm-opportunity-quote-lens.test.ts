import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-044 opportunity quote lens runtime proof", () => {
  it("shows quote and approval state on Opportunity Detail and Customer 360 without presentation authority", async () => {
    const [{ prisma }, { getUnifiedCrmOpportunityDetail }, { getUnifiedCrmCustomer360 }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-detail-service"),
      import("@/server/services/unified-crm-customer-360-service")
    ]);
    const prefix = `ucrm-quote-lens-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const quoteId = `${prefix}-quote`;
    const approvalRequestId = `${prefix}-approval`;
    const now = new Date("2026-08-26T21:00:00.000Z");
    const manager = {
      id: managerId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    const seller = {
      id: sellerId,
      name: `${prefix} Seller`,
      email: `${prefix}-seller@example.test`,
      isActive: true,
      roles: ["Salesperson"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    const scopeRepository = { async listActiveOrganizationIds() { return [organizationId]; } };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: managerId, name: manager.name, email: manager.email, passwordHash: "integration-test-only" },
        { id: sellerId, name: seller.name, email: seller.email, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.createMany({ data: [
        { userId: managerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: sellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true }
      ] });
      await prisma.customer.create({
        data: {
          id: customerId,
          organizationId,
          customerNumber: "CUS-UCRM-044",
          displayName: `${prefix} Customer`,
          ownerUserId: sellerId,
          sourceCode: "UCRM_INTEGRATION_TEST"
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_044",
          title: "Quote lens opportunity",
          summary: "Proves quote history on opportunity and customer read models.",
          nextActionLabel: "Review quote approval state",
          nextActionDueAt: new Date("2026-08-27T21:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        }
      });
      await prisma.unifiedCrmQuoteRecord.create({
        data: {
          id: quoteId,
          organizationId,
          quoteNumber: "Q-UCRM-044",
          opportunityId,
          customerId,
          createdByUserId: sellerId,
          latestVersionNumber: 2,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Valid for 5 days." },
          latestDraftSnapshot: {
            lineItems: [{ description: "Quote lens package", quantity: 1, taxable: true, unitPriceCents: 52500 }],
            totals: { subtotalCents: 52500, totalCents: 54331 }
          },
          createdAt: now,
          updatedAt: now
        }
      });
      await prisma.unifiedCrmQuoteVersion.create({
        data: {
          quoteId,
          organizationId,
          versionNumber: 2,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Valid for 5 days." },
          totalsSnapshot: { subtotalCents: 52500, totalCents: 54331 },
          lineItemsSnapshot: [{ description: "Quote lens package", quantity: 1, taxable: true, unitPriceCents: 52500 }],
          createdByUserId: sellerId,
          createdAt: now
        }
      });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmCommercialApprovalRequest" (
          "id", "organizationId", "quoteId", "quoteVersionNumber", "requestedByUserId", "status", "purpose",
          "amountCents", "discountCents", "reason", "policySnapshot", "requestSnapshot", "version", "createdAt", "updatedAt"
        )
        VALUES (
          ${approvalRequestId}, ${organizationId}, ${quoteId}, 2, ${sellerId}, 'PENDING', 'Manager approval before presentation',
          54331, 2500, 'Runtime proof request.', '{"decision":"UCRM-DEC-004"}'::jsonb, '{"quote":"Q-UCRM-044"}'::jsonb, 1, ${now}, ${now}
        )
      `;

      const detail = await getUnifiedCrmOpportunityDetail(seller, "opp_ucrm_044", { mode: "REVIEW", now: () => now, scopeRepository });
      const customer360 = await getUnifiedCrmCustomer360(seller, customerId, { readMode: "REVIEW", now: () => now, scopeRepository });

      expect(detail.quoteActivity).toMatchObject({
        state: "READY",
        links: [{
          approvalAmountCents: 54331,
          approvalDiscountCents: 2500,
          approvalRequestId,
          approvalStatus: "PENDING",
          latestVersionNumber: 2,
          quoteId,
          quoteNumber: "Q-UCRM-044",
          state: "DRAFT"
        }]
      });
      expect(detail.quoteActivity?.links[0].requestApprovalHref).toBe(`/api/crm/v1/quotes/${encodeURIComponent(quoteId)}/commercial-approvals`);
      expect(customer360.opportunityLensObservation).toMatchObject({ quoteLinkCount: 1, visibleRecordCount: 1 });
      expect(customer360.opportunityLenses).toMatchObject([{
        quoteCount: 1,
        quoteLinks: [{
          approvalAmountCents: 54331,
          approvalStatus: "PENDING",
          latestVersionNumber: 2,
          quoteNumber: "Q-UCRM-044"
        }]
      }]);
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalDecision" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalRequest" WHERE "organizationId" = ${organizationId}`;
      await prisma.unifiedCrmQuoteVersion.deleteMany({ where: { organizationId } });
      await prisma.unifiedCrmQuoteRecord.deleteMany({ where: { organizationId } });
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customer.deleteMany({ where: { organizationId } });
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
