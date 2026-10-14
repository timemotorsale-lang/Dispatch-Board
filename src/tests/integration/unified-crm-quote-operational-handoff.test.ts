import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

const databaseIntegrationEnabled = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!databaseIntegrationEnabled)("Unified CRM UCRM-045 quote operational handoff boundary runtime proof", () => {
  it("prepares approved quote handoff data without mutating operational records", async () => {
    const [{ prisma }, { prepareUnifiedCrmQuoteOperationalHandoff }] = await Promise.all([
      import("@/server/db/client"),
      import("@/server/services/unified-crm-quote-operational-handoff-service")
    ]);
    const prefix = `ucrm-quote-handoff-it-${randomUUID()}`;
    const organizationId = `${prefix}-org`;
    const locationId = `${prefix}-location`;
    const managerId = `${prefix}-manager`;
    const sellerId = `${prefix}-seller`;
    const customerId = `${prefix}-customer`;
    const opportunityId = `${prefix}-opportunity`;
    const quoteId = `${prefix}-quote`;
    const approvalRequestId = `${prefix}-approval`;
    const approvalDecisionId = `${prefix}-decision`;
    const now = new Date("2026-08-26T22:00:00.000Z");
    const seller = {
      id: sellerId,
      name: `${prefix} Seller`,
      email: `${prefix}-seller@example.test`,
      isActive: true,
      roles: ["Salesperson"],
      duties: { direct: [], roleDefaults: [], all: [] }
    };
    const scopeRepository = { async listActiveOrganizationIds() { return [organizationId]; } };

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
          customerNumber: "CUS-UCRM-045",
          displayName: `${prefix} Customer`,
          ownerUserId: sellerId,
          sourceCode: "UCRM_INTEGRATION_TEST"
        }
      });
      await prisma.unifiedCrmOpportunityRecord.create({
        data: {
          id: opportunityId,
          organizationId,
          opportunityNumber: "opp_ucrm_045",
          title: "Quote handoff boundary",
          summary: "Proves quote handoff cannot mutate operational records.",
          nextActionLabel: "Prepare handoff packet",
          nextActionDueAt: new Date("2026-08-27T22:00:00.000Z"),
          createdByUserId: managerId,
          customerId,
          ownerUserId: sellerId,
          version: 1
        }
      });
      await prisma.unifiedCrmQuoteRecord.create({
        data: {
          id: quoteId,
          organizationId,
          quoteNumber: "Q-UCRM-045",
          opportunityId,
          customerId,
          createdByUserId: sellerId,
          latestVersionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Valid for handoff proof." },
          latestDraftSnapshot: {
            lineItems: [{ description: "Handoff proof package", quantity: 1, taxable: true, unitPriceCents: 52500 }],
            totals: { subtotalCents: 52500, totalCents: 54331 }
          },
          createdAt: now,
          updatedAt: now
        }
      });
      await prisma.unifiedCrmQuoteVersion.create({
        data: {
          quoteId,
          organizationId,
          versionNumber: 1,
          state: "DRAFT",
          currency: "USD",
          priceSource: "Internal estimate",
          termsSnapshot: { termsSummary: "Valid for handoff proof." },
          totalsSnapshot: { subtotalCents: 52500, totalCents: 54331 },
          lineItemsSnapshot: [{ description: "Handoff proof package", quantity: 1, taxable: true, unitPriceCents: 52500 }],
          createdByUserId: sellerId,
          createdAt: now
        }
      });
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmCommercialApprovalRequest" (
          "id", "organizationId", "quoteId", "quoteVersionNumber", "requestedByUserId", "status", "purpose",
          "amountCents", "discountCents", "reason", "policySnapshot", "requestSnapshot", "latestDecisionId", "version", "closedAt", "createdAt", "updatedAt"
        )
        VALUES (
          ${approvalRequestId}, ${organizationId}, ${quoteId}, 1, ${sellerId}, 'APPROVED', 'Approved quote handoff packet',
          54331, 2500, 'Approved for handoff proof.', '{"decision":"UCRM-DEC-004"}'::jsonb, '{"quote":"Q-UCRM-045"}'::jsonb,
          NULL, 2, ${now}, ${now}, ${now}
        )
      `;
      await prisma.$executeRaw`
        INSERT INTO "UnifiedCrmCommercialApprovalDecision" (
          "id", "organizationId", "requestId", "decision", "decidedByUserId", "reason", "decisionSnapshot", "createdAt"
        )
        VALUES (
          ${approvalDecisionId}, ${organizationId}, ${approvalRequestId}, 'APPROVED', ${managerId}, 'Approved for handoff proof.',
          '{"decision":"APPROVED"}'::jsonb, ${now}
        )
      `;
      await prisma.$executeRaw`
        UPDATE "UnifiedCrmCommercialApprovalRequest"
        SET "latestDecisionId" = ${approvalDecisionId}
        WHERE "id" = ${approvalRequestId}
      `;

      const before = await prisma.$queryRaw<Array<{ repairOrders: bigint; saleEvents: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM "RepairOrder" WHERE "organizationId" = ${organizationId}) AS "repairOrders",
          (SELECT COUNT(*) FROM "InventorySaleEvent" WHERE "organizationId" = ${organizationId}) AS "saleEvents"
      `;
      const model = await prepareUnifiedCrmQuoteOperationalHandoff(seller, quoteId, {
        mode: "REVIEW",
        now: () => now,
        scopeRepository
      });
      const after = await prisma.$queryRaw<Array<{ repairOrders: bigint; saleEvents: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM "RepairOrder" WHERE "organizationId" = ${organizationId}) AS "repairOrders",
          (SELECT COUNT(*) FROM "InventorySaleEvent" WHERE "organizationId" = ${organizationId}) AS "saleEvents"
      `;

      expect(model).toMatchObject({
        approval: { amountCents: 54331, discountCents: 2500, status: "APPROVED" },
        handoff: {
          customerLabel: `${prefix} Customer · CUS-UCRM-045`,
          opportunityNumber: "opp_ucrm_045",
          quoteId,
          quoteNumber: "Q-UCRM-045",
          quoteVersionNumber: 1
        },
        state: "PREPARED_HELD"
      });
      expect(model.blockedEffects.map((effect) => effect.effect)).toEqual([
        "MARK_SOLD",
        "MARK_DELIVERED",
        "CREATE_INVOICE",
        "COMPLETE_DISPATCH"
      ]);
      expect(after).toEqual(before);
    } finally {
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalDecision" WHERE "organizationId" = ${organizationId}`;
      await prisma.$executeRaw`DELETE FROM "UnifiedCrmCommercialApprovalRequest" WHERE "organizationId" = ${organizationId}`;
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
