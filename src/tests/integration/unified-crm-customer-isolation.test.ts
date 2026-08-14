import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM customer PostgreSQL isolation", () => {
  it("isolates colliding organizations, enforces seller ownership, and emits no raw contact values", async () => {
    const [{ prisma }, { createUnifiedCrmCustomerReadRepository }, { getUnifiedCrmCustomerList }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/repositories/unified-crm-customer-read-repository"),
      import("@/server/services/unified-crm-customer-read-service")
    ]);
    const prefix = `ucrm-it-${randomUUID()}`;
    const organizationIds = [`${prefix}-org-a`, `${prefix}-org-b`];
    const locationIds = [`${prefix}-location-a`, `${prefix}-location-b`];
    const userIds = [`${prefix}-manager`, `${prefix}-seller-a`, `${prefix}-seller-b`];
    const customerIds = [`${prefix}-customer-a`, `${prefix}-customer-b`, `${prefix}-customer-a-other`];
    const contactPointIds = [
      `${prefix}-phone-a`,
      `${prefix}-email-a`,
      `${prefix}-phone-b`,
      `${prefix}-email-b`
    ];
    const collisionName = `Shared Customer ${prefix}`;
    const collisionNumber = "CUS-COLLISION";
    const rawPhone = "+16125559876";
    const rawEmail = `${prefix}@raw-contact.example`;
    const readAt = new Date("2026-08-14T18:00:00.000Z");

    try {
      await prisma.organization.createMany({
        data: [
          { id: organizationIds[0], code: `${prefix}-A`, name: `${prefix} Organization A` },
          { id: organizationIds[1], code: `${prefix}-B`, name: `${prefix} Organization B` }
        ]
      });
      await prisma.location.createMany({
        data: [
          { id: locationIds[0], organizationId: organizationIds[0], code: `${prefix}-A`, name: `${prefix} Location A`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" },
          { id: locationIds[1], organizationId: organizationIds[1], code: `${prefix}-B`, name: `${prefix} Location B`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" }
        ]
      });
      await prisma.user.createMany({
        data: [
          { id: userIds[0], name: `${prefix} Manager`, email: `${prefix}-manager@example.test`, passwordHash: "integration-test-only" },
          { id: userIds[1], name: `${prefix} Seller A`, email: `${prefix}-seller-a@example.test`, passwordHash: "integration-test-only" },
          { id: userIds[2], name: `${prefix} Seller B`, email: `${prefix}-seller-b@example.test`, passwordHash: "integration-test-only" }
        ]
      });
      await prisma.userLocationAccess.createMany({
        data: [
          { userId: userIds[0], locationId: locationIds[0], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true },
          { userId: userIds[1], locationId: locationIds[0], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true },
          { userId: userIds[2], locationId: locationIds[1], validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true }
        ]
      });
      await prisma.customer.createMany({
        data: [
          { id: customerIds[0], organizationId: organizationIds[0], customerNumber: collisionNumber, displayName: collisionName, phoneNumber: rawPhone, email: rawEmail, ownerUserId: userIds[1], sourceCode: "UCRM_INTEGRATION_TEST" },
          { id: customerIds[1], organizationId: organizationIds[1], customerNumber: collisionNumber, displayName: collisionName, phoneNumber: rawPhone, email: rawEmail, ownerUserId: userIds[2], sourceCode: "UCRM_INTEGRATION_TEST" },
          { id: customerIds[2], organizationId: organizationIds[0], customerNumber: "CUS-OTHER", displayName: `${prefix} Other Owner`, phoneNumber: "+16125550001", email: `${prefix}-other@example.test`, ownerUserId: userIds[0], sourceCode: "UCRM_INTEGRATION_TEST" }
        ]
      });
      await prisma.customerContactPoint.createMany({
        data: [
          { id: contactPointIds[0], customerId: customerIds[0], type: "PHONE", value: rawPhone, normalizedValue: rawPhone, isPrimary: true },
          { id: contactPointIds[1], customerId: customerIds[0], type: "EMAIL", value: rawEmail, normalizedValue: rawEmail, isPrimary: true },
          { id: contactPointIds[2], customerId: customerIds[1], type: "PHONE", value: rawPhone, normalizedValue: rawPhone, isPrimary: true },
          { id: contactPointIds[3], customerId: customerIds[1], type: "EMAIL", value: rawEmail, normalizedValue: rawEmail, isPrimary: true }
        ]
      });

      const repository = createUnifiedCrmCustomerReadRepository(prisma);
      const manager = {
        id: userIds[0],
        name: `${prefix} Manager`,
        email: `${prefix}-manager@example.test`,
        isActive: true,
        roles: ["General Manager"],
        duties: { direct: [], roleDefaults: [], all: [] }
      };
      const seller = {
        ...manager,
        id: userIds[1],
        name: `${prefix} Seller A`,
        email: `${prefix}-seller-a@example.test`,
        roles: ["Salesperson"]
      };

      const managerResult = await getUnifiedCrmCustomerList(manager, { q: collisionName }, {
        now: () => readAt,
        readMode: "REVIEW",
        repository
      });
      expect(managerResult.items.map((customer) => customer.id)).toEqual([customerIds[0]]);
      expect(managerResult.items[0]).toMatchObject({
        customerNumber: collisionNumber,
        displayName: collisionName,
        maskedPhone: "••••9876"
      });
      const serializedManagerResult = JSON.stringify(managerResult);
      expect(serializedManagerResult).not.toContain(customerIds[1]);
      expect(serializedManagerResult).not.toContain(rawPhone);
      expect(serializedManagerResult).not.toContain(rawEmail);

      const sellerResult = await getUnifiedCrmCustomerList(seller, {}, {
        now: () => readAt,
        readMode: "REVIEW",
        repository
      });
      expect(sellerResult.items.map((customer) => customer.id)).toEqual([customerIds[0]]);
      expect(JSON.stringify(sellerResult)).not.toContain(customerIds[2]);
      expect(JSON.stringify(sellerResult)).not.toContain(rawPhone);
      expect(JSON.stringify(sellerResult)).not.toContain(rawEmail);
    } finally {
      await prisma.customerContactPoint.deleteMany({ where: { id: { in: contactPointIds } } });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      await prisma.userLocationAccess.deleteMany({
        where: {
          OR: [
            { userId: userIds[0], locationId: locationIds[0] },
            { userId: userIds[1], locationId: locationIds[0] },
            { userId: userIds[2], locationId: locationIds[1] }
          ]
        }
      });
      await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
      await prisma.$disconnect();
    }
  });
});
