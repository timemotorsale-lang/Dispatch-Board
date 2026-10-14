import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity dispatch bridge PostgreSQL proof", () => {
  it("links an existing repair order to an opportunity with idempotency and detail readback", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }, { createUnifiedCrmOpportunityDispatchBridge }, { getUnifiedCrmOpportunityDetail }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-dispatch-bridge-service"),
      import("@/server/services/unified-crm-opportunity-detail-service")
    ]);
    const prefix = `ucrm-opp-dispatch-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const ownerUserId = `${prefix}-manager`;
    const customerId = `${prefix}-customer`;
    const vehicleId = `${prefix}-vehicle`;
    const serviceVisitId = `${prefix}-visit`;
    const repairOrderId = `${prefix}-ro`;
    const now = new Date("2026-08-26T17:00:00.000Z");
    const actor = {
      id: ownerUserId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    let opportunityNumber = "";

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.create({ data: { id: ownerUserId, name: actor.name, email: actor.email, passwordHash: "integration-test-only" } });
      await prisma.userLocationAccess.create({ data: { userId: ownerUserId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canViewLimitedData: true } });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-DISPATCH", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.vehicle.create({ data: { id: vehicleId, organizationId, vehicleNumber: "VEH-OPP-DISPATCH", year: 2019, make: "Honda", model: "Accord" } });
      await prisma.serviceVisit.create({
        data: {
          id: serviceVisitId,
          arrivedAt: now,
          concernSummary: "Customer opportunity requires repair order follow-up.",
          consentStatus: "NOT_REQUIRED",
          createdByUserId: ownerUserId,
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
          nextAction: "Diagnose repair scope from CRM handoff.",
          openedAt: now,
          operatingState: "ACTIVE",
          organizationId,
          origin: "CUSTOMER_REPAIR",
          ownerUserId,
          repairOrderNumber: "RO-UCRM-DISPATCH",
          serviceVisitId,
          stageStartedAt: now,
          targetAt: new Date("2026-08-26T20:00:00.000Z"),
          vehicleId,
          version: 2
        }
      });

      const created = await createUnifiedCrmOpportunity(actor, {
        customerId,
        idempotencyKey: `${prefix}-create`,
        nextActionDueAt: "2026-08-26T19:00:00.000Z",
        nextActionLabel: "Create repair order handoff",
        ownerUserId,
        summary: "Customer is ready for repair order dispatch work.",
        title: "2019 Honda Accord dispatch opportunity"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      opportunityNumber = created.opportunity.opportunityNumber;

      const linked = await createUnifiedCrmOpportunityDispatchBridge(actor, opportunityNumber, {
        expectedTargetVersion: 2,
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-dispatch`,
        repairOrderId,
        targetKind: "REPAIR_ORDER"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });

      const duplicate = await createUnifiedCrmOpportunityDispatchBridge(actor, opportunityNumber, {
        expectedTargetVersion: 2,
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-dispatch`,
        repairOrderId,
        targetKind: "REPAIR_ORDER"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });

      const detail = await getUnifiedCrmOpportunityDetail(actor, opportunityNumber, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });

      expect(linked).toMatchObject({
        contractVersion: "ucrm.opportunity-dispatch-bridge/v1",
        duplicate: false,
        opportunityId: opportunityNumber,
        target: {
          href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}`,
          repairOrderNumber: "RO-UCRM-DISPATCH",
          targetKind: "REPAIR_ORDER",
          version: 2
        }
      });
      expect(duplicate).toMatchObject({
        duplicate: true,
        target: {
          repairOrderId,
          repairOrderNumber: "RO-UCRM-DISPATCH"
        }
      });
      expect(detail.dispatchActivity).toMatchObject({
        createDispatchHref: `/api/crm/v1/opportunities/${opportunityNumber}/dispatch`,
        state: "READY",
        links: [{
          href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}`,
          repairOrderId,
          repairOrderNumber: "RO-UCRM-DISPATCH",
          state: "ACTIVE",
          targetKind: "REPAIR_ORDER",
          version: 2
        }]
      });
    } finally {
      if (opportunityNumber) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: opportunityNumber } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "OPPORTUNITY", aggregateId: opportunityNumber } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
      }
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityStageEvent" WHERE "organizationId" = ${organizationId}`;
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
      await prisma.userLocationAccess.deleteMany({ where: { userId: ownerUserId, locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
