import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-050 global search runtime proof", () => {
  it("searches permitted CRM records across entities without leaking hidden owner-scope matches", async () => {
    const [{ prisma }, { searchUnifiedCrm }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-global-search-service")
    ]);
    const prefix = `ucrm-global-search-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const otherSellerId = `${prefix}-other-seller`;
    const customerId = `${prefix}-customer`;
    const hiddenCustomerId = `${prefix}-hidden-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const hiddenOpportunityId = `${prefix}-hidden-opportunity`;
    const quoteId = `${prefix}-quote`;
    const taskId = `${prefix}-task`;
    const taskLinkId = `${prefix}-task-link`;
    const appointmentId = `${prefix}-appointment`;
    const appointmentLinkId = `${prefix}-appointment-link`;
    const vehicleId = `${prefix}-vehicle`;
    const contactPointId = `${prefix}-contact`;
    const dispatchLinkId = `${prefix}-dispatch`;
    const boardDayId = `${prefix}-board-day`;
    const now = new Date("2026-08-26T22:00:00.000Z");
    const boardDate = new Date(`2126-01-${String(Math.floor(Math.random() * 25) + 1).padStart(2, "0")}T00:00:00.000Z`);
    const manager = {
      id: managerId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { all: [], direct: [], roleDefaults: [] }
    };
    const seller = {
      id: sellerId,
      name: `${prefix} Seller`,
      email: `${prefix}-seller@example.test`,
      isActive: true,
      roles: ["Salesperson"],
      duties: { all: [], direct: [], roleDefaults: [] }
    };
    const repositoryScope = { async listActiveOrganizationIds() { return [organizationId]; } };

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
        { id: customerId, organizationId, customerNumber: "CUS-ZEPHYR-050", displayName: "Zephyr Lane", ownerUserId: sellerId, sourceCode: "UCRM_INTEGRATION_TEST" },
        { id: hiddenCustomerId, organizationId, customerNumber: "CUS-ZEPHYR-HIDDEN", displayName: "Hidden Zephyr", ownerUserId: otherSellerId, sourceCode: "UCRM_INTEGRATION_TEST" }
      ] });
      await prisma.customerContactPoint.create({
        data: {
          id: contactPointId,
          customerId,
          type: "EMAIL",
          value: "zephyr@example.test",
          normalizedValue: "zephyr@example.test",
          isPrimary: true
        }
      });
      await prisma.vehicle.create({
        data: {
          id: vehicleId,
          organizationId,
          vehicleNumber: "VEH-ZEPHYR-050",
          stockNumber: "STK-ZEPHYR-050",
          stockNumberNormalized: "STK-ZEPHYR-050",
          vin: "1HGCV1F1XKA033428",
          year: 2019,
          make: "Honda",
          model: "Accord Zephyr"
        }
      });
      await prisma.customerVehicle.create({
        data: {
          id: `${prefix}-customer-vehicle`,
          customerId,
          vehicleId,
          relationshipType: "OWNER",
          effectiveFrom: new Date("2026-08-01T00:00:00.000Z")
        }
      });
      await prisma.unifiedCrmOpportunityRecord.createMany({ data: [
        {
          id: opportunityId,
          organizationId,
          opportunityNumber: "OPP-ZEPHYR-050",
          title: "Zephyr upgrade opportunity",
          summary: "Visible seller opportunity.",
          nextActionLabel: "Search proof",
          nextActionDueAt: now,
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        },
        {
          id: hiddenOpportunityId,
          organizationId,
          opportunityNumber: "OPP-ZEPHYR-HIDDEN",
          title: "Hidden Zephyr opportunity",
          summary: "Other seller opportunity.",
          nextActionLabel: "Search proof",
          nextActionDueAt: now,
          createdByUserId: managerId,
          customerId: hiddenCustomerId,
          ownerUserId: otherSellerId,
          version: 1
        }
      ] });
      await prisma.unifiedCrmQuoteRecord.create({
        data: {
          id: quoteId,
          organizationId,
          quoteNumber: "Q-ZEPHYR-050",
          opportunityId,
          customerId,
          createdByUserId: sellerId,
          latestVersionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Search proof terms." },
          latestDraftSnapshot: { lineItems: [], totals: { subtotalCents: 0, totalCents: 0 } },
          createdAt: now,
          updatedAt: now
        }
      });
      await prisma.boardDay.create({ data: { id: boardDayId, date: boardDate } });
      await prisma.task.create({
        data: {
          id: taskId,
          assignedUserId: sellerId,
          boardDayId,
          customerId,
          customerReference: "CUS-ZEPHYR-050",
          dueAt: now,
          sourceType: "STAFF",
          title: "Call Zephyr buyer",
          vehicleId,
          vehicleReference: "STK-ZEPHYR-050",
          workflowArea: "SALES"
        }
      });
      await prisma.appointment.create({
        data: {
          id: appointmentId,
          appointmentNumber: "APT-ZEPHYR-050",
          organizationId,
          locationId,
          ownerUserId: sellerId,
          sourceType: "MANUAL",
          title: "Zephyr delivery appointment",
          schedulingTimezone: "America/Chicago",
          startsAt: now,
          endsAt: new Date("2026-08-26T23:00:00.000Z")
        }
      });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmOpportunityTaskLink" (
          "id", "opportunityId", "organizationId", "taskId", "relationship", "titleSnapshot",
          "briefSnapshot", "dueAtSnapshot", "createdByUserId", "createdAt", "updatedAt"
        )
        VALUES (
          ${taskLinkId}, ${opportunityId}, ${organizationId}, ${taskId}, 'FOLLOW_UP', 'Zephyr task link',
          'Search proof task.', ${now}, ${managerId}, ${now}, ${now}
        )
      `;
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmOpportunityAppointmentLink" (
          "id", "opportunityId", "organizationId", "appointmentId", "relationship", "titleSnapshot",
          "startsAtSnapshot", "endsAtSnapshot", "createdByUserId", "createdAt", "updatedAt"
        )
        VALUES (
          ${appointmentLinkId}, ${opportunityId}, ${organizationId}, ${appointmentId}, 'DELIVERY', 'Zephyr appointment link',
          ${now}, ${new Date("2026-08-26T23:00:00.000Z")}, ${managerId}, ${now}, ${now}
        )
      `;
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmOpportunityDispatchLink" (
          "id", "opportunityId", "organizationId", "targetKind", "repairOrderNumberSnapshot",
          "titleSnapshot", "targetVersionSnapshot", "createdByUserId", "createdAt", "updatedAt"
        )
        VALUES (
          ${dispatchLinkId}, ${opportunityId}, ${organizationId}, 'REPAIR_ORDER', 'RO-ZEPHYR-050',
          'Zephyr recon dispatch', 1, ${managerId}, ${now}, ${now}
        )
      `;

      const sellerModel = await searchUnifiedCrm(seller, { q: "Zephyr", limit: 25 }, {
        mode: "REVIEW",
        now: () => now,
        repository: {
          ...repositoryScope,
          search: (await import("@/server/repositories/unified-crm-global-search-repository")).createUnifiedCrmGlobalSearchRepository().search
        }
      });
      const managerModel = await searchUnifiedCrm(manager, { q: "Zephyr", limit: 25 }, {
        mode: "REVIEW",
        now: () => now,
        repository: {
          ...repositoryScope,
          search: (await import("@/server/repositories/unified-crm-global-search-repository")).createUnifiedCrmGlobalSearchRepository().search
        }
      });

      expect(sellerModel.visibility).toBe("owned");
      expect(sellerModel.groups.map((group) => group.entity)).toEqual([
        "customer",
        "contact",
        "opportunity",
        "quote",
        "task",
        "appointment",
        "vehicle",
        "dispatch"
      ]);
      expect(JSON.stringify(sellerModel)).not.toContain("Hidden Zephyr");
      expect(JSON.stringify(sellerModel)).not.toContain("OPP-ZEPHYR-HIDDEN");
      expect(managerModel.visibility).toBe("organization");
      expect(JSON.stringify(managerModel)).toContain("Hidden Zephyr");
      expect(managerModel.resultCount).toBeGreaterThan(sellerModel.resultCount);
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityAppointmentLink" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityTaskLink" WHERE "organizationId" = ${organizationId}`;
      await prisma.appointment.deleteMany({ where: { organizationId } });
      await prisma.task.deleteMany({ where: { id: taskId } });
      await prisma.boardDay.deleteMany({ where: { id: boardDayId } });
      await prisma.unifiedCrmQuoteRecord.deleteMany({ where: { organizationId } });
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customerContactPoint.deleteMany({ where: { customerId } });
      await prisma.customerVehicle.deleteMany({ where: { customerId } });
      await prisma.customer.deleteMany({ where: { organizationId } });
      await prisma.vehicle.deleteMany({ where: { organizationId } });
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId, otherSellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
