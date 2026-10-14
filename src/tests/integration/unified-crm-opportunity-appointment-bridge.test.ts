import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM opportunity appointment bridge PostgreSQL proof", () => {
  it("creates a governed draft appointment link and reads it back from opportunity activity", async () => {
    const [{ prisma }, { createUnifiedCrmOpportunity }, { createUnifiedCrmOpportunityAppointmentBridge }, { getUnifiedCrmOpportunityDetail }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-appointment-bridge-service"),
      import("@/server/services/unified-crm-opportunity-detail-service")
    ]);
    const prefix = `ucrm-opp-appt-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const ownerUserId = `${prefix}-manager`;
    const customerId = `${prefix}-customer`;
    const appointmentNumber = `${prefix}-APT`;
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
    let appointmentId = "";

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.create({ data: { id: ownerUserId, name: actor.name, email: actor.email, passwordHash: "integration-test-only" } });
      await prisma.userLocationAccess.create({ data: { userId: ownerUserId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true } });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-OPP-APPT", displayName: `${prefix} Customer`, ownerUserId, sourceCode: "UCRM_INTEGRATION_TEST" } });

      const created = await createUnifiedCrmOpportunity(actor, {
        customerId,
        idempotencyKey: `${prefix}-create`,
        nextActionDueAt: "2026-08-26T19:00:00.000Z",
        nextActionLabel: "Schedule appointment",
        ownerUserId,
        summary: "Customer is ready for an appointment.",
        title: "2019 Honda Accord opportunity"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      opportunityNumber = created.opportunity.opportunityNumber;

      const linked = await createUnifiedCrmOpportunityAppointmentBridge(actor, opportunityNumber, {
        appointmentNumber,
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-appointment`,
        locationId,
        schedulingTimezone: "America/Chicago",
        title: "Appointment with Accord shopper"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      appointmentId = linked.appointment.id;

      const replay = await createUnifiedCrmOpportunityAppointmentBridge(actor, opportunityNumber, {
        appointmentNumber,
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-appointment`,
        locationId,
        schedulingTimezone: "America/Chicago",
        title: "Appointment with Accord shopper"
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      expect(replay.duplicate).toBe(true);
      expect(replay.appointment.id).toBe(appointmentId);

      const rows = await prisma.$queryRaw<Array<{ appointmentLinks: bigint; crmLedgerRows: bigint; auditRows: bigint; outboxRows: bigint; version: number }>>`
        SELECT
          opportunity."version",
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityAppointmentLink" link WHERE link."opportunityId" = opportunity."id") AS "appointmentLinks",
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" command WHERE command."organizationId" = ${organizationId} AND command."subjectType" = 'OPPORTUNITY' AND command."subjectId" = ${opportunityNumber} AND command."commandType" = 'CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATE_DRAFT') AS "crmLedgerRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" audit WHERE audit."organizationId" = ${organizationId} AND audit."subjectType" = 'OPPORTUNITY' AND audit."subjectId" = ${opportunityNumber} AND audit."eventType" = 'CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATED') AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" outbox WHERE outbox."organizationId" = ${organizationId} AND outbox."messageKey" = ${opportunityNumber} AND outbox."payload"->>'eventType' = 'CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATED') AS "outboxRows"
        FROM "UnifiedCrmOpportunityRecord" opportunity
        WHERE opportunity."organizationId" = ${organizationId}
          AND opportunity."opportunityNumber" = ${opportunityNumber}
      `;

      expect(rows).toHaveLength(1);
      expect(rows[0].version).toBe(2);
      expect(Number(rows[0].appointmentLinks)).toBe(1);
      expect(Number(rows[0].crmLedgerRows)).toBe(1);
      expect(Number(rows[0].auditRows)).toBe(1);
      expect(Number(rows[0].outboxRows)).toBe(1);

      const detail = await getUnifiedCrmOpportunityDetail(actor, opportunityNumber, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository: { async listActiveOrganizationIds() { return [organizationId]; } }
      });
      expect(detail.appointmentActivity).toMatchObject({
        createAppointmentHref: `/api/crm/v1/opportunities/${opportunityNumber}/appointments`,
        state: "READY",
        links: [{
          appointmentNumber,
          href: `/appointments?appointment=${appointmentNumber}`,
          relationship: "DRAFT_APPOINTMENT",
          state: "ACTIVE",
          title: "Appointment with Accord shopper",
          version: 1
        }]
      });
    } finally {
      if (appointmentId) {
        await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityAppointmentLink" WHERE "appointmentId" = ${appointmentId}`;
        await prisma.appointmentHistoryEvent.deleteMany({ where: { appointmentId } });
        await prisma.appointmentCommandLedger.deleteMany({ where: { appointmentId } });
        await prisma.appointment.deleteMany({ where: { id: appointmentId } });
      }
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
