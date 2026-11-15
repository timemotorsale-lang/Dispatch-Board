import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

// Opt-in and exact target guard: never run these writes against a preview schema.
describe.skipIf(process.env.RUN_DEPOSIT_DB_INTEGRATION !== "1")("isolated deposit database integration", () => {
  it.each(["Inventory Manager", "Operations Coordinator", "Salesperson", "Collections"])("%s can issue estimates and financial receipts with store grants, preserving baseline and cross-store boundaries", async role => {
    const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
    if (target.protocol !== "postgresql:" || target.hostname !== "127.0.0.1" || target.port !== "55439" || target.searchParams.get("schema") !== "dispatch_board_e2e_deposit_integration_20261114" || target.searchParams.get("connection_limit") !== "2" || [...target.searchParams.keys()].some(key => !["schema", "connection_limit", "pool_timeout"].includes(key))) throw new Error("Exact isolated deposit integration target and connection_limit=2 required.");
    const { prisma } = await import("@/server/db/client");
    const { executeServiceBilling, getServiceBilling } = await import("@/server/service-billing/service");
    const { serviceInvoiceCandidate } = await import("@/server/service-close-parts/invoice-candidate");
    const { recordEstimateDocument, recordAuthorizationDocument } = await import("@/server/repair-order/service-documents");
    const prefix = `deposit-proof-${randomUUID()}`, organizationId = "org-time-motor-sales";
    const actor = { id: `${prefix}-actor`, name: "Synthetic deposit operator", email: `${prefix}@example.test`, isActive: true, roles: [role], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.organization.upsert({ where: { id: organizationId }, create: { id: organizationId, code: "TIME_MOTOR_SALES", name: "Synthetic isolated deposit organization" }, update: {} });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "disabled-synthetic-login" } });
    for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS"]) {
      const existing = await prisma.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId, code, locationId: null } });
      if (existing) await prisma.vehicleOperationsFeatureFlag.update({ where: { id: existing.id }, data: { mode: "GENERAL" } });
      else await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId, code, mode: "GENERAL", allowedUserIds: [] } });
    }
    const storedRole = await prisma.role.upsert({ where: { name: role }, create: { name: role }, update: {} });
    await prisma.userRole.create({ data: { userId: actor.id, roleId: storedRole.id } });
    const { executeAuthorityCommand } = await import("@/server/inventory-governance/authority-service");
    const administrator = { ...actor, id: `${prefix}-administrator`, email: `${prefix}-admin@example.test`, roles: ["General Manager"] };
    await prisma.user.create({ data: { id: administrator.id, name: "Synthetic authority administrator", email: administrator.email, passwordHash: "disabled-synthetic-login" } });
    const authorityInput = (locationId: string, capability: string, effect = "ALLOW", expectedVersion = 0, suffix = "grant") => ({ action: "UPSERT_CAPABILITY_GRANT", userId: actor.id, locationId, capability, effect, expectedVersion, validFrom: "2026-01-01T00:00:00Z", reason: "Synthetic explicitly approved store authority", idempotencyKey: `${prefix}-${capability}-${suffix}` });
    const { presentRepairEstimate } = await import("@/server/shop-planning/service");
    const { getServiceDocumentForPrint } = await import("@/server/repair-order/document-service");
    const { estimateReviewScope } = await import("@/lib/estimate-review");
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
      const local = await fixture(organizationId, actor.id, "local"), other = await fixture(organizationId, actor.id, "other"), options = { organizationId };
      const estimateOrder = await fixture(organizationId, actor.id, "estimate");
      // The estimate test uses the same authorized store, but a separate RO so its
      // new estimate cannot invalidate the ready invoice package used below.
      await prisma.repairOrder.update({ where: { id: estimateOrder.order.id }, data: { locationId: local.location.id } });
      const lines = [{ key: "synthetic-manual-labor", type: "LABOR", description: "Synthetic reviewed repair scope", quantity: 1, unitPriceCents: 10000, laborGuideMinutes: 60, taxable: false }];
      const estimateInput = (vehicleId: string, key: string) => ({ lineItems: lines, presentedAt: "2026-02-01T12:00:00Z", expiresAt: "2027-01-01T12:00:00Z", taxBoundary: "Synthetic non-taxable test", presentationChannel: "INTERNAL", reason: "Synthetic manually reviewed estimate", idempotencyKey: `${prefix}-${key}`, manualLaborReview: { engine: "Synthetic engine", configuration: "Synthetic configuration", source: "Isolated test review", limitations: "Not customer work", scope: estimateReviewScope(vehicleId, lines) } });
      for (const data of [estimateOrder, other]) await prisma.repairDiagnosisVersion.create({ data: { organizationId, repairOrderId: data.order.id, version: 1, concern: "Synthetic concern", symptoms: [], tests: [], evidence: ["Synthetic only"], cause: "Synthetic cause", uncertainty: "LOW", recommendation: "Synthetic repair", proposedCorrection: "Synthetic repair", technicianUserId: actor.id, diagnosedAt: new Date("2026-01-01") } });
      const deposit = { action: "DEPOSIT", expectedVersion: 0, amountCents: 1000, method: "CASH", occurredAt: "2026-01-20T12:00:00Z", reference: `${prefix}-deposit`, evidence: ["Synthetic cashier evidence"], reason: "Synthetic permission matrix deposit", idempotencyKey: `${prefix}-deposit` };
      await expect(executeServiceBilling(actor, local.order.id, deposit, options)).rejects.toThrow("SERVICE_BILLING_MANAGE");
      await expect(getServiceBilling(actor, local.order.id, organizationId)).rejects.toThrow("SERVICE_BILLING_VIEW");
      if (role !== "Inventory Manager") await expect(presentRepairEstimate(actor, estimateOrder.order.id, estimateInput(estimateOrder.order.vehicleId, "no-grant"), options)).rejects.toThrow("REPAIR_ORDER_MANAGE");
      for (const capability of ["REPAIR_ORDER_VIEW", "REPAIR_ORDER_MANAGE", "SERVICE_BILLING_VIEW", "SERVICE_BILLING_MANAGE"]) {
        const input = authorityInput(local.location.id, capability);
        await expect(executeAuthorityCommand(actor, input, options)).rejects.toThrow("Only the General Manager");
        const granted = await executeAuthorityCommand(administrator, input, options);
        expect(granted).toMatchObject({ duplicate: false, version: 1 });
        expect(await executeAuthorityCommand(administrator, input, options)).toMatchObject({ duplicate: true, version: 1 });
        const ledger = await prisma.enterpriseCommandLedger.findFirstOrThrow({ where: { organizationId, idempotencyKey: input.idempotencyKey } });
        const audit = await prisma.enterpriseAuditEvent.findFirstOrThrow({ where: { commandId: ledger.id } });
        expect(audit.priorValue).toBeNull();
        expect(audit.newValue).toMatchObject({ effect: "ALLOW", userId: actor.id, locationId: local.location.id });
        expect(await prisma.enterpriseAuditEvent.count({ where: { commandId: ledger.id } })).toBe(1);
        const event = await prisma.enterpriseDomainEvent.findFirstOrThrow({ where: { commandId: ledger.id } });
        expect(await prisma.enterpriseOutboxMessage.count({ where: { domainEventId: event.id } })).toBe(1);
      }
      await presentRepairEstimate(actor, estimateOrder.order.id, estimateInput(estimateOrder.order.vehicleId, "estimate-allowed"), options);
      const issuedEstimate = await prisma.serviceDocument.findFirstOrThrow({ where: { organizationId, repairOrderId: estimateOrder.order.id, kind: "ESTIMATE", sourceVersion: 2 } });
      expect(await getServiceDocumentForPrint(actor, estimateOrder.order.id, issuedEstimate.id)).toMatchObject({ id: issuedEstimate.id });
      const collected = await executeServiceBilling(actor, local.order.id, deposit, options);
      const depositDocument = (collected.result as { documentId: string }).documentId;
      expect(await getServiceDocumentForPrint(actor, local.order.id, depositDocument)).toMatchObject({ id: depositDocument, kind: "DEPOSIT" });
      const post = await executeServiceBilling(actor, local.order.id, { action: "POST_INVOICE", packageId: local.invoicePackage.id, occurredAt: local.now.toISOString(), idempotencyKey: `${prefix}-post`, reason: "Synthetic approved invoice permission proof" }, options);
      expect(await getServiceDocumentForPrint(actor, local.order.id, (post.result as { documentId: string }).documentId)).toMatchObject({ kind: "INVOICE" });
      const payment = await executeServiceBilling(actor, local.order.id, { ...deposit, action: "PAYMENT", invoiceId: local.invoicePackage.id, expectedVersion: 1, occurredAt: "2026-02-02T12:00:00Z", reference: `${prefix}-payment`, idempotencyKey: `${prefix}-payment` }, options);
      const paymentDocument = (payment.result as { documentId: string }).documentId;
      expect(await getServiceDocumentForPrint(actor, local.order.id, paymentDocument)).toMatchObject({ id: paymentDocument, kind: "PAYMENT" });
      expect(await executeServiceBilling(actor, other.order.id, { ...deposit, idempotencyKey: `${prefix}-other` }, options).then(() => "unexpected", error => error.message)).toContain("SERVICE_BILLING_MANAGE");
      await expect(getServiceBilling(actor, other.order.id, organizationId)).rejects.toThrow("SERVICE_BILLING_VIEW");
      if (role === "Inventory Manager") {
        // A scoped grant adds permission; it does not remove this role's existing RO authority.
        await presentRepairEstimate(actor, other.order.id, estimateInput(other.order.vehicleId, "role-default-other"), options);
      } else await expect(presentRepairEstimate(actor, other.order.id, estimateInput(other.order.vehicleId, "other-denied"), options)).rejects.toThrow("REPAIR_ORDER_MANAGE");
      await executeAuthorityCommand(administrator, authorityInput(other.location.id, "REPAIR_ORDER_MANAGE", "DENY", 0, "other-deny"), options);
      await expect(presentRepairEstimate(actor, other.order.id, estimateInput(other.order.vehicleId, "explicit-denied"), options)).rejects.toThrow("REPAIR_ORDER_MANAGE");
      const rejected = authorityInput(local.location.id, "SERVICE_BILLING_VIEW", "DENY", 1, "rollback");
      // Simulate a stale/deleted authenticated administrator: command-ledger FK fails
      // after aggregate and grant writes, which must all roll back together.
      await expect(executeAuthorityCommand({ ...administrator, id: `${prefix}-missing-admin` }, rejected, options)).rejects.toMatchObject({ code: "P2003" });
      expect(await prisma.vehicleCapabilityGrant.findFirstOrThrow({ where: { organizationId, userId: actor.id, locationId: local.location.id, capability: "SERVICE_BILLING_VIEW" } })).toMatchObject({ effect: "ALLOW" });
      expect(await prisma.enterpriseCommandLedger.count({ where: { organizationId, idempotencyKey: rejected.idempotencyKey } })).toBe(0);
      const revoke = authorityInput(local.location.id, "SERVICE_BILLING_VIEW", "DENY", 1, "revoke");
      expect(await executeAuthorityCommand(administrator, revoke, options)).toMatchObject({ version: 2 });
      const revokeLedger = await prisma.enterpriseCommandLedger.findFirstOrThrow({ where: { organizationId, idempotencyKey: revoke.idempotencyKey } });
      const revokeAudit = await prisma.enterpriseAuditEvent.findFirstOrThrow({ where: { commandId: revokeLedger.id } });
      expect(revokeAudit.priorValue).toMatchObject({ effect: "ALLOW" });
      expect(revokeAudit.newValue).toMatchObject({ effect: "DENY" });
      await expect(getServiceDocumentForPrint(actor, local.order.id, paymentDocument)).rejects.toThrow("SERVICE_BILLING_VIEW");
      expect(await prisma.userRole.findMany({ where: { userId: actor.id }, select: { role: { select: { name: true } } } })).toEqual([{ role: { name: role } }]);
    } finally { await prisma.$disconnect(); }
  }, 90000);
});
