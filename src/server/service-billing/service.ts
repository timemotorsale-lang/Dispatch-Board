import { validateCreditComponents, type CreditComponents } from "@/lib/service-credit";
import { invoicePackageMismatchCodes } from "@/lib/service-billing-workflow";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import { assertCurrentInvoicePackage, serviceInvoiceCandidate } from "@/server/service-close-parts/invoice-candidate";
import { invoiceReceiptIdentity, recordServiceDocument, type ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { serviceInvoiceBalance, validateBillingEntry } from "@/lib/service-billing";
import { createServiceClosePartsRepository } from "@/server/service-close-parts/repository";

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
  assertAuthenticatedUser(actor);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { id: true, locationId: true, repairOrderNumber: true } });
  if (!order) throw new Error("Repair order was not found.");
  await billingAccess(actor, order.locationId, false, organizationId);
  const invoices = await prisma.serviceInvoice.findMany({ where: { organizationId, repairOrderId }, orderBy: { issuedAt: "desc" } });
  const entries = await prisma.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: { in: invoices.map(invoice => invoice.id) } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
  const packages = await prisma.serviceInvoicePackage.findMany({ where: { organizationId, repairOrderId }, orderBy: { version: "desc" }, take: 20 });
  let readiness: { mismatchCodes: string[] };
  let currentFingerprint: string | undefined;
  try { const candidate = await serviceInvoiceCandidate(prisma, organizationId, repairOrderId); readiness = { mismatchCodes: candidate.mismatchCodes }; currentFingerprint = candidate.fingerprint; }
  catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Invoice requires current exact-version authorization")) throw error;
    readiness = { mismatchCodes: ["INVOICE_AUTHORIZATION_REQUIRED"] };
  }
  return { order, readiness, packages: packages.map(item => ({ id: item.id, version: item.version, mismatchCodes: invoicePackageMismatchCodes(item.mismatchCodes, item.sourceSnapshot, currentFingerprint), billingMode: (item.sourceSnapshot as {billingMode?:string}).billingMode ?? "LEGACY_REVIEW_REQUIRED", preview: (item.sourceSnapshot as {commercial?:unknown}).commercial ?? null, identity: (item.sourceSnapshot as {identity?:unknown}).identity ?? null })), invoices: invoices.map(invoice => ({ ...invoice, entries: entries.filter(entry => entry.invoiceId === invoice.id), balance: serviceInvoiceBalance(invoice, entries.filter(entry => entry.invoiceId === invoice.id)) })) };
}
export async function executeServiceBilling(actor: AuthenticatedUser | null, repairOrderId: string, value: unknown, options: { organizationId?: string; enforceRollout?: boolean } = {}) {
  assertAuthenticatedUser(actor);
  const organizationId = options.organizationId ?? INITIAL_ORGANIZATION.id;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Billing command is required.");
  const raw = value as Record<string, unknown>, action = String(raw.action);
  if (!["PREPARE_INVOICE", "POST_INVOICE", "PAYMENT", "REFUND", "CREDIT", "VOID"].includes(action)) throw new Error("Unsupported billing action.");
  const idempotencyKey = required(raw.idempotencyKey, "Idempotency key"), reason = required(raw.reason, "Reason", 500);
  if (reason.length < 10) throw new Error("A detailed financial reason is required.");
  if (action === "PREPARE_INVOICE") {
    const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, select: { locationId: true } });
    if (!order) throw new Error("Open repair order was not found.");
    const user = await billingAccess(actor, order.locationId, true, organizationId, options.enforceRollout ?? true);
    const generatedAt = new Date(String(raw.occurredAt));
    if (!Number.isFinite(generatedAt.getTime()) || generatedAt.getTime() > Date.now() + 60_000) throw new Error("Valid nonfuture preparation time is required.");
    const repository = createServiceClosePartsRepository(), receipt = await repository.commandReceipt(organizationId, "GENERATE_INVOICE_PACKAGE", idempotencyKey);
    const expectedVersion = receipt?.expectedVersion ?? await repository.aggregateVersion(organizationId, "SHOP_OPERATIONS", "REPAIR_ORDER", repairOrderId);
    const data = { generatedAt: generatedAt.toISOString() };
    return repository.generateInvoice(normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: repairOrderId, commandType: "GENERATE_INVOICE_PACKAGE", expectedVersion, idempotencyKey, locationId: order.locationId, payload: data, reason }), { generatedAt, createdByUserId: user.id, reason });
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
  const data = { action, repairOrderId, subjectId, occurredAt: occurredAt.toISOString(), amountCents, method, reference, evidence, relatedEntryId, creditComponents: action === "CREDIT" ? raw.creditComponents : null };
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, domain: "SHOP_OPERATIONS", subjectType: "SERVICE_NATIVE_INVOICE", subjectId, commandType: action, expectedVersion, idempotencyKey, locationId: order.locationId, payload: data, reason });
  return executeAggregateMutation(prisma, command, "vehicle-operations.service-billing", async (tx, version) => {
    if (action === "POST_INVOICE") {
      const invoicePackage = await tx.serviceInvoicePackage.findFirst({ where: { id: subjectId, organizationId, repairOrderId } });
      if (!invoicePackage) throw new Error("Invoice package was not found.");
      const candidate = await assertCurrentInvoicePackage(tx, organizationId, invoicePackage);
      if (candidate.order.origin !== "CUSTOMER_REPAIR" || !candidate.order.customerId) throw new Error("Native customer invoices require a customer-linked customer-repair RO. Internal recon uses an internal cost package, not a customer receivable.");
      if (!candidate.identity || candidate.order.closedAt) throw new Error("Frozen estimate identity and an open repair order are required.");
      if (await tx.serviceInvoice.findFirst({ where: { organizationId, repairOrderId, status: "POSTED" } })) throw new Error("This RO already has a posted invoice. Use a credit/refund or audited void before reissue.");
      if (occurredAt < candidate.authorization.decidedAt) throw new Error("Invoice cannot predate authorization.");
      const sequence = await tx.serviceInvoiceSequence.upsert({ where: { organizationId }, create: { organizationId, nextNumber: 2 }, update: { nextNumber: { increment: 1 } } });
      const invoiceNumber = `INV-${occurredAt.getUTCFullYear()}-${String(sequence.nextNumber - 1).padStart(6, "0")}`;
      const ledger = candidate.ledger;
      await billingAccess(actor, order.locationId, true, organizationId, options.enforceRollout ?? true, ledger.totalCents);
      const invoice = await tx.serviceInvoice.create({ data: { id: subjectId, organizationId, repairOrderId, packageId: subjectId, invoiceNumber, subtotalCents: ledger.subtotalCents, discountCents: ledger.discountCents, taxCents: ledger.taxCents, totalCents: ledger.totalCents, ledger: toJson({ ...ledger, identity: candidate.identity, authorizationId: candidate.authorization.id, estimateId: candidate.estimate.id, proposedMinutes: ledger.proposedMinutes, measuredTechnicianMinutes: candidate.clockedLaborMinutes }), sourceFingerprint: candidate.fingerprint, issuedAt: occurredAt, createdByUserId: user.id, reason, version } });
      const content: ServiceDocumentContent = { title: "Final service invoice", number: invoiceNumber, issuedAt: occurredAt.toISOString(), identity: candidate.identity, lines: ledger.lines.map(line => ({...line,...(line.type === "LABOR" && line.laborGuideMinutes ? {hours:line.laborGuideMinutes/60,planningHourlyRateCents:Math.round(line.unitPriceCents*60/line.laborGuideMinutes)} : {})})), totals: ledger, notes: ["Native posted invoice. Payment status is separately recorded in the receipt ledger. The implied planning-hour rate is a quote calculation, not a measured-time or validated-standard billing rate.", `Authorized planning time ${ledger.proposedMinutes} minutes; measured technician time ${candidate.clockedLaborMinutes} minutes. Measured time does not automatically change approved charges.`, `Source estimate ${candidate.estimate.id}; authorization ${candidate.authorization.id}.`] };
      await recordServiceDocument(tx, { organizationId, repairOrderId, kind: "INVOICE", sourceId: invoice.id, sourceVersion: version, createdByUserId: user.id, content });
      return { result: { id: invoice.id, invoiceNumber, version, totalCents: invoice.totalCents } };
    }
    const invoice = await tx.serviceInvoice.findFirst({ where: { id: subjectId, organizationId, repairOrderId } });
    if (!invoice || invoice.version !== expectedVersion) throw new Error("Invoice version changed. Reload before recording financial activity.");
    const entries = await tx.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: invoice.id } });
    validateBillingEntry(invoice, entries, { kind: action, amountCents, relatedEntryId, occurredAt });
    if (action === "REFUND") {
      const original = entries.find(item => item.id === relatedEntryId);
      if (!original || original.method !== method || occurredAt < original.occurredAt) throw new Error("Refund method and time must match the original verified payment.");
    }
    const originalLedger = invoice.ledger as unknown as { lines: { key: string; totalCents: number; taxable?: boolean }[] };
    const components = action === "CREDIT" ? validateCreditComponents(invoice, entries.filter(item => item.kind === "CREDIT").map(item => (item.evidence as unknown as { components: CreditComponents }).components), raw.creditComponents, amountCents, originalLedger.lines) : null;
    const entry = await tx.serviceInvoiceEntry.create({ data: { id: randomUUID(), organizationId, invoiceId: invoice.id, kind: action, amountCents, method, reference, relatedEntryId, evidence: toJson({ references: evidence, components }), occurredAt, createdByUserId: user.id, reason } });
    const status = action === "VOID" ? "VOID" : invoice.status;
    await tx.serviceInvoice.update({ where: { id: invoice.id }, data: { status, version } });
    const balance = serviceInvoiceBalance({ ...invoice, status }, [...entries, entry]);
    const identity = await invoiceReceiptIdentity(tx, organizationId, repairOrderId, invoice.id, (invoice.ledger as unknown as { identity: ServiceDocumentContent["identity"] }).identity);
    await recordServiceDocument(tx, { organizationId, repairOrderId, kind: action, sourceId: entry.id, sourceVersion: 1, createdByUserId: user.id, content: { title: `Service ${action.toLowerCase()} receipt`, number: `${invoice.invoiceNumber} / ${entry.id}`, issuedAt: occurredAt.toISOString(), identity, lines: [{ key: entry.id, description: `${action}: ${method ?? "Adjustment"}; reference ${reference}`, quantity: 1, unitPriceCents: amountCents, totalCents: amountCents }], ...(components ? { totals: { ...components, totalCents: amountCents } } : {}), notes: [`Original invoice ${invoice.invoiceNumber}; remaining balance ${balance.balanceCents} cents.`, `Recorded by ${user.name}. ${reason}`, "This is a record of verified financial activity, not a card-processing instruction."] } });
    return { previous: invoice, result: { id: invoice.id, entryId: entry.id, version, balance, status } };
  });
}
