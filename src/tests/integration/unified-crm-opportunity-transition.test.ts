import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity transition PostgreSQL proof", () => {
  it("moves an opportunity with versioning, stage history, ledger, audit, and idempotent replay", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }, { transitionUnifiedCrmOpportunity }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-transition-command-service")
    ]);
    const prefix = `ucrm-opp-transition-it-${randomUUID()}`;
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
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-TRANSITION", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });

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

      const payload = {
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-transition`,
        nextActionDueAt: "2026-08-27T18:00:00.000Z",
        nextActionLabel: "Confirm appointment slot",
        reason: "Customer is qualified and ready for appointment scheduling.",
        toStage: "QUALIFIED"
      };
      const transitioned = await transitionUnifiedCrmOpportunity(actor, opportunityNumber, payload, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      expect(transitioned).toMatchObject({
        duplicate: false,
        opportunity: {
          fromStage: "NEW_INQUIRY",
          nextActionLabel: "Confirm appointment slot",
          opportunityNumber,
          stage: "QUALIFIED",
          version: 2
        }
      });

      const replay = await transitionUnifiedCrmOpportunity(actor, opportunityNumber, payload, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      expect(replay.duplicate).toBe(true);
      expect(replay.opportunity.version).toBe(2);

      const rows = await prisma.$queryRaw<Array<{ stage: string; version: number; stageEvents: bigint; ledgerRows: bigint; auditRows: bigint; outboxRows: bigint }>>`
        SELECT
          opportunity."stage"::text AS "stage",
          opportunity."version",
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityStageEvent" event WHERE event."opportunityId" = opportunity."id") AS "stageEvents",
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" command WHERE command."organizationId" = ${organizationId} AND command."subjectType" = 'OPPORTUNITY' AND command."subjectId" = ${opportunityNumber}) AS "ledgerRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" audit WHERE audit."organizationId" = ${organizationId} AND audit."subjectType" = 'OPPORTUNITY' AND audit."subjectId" = ${opportunityNumber}) AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" outbox WHERE outbox."organizationId" = ${organizationId} AND outbox."messageKey" = ${opportunityNumber}) AS "outboxRows"
        FROM "UnifiedCrmOpportunityRecord" opportunity
        WHERE opportunity."organizationId" = ${organizationId}
          AND opportunity."opportunityNumber" = ${opportunityNumber}
      `;

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ stage: "QUALIFIED", version: 2 });
      expect(Number(rows[0].stageEvents)).toBe(2);
      expect(Number(rows[0].ledgerRows)).toBe(2);
      expect(Number(rows[0].auditRows)).toBe(2);
      expect(Number(rows[0].outboxRows)).toBe(2);
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
