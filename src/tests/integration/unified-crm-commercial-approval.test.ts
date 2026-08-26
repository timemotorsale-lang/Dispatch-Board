import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-043 commercial approval runtime proof", () => {
  it("requests and decides commercial approval with separation of duties and durable evidence", async () => {
    const [
      { prisma },
      { saveUnifiedCrmQuoteDraft },
      { requestUnifiedCrmCommercialApproval, decideUnifiedCrmCommercialApproval }
    ] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-quote-draft-service"),
      import("@/server/services/unified-crm-commercial-approval-service")
    ]);
    const prefix = `ucrm-commercial-approval-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const now = new Date("2026-08-26T20:00:00.000Z");
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
    const scopeRepository = { async listActiveOrganizationIds() { return [organizationId]; } };
    let quoteId = "";
    let requestId = "";
    let managerRequestId = "";

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
      await prisma.customer.create({
        data: {
          id: customerId,
          organizationId,
          customerNumber: "CUS-UCRM-043",
          displayName: `${prefix} Customer`,
          ownerUserId: sellerId,
          sourceCode: "UCRM_INTEGRATION_TEST"
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_043",
          title: "Commercial approval proof",
          summary: "Proves internal quote approval request governance.",
          nextActionLabel: "Request commercial approval",
          nextActionDueAt: new Date("2026-08-27T20:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        }
      });

      const draft = await saveUnifiedCrmQuoteDraft(seller, {
        customerId,
        discountCents: 2500,
        expectedVersion: 0,
        idempotencyKey: `${prefix}-draft`,
        lineItems: [{ description: "Commercial approval package", quantity: 1, taxable: true, unitPriceCents: 52500 }],
        opportunityId,
        priceSource: "Internal estimate",
        reason: "Create quote draft before requesting commercial approval.",
        taxRateBasisPoints: 825,
        termsSummary: "Valid for 7 days."
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });
      quoteId = draft.quoteId;

      const requestCommand = {
        amountCents: 54331,
        discountCents: 2500,
        expectedQuoteVersion: draft.latestVersionNumber,
        idempotencyKey: `${prefix}-request`,
        purpose: "Manager approval before customer presentation",
        reason: "Request independent commercial approval for the exact draft quote."
      };
      const requested = await requestUnifiedCrmCommercialApproval(seller, quoteId, requestCommand, {
        mode: "REVIEW",
        scopeRepository
      });
      requestId = requested.requestId;
      const replayedRequest = await requestUnifiedCrmCommercialApproval(seller, quoteId, requestCommand, {
        mode: "REVIEW",
        scopeRepository
      });

      expect(requested).toMatchObject({
        amountCents: 54331,
        decision: null,
        discountCents: 2500,
        duplicate: false,
        purpose: "Manager approval before customer presentation",
        quoteId,
        quoteNumber: draft.quoteNumber,
        quoteVersionNumber: 1,
        requestedByUserId: sellerId,
        status: "PENDING",
        version: 1
      });
      expect(replayedRequest).toMatchObject({
        duplicate: true,
        requestId,
        status: "PENDING",
        version: 1
      });

      await expect(decideUnifiedCrmCommercialApproval(seller, requestId, {
        decision: "APPROVED",
        expectedVersion: 1,
        idempotencyKey: `${prefix}-staff-decision`,
        reason: "A salesperson must not be able to decide approval requests."
      }, {
        mode: "REVIEW",
        scopeRepository
      })).rejects.toMatchObject({ code: "UNAUTHORIZED_COMMERCIAL_APPROVAL" });

      const managerRequested = await requestUnifiedCrmCommercialApproval(manager, quoteId, {
        amountCents: 54331,
        discountCents: 2500,
        expectedQuoteVersion: draft.latestVersionNumber,
        idempotencyKey: `${prefix}-manager-request`,
        purpose: "Manager-entered approval still needs independent decision",
        reason: "Create a second approval request to prove no self-approval."
      }, {
        mode: "REVIEW",
        scopeRepository
      });
      managerRequestId = managerRequested.requestId;
      await expect(decideUnifiedCrmCommercialApproval(manager, managerRequestId, {
        decision: "APPROVED",
        expectedVersion: 1,
        idempotencyKey: `${prefix}-self-approval`,
        reason: "The manager who requested approval must not decide it."
      }, {
        mode: "REVIEW",
        scopeRepository
      })).rejects.toMatchObject({ code: "SELF_APPROVAL_NOT_ALLOWED" });

      const decisionCommand = {
        decision: "APPROVED",
        expectedVersion: 1,
        idempotencyKey: `${prefix}-decision`,
        reason: "Manager independently approved this exact quote draft for the test."
      };
      const decided = await decideUnifiedCrmCommercialApproval(manager, requestId, decisionCommand, {
        mode: "REVIEW",
        scopeRepository
      });
      const replayedDecision = await decideUnifiedCrmCommercialApproval(manager, requestId, decisionCommand, {
        mode: "REVIEW",
        scopeRepository
      });

      expect(decided).toMatchObject({
        decision: "APPROVED",
        duplicate: false,
        requestId,
        status: "APPROVED",
        version: 2
      });
      expect(replayedDecision).toMatchObject({
        decision: "APPROVED",
        duplicate: true,
        requestId,
        status: "APPROVED",
        version: 2
      });
      await expect(decideUnifiedCrmCommercialApproval(manager, requestId, {
        decision: "DENIED",
        expectedVersion: 2,
        idempotencyKey: `${prefix}-late-denial`,
        reason: "Closed requests must not accept a second decision."
      }, {
        mode: "REVIEW",
        scopeRepository
      })).rejects.toMatchObject({ code: "REQUEST_NOT_PENDING" });

      const rows = await prisma.$queryRaw<Array<{ aggregateRows: bigint; auditRows: bigint; commandRows: bigint; decisionRows: bigint; domainRows: bigint; outboxRows: bigint; requestRows: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM "UnifiedCrmCommercialApprovalRequest" WHERE "organizationId" = ${organizationId}) AS "requestRows",
          (SELECT COUNT(*) FROM "UnifiedCrmCommercialApprovalDecision" WHERE "organizationId" = ${organizationId}) AS "decisionRows",
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'COMMERCIAL_APPROVAL' AND "subjectId" = ${requestId}) AS "commandRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'COMMERCIAL_APPROVAL' AND "subjectId" = ${requestId}) AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseDomainEvent" WHERE "organizationId" = ${organizationId} AND "aggregateType" = 'COMMERCIAL_APPROVAL' AND "aggregateId" = ${requestId}) AS "domainRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" WHERE "organizationId" = ${organizationId} AND "messageKey" = ${requestId}) AS "outboxRows",
          (SELECT COUNT(*) FROM "EnterpriseAggregateVersion" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'COMMERCIAL_APPROVAL' AND "subjectId" = ${requestId}) AS "aggregateRows"
      `;
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].requestRows)).toBe(2);
      expect(Number(rows[0].decisionRows)).toBe(1);
      expect(Number(rows[0].commandRows)).toBe(2);
      expect(Number(rows[0].auditRows)).toBe(2);
      expect(Number(rows[0].domainRows)).toBe(2);
      expect(Number(rows[0].outboxRows)).toBe(2);
      expect(Number(rows[0].aggregateRows)).toBe(1);
    } finally {
      if (requestId) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: requestId } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "COMMERCIAL_APPROVAL", aggregateId: requestId } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: requestId } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: requestId } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: requestId } });
      }
      if (managerRequestId) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: managerRequestId } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "COMMERCIAL_APPROVAL", aggregateId: managerRequestId } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: managerRequestId } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: managerRequestId } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "COMMERCIAL_APPROVAL", subjectId: managerRequestId } });
      }
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalDecision" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalRequest" WHERE "organizationId" = ${organizationId}`;
      if (quoteId) {
        await prisma.enterpriseOutboxMessage.deleteMany({ where: { organizationId, messageKey: quoteId } });
        await prisma.enterpriseDomainEvent.deleteMany({ where: { organizationId, aggregateType: "QUOTE", aggregateId: quoteId } });
        await prisma.enterpriseAuditEvent.deleteMany({ where: { organizationId, subjectType: "QUOTE", subjectId: quoteId } });
        await prisma.enterpriseCommandLedger.deleteMany({ where: { organizationId, subjectType: "QUOTE", subjectId: quoteId } });
        await prisma.enterpriseAggregateVersion.deleteMany({ where: { organizationId, subjectType: "QUOTE", subjectId: quoteId } });
      }
      await prisma.unifiedCrmQuoteVersion.deleteMany({ where: { organizationId } });
      await prisma.unifiedCrmQuoteRecord.deleteMany({ where: { organizationId } });
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmOpportunityRecord" WHERE "organizationId" = ${organizationId}`;
      await prisma.customer.deleteMany({ where: { organizationId } });
      await prisma.userLocationAccess.deleteMany({ where: { locationId } });
      await prisma.location.deleteMany({ where: { id: locationId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerId, sellerId] } } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.$disconnect();
    }
  });
});
