import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-039 core slice gate", () => {
  it("proves customer to opportunity to task appointment dispatch readback under manager and owner scopes", async () => {
    const [
      { prisma },
      { createUnifiedCrmOpportunity },
      { transitionUnifiedCrmOpportunity },
      { createUnifiedCrmOpportunityTaskBridge },
      { createUnifiedCrmOpportunityAppointmentBridge },
      { createUnifiedCrmOpportunityDispatchBridge },
      { getUnifiedCrmOpportunityDetail },
      { getUnifiedCrmCustomer360 }
    ] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-opportunity-create-command-service"),
      import("@/server/services/unified-crm-opportunity-transition-command-service"),
      import("@/server/services/unified-crm-opportunity-task-bridge-service"),
      import("@/server/services/unified-crm-opportunity-appointment-bridge-service"),
      import("@/server/services/unified-crm-opportunity-dispatch-bridge-service"),
      import("@/server/services/unified-crm-opportunity-detail-service"),
      import("@/server/services/unified-crm-customer-360-service")
    ]);
    const prefix = `ucrm-core-gate-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const vehicleId = `${prefix}-vehicle`;
    const serviceVisitId = `${prefix}-visit`;
    const repairOrderId = `${prefix}-ro`;
    const appointmentNumber = `${prefix}-APT`;
    const now = new Date("2026-08-26T17:00:00.000Z");
    const manager = {
      id: managerId,
      name: `${prefix} Manager`,
      email: `${prefix}-manager@example.test`,
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    const seller = {
      id: sellerId,
      name: `${prefix} Seller`,
      email: `${prefix}-seller@example.test`,
      isActive: true,
      roles: ["Salesperson"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    let opportunityNumber = "";
    let taskId = "";
    let appointmentId = "";

    const scopeRepository = { async listActiveOrganizationIds() { return [organizationId]; } };

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: managerId, name: manager.name, email: manager.email, passwordHash: "integration-test-only" },
        { id: sellerId, name: seller.name, email: seller.email, passwordHash: "integration-test-only" }
      ] });
      await prisma.userLocationAccess.createMany({ data: [
        { userId: managerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true },
        { userId: sellerId, locationId, validFrom: new Date("2026-01-01T00:00:00.000Z"), canManageAppointments: true, canOwnAppointments: true, canViewLimitedData: true }
      ] });
      await prisma.customer.create({ data: { id: customerId, organizationId, customerNumber: "CUS-UCRM-039", displayName: `${prefix} Customer`, ownerUserId: sellerId, sourceCode: "UCRM_INTEGRATION_TEST" } });
      await prisma.vehicle.create({ data: { id: vehicleId, organizationId, vehicleNumber: "VEH-UCRM-039", year: 2019, make: "Honda", model: "Accord" } });
      await prisma.serviceVisit.create({
        data: {
          id: serviceVisitId,
          arrivedAt: now,
          concernSummary: "Core CRM slice dispatch proof.",
          consentStatus: "NOT_REQUIRED",
          createdByUserId: managerId,
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
          nextAction: "Complete CRM core slice gate dispatch review.",
          openedAt: now,
          operatingState: "ACTIVE",
          organizationId,
          origin: "CUSTOMER_REPAIR",
          ownerUserId: managerId,
          repairOrderNumber: "RO-UCRM-039",
          serviceVisitId,
          stageStartedAt: now,
          targetAt: new Date("2026-08-26T20:00:00.000Z"),
          vehicleId,
          version: 2
        }
      });

      const created = await createUnifiedCrmOpportunity(manager, {
        customerId,
        idempotencyKey: `${prefix}-create`,
        nextActionDueAt: "2026-08-26T19:00:00.000Z",
        nextActionLabel: "Qualify Accord opportunity",
        ownerUserId: sellerId,
        summary: "Customer is ready for an end-to-end CRM opportunity proof.",
        title: "2019 Honda Accord core CRM opportunity"
      }, { mode: "REVIEW", now: () => now, scopeRepository });
      opportunityNumber = created.opportunity.opportunityNumber;

      const transitioned = await transitionUnifiedCrmOpportunity(manager, opportunityNumber, {
        expectedVersion: created.opportunity.version,
        idempotencyKey: `${prefix}-transition`,
        nextActionDueAt: "2026-08-27T18:00:00.000Z",
        nextActionLabel: "Schedule and dispatch linked work",
        reason: "Customer is qualified for the UCRM-039 core slice gate.",
        toStage: "QUALIFIED"
      }, { mode: "REVIEW", now: () => now, scopeRepository });

      const task = await createUnifiedCrmOpportunityTaskBridge(manager, opportunityNumber, {
        brief: "Document the UCRM-039 opportunity follow-up and linked operational work.",
        dueAt: "2026-08-26T21:00:00.000Z",
        expectedVersion: transitioned.opportunity.version,
        idempotencyKey: `${prefix}-task`,
        title: "UCRM-039 core follow-up"
      }, { mode: "REVIEW", now: () => now, scopeRepository });
      taskId = task.task.id;

      const appointment = await createUnifiedCrmOpportunityAppointmentBridge(manager, opportunityNumber, {
        appointmentNumber,
        expectedVersion: transitioned.opportunity.version + 1,
        idempotencyKey: `${prefix}-appointment`,
        locationId,
        schedulingTimezone: "America/Chicago",
        title: "UCRM-039 customer appointment"
      }, { mode: "REVIEW", now: () => now, scopeRepository });
      appointmentId = appointment.appointment.id;

      const dispatch = await createUnifiedCrmOpportunityDispatchBridge(manager, opportunityNumber, {
        expectedTargetVersion: 2,
        expectedVersion: transitioned.opportunity.version + 2,
        idempotencyKey: `${prefix}-dispatch`,
        repairOrderId,
        targetKind: "REPAIR_ORDER"
      }, { mode: "REVIEW", now: () => now, scopeRepository });

      const managerDetail = await getUnifiedCrmOpportunityDetail(manager, opportunityNumber, { mode: "REVIEW", now: () => now, scopeRepository });
      const sellerDetail = await getUnifiedCrmOpportunityDetail(seller, opportunityNumber, { mode: "REVIEW", now: () => now, scopeRepository });
      const customer360 = await getUnifiedCrmCustomer360(seller, customerId, { readMode: "REVIEW", now: () => now, scopeRepository });

      expect(dispatch.target).toMatchObject({ repairOrderId, repairOrderNumber: "RO-UCRM-039", targetKind: "REPAIR_ORDER" });
      expect(managerDetail.lifecycle).toMatchObject({ stage: "QUALIFIED", version: 5 });
      expect(sellerDetail.visibility).toBe("owned");
      expect(sellerDetail.taskActivity.links).toHaveLength(1);
      expect(sellerDetail.appointmentActivity.links).toHaveLength(1);
      expect(sellerDetail.dispatchActivity.links).toMatchObject([{ repairOrderId, repairOrderNumber: "RO-UCRM-039" }]);
      expect(customer360.opportunityLensObservation).toMatchObject({ dispatchLinkCount: 1, visibleRecordCount: 1 });
      expect(customer360.opportunityLenses).toMatchObject([{ id: opportunityNumber, dispatchLinkCount: 1 }]);

      const counts = await prisma.$queryRaw<Array<{ auditRows: bigint; commandRows: bigint; dispatchRows: bigint; domainRows: bigint; outboxRows: bigint; stageRows: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'OPPORTUNITY' AND "subjectId" = ${opportunityNumber}) AS "commandRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'OPPORTUNITY' AND "subjectId" = ${opportunityNumber}) AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseDomainEvent" WHERE "organizationId" = ${organizationId} AND "aggregateType" = 'OPPORTUNITY' AND "aggregateId" = ${opportunityNumber}) AS "domainRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" WHERE "organizationId" = ${organizationId} AND "messageKey" = ${opportunityNumber}) AS "outboxRows",
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityStageEvent" WHERE "organizationId" = ${organizationId} AND "opportunityId" = (SELECT "id" FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId} AND "opportunityNumber" = ${opportunityNumber})) AS "stageRows",
          (SELECT COUNT(*) FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}) AS "dispatchRows"
      `;
      expect(counts).toHaveLength(1);
      expect(Number(counts[0].commandRows)).toBe(5);
      expect(Number(counts[0].auditRows)).toBe(5);
      expect(Number(counts[0].domainRows)).toBe(5);
      expect(Number(counts[0].outboxRows)).toBe(5);
      expect(Number(counts[0].stageRows)).toBe(2);
      expect(Number(counts[0].dispatchRows)).toBe(1);

      await expect(getUnifiedCrmOpportunityDetail(seller, opportunityNumber, {
        mode: "OFF",
        now: () => now,
        scopeRepository
      })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    } finally {
      if (taskId) {
        await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityTaskLink" WHERE "taskId" = ${taskId}`;
        await prisma.task.deleteMany({ where: { id: taskId } });
      }
      if (appointmentId) {
        await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityAppointmentLink" WHERE "appointmentId" = ${appointmentId}`;
        await prisma.appointmentHistoryEvent.deleteMany({ where: { appointmentId } });
        await prisma.appointmentCommandLedger.deleteMany({ where: { appointmentId } });
        await prisma.appointment.deleteMany({ where: { id: appointmentId } });
      }
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityDispatchLink" WHERE "organizationId" = ${organizationId}`;
      if (opportunityNumber) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: opportunityNumber } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "OPPORTUNITY", aggregateId: opportunityNumber } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "OPPORTUNITY", subjectId: opportunityNumber } });
      }
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
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
