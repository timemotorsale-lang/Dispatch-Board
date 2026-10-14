import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity create PostgreSQL proof", () => {
  it("creates a governed NEW_INQUIRY opportunity with ledger, audit, stage history, and idempotent replay", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service")
    ]);
    const prefix = `ucrm-opp-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const ownerUserId = `${prefix}-manager`;
    const customerId = `${prefix}-customer`;
    const leadId = `${prefix}-lead`;
    const now = new Date("2026-08-26T17:00:00.000Z");
    const dueAt = new Date("2026-08-26T19:00:00.000Z");
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
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-IT", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.customerLead.create({
        data: {
          id: leadId,
          organizationId,
          customerId,
          leadNumber: `${prefix}-LEAD`,
          idempotencyKey: `${prefix}-lead`,
          requestHash: "integration-test",
          sourceCode: "WALK_IN",
          ownerUserId,
          nextActionCode: "FOLLOW_UP",
          nextActionAt: dueAt,
          priority: "P2",
          score: 50,
          confidence: "MEDIUM",
          qualificationSnapshot: {},
          createdByUserId: ownerUserId
        }
      });

      const payload = {
        customerId,
        estimatedValueCents: 1850000,
        expectedCloseAt: "2026-08-30T17:00:00.000Z",
        idempotencyKey: `${prefix}-create`,
        nextActionDueAt: dueAt.toISOString(),
        nextActionLabel: "Call customer with Accord options",
        ownerUserId,
        sourceLeadId: leadId,
        summary: "Customer is interested in a 2019 Honda Accord.",
        title: "2019 Honda Accord opportunity"
      };

      const created = await createUnifiedCrmOpportunity(actor, payload, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      opportunityNumber = created.opportunity.opportunityNumber;
      expect(created.duplicate).toBe(false);
      expect(created.opportunity).toMatchObject({
        customerId,
        estimatedValueCents: 1850000,
        nextActionLabel: "Call customer with Accord options",
        ownerUserId,
        sourceLeadId: leadId,
        stage: "NEW_INQUIRY",
        title: "2019 Honda Accord opportunity",
        version: 1
      });

      const replay = await createUnifiedCrmOpportunity(actor, payload, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      expect(replay.duplicate).toBe(true);
      expect(replay.opportunity.opportunityNumber).toBe(opportunityNumber);

      const rows = await prisma.$queryRaw<Array<{ stage: string; stageEvents: bigint; ledgerRows: bigint; auditRows: bigint; outboxRows: bigint }>>`
        SELECT
          opportunity."stage"::text AS "stage",
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityStageEvent" event WHERE event."opportunityId" = opportunity."id") AS "stageEvents",
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" command WHERE command."organizationId" = ${organizationId} AND command."subjectType" = 'OPPORTUNITY' AND command."subjectId" = ${opportunityNumber}) AS "ledgerRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" audit WHERE audit."organizationId" = ${organizationId} AND audit."subjectType" = 'OPPORTUNITY' AND audit."subjectId" = ${opportunityNumber}) AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" outbox WHERE outbox."organizationId" = ${organizationId} AND outbox."messageKey" = ${opportunityNumber}) AS "outboxRows"
        FROM "UnifiedCrmOpportunityRecord" opportunity
        WHERE opportunity."organizationId" = ${organizationId}
          AND opportunity."opportunityNumber" = ${opportunityNumber}
      `;

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ stage: "NEW_INQUIRY" });
      expect(Number(rows[0].stageEvents)).toBe(1);
      expect(Number(rows[0].ledgerRows)).toBe(1);
      expect(Number(rows[0].auditRows)).toBe(1);
      expect(Number(rows[0].outboxRows)).toBe(1);
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
      await prisma.customerLead.deleteMany({ where: { id: leadId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.userLocationAccess.deleteMany({ where: { userId: ownerUserId, locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
