import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-054 forecast runtime proof", () => {
  it("separates deterministic baseline from append-only seller and manager judgment history", async () => {
    const [{ prisma }, { getUnifiedCrmForecast, submitUnifiedCrmForecastJudgment }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-forecast-service")
    ]);
    const prefix = `ucrm-forecast-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const now = new Date("2026-08-26T22:30:00.000Z");
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
          customerNumber: "CUS-UCRM-054",
          displayName: `${prefix} Customer`,
          ownerUserId: sellerId,
          sourceCode: "UCRM_INTEGRATION_TEST"
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "OPP-UCRM-054",
          title: "Forecast proof opportunity",
          summary: "Proves forecast baseline and append-only judgment history.",
          stage: "QUOTE_PRESENTED",
          estimatedValueCents: 100_000,
          nextActionLabel: "Review forecast",
          nextActionDueAt: now,
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 4
        }
      });

      const baselineOnly = await getUnifiedCrmForecast(seller, opportunityId, { now: () => now });
      expect(baselineOnly.baseline).toMatchObject({
        amountCents: 65_000,
        category: "BEST_CASE",
        probabilityBasisPts: 6500,
        source: "BASELINE"
      });
      expect(baselineOnly.history).toHaveLength(1);

      const sellerSubmit = await submitUnifiedCrmForecastJudgment(seller, opportunityId, {
        amountCents: 85_000,
        category: "BEST_CASE",
        expectedVersion: 4,
        idempotencyKey: `${prefix}-seller-key`,
        probabilityBasisPts: 8500,
        reason: "Customer is likely to accept after delivery timing is confirmed.",
        source: "SELLER_JUDGMENT"
      }, { now: () => now });
      const replay = await submitUnifiedCrmForecastJudgment(seller, opportunityId, {
        amountCents: 85_000,
        category: "BEST_CASE",
        expectedVersion: 4,
        idempotencyKey: `${prefix}-seller-key`,
        probabilityBasisPts: 8500,
        reason: "Customer is likely to accept after delivery timing is confirmed.",
        source: "SELLER_JUDGMENT"
      }, { now: () => now });
      await submitUnifiedCrmForecastJudgment(manager, opportunityId, {
        amountCents: 92_000,
        category: "COMMIT",
        expectedVersion: 4,
        idempotencyKey: `${prefix}-manager-key`,
        probabilityBasisPts: 9200,
        reason: "Manager reviewed approval evidence and customer commitment.",
        source: "MANAGER_JUDGMENT"
      }, { now: () => now });

      expect(sellerSubmit.duplicate).toBe(false);
      expect(replay).toMatchObject({ duplicate: true, snapshot: sellerSubmit.snapshot });

      const history = await getUnifiedCrmForecast(manager, opportunityId, { now: () => now });
      expect(history.history.map((item) => item.source)).toEqual([
        "BASELINE",
        "MANAGER_JUDGMENT",
        "SELLER_JUDGMENT"
      ]);
      expect(history.latestSellerJudgment).toMatchObject({ amountCents: 85_000, source: "SELLER_JUDGMENT" });
      expect(history.latestManagerJudgment).toMatchObject({ amountCents: 92_000, source: "MANAGER_JUDGMENT" });
      const persistedRows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "UnifiedCrmForecastSnapshot"
        WHERE "organizationId" = ${organizationId}
      `;
      expect(Number(persistedRows[0]?.count ?? 0)).toBe(2);
    } finally {
      await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, commandType: "CRM_FORECAST_SUBMIT" } });
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmForecastSnapshot" WHERE "organizationId" = ${organizationId}`;
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
