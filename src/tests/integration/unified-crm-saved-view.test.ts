import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-055 saved view runtime proof", () => {
  it("keeps personal and team CRM saved views scoped while recovering invalid stored filters", async () => {
    const [{ prisma }, service] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-saved-view-service")
    ]);
    const prefix = `ucrm-saved-view-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const otherSellerId = `${prefix}-other-seller`;
    const invalidViewId = `${prefix}-invalid-view`;
    const now = new Date("2026-08-26T23:00:00.000Z");
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
    const otherSeller = {
      ...seller,
      id: otherSellerId,
      name: `${prefix} Other Seller`,
      email: `${prefix}-other@example.test`
    };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: managerId, name: manager.name, email: manager.email, passwordHash: "integration-test-only" },
        { id: sellerId, name: seller.name, email: seller.email, passwordHash: "integration-test-only" },
        { id: otherSellerId, name: otherSeller.name, email: otherSeller.email, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.createMany({ data: [
        { userId: managerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: sellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: otherSellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true }
      ] });

      const sellerPersonal = await service.createUnifiedCrmSavedView(seller, {
        config: { dateWindow: "TODAY", ownerFilter: "MINE", query: "Accord", sort: "NEXT_ACTION_ASC", stages: ["QUALIFIED"], tab: "pipeline" },
        name: "My Accord deals",
        visibility: "PERSONAL"
      }, { now: () => now });
      const team = await service.createUnifiedCrmSavedView(manager, {
        config: { dateWindow: "NEXT_7_DAYS", ownerFilter: "ANY", sort: "VALUE_DESC", stages: ["QUOTE_PRESENTED"], tab: "pipeline" },
        name: "Team quote watch",
        visibility: "TEAM"
      }, { now: () => now });
      await service.createUnifiedCrmSavedView(otherSeller, {
        config: { ownerFilter: "MINE", tab: "work" },
        name: "Other seller private",
        visibility: "PERSONAL"
      }, { now: () => now });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmSavedView" (
          id, "organizationId", "createdByUserId", name, visibility, config, "configSchemaVersion"
        )
        VALUES (
          ${invalidViewId}, ${organizationId}, ${sellerId}, 'Retired filter', 'PERSONAL',
          '{"tab":"retired","ownerFilter":"ADMIN_ONLY"}'::jsonb,
          99
        )
      `;

      const sellerViews = await service.listUnifiedCrmSavedViews(seller, { now: () => now });
      const managerViews = await service.listUnifiedCrmSavedViews(manager, { now: () => now });

      expect(sellerViews.savedViews.map((view) => view.name).sort()).toEqual(["My Accord deals", "Retired filter", "Team quote watch"]);
      expect(managerViews.savedViews.map((view) => view.name).sort()).toEqual(["Team quote watch"]);
      expect(sellerViews.savedViews.find((view) => view.id === invalidViewId)).toMatchObject({
        recoveryNotice: expect.stringContaining("safe defaults"),
        tab: "work"
      });
      expect(team.canDelete).toBe(true);
      await expect(service.createUnifiedCrmSavedView(seller, {
        config: { tab: "work" },
        name: "Unsafe team share",
        visibility: "TEAM"
      }, { now: () => now })).rejects.toMatchObject({ code: "SAVED_VIEW_FORBIDDEN" });

      await service.deleteUnifiedCrmSavedView(seller, sellerPersonal.id, { now: () => now });
      await service.deleteUnifiedCrmSavedView(manager, team.id, { now: () => now });
      await expect(service.deleteUnifiedCrmSavedView(seller, `${prefix}-missing`, { now: () => now })).rejects.toMatchObject({ code: "SAVED_VIEW_NOT_FOUND" });
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmSavedView" WHERE "organizationId" = ${organizationId}`;
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId, otherSellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
