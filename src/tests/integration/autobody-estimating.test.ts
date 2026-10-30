import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

describe.skipIf(process.env.RUN_AUTOBODY_DB !== "isolated")("isolated collision draft and estimate workflow", () => {
  let actor: AuthenticatedUser, locationId: string, vehicleId: string, repairOrderId: string, id: string, content: import("@/lib/autobody-estimating/domain").BodyDraft;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "invalid:");
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/dispatch_autobody_verify_\d+$/.test(url.pathname)) throw new Error("Synthetic collision tests require the disposable local verification database.");
    const { prisma } = await import("@/server/db/client"), { hashPassword } = await import("@/server/auth/password"), { INITIAL_ORGANIZATION } = await import("@/server/appointments/location-foundation");
    const org = INITIAL_ORGANIZATION.id, prefix = `body-proof-${randomUUID()}`;
    actor = { id: `${prefix}-actor`, email: `${prefix}@example.test`, name: "Synthetic collision estimator", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.user.create({ data: { id: actor.id, email: actor.email, name: actor.name, passwordHash: await hashPassword("Synthetic-body-123!") } });
    const role = await prisma.role.findFirstOrThrow({ where: { name: "General Manager" } });
    await prisma.userRole.create({ data: { userId: actor.id, roleId: role.id } });
    const location = await prisma.location.create({ data: { organizationId: org, code: prefix, name: "Synthetic collision verification site", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } }); locationId = location.id;
    for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS", "VEHICLE_360"]) await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: org, locationId, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId: org, vehicleNumber: prefix, year: 2017, make: "SYNTHETIC", model: "Collision fixture", vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic isolated verification vehicle", vinValidationSource: "SYNTHETIC" } }); vehicleId = vehicle.id;
    const customer = await prisma.customer.create({ data: { organizationId: org, customerNumber: prefix, displayName: "Synthetic collision customer" } });
    const now = new Date(), visit = await prisma.serviceVisit.create({ data: { organizationId: org, locationId, vehicleId, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: now, concernSummary: "Synthetic visible bumper damage", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: actor.id } });
    const order = await prisma.repairOrder.create({ data: { organizationId: org, locationId, vehicleId, customerId: customer.id, serviceVisitId: visit.id, repairOrderNumber: prefix, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: now, stageStartedAt: now, targetAt: now, ownerUserId: actor.id, nextAction: "Synthetic collision workflow", stage: "INTAKE" } }); repairOrderId = order.id;
    const { emptyBodyDraft, newBodyLine } = await import("@/lib/autobody-estimating/domain"), { getActiveLaborRate } = await import("@/server/services/labor-rate-settings");
    const rate = await getActiveLaborRate(actor);
    content = { ...emptyBodyDraft(Math.round(rate.laborRate * 100)), title: `Synthetic collision ${prefix}`, vehicleId, repairOrderId, taxBasisPoints: 0, taxReference: "Synthetic reviewed no-tax fixture, not tax advice", lines: [{ ...newBodyLine("body:front-cover:replace"), minutes: 90, basis: "Synthetic estimator-reviewed allowance", applicability: "Synthetic vehicle scope check", position: "front", note: "Synthetic bodywork fixture, no real repair" }] };
    id = randomUUID();
    mkdirSync("tmp/autobody", { recursive: true });
    writeFileSync("tmp/autobody/browser-fixture.json", JSON.stringify({ email: actor.email, password: "Synthetic-body-123!", userId: actor.id, repairOrderId, vehicleId, locationId, draftId: id }));
  }, 60000);
  it("saves shared drafts once, retains versions and rejects stale or altered requests", async () => {
    const { saveBodyDraft, readBodyWorkspace } = await import("@/server/autobody-estimating/service"), key = randomUUID();
    const input = { id, content, locationId, expectedVersion: 0, idempotencyKey: key };
    const result = await saveBodyDraft(actor, input); expect(result.duplicate).toBe(false);
    expect((await saveBodyDraft(actor, input)).duplicate).toBe(true);
    await expect(saveBodyDraft(actor, { ...input, content: { ...content, title: "Changed" } })).rejects.toThrow("save key");
    await expect(saveBodyDraft(actor, { ...input, idempotencyKey: randomUUID() })).rejects.toThrow("Another staff");
    await expect(readBodyWorkspace(null, { id })).rejects.toThrow("Authentication");
    await expect(readBodyWorkspace({ ...actor, roles: [], isActive: false }, { id })).rejects.toThrow();
    const opened = await readBodyWorkspace(actor, { id }); expect("record" in opened && opened.record?.version).toBe(1);
  });
  it("rejects a foreign organization vehicle or evidence before saving", async () => {
    const { prisma } = await import("@/server/db/client"), { saveBodyDraft } = await import("@/server/autobody-estimating/service");
    const org = await prisma.organization.create({ data: { code: `body-foreign-${randomUUID()}`, name: "Synthetic unrelated organization" } }), vehicle = await prisma.vehicle.create({ data: { organizationId: org.id, vehicleNumber: randomUUID(), vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic boundary fixture", vinValidationSource: "SYNTHETIC" } });
    await expect(saveBodyDraft(actor, { id: randomUUID(), locationId, expectedVersion: 0, idempotencyKey: randomUUID(), content: { ...content, vehicleId: vehicle.id, repairOrderId: null } })).rejects.toThrow("Vehicle was not found");
    await expect(saveBodyDraft(actor, { id: randomUUID(), locationId, expectedVersion: 0, idempotencyKey: randomUUID(), content: { ...content, evidenceIds: ["foreign-evidence"] } })).rejects.toThrow("evidence reference");
  });
  it("generates one frozen official estimate without a fabricated diagnosis", async () => {
    const { presentBodyDraft } = await import("@/server/autobody-estimating/service"), { prisma } = await import("@/server/db/client");
    const first = await presentBodyDraft(actor, id, 1), repeated = await presentBodyDraft(actor, id, 1);
    expect(first.estimateId).toBe(repeated.estimateId); expect(repeated.duplicate).toBe(true);
    expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId } })).toBe(1);
    expect(await prisma.repairDiagnosisVersion.count({ where: { repairOrderId } })).toBe(0);
    expect(await prisma.serviceDocument.count({ where: { repairOrderId, sourceId: first.estimateId, kind: "ESTIMATE" } })).toBe(1);
    expect(await prisma.repairAuthorization.count({ where: { repairOrderId } })).toBe(0);
    expect(await prisma.serviceInvoice.count({ where: { repairOrderId } })).toBe(0);
  }, 30000);
  it("creates a supplement with retained history and uses existing authorization/job services", async () => {
    const { supplementBodyDraft, saveBodyDraft, presentBodyDraft } = await import("@/server/autobody-estimating/service"), { prisma } = await import("@/server/db/client"), { decideRepairAuthorization, createApprovedRepairJobs } = await import("@/server/shop-planning/service");
    const original = await prisma.serviceDocument.findFirstOrThrow({ where: { repairOrderId, kind: "ESTIMATE" } });
    const supplement = await supplementBodyDraft(actor, id), nextId = randomUUID();
    supplement.content.lines[0].minutes = 120; supplement.content.supplementReason = "Synthetic teardown supplement: revised visible scope";
    await saveBodyDraft(actor, { id: nextId, locationId, expectedVersion: 0, idempotencyKey: randomUUID(), content: supplement.content });
    const issued = await presentBodyDraft(actor, nextId, 1), estimate = await prisma.repairEstimateVersion.findUniqueOrThrow({ where: { id: issued.estimateId } });
    expect(estimate.supersedesId).toBe(supplement.content.priorEstimateId);
    expect((await prisma.serviceDocument.findUniqueOrThrow({ where: { id: original.id } })).sha256).toBe(original.sha256);
    const lines = estimate.lineItems as unknown as { key: string }[];
    await decideRepairAuthorization(actor, repairOrderId, { estimateVersionId: estimate.id, disposition: "ACCEPTED", channel: "IN_PERSON", authorizedLineKeys: lines.map(line => line.key), authorizedAmountCents: estimate.totalCents, decisionActorType: "CUSTOMER", decisionActorName: "Synthetic isolated decision, not actual consent", decidedAt: new Date().toISOString(), idempotencyKey: randomUUID(), reason: "Synthetic fixture only; not actual customer approval" });
    await createApprovedRepairJobs(actor, repairOrderId, { idempotencyKey: randomUUID(), reason: "Synthetic approved collision job verification" });
    const job = await prisma.repairJob.findFirstOrThrow({ where: { repairOrderId } });
    expect(job.laborGuideMinutes).toBe(120); expect(job.requiredSkills).toContain("BODY_TECHNICIAN");
    expect(await prisma.autobodyEstimateDraftRevision.count({ where: { draftId: nextId } })).toBe(1);
    expect(await prisma.serviceInvoice.count({ where: { repairOrderId } })).toBe(0);
    writeFileSync("tmp/autobody/browser-fixture.json", JSON.stringify({ email: actor.email, password: "Synthetic-body-123!", userId: actor.id, repairOrderId, vehicleId, locationId, draftId: nextId, title: supplement.content.title, estimateId: estimate.id }));
  }, 30000);
  it("recovers an official receipt even after later RO activity", async () => {
    const { prisma } = await import("@/server/db/client"), { presentBodyDraft } = await import("@/server/autobody-estimating/service");
    const before = await prisma.autobodyEstimateDraft.findUniqueOrThrow({ where: { id } });
    await prisma.autobodyEstimateDraft.update({ where: { id }, data: { status: "PRESENTING", estimateId: null } });
    const result = await presentBodyDraft(actor, id, 1);
    expect(result.duplicate).toBe(true); expect(result.estimateId).toBe(before.estimateId);
    expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId } })).toBe(2);
  });
  it("does not let an ordinary quote claim collision provenance", async () => {
    const { presentRepairEstimate } = await import("@/server/shop-planning/service"), { bodyEstimateLines, calculateBodyDraft } = await import("@/lib/autobody-estimating/domain");
    await expect(presentRepairEstimate(actor, repairOrderId, { lineItems: bodyEstimateLines(content), taxCents: calculateBodyDraft(content).taxCents, discountCents: 0, taxBoundary: content.taxReference, optionGroups: [{ type: "AUTOBODY_PROVENANCE", snapshot: "forged" }], estimateWorkflow: "STAFF_QUOTE", presentedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), presentationChannel: "IN_PERSON", reason: "Synthetic invalid provenance boundary", idempotencyKey: randomUUID() })).rejects.toThrow("validated collision review");
  });
  it("enforces location grants for active staff", async () => {
    const { prisma } = await import("@/server/db/client"), { readBodyWorkspace, saveBodyDraft } = await import("@/server/autobody-estimating/service"), { INITIAL_ORGANIZATION } = await import("@/server/appointments/location-foundation");
    const organizationId = INITIAL_ORGANIZATION.id, name = randomUUID();
    const staff = await prisma.user.create({ data: { email: `${name}@example.test`, name: "Synthetic location-scoped viewer", passwordHash: "Synthetic disabled login fixture" } });
    await prisma.vehicleCapabilityGrant.create({ data: { organizationId, locationId, userId: staff.id, capability: "REPAIR_ORDER_VIEW", effect: "ALLOW", constraints: {}, validFrom: new Date(Date.now() - 86400000) } });
    const viewer = { ...actor, id: staff.id, roles: [] };
    expect("record" in await readBodyWorkspace(viewer, { id })).toBe(true);
    const otherLocation = await prisma.location.create({ data: { organizationId, code: `body-location-${name}`, name: "Synthetic other location", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } }), otherId = randomUUID();
    await saveBodyDraft(actor, { id: otherId, locationId: otherLocation.id, expectedVersion: 0, idempotencyKey: randomUUID(), content: { ...content, repairOrderId: null } });
    await expect(readBodyWorkspace(viewer, { id: otherId })).rejects.toThrow("Vehicle capability required");
  });
  it.each(["customer", "internal", "vendor"] as const)("continues %s collision work through real QC/release, correct billing and closeout services", async path => {
    const { prisma } = await import("@/server/db/client"), { INITIAL_ORGANIZATION } = await import("@/server/appointments/location-foundation"), { saveBodyDraft, presentBodyDraft, readBodyWorkspace } = await import("@/server/autobody-estimating/service"), { emptyBodyDraft, newBodyLine } = await import("@/lib/autobody-estimating/domain");
    const { decideRepairAuthorization, createApprovedRepairJobs } = await import("@/server/shop-planning/service"), { recordQualityInspection, authorizeRepairOrderRelease } = await import("@/server/quality-control/service"), { executeServiceBilling, getServiceBilling } = await import("@/server/service-billing/service"), { executeServiceClosePartsCommand } = await import("@/server/service-close-parts/service"), { evaluateDeliveryReadiness, createRepairVendorWork, updateRepairVendorWork } = await import("@/server/shop-completion/service");
    const organizationId = INITIAL_ORGANIZATION.id, name = `body-${path}-${randomUUID()}`, now = new Date(), prior = new Date(Date.now() - 60000);
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: name, year: 2018, make: "SYNTHETIC", model: "Collision closeout", vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated collision journey fixture", vinValidationSource: "SYNTHETIC" } });
    const customer = path === "internal" ? null : await prisma.customer.create({ data: { organizationId, customerNumber: name, displayName: "Synthetic collision closeout customer" } });
    const unit = path === "internal" ? await prisma.inventoryUnit.create({ data: { organizationId, vehicleId: vehicle.id, inventoryNumber: name, financialAcquiredAt: prior, stageStartedAt: prior, ownerUserId: actor.id, locationId, targetAt: now, nextAction: "Synthetic internal recon" } }) : null;
    const origin = path === "internal" ? "INVENTORY_RECON" : "CUSTOMER_REPAIR", intakeSource = path === "internal" ? "INVENTORY_RECON" : "WALK_IN";
    const visit = await prisma.serviceVisit.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer?.id, inventoryUnitId: unit?.id, origin, intakeSource, arrivedAt: prior, concernSummary: "Synthetic visible collision scope", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: actor.id } });
    const order = await prisma.repairOrder.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer?.id, inventoryUnitId: unit?.id, serviceVisitId: visit.id, origin, intakeSource, repairOrderNumber: name, openedAt: prior, stageStartedAt: prior, targetAt: now, ownerUserId: actor.id, nextAction: "Synthetic collision review", stage: "INTAKE" } });
    const draft: import("@/lib/autobody-estimating/domain").BodyDraft = { ...emptyBodyDraft(content.rates.BODY), title: name, vehicleId: vehicle.id, repairOrderId: order.id, payer: path === "internal" ? "INTERNAL" : "CUSTOMER", taxBasisPoints: 0, taxReference: "Synthetic reviewed no-tax fixture", lines: path === "vendor" ? [{ ...newBodyLine("body:sublet-repair:sublet"), subletCents: 18000, subletReference: "Synthetic vendor quote, no real purchase" }] : [{ ...newBodyLine("body:front-cover:repair"), minutes: 90, basis: "Synthetic reviewed repair allowance", applicability: "Synthetic visible repair scope checked" }] };
    const draftId = randomUUID(); await saveBodyDraft(actor, { id: draftId, locationId, expectedVersion: 0, idempotencyKey: randomUUID(), content: draft });
    const opened = await readBodyWorkspace(actor, { repairOrderId: order.id }); expect("context" in opened && opened.context?.payer).toBe(draft.payer);
    const issued = await presentBodyDraft(actor, draftId, 1), estimate = await prisma.repairEstimateVersion.findUniqueOrThrow({ where: { id: issued.estimateId } });
    const lines = estimate.lineItems as unknown as { key: string }[];
    await decideRepairAuthorization(actor, order.id, { estimateVersionId: estimate.id, disposition: "ACCEPTED", channel: path === "internal" ? "INTERNAL" : "IN_PERSON", authorizedLineKeys: lines.map(line => line.key), decisionActorType: path === "internal" ? "MANAGER" : "CUSTOMER", decisionActorName: "Synthetic isolated approval fixture only", decidedAt: new Date().toISOString(), idempotencyKey: randomUUID(), reason: "Synthetic collision journey, not actual customer consent" });
    if (path === "vendor") {
      const work = await createRepairVendorWork(actor, order.id, { vendorName: "Synthetic collision vendor", scope: "Synthetic quoted outside repair", status: "AT_VENDOR", approvalStatus: "APPROVED", approvedAmountCents: 18000, sentAt: prior.toISOString(), occurredAt: prior.toISOString(), evidence: ["Synthetic dispatch"], idempotencyKey: randomUUID(), reason: "Synthetic outside repair fixture" });
      const vendorId = (work.result as { id: string }).id;
      for (const status of ["READY_FOR_PICKUP", "QC_REQUIRED"]) await updateRepairVendorWork(actor, order.id, vendorId, { status, approvalStatus: "APPROVED", approvedAmountCents: 18000, lastUpdateSummary: "Synthetic vendor completion returned", customerVisibleSummary: "Synthetic fixture returned", nextAction: "Inspect returned vendor repair", occurredAt: new Date().toISOString(), evidence: ["Synthetic return receipt"], idempotencyKey: randomUUID(), reason: "Synthetic returned repair fixture" });
      const vendor = await prisma.repairVendorWork.findUniqueOrThrow({ where: { id: vendorId } }), { recordVendorReturnAcceptance } = await import("@/server/quality-control/vendor-acceptance");
      const accept = { vendorWorkId: vendor.id, estimateId: estimate.id, expectedVersion: vendor.version, lineKeys: lines.map(line => line.key), reference: "Synthetic completion invoice reference", evidence: "Synthetic fit, finish, road-test and safety review evidence", fitFinishPassed: true, safetyPassed: true, idempotencyKey: randomUUID() };
      await expect(recordVendorReturnAcceptance(actor, order.id, { ...accept, safetyPassed: false })).rejects.toThrow("confirm fit/finish");
      expect((await recordVendorReturnAcceptance(actor, order.id, accept)).duplicate).toBe(false);
      expect((await recordVendorReturnAcceptance(actor, order.id, accept)).duplicate).toBe(true);
      expect(await prisma.repairJob.count({ where: { repairOrderId: order.id } })).toBe(0);
    } else {
      await createApprovedRepairJobs(actor, order.id, { idempotencyKey: randomUUID(), reason: "Synthetic authorized body repair job" });
      const job = await prisma.repairJob.findFirstOrThrow({ where: { repairOrderId: order.id } });
      await prisma.repairJob.update({ where: { id: job.id }, data: { status: "READY_FOR_QC", executionEvidence: ["Synthetic completed repair fixture only"] } });
      await prisma.repairJobLaborClock.create({ data: { organizationId, repairJobId: job.id, technicianUserId: actor.id, state: "FINISHED", startedAt: prior, finishedAt: prior, accumulatedMinutes: 47 } });
      await recordQualityInspection(actor, job.id, { templateCode: "SYNTHETIC_COLLISION", templateVersion: 1, checks: ["COMPLETION", "SAFETY"].map(category => ({ code: category, category, label: `Synthetic ${category} check`, result: "PASS", evidence: ["Synthetic fixture evidence"] })), completionEvidence: ["Synthetic actual repair result fixture"], inspectedAt: new Date().toISOString(), roadTestRequired: false, roadTestOutcome: "NOT_REQUIRED", idempotencyKey: randomUUID(), reason: "Synthetic QC service verification" });
    }
    await authorizeRepairOrderRelease(actor, order.id, { authorizedAt: new Date().toISOString(), keysVerified: true, openExceptions: [], releaseEvidence: ["Synthetic verified release evidence"], idempotencyKey: randomUUID(), reason: "Synthetic collision release fixture" });
    await executeServiceBilling(actor, order.id, { action: "PREPARE_INVOICE", occurredAt: new Date().toISOString(), reason: "Synthetic exact authorized collision closeout package", idempotencyKey: randomUUID() });
    const billing = await getServiceBilling(actor, order.id), pack = billing.packages[0];
    expect(pack.mismatchCodes).toEqual([]); expect(pack.billingMode).toBe(path === "internal" ? "INTERNAL_COST" : "NATIVE");
    if (path === "internal") {
      await expect(executeServiceBilling(actor, order.id, { action: "POST_INVOICE", packageId: pack.id, occurredAt: new Date().toISOString(), reason: "Synthetic rejection of customer invoice for internal recon", idempotencyKey: randomUUID() })).rejects.toThrow("Internal recon");
      expect(await prisma.inventoryUnitCost.count({ where: { inventoryUnitId: unit!.id } })).toBe(0);
    } else {
      await executeServiceBilling(actor, order.id, { action: "POST_INVOICE", packageId: pack.id, occurredAt: new Date().toISOString(), reason: "Synthetic native invoice fixture, no real receivable", idempotencyKey: randomUUID() });
      await executeServiceBilling(actor, order.id, { action: "PAYMENT", invoiceId: pack.id, expectedVersion: 1, amountCents: estimate.totalCents, method: "CASH", reference: name, evidence: ["Synthetic isolated cashier receipt, no actual money"], occurredAt: new Date().toISOString(), reason: "Synthetic settlement fixture only", idempotencyKey: randomUUID() });
    }
    const readiness = await evaluateDeliveryReadiness(actor, order.id, { checks: [{ code: "SYNTHETIC_HANDOFF", label: "Synthetic current handoff readiness", passed: true, evidence: ["Synthetic fixture evidence"] }], evaluatedAt: new Date().toISOString(), idempotencyKey: randomUUID(), reason: "Synthetic current delivery readiness" });
    expect(readiness.result).toMatchObject({ disposition: "READY" });
    const close = { action: "CLOSE_REPAIR_ORDER", subjectId: order.id, occurredAt: new Date().toISOString(), keysVerified: true, finalOdometer: 100, recipientName: "Synthetic recipient only", handoffEvidence: ["Synthetic isolated handoff receipt"], idempotencyKey: randomUUID(), reason: "Synthetic verified collision closeout" };
    expect((await executeServiceClosePartsCommand(actor, close)).result).toMatchObject({ stage: "CLOSED" });
    expect((await executeServiceClosePartsCommand(actor, close)).duplicate).toBe(true);
    expect(await prisma.repairDiagnosisVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
    expect(await prisma.serviceInvoice.count({ where: { repairOrderId: order.id } })).toBe(path === "internal" ? 0 : 1);
  }, 60000);
});
