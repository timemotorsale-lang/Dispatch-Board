import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

// Opt-in and exact target guard: never run these writes against a preview schema.
describe.skipIf(process.env.RUN_DEPOSIT_DB_INTEGRATION !== "1")("isolated deposit database integration", () => {
  it("commits exact receipts, reverses/refunds, rejects forbidden writes, preserves cash chronology and resolves concurrency with one winner", async () => {
    const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
    if (target.protocol !== "postgresql:" || target.hostname !== "127.0.0.1" || target.port !== "55439" || target.searchParams.get("schema") !== "dispatch_board_e2e_deposit_integration_20261114" || target.searchParams.get("connection_limit") !== "2" || [...target.searchParams.keys()].some(key => !["schema", "connection_limit", "pool_timeout"].includes(key))) throw new Error("Exact isolated deposit integration target and connection_limit=2 required.");
    const { prisma } = await import("@/server/db/client");
    const { executeServiceBilling, getServiceBilling } = await import("@/server/service-billing/service");
    const { readRepairDeposits } = await import("@/server/service-billing/deposits");
    const { getLaborBillingReport } = await import("@/server/service-billing/reporting");
    const { serviceInvoiceCandidate } = await import("@/server/service-close-parts/invoice-candidate");
    const { recordEstimateDocument, recordAuthorizationDocument } = await import("@/server/repair-order/service-documents");
    const { hashEnterpriseCommand } = await import("@/server/enterprise-command/domain");
    const prefix = `deposit-proof-${randomUUID()}`, organizationId = "org-time-motor-sales";
    const actor = { id: `${prefix}-actor`, name: "Synthetic deposit operator", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.organization.upsert({ where: { id: organizationId }, create: { id: organizationId, code: "TIME_MOTOR_SALES", name: "Synthetic isolated deposit organization" }, update: {} });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "disabled-synthetic-login" } });
    for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS"]) {
      const existing = await prisma.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId, code, locationId: null } });
      if (existing) await prisma.vehicleOperationsFeatureFlag.update({ where: { id: existing.id }, data: { mode: "GENERAL" } });
      else await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId, code, mode: "GENERAL", allowedUserIds: [] } });
    }
    async function fixture(org: string, userId: string, suffix: string) {
      const name = `${prefix}-${suffix}`, now = new Date("2026-02-01T12:00:00Z"), prior = new Date("2026-01-01T12:00:00Z");
      const location = await prisma.location.create({ data: { organizationId: org, code: name, name: "Synthetic billing site", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
      const vehicle = await prisma.vehicle.create({ data: { organizationId: org, vehicleNumber: name, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic billing fixture only", vinValidationSource: "SYNTHETIC" } });
      const customer = await prisma.customer.create({ data: { organizationId: org, customerNumber: name, displayName: "Original frozen synthetic customer" } });
      const visit = await prisma.serviceVisit.create({ data: { organizationId: org, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: prior, concernSummary: "Synthetic billing journey, not customer work", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: userId } });
      const order = await prisma.repairOrder.create({ data: { organizationId: org, locationId: location.id, serviceVisitId: visit.id, vehicleId: vehicle.id, customerId: customer.id, repairOrderNumber: name, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: prior, stageStartedAt: prior, ownerUserId: userId, targetAt: now, nextAction: "Isolated synthetic billing proof", stage: "HANDOFF" } });
      const estimate = await prisma.repairEstimateVersion.create({ data: { organizationId: org, repairOrderId: order.id, status: "PRESENTED", version: 1, lineItems: [{ key: "labor", type: "LABOR", description: "Synthetic approved repair", quantity: 1, unitPriceCents: 10000, laborGuideMinutes: 90, taxable: false }, { key: "part", type: "PART", description: "Synthetic installed part", partNumber: name, laborLineKey: "labor", quantity: 2, unitPriceCents: 2500, taxable: true }, { key: "fee", type: "FEE", description: "Synthetic service fee", quantity: 1, unitPriceCents: 500, taxable: false }], laborSubtotalCents: 10000, partsSubtotalCents: 5000, feeSubtotalCents: 500, discountCents: 1550, taxCents: 400, totalCents: 14350, taxBoundary: "Synthetic stored quote, not tax advice", expiresAt: new Date("2027-01-01"), presentedAt: prior, presentationChannel: "INTERNAL", authorUserId: userId } });
      await prisma.$transaction(tx => recordEstimateDocument(tx, org, order.id, estimate, userId));
      const authorization = await prisma.repairAuthorization.create({ data: { organizationId: org, repairOrderId: order.id, estimateVersionId: estimate.id, disposition: "ACCEPTED", channel: "INTERNAL", authorizedLineKeys: ["labor", "part", "fee"], authorizedAmountCents: 14350, decisionActorType: "SYNTHETIC_FIXTURE", decisionActorName: "Synthetic decision, not customer approval", decidedByUserId: userId, decidedAt: prior, reason: "Synthetic isolated authorization fixture" } });
      await prisma.$transaction(tx => recordAuthorizationDocument(tx, { organizationId: org, repairOrderId: order.id, estimateVersionId: estimate.id, authorizationId: authorization.id, disposition: "ACCEPTED", actor: "Synthetic fixture", channel: "INTERNAL", decidedAt: prior, approvedLineKeys: ["labor", "part", "fee"], createdByUserId: userId }));
      const job = await prisma.repairJob.create({ data: { organizationId: org, repairOrderId: order.id, jobNumber: "J001", estimateVersionId: estimate.id, authorizationId: authorization.id, authorizedLineKey: "labor", workTypeCode: "SYNTHETIC_BILLING", description: "Synthetic repair evidence", plannedCorrection: "Fixture only", laborGuideMinutes: 90, requiredSkills: [], requiredCertifications: [], bayRequirements: [], toolRequirements: [], priority: "NORMAL", dependencyJobIds: [], readinessReasonCodes: [], partsRequired: true, status: "QC_PASSED", authorizedAmountCents: 10000, createdByUserId: userId } });
      const clock = await prisma.repairJobLaborClock.create({ data: { organizationId: org, repairJobId: job.id, technicianUserId: userId, state: "FINISHED", startedAt: prior, accumulatedMinutes: 47, finishedAt: prior } });
      await prisma.repairQualityInspection.create({ data: { organizationId: org, repairOrderId: order.id, repairJobId: job.id, version: 1, disposition: "PASSED", templateCode: "SYNTHETIC", templateVersion: 1, templateSnapshot: {}, checkResults: [], completionEvidence: ["Synthetic fixture only"], safetyChecksPassed: true, peerVerificationRequired: false, peerVerificationPassed: false, roadTestRequired: false, roadTestOutcome: "NOT_REQUIRED", roadTestEvidence: [], failureReasonCodes: [], inspectorUserId: userId, inspectedAt: prior } });
      const part = await prisma.part.create({ data: { organizationId: org, partNumber: name, description: "Synthetic installed part", standardCostCents: 1000 } });
      await prisma.partCustodyEvent.create({ data: { organizationId: org, sourceType: "SYNTHETIC", sourceId: name, repairJobId: job.id, partId: part.id, type: "INSTALL", quantity: 2, unitCostCents: 1000, actorUserId: userId, occurredAt: prior, reason: "Synthetic installation fixture", evidence: ["Synthetic installation record"], correlationId: name } });
      const candidate = await serviceInvoiceCandidate(prisma, org, order.id);
      expect(candidate.mismatchCodes).toEqual([]);
      const invoicePackage = await prisma.serviceInvoicePackage.create({ data: { organizationId: org, repairOrderId: order.id, version: 1, status: "READY", authorizedTotalCents: candidate.ledger.totalCents, clockedLaborMinutes: candidate.clockedLaborMinutes, installedPartsCostCents: candidate.installedPartsCostCents, lineItems: candidate.ledger.lines, mismatchCodes: [], sourceSnapshot: { fingerprint: candidate.fingerprint, commercial: candidate.ledger, identity: candidate.identity, billingMode: "NATIVE" }, generatedAt: now, createdByUserId: userId, reason: "Synthetic isolated package fixture" } });
      return { order, invoicePackage, customer, estimate, authorization, clock, location, now };
    }
    try {
      const data = await fixture(organizationId, actor.id, "core"), options = { organizationId };
      const command = { action: "DEPOSIT", expectedVersion: 0, amountCents: 10000, method: "CASH", occurredAt: "2026-01-20T12:00:00Z", reference: `${prefix}-collection`, evidence: ["Synthetic cashier verification; no processor"], reason: "Isolated synthetic deposit verification", idempotencyKey: `${prefix}-collection` };
      const collect = await executeServiceBilling(actor, data.order.id, command, options);
      const collected = collect.result as { entryId: string; documentId: string };
      expect(await executeServiceBilling(actor, data.order.id, command, options)).toMatchObject({ duplicate: true, result: collected });
      await expect(executeServiceBilling(actor, data.order.id, { ...command, amountCents: 1 }, options)).rejects.toThrow("different request");
      const exact = await prisma.serviceDocument.findUniqueOrThrow({ where: { id: collected.documentId } });
      expect(exact).toMatchObject({ kind: "DEPOSIT", sourceId: collected.entryId, sourceVersion: 1 });
      expect(exact.sha256).toBe(hashEnterpriseCommand({ templateVersion: exact.templateVersion, content: exact.content }));
      await expect(prisma.$executeRaw`UPDATE "ServiceRepairDepositEntry" SET "amountCents"=1 WHERE id=${collected.entryId}`).rejects.toThrow("immutable");
      await expect(prisma.$executeRaw`DELETE FROM "ServiceRepairDepositEntry" WHERE id=${collected.entryId}`).rejects.toThrow("immutable");
      await expect(prisma.serviceDocument.delete({ where: { id: exact.id } })).rejects.toThrow("append-only");
      await expect(executeServiceBilling(actor, data.order.id, { ...command, expectedVersion: 1, amountCents: 1000, idempotencyKey: `${prefix}-same-ref` }, options)).rejects.toMatchObject({ code: "P2010", meta: { code: "23505" } });
      expect(await readRepairDeposits(prisma, organizationId, data.order.id)).toHaveLength(1);
      expect(await prisma.enterpriseCommandLedger.count({ where: { organizationId, idempotencyKey: `${prefix}-same-ref` } })).toBe(0);
      const denied = { ...actor, roles: ["Sales"] };
      await expect(executeServiceBilling(denied, data.order.id, { ...command, expectedVersion: 1, idempotencyKey: `${prefix}-denied` }, options)).rejects.toThrow("SERVICE_BILLING_MANAGE");
      await prisma.vehicleCapabilityGrant.create({ data: { organizationId, locationId: data.location.id, userId: actor.id, capability: "SERVICE_BILLING_MANAGE", effect: "DENY", validFrom: new Date("2026-01-01"), constraints: {} } });
      await expect(executeServiceBilling(actor, data.order.id, { ...command, expectedVersion: 1, idempotencyKey: `${prefix}-store-denied` }, options)).rejects.toThrow("SERVICE_BILLING_MANAGE");
      await prisma.vehicleCapabilityGrant.deleteMany({ where: { organizationId, locationId: data.location.id, userId: actor.id } });
      const post = await executeServiceBilling(actor, data.order.id, { action: "POST_INVOICE", packageId: data.invoicePackage.id, occurredAt: data.now.toISOString(), idempotencyKey: `${prefix}-post`, reason: "Synthetic approved invoice after QC" }, options);
      const posted = post.result as { documentId: string };
      expect(await prisma.serviceDocument.findUniqueOrThrow({ where: { id: posted.documentId } })).toMatchObject({ kind: "INVOICE", sourceId: data.invoicePackage.id });
      const apply = { ...command, action: "APPLY_DEPOSIT", expectedVersion: 1, invoiceExpectedVersion: 1, invoiceId: data.invoicePackage.id, relatedEntryId: collected.entryId, occurredAt: "2026-02-02T12:00:00Z", reference: `${prefix}-apply`, idempotencyKey: `${prefix}-apply` };
      const applied = await executeServiceBilling(actor, data.order.id, apply, options);
      expect(applied.result).toMatchObject({ invoiceBalance: { balanceCents: 4350 }, balance: { availableCents: 0, appliedCents: 10000 } });
      const application = (applied.result as { entryId: string }).entryId;
      const reverse = await executeServiceBilling(actor, data.order.id, { ...apply, action: "UNAPPLY_DEPOSIT", amountCents: 4000, expectedVersion: 2, invoiceExpectedVersion: 2, relatedEntryId: application, occurredAt: "2026-02-03T12:00:00Z", reference: `${prefix}-reverse`, idempotencyKey: `${prefix}-reverse` }, options);
      expect(reverse.result).toMatchObject({ invoiceBalance: { balanceCents: 8350 }, balance: { availableCents: 4000, appliedCents: 6000 } });
      const refund = await executeServiceBilling(actor, data.order.id, { ...command, action: "REFUND_DEPOSIT", amountCents: 2000, expectedVersion: 3, relatedEntryId: collected.entryId, occurredAt: "2026-02-04T12:00:00Z", reference: `${prefix}-refund`, idempotencyKey: `${prefix}-refund` }, options);
      expect(refund.result).toMatchObject({ balance: { availableCents: 2000, refundedCents: 2000 } });
      await executeServiceBilling(actor, data.order.id, { ...apply, amountCents: 2000, expectedVersion: 4, invoiceExpectedVersion: 3, occurredAt: "2026-02-05T12:00:00Z", reference: `${prefix}-reapply`, idempotencyKey: `${prefix}-reapply` }, options);
      // Failure occurs at the raw deposit INSERT, after the invoice entry and CAS writes.
      await expect(executeServiceBilling(actor, data.order.id, { ...apply, action: "UNAPPLY_DEPOSIT", amountCents: 100, expectedVersion: 5, invoiceExpectedVersion: 4, relatedEntryId: application, occurredAt: "2026-02-06T12:00:00Z", reference: `${prefix}-reverse`, idempotencyKey: `${prefix}-rollback-invoice` }, options)).rejects.toMatchObject({ code: "P2010", meta: { code: "23505" } });
      expect(await prisma.serviceInvoice.findUniqueOrThrow({ where: { id: data.invoicePackage.id } })).toMatchObject({ version: 4 });
      expect(await prisma.serviceInvoiceEntry.count({ where: { invoiceId: data.invoicePackage.id } })).toBe(3);
      expect(await prisma.enterpriseCommandLedger.count({ where: { organizationId, idempotencyKey: `${prefix}-rollback-invoice` } })).toBe(0);
      const state = await getServiceBilling(actor, data.order.id, organizationId);
      expect(state.deposits.entries).toHaveLength(5);
      expect(state.deposits.entries.every(entry => entry.documentId)).toBe(true);
      expect(state.invoices[0].balance).toMatchObject({ balanceCents: 6350 });
      const january = await getLaborBillingReport(actor, "2026-01-01", "2026-01-31", data.location.id);
      expect(january.activity.reduce((sum, entry) => sum + entry.cashAmountCents, 0)).toBe(10000);
      const february = await getLaborBillingReport(actor, "2026-02-01", "2026-02-28", data.location.id);
      expect(february.activity.reduce((sum, entry) => sum + entry.cashAmountCents, 0)).toBe(-2000);
      expect(february.depositTransfers).toHaveLength(3);
      expect(february.depositTransfers.every(entry => entry.cashAmountCents === 0)).toBe(true);
      expect(february.financial[0].balanceCents).toBe(6350);
      const race = await fixture(organizationId, actor.id, "race");
      const results = await Promise.allSettled(["one", "two"].map(key => executeServiceBilling(actor, race.order.id, { ...command, amountCents: 1000, reference: `${prefix}-${key}`, idempotencyKey: `${prefix}-${key}` }, options)));
      expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
      expect(await readRepairDeposits(prisma, organizationId, race.order.id)).toHaveLength(1);
      expect(await prisma.serviceDocument.count({ where: { organizationId, repairOrderId: race.order.id, kind: "DEPOSIT" } })).toBe(1);
      expect(await prisma.enterpriseCommandLedger.count({ where: { organizationId, subjectId: race.order.id, commandType: "DEPOSIT" } })).toBe(1);
      const raceState = await getServiceBilling(actor, race.order.id, organizationId);
      expect(raceState.deposits.version).toBe(1);
      expect(raceState.deposits.balance.availableCents).toBe(1000);
      await executeServiceBilling(actor, race.order.id, { action: "POST_INVOICE", packageId: race.invoicePackage.id, occurredAt: race.now.toISOString(), idempotencyKey: `${prefix}-race-post`, reason: "Synthetic concurrent invoice proof" }, options);
      const transfers = await Promise.allSettled(["one", "two"].map(key => executeServiceBilling(actor, race.order.id, { ...apply, amountCents: 700, expectedVersion: 1, invoiceExpectedVersion: 1, invoiceId: race.invoicePackage.id, relatedEntryId: raceState.deposits.entries[0].id, reference: `${prefix}-transfer-${key}`, idempotencyKey: `${prefix}-transfer-${key}` }, options)));
      expect(transfers.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(transfers.filter(result => result.status === "rejected")).toHaveLength(1);
      const finalRace = await getServiceBilling(actor, race.order.id, organizationId);
      expect(finalRace.deposits).toMatchObject({ version: 2, balance: { availableCents: 300, appliedCents: 700 } });
      expect(finalRace.deposits.entries).toHaveLength(2);
      expect(finalRace.invoices[0]).toMatchObject({ version: 2, balance: { balanceCents: 13650 } });
      expect(finalRace.invoices[0].entries).toHaveLength(1);
      expect(await prisma.serviceDocument.count({ where: { organizationId, repairOrderId: race.order.id, kind: "DEPOSIT_APPLICATION" } })).toBe(1);

    } finally { await prisma.$disconnect(); }
  }, 90000);
});
