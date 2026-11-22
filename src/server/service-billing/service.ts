import { validateCreditComponents, type CreditComponents } from "@/lib/service-credit";
import { invoicePackageMismatchCodes } from "@/lib/service-billing-workflow";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, canManageSettings } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature, describeVehicleOperationsBlock } from "@/server/enterprise-command/service";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import { assertCurrentInvoicePackage, serviceInvoiceCandidate } from "@/server/service-close-parts/invoice-candidate";
import { invoiceReceiptIdentity, recordServiceDocument, type ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { serviceInvoiceBalance, validateBillingEntry } from "@/lib/service-billing";
import { createServiceClosePartsRepository } from "@/server/service-close-parts/repository";
import { DEPOSIT_ACTIONS, executeRepairDeposit, getRepairDepositView } from "./deposits";

export async function billingAccess(actor: AuthenticatedUser | null, locationId: string, manage = false, organizationId: string = INITIAL_ORGANIZATION.id, enforceRollout = true, amountCents?: number) {
  const user = assertAuthenticatedUser(actor), foundation = createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, grants, locationId, capability: manage ? "SERVICE_BILLING_MANAGE" : "SERVICE_BILLING_VIEW", amountCents });
  assertVehicleCapability({ actor: user, grants, locationId, capability: "REPAIR_ORDER_VIEW" });
  if (manage && enforceRollout) {
    const flags = await foundation.listFeatureFlags(organizationId);
    if (!evaluateVehicleOperationsFeature(flags, "SHOP_OPERATIONS", user.id, locationId).executable) throw new Error("Shop Operations billing mutations are not enabled.");
  }
  return user;
}
function required(value: unknown, label: string, max = 200) {
  if (typeof value !== "string" || value.trim().length < 3 || value.length > max || /\b(?:\d[ -]?){13,19}\b/.test(value)) throw new Error(`${label} is required; never store card or bank account numbers.`);
  return value.trim();
}
export async function getServiceBilling(actor: AuthenticatedUser | null, repairOrderId: string, organizationId: string = INITIAL_ORGANIZATION.id) {
  const user = assertAuthenticatedUser(actor);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { id: true, locationId: true, repairOrderNumber: true, closedAt: true, origin: true, customerId: true } });
  if (!order) throw new Error("Repair order was not found.");
  await billingAccess(actor, order.locationId, false, organizationId);
  const foundation = createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  const canManage = evaluateVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "SERVICE_BILLING_MANAGE" }).allowed;
  let mutationBlockReason = !canManage ? "You can view and print billing documents. Creating invoices or recording payments requires Service Billing manage permission at this store. Ask an administrator to review your access." : order.closedAt ? "This repair order is closed. Saved documents remain available to view and print. An authorized staff member must reopen the order before changing billing." : null;
  if (!mutationBlockReason) {
    const rollout = evaluateVehicleOperationsFeature(await foundation.listFeatureFlags(organizationId), "SHOP_OPERATIONS", user.id, order.locationId);
    if (!rollout.executable) mutationBlockReason = describeVehicleOperationsBlock(rollout.reason);
  }
  const canManageRollout = canManageSettings(user) && (["VEHICLE_HEALTH_VIEW", "VEHICLE_ROLLOUT_MANAGE"] as const).every(capability => evaluateVehicleCapability({ actor: user, grants, locationId: null, capability }).allowed);
  const mutationAvailability = { allowed: !mutationBlockReason, reason: mutationBlockReason, canManageRollout };
  const invoices = await prisma.serviceInvoice.findMany({ where: { organizationId, repairOrderId }, orderBy: { issuedAt: "desc" } });
  const entries = await prisma.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: { in: invoices.map(invoice => invoice.id) } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
  const packages = await prisma.serviceInvoicePackage.findMany({ where: { organizationId, repairOrderId }, orderBy: { version: "desc" }, take: 20 });
  let readiness: { mismatchCodes: string[]; repairJobsMissing?: boolean; missingRepairJobLines?: string[]; estimateId?: string; estimateVersion?: number };
  let currentFingerprint: string | undefined;
  try {
    const candidate = await serviceInvoiceCandidate(prisma, organizationId, repairOrderId);
    readiness = {
      mismatchCodes: candidate.mismatchCodes,
      estimateId: candidate.estimate?.id,
      estimateVersion: candidate.estimate?.version,
      repairJobsMissing: Boolean(candidate.missingRepairJobLines?.length),
      missingRepairJobLines: candidate.missingRepairJobLines
    };
    currentFingerprint = candidate.fingerprint;
  }
  catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Invoice requires current exact-version authorization")) throw error;
    const estimate = await prisma.repairEstimateVersion.findFirst({
      where: { organizationId, repairOrderId }, orderBy: { version: "desc" }, select: { id: true, version: true }
    });
    readiness = { mismatchCodes: ["INVOICE_AUTHORIZATION_REQUIRED"], estimateId: estimate?.id, estimateVersion: estimate?.version };
  }
  const deposits = await getRepairDepositView(prisma, organizationId, repairOrderId);
  if (!mutationAvailability.allowed) deposits.collectionAvailability = { allowed: false, reason: mutationAvailability.reason, maxAmountCents: 0 };
  const invoiceEligibility = order.origin === "INVENTORY_RECON" ? "INTERNAL_COST" : order.origin === "CUSTOMER_REPAIR" && !order.customerId ? "CUSTOMER_REQUIRED" : "CUSTOMER_INVOICE";
  const orderSummary = { id: order.id, locationId: order.locationId, repairOrderNumber: order.repairOrderNumber, closedAt: order.closedAt };
  return { order: orderSummary, invoiceEligibility, canManage, mutationAvailability, readiness, deposits, packages: packages.map(item => {
    const snapshot = item.sourceSnapshot && typeof item.sourceSnapshot === "object" && !Array.isArray(item.sourceSnapshot) ? item.sourceSnapshot as Record<string, unknown> : {};
    return { id: item.id, version: item.version, mismatchCodes: invoicePackageMismatchCodes(item.mismatchCodes, snapshot, currentFingerprint), billingMode: typeof snapshot.billingMode === "string" ? snapshot.billingMode : "LEGACY_REVIEW_REQUIRED", preview: snapshot.commercial ?? null, identity: snapshot.identity ?? null };
  }), invoices: invoices.map(invoice => ({ ...invoice, appliedDepositCents: deposits.entries.filter(entry => entry.invoiceId === invoice.id).reduce((sum, entry) => sum + (entry.kind === "APPLY" ? entry.amountCents : entry.kind === "UNAPPLY" ? -entry.amountCents : 0), 0), entries: entries.filter(entry => entry.invoiceId === invoice.id), balance: serviceInvoiceBalance(invoice, entries.filter(entry => entry.invoiceId === invoice.id)) })) };
}
export async function executeServiceBilling(actor: AuthenticatedUser | null, repairOrderId: string, value: unknown, options: { organizationId?: string; enforceRollout?: boolean } = {}) {
  assertAuthenticatedUser(actor);
  const organizationId = options.organizationId ?? INITIAL_ORGANIZATION.id;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Billing command is required.");
  const raw = value as Record<string, unknown>, action = String(raw.action);
  const expectedEstimateId = ["PREPARE_INVOICE", "POST_INVOICE"].includes(action) && raw.expectedEstimateId !== undefined
    ? required(raw.expectedEstimateId, "Expected estimate ID", 120) : undefined;
  if (DEPOSIT_ACTIONS.includes(action)) return executeRepairDeposit(actor, repairOrderId, raw, organizationId, options.enforceRollout ?? true);
  if (!["PREPARE_INVOICE", "POST_INVOICE", "PAYMENT", "REFUND", "CREDIT", "VOID"].includes(action)) throw new Error("Unsupported billing action.");
  const idempotencyKey = required(raw.idempotencyKey, "Idempotency key"), reason = required(raw.reason, "Reason", 500);
  if (reason.length < 10) throw new Error("A detailed financial reason is required.");
  if (action === "PREPARE_INVOICE") {
    const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, select: { locationId: true, origin: true, customerId: true } });
    if (!order) throw new Error("Open repair order was not found.");
    const user = await billingAccess(actor, order.locationId, true, organizationId, options.enforceRollout ?? true);
    if (order.origin === "INVENTORY_RECON") throw new Error("Internal recon orders use internal cost closeout. A customer invoice cannot be prepared for this order.");
    if (order.origin === "CUSTOMER_REPAIR" && !order.customerId) throw new Error("Verify the customer on this repair order before preparing a final invoice.");
    const generatedAt = new Date(String(raw.occurredAt));
    if (!Number.isFinite(generatedAt.getTime()) || generatedAt.getTime() > Date.now() + 60_000) throw new Error("Valid nonfuture preparation time is required.");
    const repository = createServiceClosePartsRepository(), receipt = await repository.commandReceipt(organizationId, "GENERATE_INVOICE_PACKAGE", idempotencyKey);
    const expectedVersion = receipt?.expectedVersion ?? await repository.aggregateVersion(organizationId, "SHOP_OPERATIONS", "REPAIR_ORDER", repairOrderId);
    const data = { generatedAt: generatedAt.toISOString(), ...(expectedEstimateId ? { expectedEstimateId } : {}) };
    return repository.generateInvoice(normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: repairOrderId, commandType: "GENERATE_INVOICE_PACKAGE", expectedVersion, idempotencyKey, locationId: order.locationId, payload: data, reason }), { generatedAt, createdByUserId: user.id, reason, expectedEstimateId });
  }
  const subjectId = required(action === "POST_INVOICE" ? raw.packageId : raw.invoiceId, "Invoice/package ID", 100), expectedVersion = action === "POST_INVOICE" ? 0 : Number(raw.expectedVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error("Exact invoice version is required.");
  const occurredAt = new Date(String(raw.occurredAt));
  if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 60_000) throw new Error("A valid nonfuture financial event time is required.");
  const amountCents = action === "POST_INVOICE" || action === "VOID" ? 0 : Number(raw.amountCents);
  const reference = action === "POST_INVOICE" ? "Native posting" : required(raw.reference, "Receipt/adjustment reference");
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.map(item => required(item, "Evidence reference", 500)) : [];
  if (action !== "POST_INVOICE" && evidence.length === 0) throw new Error("Verified payment/refund/adjustment evidence is required.");
  const method = action === "PAYMENT" || action === "REFUND" ? String(raw.method) : null;
  if (method && !["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].includes(method)) throw new Error("Unsupported payment method. This app does not process card charges.");
  const relatedEntryId = raw.relatedEntryId == null || raw.relatedEntryId === "" ? null : required(raw.relatedEntryId, "Original payment ID", 100);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { locationId: true, closedAt: true } });
  if (!order) throw new Error("Repair order was not found.");
  if (order.closedAt) throw new Error("Reopen the repair order before changing its financial ledger.");
  const user = await billingAccess(actor, order.locationId, true, organizationId, options.enforceRollout ?? true, amountCents);
  const data = { action, repairOrderId, subjectId, occurredAt: occurredAt.toISOString(), amountCents, method, reference, evidence, relatedEntryId, creditComponents: action === "CREDIT" ? raw.creditComponents : null, ...(expectedEstimateId ? { expectedEstimateId } : {}) };
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, domain: "SHOP_OPERATIONS", subjectType: "SERVICE_NATIVE_INVOICE", subjectId, commandType: action, expectedVersion, idempotencyKey, locationId: order.locationId, payload: data, reason });
  return executeAggregateMutation(prisma, command, "vehicle-operations.service-billing", async (tx, version) => {
    if (action === "POST_INVOICE") {
      const invoicePackage = await tx.serviceInvoicePackage.findFirst({ where: { id: subjectId, organizationId, repairOrderId } });
      if (!invoicePackage) throw new Error("Invoice package was not found.");
      const candidate = await assertCurrentInvoicePackage(tx, organizationId, invoicePackage);
      if (expectedEstimateId && candidate.estimate.id !== expectedEstimateId) throw new Error("The selected estimate is no longer current. Open the repair order to review the current estimate before invoicing.");
      if (candidate.order.origin !== "CUSTOMER_REPAIR" || !candidate.order.customerId) throw new Error("Native customer invoices require a customer-linked customer-repair RO. Internal recon uses an internal cost package, not a customer receivable.");
      if (!candidate.identity || candidate.order.closedAt) throw new Error("Frozen estimate identity and an open repair order are required.");
      if (await tx.serviceInvoice.findFirst({ where: { organizationId, repairOrderId, status: "POSTED" } })) throw new Error("This RO already has a posted invoice. Use a credit/refund or audited void before reissue.");
      if (occurredAt < candidate.authorization.decidedAt) throw new Error("Invoice cannot predate authorization.");
      const sequence = await tx.serviceInvoiceSequence.upsert({ where: { organizationId }, create: { organizationId, nextNumber: 2 }, update: { nextNumber: { increment: 1 } } });
      const invoiceNumber = `INV-${occurredAt.getUTCFullYear()}-${String(sequence.nextNumber - 1).padStart(6, "0")}`;
      const ledger = candidate.ledger;
      await billingAccess(actor, order.locationId, true, organizationId, options.enforceRollout ?? true, ledger.totalCents);
      const invoice = await tx.serviceInvoice.create({ data: { id: subjectId, organizationId, repairOrderId, packageId: subjectId, invoiceNumber, subtotalCents: ledger.subtotalCents, discountCents: ledger.discountCents, taxCents: ledger.taxCents, totalCents: ledger.totalCents, ledger: toJson({ ...ledger, identity: candidate.identity, authorizationId: candidate.authorization.id, estimateId: candidate.estimate.id, proposedMinutes: ledger.proposedMinutes, measuredTechnicianMinutes: candidate.clockedLaborMinutes }), sourceFingerprint: candidate.fingerprint, issuedAt: occurredAt, createdByUserId: user.id, reason, version } });
      const content: ServiceDocumentContent = { title: "Final service invoice", number: invoiceNumber, issuedAt: occurredAt.toISOString(), identity: candidate.identity, lines: ledger.lines.map(line => ({...line,...(line.type === "LABOR" && line.laborGuideMinutes ? {hours:line.laborGuideMinutes/60,planningHourlyRateCents:Math.round(line.unitPriceCents*60/line.laborGuideMinutes)} : {})})), totals: ledger, notes: ["Thank you for your business. Please retain this invoice for your records."] };
      const document = await recordServiceDocument(tx, { organizationId, repairOrderId, kind: "INVOICE", sourceId: invoice.id, sourceVersion: version, createdByUserId: user.id, content });
      return { result: { id: invoice.id, documentId: document.id, invoiceNumber, version, totalCents: invoice.totalCents } };
    }
    const invoice = await tx.serviceInvoice.findFirst({ where: { id: subjectId, organizationId, repairOrderId } });
    if (!invoice || invoice.version !== expectedVersion) throw new Error("Invoice version changed. Reload before recording financial activity.");
    const entries = await tx.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: invoice.id } });
    validateBillingEntry(invoice, entries, { kind: action, amountCents, relatedEntryId, occurredAt });
    if (action === "REFUND") {
      const original = entries.find(item => item.id === relatedEntryId);
      if (original?.evidence && typeof original.evidence === "object" && !Array.isArray(original.evidence) && original.evidence.depositTransfer === true) throw new Error("Reverse the deposit application first, then refund its available deposit funds. A deposit transfer is not a new cash payment.");
      if (!original || original.method !== method || occurredAt < original.occurredAt) throw new Error("Refund method and time must match the original verified payment.");
    }
    const originalLedger = invoice.ledger as unknown as { lines: { key: string; totalCents: number; taxable?: boolean }[] };
    const components = action === "CREDIT" ? validateCreditComponents(invoice, entries.filter(item => item.kind === "CREDIT").map(item => (item.evidence as unknown as { components: CreditComponents }).components), raw.creditComponents, amountCents, originalLedger.lines) : null;
    const entry = await tx.serviceInvoiceEntry.create({ data: { id: randomUUID(), organizationId, invoiceId: invoice.id, kind: action, amountCents, method, reference, relatedEntryId, evidence: toJson({ references: evidence, components }), occurredAt, createdByUserId: user.id, reason } });
    const status = action === "VOID" ? "VOID" : invoice.status;
    await tx.serviceInvoice.update({ where: { id: invoice.id }, data: { status, version } });
    const balance = serviceInvoiceBalance({ ...invoice, status }, [...entries, entry]);
    const identity = await invoiceReceiptIdentity(tx, organizationId, repairOrderId, invoice.id, (invoice.ledger as unknown as { identity: ServiceDocumentContent["identity"] }).identity);
    const document = await recordServiceDocument(tx, { organizationId, repairOrderId, kind: action, sourceId: entry.id, sourceVersion: 1, createdByUserId: user.id, content: { title: `Service ${action.toLowerCase()} receipt`, number: `${invoice.invoiceNumber} / R${entries.length + 1}`, issuedAt: occurredAt.toISOString(), identity, receipt: { invoiceNumber: invoice.invoiceNumber, kind: action, amountCents, method, reference, balanceCents: balance.balanceCents }, lines: [{ key: entry.id, description: `${action}: ${method ?? "Adjustment"}; reference ${reference}`, quantity: 1, unitPriceCents: amountCents, totalCents: amountCents }], ...(components ? { totals: { ...components, totalCents: amountCents } } : {}), notes: ["Please retain this receipt for your records."] } });
    return { previous: invoice, result: { id: invoice.id, entryId: entry.id, documentId: document.id, version, balance, status } };
  });
}
