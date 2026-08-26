import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-041 quote draft workflow runtime proof", () => {
  it("creates, replays, and revises quote drafts with governed ledger evidence", async () => {
    const [
      { prisma },
      { getUnifiedCrmQuoteDraftWorkspace, saveUnifiedCrmQuoteDraft },
      { getUnifiedCrmQuoteFoundation }
    ] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-quote-draft-service"),
      import("@/server/services/unified-crm-quote-foundation-service")
    ]);
    const prefix = `ucrm-quote-draft-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const now = new Date("2026-08-26T19:00:00.000Z");
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

    try {
      await prisma.organization.create({ data: { id: organizationId, code: `${prefix}-ORG`, name: `${prefix} Organization` } });
      await prisma.location.create({ data: { id: locationId, organizationId, code: `${prefix}-LOC`, name: `${prefix} Location`, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      await prisma.user.createMany({ data: [
        { id: managerId, name: `${prefix} Manager`, email: `${prefix}-manager@example.test`, passwordHash: "integration-test-only" },
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
          customerNumber: "CUS-UCRM-041",
          displayName: `${prefix} Customer`,
          ownerUserId: sellerId,
          sourceCode: "UCRM_INTEGRATION_TEST"
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_041",
          title: "Draft quote workflow proof",
          summary: "Proves governed quote draft persistence.",
          nextActionLabel: "Prepare quote",
          nextActionDueAt: new Date("2026-08-27T19:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        }
      });

      const createCommand = {
        customerId,
        discountCents: 5000,
        expectedVersion: 0,
        idempotencyKey: `${prefix}-create`,
        lineItems: [
          { description: "Front brake service", quantity: 1, taxable: true, unitPriceCents: 45000 },
          { description: "Shop supplies", quantity: 2, taxable: false, unitPriceCents: 2500 }
        ],
        opportunityId,
        priceSource: "Internal estimate",
        reason: "Create the first governed quote draft for runtime proof.",
        taxRateBasisPoints: 825,
        termsSummary: "Valid for 7 days."
      };
      const created = await saveUnifiedCrmQuoteDraft(seller, createCommand, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });
      quoteId = created.quoteId;
      const replayed = await saveUnifiedCrmQuoteDraft(seller, createCommand, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });

      expect(created).toMatchObject({
        duplicate: false,
        latestVersionNumber: 1,
        state: "DRAFT",
        version: 1
      });
      expect(replayed).toMatchObject({
        duplicate: true,
        latestVersionNumber: 1,
        quoteId,
        quoteNumber: created.quoteNumber,
        version: 1
      });

      const workspace = await getUnifiedCrmQuoteDraftWorkspace(seller, quoteId, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });
      expect(workspace).toMatchObject({
        action: { state: "READY" },
        form: {
          expectedVersion: 1,
          mode: "update",
          quoteId,
          quoteNumber: created.quoteNumber,
          termsSummary: "Valid for 7 days."
        },
        state: "LIVE_DRAFT",
        visibility: "owned"
      });
      expect(workspace.visibleDrafts).toHaveLength(1);

      const revised = await saveUnifiedCrmQuoteDraft(seller, quoteId, {
        customerId,
        discountCents: 0,
        expectedVersion: 1,
        idempotencyKey: `${prefix}-revise`,
        lineItems: [{ description: "Front brake service and road test", quantity: 1, taxable: true, unitPriceCents: 47500 }],
        opportunityId,
        priceSource: "Advisor revised estimate",
        reason: "Revise the draft after confirming the scope.",
        taxRateBasisPoints: 825,
        termsSummary: "Valid for 5 days."
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });

      expect(revised).toMatchObject({
        duplicate: false,
        latestVersionNumber: 2,
        quoteId,
        quoteNumber: created.quoteNumber,
        state: "DRAFT",
        version: 2
      });
      await expect(saveUnifiedCrmQuoteDraft(seller, quoteId, {
        customerId,
        discountCents: 0,
        expectedVersion: 1,
        idempotencyKey: `${prefix}-stale`,
        lineItems: [{ description: "Stale revision", quantity: 1, taxable: true, unitPriceCents: 1000 }],
        opportunityId,
        priceSource: "Stale estimate",
        reason: "This stale revision should be rejected.",
        taxRateBasisPoints: 0,
        termsSummary: "Stale terms."
      }, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      })).rejects.toMatchObject({ code: "QUOTE_VERSION_CONFLICT" });

      const foundation = await getUnifiedCrmQuoteFoundation(seller, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository,
        selectedQuoteId: quoteId
      });
      expect(foundation).toMatchObject({
        commands: {
          draft: { available: true, state: "READY" },
          present: { available: false, state: "HELD" }
        },
        draftWorkspace: {
          expectedVersionNumber: 2,
          mode: "REVISE",
          quoteId,
          quoteNumber: created.quoteNumber,
          subtotalCents: 47500,
          termsSummary: "Valid for 5 days."
        },
        liveObservation: { state: "READY", visibleRecordCount: 1 },
        state: "HELD_REVIEW",
        visibility: "owned"
      });

      const counts = await prisma.$queryRaw<Array<{ aggregateRows: bigint; auditRows: bigint; commandRows: bigint; domainRows: bigint; outboxRows: bigint; quoteRows: bigint; versionRows: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM "UnifiedCrmQuoteRecord" WHERE "organizationId" = ${organizationId}) AS "quoteRows",
          (SELECT COUNT(*) FROM "UnifiedCrmQuoteVersion" WHERE "organizationId" = ${organizationId}) AS "versionRows",
          (SELECT COUNT(*) FROM "EnterpriseCommandLedger" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'QUOTE' AND "subjectId" = ${quoteId}) AS "commandRows",
          (SELECT COUNT(*) FROM "EnterpriseAuditEvent" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'QUOTE' AND "subjectId" = ${quoteId}) AS "auditRows",
          (SELECT COUNT(*) FROM "EnterpriseDomainEvent" WHERE "organizationId" = ${organizationId} AND "aggregateType" = 'QUOTE' AND "aggregateId" = ${quoteId}) AS "domainRows",
          (SELECT COUNT(*) FROM "EnterpriseOutboxMessage" WHERE "organizationId" = ${organizationId} AND "messageKey" = ${quoteId}) AS "outboxRows",
          (SELECT COUNT(*) FROM "EnterpriseAggregateVersion" WHERE "organizationId" = ${organizationId} AND "subjectType" = 'QUOTE' AND "subjectId" = ${quoteId}) AS "aggregateRows"
      `;
      expect(counts).toHaveLength(1);
      expect(Number(counts[0].quoteRows)).toBe(1);
      expect(Number(counts[0].versionRows)).toBe(2);
      expect(Number(counts[0].commandRows)).toBe(2);
      expect(Number(counts[0].auditRows)).toBe(2);
      expect(Number(counts[0].domainRows)).toBe(2);
      expect(Number(counts[0].outboxRows)).toBe(2);
      expect(Number(counts[0].aggregateRows)).toBe(1);

      await expect(saveUnifiedCrmQuoteDraft(seller, createCommand, {
        mode: "OFF",
        now: () => now,
        scopeRepository
      })).rejects.toMatchObject({ code: "QUOTE_OFF" });
    } finally {
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
