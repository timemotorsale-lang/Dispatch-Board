import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-056 dashboard reconciliation runtime proof", () => {
  it("reconciles manager dashboard metrics to scoped sample records without contact leakage", async () => {
    const [{ prisma }, { getUnifiedCrmDashboardReconciliation }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-dashboard-reconciliation-service")
    ]);
    const prefix = `ucrm-dashboard-recon-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const quoteId = `${prefix}-quote`;
    const dispatchId = `${prefix}-dispatch`;
    const now = new Date("2026-08-26T23:30:00.000Z");
    const manager = {
      id: managerId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { all: [], direct: [], roleDefaults: [] }
    };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: managerId, name: manager.name, email: manager.email, passwordHash: "integration-test-only" },
        { id: sellerId, name: `${prefix} Seller`, email: `${prefix}-seller@example.test`, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.create({ data: { userId: managerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true } });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-RECON-056", displayName: "Reconciliation Buyer", ownerUserId: sellerId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "OPP-RECON-056",
          title: "Accord dashboard reconciliation",
          summary: "Dashboard reconciliation proof.",
          nextActionLabel: "Call customer",
          nextActionDueAt: new Date("2026-08-26T20:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          stage: "QUOTE_PRESENTED",
          updatedAt: now,
          version: 1
        }
      });
      await prisma.$executeRaw`
        UPDATE "UnifiedCrmOpportunityRecord"
        SET "nextActionDueAt" = ${new Date("2026-08-26T20:00:00.000Z")}, "updatedAt" = ${now}
        WHERE id = ${opportunityId}
      `;
      await prisma.unifiedCrmQuoteRecord.create({
        data: {
          id: quoteId,
          organizationId,
          quoteNumber: "Q-RECON-056",
          opportunityId,
          customerId,
          createdByUserId: sellerId,
          latestVersionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Reconciliation proof." },
          latestDraftSnapshot: { lineItems: [], totals: { subtotalCents: 0, totalCents: 0 } },
          createdAt: now,
          updatedAt: now
        }
      });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmOpportunityDispatchLink" (
          id, "opportunityId", "organizationId", "targetKind", "repairOrderNumberSnapshot",
          "titleSnapshot", "targetVersionSnapshot", "createdByUserId", "createdAt", "updatedAt"
        )
        VALUES (
          ${dispatchId}, ${opportunityId}, ${organizationId}, 'REPAIR_ORDER', 'RO-RECON-056',
          'QC dispatch handoff', 1, ${managerId}, ${now}, ${now}
        )
      `;

      const result = await getUnifiedCrmDashboardReconciliation(manager, { now: () => now });

      expect(result.state).toBe("PASS");
      expect(result.metrics.map((metric) => [metric.id, metric.count])).toEqual([
        ["ownedWork", 1],
        ["overdueFollowUp", 1],
        ["pipeline", 1],
        ["quotes", 1],
        ["dispatchHandoffs", 1]
      ]);
      expect(result.checks.every((check) => check.status === "PASS")).toBe(true);
      expect(JSON.stringify(result)).not.toContain("@example.test");
      expect(JSON.stringify(result)).not.toContain("555");
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}`;
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
