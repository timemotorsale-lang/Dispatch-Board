import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-060 pilot data load rehearsal runtime proof", () => {
  it("dry-runs admin pilot data load with existing duplicate detection and no CRM writes", async () => {
    const [{ prisma }, { rehearseUnifiedCrmPilotDataLoad }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-pilot-data-load-rehearsal-service")
    ]);
    const prefix = `ucrm-pilot-load-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const adminId = `${prefix}-admin`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const now = new Date("2026-08-26T23:45:00.000Z");
    const admin = {
      id: adminId,
      name: `${prefix} Admin`,
      email: `${prefix}-admin@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { all: [], direct: [], roleDefaults: [] }
    };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: adminId, name: admin.name, email: admin.email, passwordHash: "integration-test-only" },
        { id: sellerId, name: `${prefix} Seller`, email: `${prefix}-seller@example.test`, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.create({ data: { userId: adminId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true } });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-PILOT-060", displayName: "Pilot Existing Customer", ownerUserId: sellerId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "SRC-PILOT-060",
          title: "Existing pilot Accord",
          createdByUserId: adminId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        }
      });
      const before = await prisma.unifiedCrmOpportunityRecord.count({ where: { organizationId } });

      const result = await rehearseUnifiedCrmPilotDataLoad(admin, {
        rows: [
          { customerName: "Pilot New Customer", customerNumber: "CUS-PILOT-NEW", opportunityTitle: "Fresh pilot Accord", sourceReference: "SRC-PILOT-NEW", stockNumber: "STK-PILOT-NEW" },
          { customerName: "Pilot Existing Customer", customerNumber: "CUS-PILOT-060", opportunityTitle: "Existing pilot Accord", sourceReference: "SRC-PILOT-060" }
        ],
        sourceSystem: "administrator-pilot-sheet"
      }, { now: () => now });
      const after = await prisma.unifiedCrmOpportunityRecord.count({ where: { organizationId } });

      expect(result.dryRun).toBe(true);
      expect(result.state).toBe("BLOCKED");
      expect(result.counts).toEqual({ duplicate: 1, invalid: 0, ready: 1, total: 2 });
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(result.outcomes[1].duplicateReasons.join(" ")).toContain("Existing CRM customer number match");
      expect(after).toBe(before);
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customer.deleteMany({ where: { organizationId } });
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [adminId, sellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
