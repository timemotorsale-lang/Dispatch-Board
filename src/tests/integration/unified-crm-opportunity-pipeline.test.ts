import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity pipeline PostgreSQL proof", () => {
  it("groups persisted opportunities into lifecycle columns with detail and transition links", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }, { getUnifiedCrmOpportunityPipelinePreview }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-read-service")
    ]);
    const prefix = `ucrm-opp-pipeline-it-${randomUUID()}`;
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
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-PIPELINE", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });

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

      const pipeline = await getUnifiedCrmOpportunityPipelinePreview(actor, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });

      expect(pipeline.columns).toHaveLength(1);
      expect(pipeline.columns[0]).toMatchObject({
        id: "stage-new_inquiry",
        label: "New Inquiry",
        itemCountLabel: "1 live record",
        valueLabel: "Governed movement"
      });
      expect(pipeline.columns[0].items[0]).toMatchObject({
        customerLabel: `${prefix} Customer · CUS-OPP-PIPELINE`,
        detailHref: `/crm/opportunities/${opportunityNumber}?crmReturnTo=%2Fcrm%3Fview%3Dpipeline`,
        moveHref: `/crm/opportunities/${opportunityNumber}/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline`,
        nextActionLabel: "Call customer with Accord options",
        stage: "NEW_INQUIRY",
        version: 1
      });
      expect(pipeline.constraints).toContain("Stage movement must use the governed transition command; board cards link into that command instead of mutating directly.");
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
