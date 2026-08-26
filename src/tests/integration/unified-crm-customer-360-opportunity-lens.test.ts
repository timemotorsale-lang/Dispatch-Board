import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM Customer 360 opportunity lens PostgreSQL proof", () => {
  it("reconciles persisted opportunities with linked dispatch work", async () => {
    const [{ prisma }, { createUnifiedCrmCustomer360Repository }, { createUnifiedCrmCustomerReadRepository }, { getUnifiedCrmCustomer360 }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/repositories/unified-crm-customer-360-repository"),
      import("@/server/repositories/unified-crm-customer-read-repository"),
      import("@/server/services/unified-crm-customer-360-service")
    ]);
    const prefix = `ucrm-360-opp-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const userId = `${prefix}-manager`;
    const customerId = `${prefix}-customer`;
    const vehicleId = `${prefix}-vehicle`;
    const serviceVisitId = `${prefix}-visit`;
    const repairOrderId = `${prefix}-ro`;
    const opportunityId = `${prefix}-opp-db`;
    const dispatchLinkId = `${prefix}-dispatch-link`;
    const readAt = new Date("2026-08-26T17:00:00.000Z");
    const actor = {
      id: userId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.create({ data: { id: userId, name: actor.name, email: actor.email, passwordHash: "integration-test-only" } });
      await prisma.userLocationAccess.create({ data: { userId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true } });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-360-OPP", displayName: `${prefix} Customer`, ownerUserId: userId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.vehicle.create({ data: { id: vehicleId, organizationId, vehicleNumber: "VEH-360-OPP", year: 2019, make: "Honda", model: "Accord" } });
      await prisma.serviceVisit.create({
        data: {
          id: serviceVisitId,
          arrivedAt: readAt,
          concernSummary: "Customer opportunity dispatch context.",
          consentStatus: "NOT_REQUIRED",
          createdByUserId: userId,
          customerId,
          intakeSource: "WALK_IN",
          keysReceivedCount: 1,
          locationId,
          organizationId,
          origin: "CUSTOMER_REPAIR",
          transportMode: "CUSTOMER_WAITING",
          vehicleId
        }
      });
      await prisma.repairOrder.create({
        data: {
          id: repairOrderId,
          customerId,
          intakeSource: "WALK_IN",
          locationId,
          nextAction: "Review Customer 360 linked dispatch proof.",
          openedAt: readAt,
          operatingState: "ACTIVE",
          organizationId,
          origin: "CUSTOMER_REPAIR",
          ownerUserId: userId,
          repairOrderNumber: "RO-360-OPP",
          serviceVisitId,
          stageStartedAt: readAt,
          targetAt: new Date("2026-08-26T20:00:00.000Z"),
          vehicleId,
          version: 3
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          createdByUserId: userId,
          createdReason: "Integration proof for Customer 360 opportunity lens.",
          customerId,
          nextActionDueAt: new Date("2026-08-27T17:00:00.000Z"),
          nextActionLabel: "Review linked repair order",
          opportunityNumber: "opp_360038",
          organizationId,
          ownerUserId: userId,
          stage: "QUALIFIED",
          summary: "Customer 360 should show this opportunity and its linked repair order.",
          title: "2019 Honda Accord linked dispatch opportunity",
          version: 1
        }
      });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmOpportunityDispatchLink" (
          "id",
          "opportunityId",
          "organizationId",
          "targetKind",
          "repairOrderId",
          "repairOrderNumberSnapshot",
          "titleSnapshot",
          "targetVersionSnapshot",
          "createdByUserId"
        ) VALUES (
          ${dispatchLinkId},
          ${opportunityId},
          ${organizationId},
          ${"REPAIR_ORDER"},
          ${repairOrderId},
          ${"RO-360-OPP"},
          ${"Repair order RO-360-OPP"},
          ${3},
          ${userId}
        )
      `;

      const model = await getUnifiedCrmCustomer360(actor, customerId, {
        now: () => readAt,
        readMode: "REVIEW",
        repository: createUnifiedCrmCustomer360Repository(prisma),
        scopeRepository: createUnifiedCrmCustomerReadRepository(prisma)
      });

      expect(model.opportunityLensObservation).toMatchObject({
        dispatchLinkCount: 1,
        state: "READY",
        visibleRecordCount: 1
      });
      expect(model.opportunityLenses).toMatchObject([{
        dispatchLinkCount: 1,
        dispatchLinks: [{
          href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}`,
          repairOrderId,
          repairOrderNumber: "RO-360-OPP",
          state: "ACTIVE",
          targetKind: "REPAIR_ORDER",
          version: 3
        }],
        id: "opp_360038",
        opportunityNumber: "opp_360038",
        stage: "QUALIFIED",
        title: "2019 Honda Accord linked dispatch opportunity"
      }]);
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.repairOrder.deleteMany({ where: { id: repairOrderId } });
      await prisma.$executeRawUnsafe('ALTER TABLE "ServiceVisit" DISABLE TRIGGER "ServiceVisit_prevent_update"');
      try {
        await prisma.serviceVisit.deleteMany({ where: { id: serviceVisitId } });
      } finally {
        await prisma.$executeRawUnsafe('ALTER TABLE "ServiceVisit" ENABLE TRIGGER "ServiceVisit_prevent_update"');
      }
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.userLocationAccess.deleteMany({ where: { userId, locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
