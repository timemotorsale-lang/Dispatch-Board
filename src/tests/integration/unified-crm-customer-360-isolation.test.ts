import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM Customer 360 PostgreSQL isolation", () => {
  it("isolates detail records, owner scope, lifecycle state, nested sources, and raw contacts", async () => {
    const [{ prisma }, { createUnifiedCrmCustomer360Repository }, { createUnifiedCrmCustomerReadRepository }, { getUnifiedCrmCustomer360 }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/repositories/unified-crm-customer-360-repository"),
      import("@/server/repositories/unified-crm-customer-read-repository"),
      import("@/server/services/unified-crm-customer-360-service")
    ]);
    const prefix = `ucrm-360-it-${randomUUID()}`;
    const organizationIds = [`${prefix}-org-a`, `${prefix}-org-b`];
    const locationIds = [`${prefix}-location-a`, `${prefix}-location-b`];
    const userIds = [`${prefix}-manager`, `${prefix}-seller-a`, `${prefix}-seller-b`];
    const customerIds = {
      allowed: `${prefix}-customer-a`,
      archived: `${prefix}-customer-archived`,
      merged: `${prefix}-customer-merged`,
      otherOrganization: `${prefix}-customer-b`,
      otherOwner: `${prefix}-customer-other-owner`
    };
    const contactPointIds = [`${prefix}-phone-a`, `${prefix}-email-a`];
    const leadIds = [`${prefix}-lead-a`, `${prefix}-lead-wrong-org`];
    const vehicleIds = [`${prefix}-vehicle-a`, `${prefix}-vehicle-b`];
    const customerVehicleIds = [`${prefix}-customer-vehicle-a`, `${prefix}-customer-vehicle-wrong-org`];
    const rawPhone = "+16125559876";
    const rawEmail = `${prefix}@private-contact.example`;
    const readAt = new Date("2026-08-14T18:00:00.000Z");

    function actor(id: string, role: string) {
      return {
        id,
        name: `${prefix} Actor`,
        email: `${id}@example.test`,
        isActive: true,
        roles: [role],
        duties: { direct: [], roleDefaults: [], all: [] }
      };
    }

    function safeErrorBytes(error: unknown) {
      const value = error as { code?: unknown; contractVersion?: unknown; httpStatus?: unknown; message?: unknown; retryable?: unknown };
      return JSON.stringify({ code: value.code, contractVersion: value.contractVersion, httpStatus: value.httpStatus, message: value.message, retryable: value.retryable });
    }

    try {
      await prisma.organization.createMany({ data: [
        { id: organizationIds[0], code: `${prefix}-A`, name: `${prefix} Organization A` },
        { id: organizationIds[1], code: `${prefix}-B`, name: `${prefix} Organization B` }
      ] });
      await prisma.location.createMany({ data: [
        { id: locationIds[0], organizationId: organizationIds[0], code: `${prefix}-A`, name: `${prefix} Location A`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" },
        { id: locationIds[1], organizationId: organizationIds[1], code: `${prefix}-B`, name: `${prefix} Location B`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" }
      ] });
      await prisma.user.createMany({ data: [
        { id: userIds[0], name: `${prefix} Manager`, email: `${prefix}-manager@example.test`, passwordHash: "integration-test-only" },
        { id: userIds[1], name: `${prefix} Seller A`, email: `${prefix}-seller-a@example.test`, passwordHash: "integration-test-only" },
        { id: userIds[2], name: `${prefix} Seller B`, email: `${prefix}-seller-b@example.test`, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.createMany({ data: [
        { userId: userIds[0], locationId: locationIds[0], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true },
        { userId: userIds[1], locationId: locationIds[0], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true },
        { userId: userIds[2], locationId: locationIds[1], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true }
      ] });
      await prisma.customer.createMany({ data: [
        { id: customerIds.allowed, organizationId: organizationIds[0], customerNumber: "CUS-COLLISION", displayName: `${prefix} Shared Customer`, phoneNumber: rawPhone, email: rawEmail, ownerUserId: userIds[1], sourceCode: "UCRM_INTEGRATION_TEST" },
        { id: customerIds.otherOrganization, organizationId: organizationIds[1], customerNumber: "CUS-COLLISION", displayName: `${prefix} Shared Customer`, phoneNumber: rawPhone, email: rawEmail, ownerUserId: userIds[2], sourceCode: "UCRM_INTEGRATION_TEST" },
        { id: customerIds.otherOwner, organizationId: organizationIds[0], customerNumber: "CUS-OTHER-OWNER", displayName: `${prefix} Other Owner`, ownerUserId: userIds[0], sourceCode: "UCRM_INTEGRATION_TEST" },
        { id: customerIds.archived, organizationId: organizationIds[0], customerNumber: "CUS-ARCHIVED", displayName: `${prefix} Archived`, ownerUserId: userIds[1], archivedAt: new Date("2026-08-01T00:00:00.000Z"), sourceCode: "UCRM_INTEGRATION_TEST" }
      ] });
      await prisma.customer.create({ data: { id: customerIds.merged, organizationId: organizationIds[0], customerNumber: "CUS-MERGED", displayName: `${prefix} Merged`, ownerUserId: userIds[1], mergedIntoCustomerId: customerIds.allowed, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.customerContactPoint.createMany({ data: [
        { id: contactPointIds[0], customerId: customerIds.allowed, type: "PHONE", value: rawPhone, normalizedValue: rawPhone, isPrimary: true, consentStatus: "OPTED_IN" },
        { id: contactPointIds[1], customerId: customerIds.allowed, type: "EMAIL", value: rawEmail, normalizedValue: rawEmail, isPrimary: false, consentStatus: "OPTED_IN" }
      ] });
      await prisma.customerLead.createMany({ data: [
        { id: leadIds[0], organizationId: organizationIds[0], customerId: customerIds.allowed, leadNumber: `${prefix}-LEAD-A`, idempotencyKey: `${prefix}-lead-a`, requestHash: "test", sourceCode: "WEB", ownerUserId: userIds[1], nextActionCode: "FOLLOW_UP", nextActionAt: readAt, priority: "P2", score: 50, confidence: "MEDIUM", qualificationSnapshot: {}, createdByUserId: userIds[1] },
        { id: leadIds[1], organizationId: organizationIds[1], customerId: customerIds.allowed, leadNumber: `${prefix}-LEAD-B`, idempotencyKey: `${prefix}-lead-b`, requestHash: "test", sourceCode: "WRONG_ORG", ownerUserId: userIds[2], nextActionCode: "DO_NOT_LEAK", nextActionAt: readAt, priority: "P0", score: 99, confidence: "HIGH", qualificationSnapshot: {}, createdByUserId: userIds[2] }
      ] });
      await prisma.vehicle.createMany({ data: [
        { id: vehicleIds[0], organizationId: organizationIds[0], vehicleNumber: `${prefix}-VEH-A`, year: 2022, make: "Toyota", model: "Camry" },
        { id: vehicleIds[1], organizationId: organizationIds[1], vehicleNumber: `${prefix}-VEH-B`, year: 2025, make: "Private", model: "WrongOrg" }
      ] });
      await prisma.customerVehicle.createMany({ data: [
        { id: customerVehicleIds[0], customerId: customerIds.allowed, vehicleId: vehicleIds[0], relationshipType: "OWNER", effectiveFrom: new Date("2025-01-01T00:00:00.000Z") },
        { id: customerVehicleIds[1], customerId: customerIds.allowed, vehicleId: vehicleIds[1], relationshipType: "OWNER", effectiveFrom: new Date("2025-01-02T00:00:00.000Z") }
      ] });

      const repository = createUnifiedCrmCustomer360Repository(prisma);
      const scopeRepository = createUnifiedCrmCustomerReadRepository(prisma);
      const dependencies = { now: () => readAt, readMode: "REVIEW" as const, repository, scopeRepository };
      const managerResult = await getUnifiedCrmCustomer360(actor(userIds[0], "General Manager"), customerIds.allowed, dependencies);
      expect(managerResult.identity.id).toBe(customerIds.allowed);
      expect(managerResult.sourceLenses.leads.map((lead) => lead.id)).toEqual([leadIds[0]]);
      expect(managerResult.vehicles.map((vehicle) => vehicle.id)).toEqual([vehicleIds[0]]);
      const serialized = JSON.stringify(managerResult);
      expect(serialized).not.toContain(leadIds[1]);
      expect(serialized).not.toContain(vehicleIds[1]);
      expect(serialized).not.toContain(rawPhone);
      expect(serialized).not.toContain(rawEmail);
      expect(serialized).not.toContain("OPTED_IN");

      const sellerResult = await getUnifiedCrmCustomer360(actor(userIds[1], "Salesperson"), customerIds.allowed, dependencies);
      expect(sellerResult.visibility).toBe("owned");
      const unavailableIds = ["missing-customer", customerIds.otherOrganization, customerIds.otherOwner, customerIds.archived, customerIds.merged];
      const failures: string[] = [];
      for (const customerId of unavailableIds) {
        try {
          await getUnifiedCrmCustomer360(actor(userIds[1], "Salesperson"), customerId, dependencies);
          throw new Error("Expected unavailable customer detail.");
        } catch (error) {
          failures.push(safeErrorBytes(error));
        }
      }
      expect(new Set(failures).size).toBe(1);
      expect(JSON.parse(failures[0])).toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE", httpStatus: 404 });
    } finally {
      await prisma.customerContactPoint.deleteMany({ where: { id: { in: contactPointIds } } });
      await prisma.customerVehicle.deleteMany({ where: { id: { in: customerVehicleIds } } });
      await prisma.customerLead.deleteMany({ where: { id: { in: leadIds } } });
      await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await prisma.customer.deleteMany({ where: { id: customerIds.merged } });
      await prisma.customer.deleteMany({ where: { id: { in: [customerIds.allowed, customerIds.otherOrganization, customerIds.otherOwner, customerIds.archived] } } });
      await prisma.userLocationAccess.deleteMany({ where: { OR: [
        { userId: userIds[0], locationId: locationIds[0] },
        { userId: userIds[1], locationId: locationIds[0] },
        { userId: userIds[2], locationId: locationIds[1] }
      ] } });
      await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
      await prisma.$disconnect();
    }
  });
});
