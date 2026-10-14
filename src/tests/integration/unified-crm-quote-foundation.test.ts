import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-040 quote foundation runtime proof", () => {
  it("reads persisted quote history through manager and owner scopes without enabling presentation", async () => {
    const [{ prisma }, { getUnifiedCrmQuoteFoundation }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-quote-foundation-service")
    ]);
    const prefix = `ucrm-quote-foundation-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const otherSellerId = `${prefix}-other-seller`;
    const customerId = `${prefix}-customer`;
    const otherCustomerId = `${prefix}-other-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const otherOpportunityId = `${prefix}-other-opportunity`;
    const quoteId = `${prefix}-quote`;
    const otherQuoteId = `${prefix}-other-quote`;
    const now = new Date("2026-08-26T18:00:00.000Z");
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
        { id: sellerId, name: seller.name, email: seller.email, passwordHash: "integration-test-only" },
        { id: otherSellerId, name: `${prefix} Other Seller`, email: `${prefix}-other@example.test`, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.createMany({ data: [
        { userId: managerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: sellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: otherSellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true }
      ] });
      await prisma.customer.createMany({ data: [
        { id: customerId, organizationId, customerNumber: "CUS-UCRM-040-A", displayName: `${prefix} Customer`, ownerUserId: sellerId, sourceCode: "UCRM_INTEGRATION_TEST" },
        { id: otherCustomerId, organizationId, customerNumber: "CUS-UCRM-040-B", displayName: `${prefix} Other Customer`, ownerUserId: otherSellerId, sourceCode: "UCRM_INTEGRATION_TEST" }
      ] });
      await prisma.unifiedCrmOpportunityRecord.createMany({ data: [
        {
          id: opportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_040_owned",
          title: "Owned quote foundation proof",
          summary: "Proves owner-scoped quote visibility.",
          nextActionLabel: "Review owned quote",
          nextActionDueAt: new Date("2026-08-27T18:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        },
        {
          id: otherOpportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_040_other",
          title: "Other seller quote foundation proof",
          summary: "Proves organization-scoped quote visibility.",
          nextActionLabel: "Review other quote",
          nextActionDueAt: new Date("2026-08-27T18:30:00.000Z"),
          createdByUserId: managerId,
          customerId: otherCustomerId,
          ownerUserId: otherSellerId,
          version: 1
        }
      ] });
      await prisma.unifiedCrmQuoteRecord.createMany({ data: [
        {
          id: quoteId,
          organizationId,
          quoteNumber: "Q-UCRM-040-A",
          opportunityId,
          customerId,
          createdByUserId: sellerId,
          latestVersionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { summary: "Valid for 7 days." },
          latestDraftSnapshot: {
            lineItems: [{ description: "Brake service", quantity: 1, unitPriceCents: 42500 }],
            totals: { subtotalCents: 42500, totalCents: 42500 }
          },
          createdAt: now,
          updatedAt: now
        },
        {
          id: otherQuoteId,
          organizationId,
          quoteNumber: "Q-UCRM-040-B",
          opportunityId: otherOpportunityId,
          customerId: otherCustomerId,
          createdByUserId: otherSellerId,
          latestVersionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Vendor estimate",
          termsSnapshot: { summary: "Due on receipt." },
          latestDraftSnapshot: {
            lineItems: [{ description: "Detail package", quantity: 1, unitPriceCents: 18000 }],
            totals: { subtotalCents: 18000, totalCents: 18000 }
          },
          createdAt: new Date("2026-08-26T17:50:00.000Z"),
          updatedAt: new Date("2026-08-26T17:50:00.000Z")
        }
      ] });
      await prisma.unifiedCrmQuoteVersion.createMany({ data: [
        {
          quoteId,
          organizationId,
          versionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { summary: "Valid for 7 days." },
          totalsSnapshot: { subtotalCents: 42500, totalCents: 42500 },
          lineItemsSnapshot: [{ description: "Brake service", quantity: 1, unitPriceCents: 42500 }],
          createdByUserId: sellerId,
          createdAt: now
        },
        {
          quoteId: otherQuoteId,
          organizationId,
          versionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Vendor estimate",
          termsSnapshot: { summary: "Due on receipt." },
          totalsSnapshot: { subtotalCents: 18000, totalCents: 18000 },
          lineItemsSnapshot: [{ description: "Detail package", quantity: 1, unitPriceCents: 18000 }],
          createdByUserId: otherSellerId,
          createdAt: new Date("2026-08-26T17:50:00.000Z")
        }
      ] });

      const managerModel = await getUnifiedCrmQuoteFoundation(manager, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository,
        selectedQuoteId: quoteId
      });
      const sellerModel = await getUnifiedCrmQuoteFoundation(seller, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository,
        selectedQuoteId: quoteId
      });

      expect(managerModel).toMatchObject({
        commands: {
          draft: { available: true, state: "READY" },
          present: { available: false, state: "HELD" }
        },
        liveObservation: { state: "READY", visibleRecordCount: 2 },
        state: "HELD_REVIEW",
        visibility: "organization"
      });
      expect(managerModel.visibleQuotes.map((quote) => quote.quoteNumber)).toEqual(["Q-UCRM-040-A", "Q-UCRM-040-B"]);
      expect(sellerModel).toMatchObject({
        commands: {
          draft: { available: true, state: "READY" },
          present: { available: false, state: "HELD" }
        },
        draftWorkspace: {
          mode: "REVISE",
          quoteId,
          quoteNumber: "Q-UCRM-040-A",
          subtotalCents: 42500,
          termsSummary: "Valid for 7 days."
        },
        liveObservation: { state: "READY", visibleRecordCount: 1 },
        state: "HELD_REVIEW",
        visibility: "owned"
      });
      expect(sellerModel.visibleQuotes).toMatchObject([{
        customerLabel: `${prefix} Customer · CUS-UCRM-040-A`,
        opportunityLabel: "opp_ucrm_040_owned",
        quoteNumber: "Q-UCRM-040-A",
        versionLabel: "v1"
      }]);
      await expect(getUnifiedCrmQuoteFoundation(seller, {
        mode: "OFF",
        now: () => now,
        scopeRepository
      })).rejects.toMatchObject({ code: "QUOTE_OFF" });
    } finally {
      await prisma.unifiedCrmQuoteVersion.deleteMany({ where: { organizationId } });
      await prisma.unifiedCrmQuoteRecord.deleteMany({ where: { organizationId } });
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customer.deleteMany({ where: { organizationId } });
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId, otherSellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
