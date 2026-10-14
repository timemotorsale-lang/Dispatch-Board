import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity detail PostgreSQL proof", () => {
  it("reads current lifecycle, next action, and stage history for a persisted opportunity", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }, { transitionUnifiedCrmOpportunity }, { getUnifiedCrmOpportunityDetail }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-transition-command-service"),
      import("@/server/services/unified-crm-opportunity-detail-service")
    ]);
    const prefix = `ucrm-opp-detail-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const ownerUserId = `${prefix}-manager`;
    const customerId = `${prefix}-customer`;
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
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-DETAIL", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });

      const created = await createUnifiedCrmOpportunity(actor, {
        customerId,
        idempotencyKey: `${prefix}-create`,
        nextActionDueAt: "2026-08-26T19:00:00.000Z",
        nextActionLabel: "Call customer with Accord options",
        ownerUserId,
        summary: "Customer is interested in a 2019 Honda Accord.",
        title: "2019 Honda Accord opportunity"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      opportunityNumber = created.opportunity.opportunityNumber;

      await transitionUnifiedCrmOpportunity(actor, opportunityNumber, {
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-transition`,
        nextActionDueAt: "2026-08-27T18:00:00.000Z",
        nextActionLabel: "Confirm appointment slot",
        reason: "Customer is qualified and ready for appointment scheduling.",
        toStage: "QUALIFIED"
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

      expect(detail).toMatchObject({
        state: "READY",
        requestedOpportunityId: opportunityNumber,
        summary: {
          customer: `${prefix} Customer · CUS-OPP-DETAIL`,
          nextAction: "Confirm appointment slot"
        },
        lifecycle: {
          allowedNextStages: ["APPOINTMENT_SET", "WORKING_DEAL", "LOST"],
          nextActionDueAt: "2026-08-27T13:00:00.000Z",
          nextActionLabel: "Confirm appointment slot",
          stage: "QUALIFIED",
          terminal: false,
          transitionHref: `/crm/opportunities/${opportunityNumber}/transition`,
          version: 2
        }
      });
      expect(detail.stageHistory).toHaveLength(2);
      expect(detail.stageHistory[0]).toMatchObject({
        actorLabel: actor.name,
        fromStage: "NEW_INQUIRY",
        toStage: "QUALIFIED"
      });
      expect(detail.stageHistory[1]).toMatchObject({
        actorLabel: actor.name,
        fromStage: null,
        toStage: "NEW_INQUIRY"
      });
    } finally {
      if (opportunityNumber) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: opportunityNumber } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "OPPORTUNITY", aggregateId: opportunityNumber } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
      }
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityStageEvent" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.userLocationAccess.deleteMany({ where: { userId: ownerUserId, locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
