import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError, hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import { invoiceReceiptIdentity, recordServiceDocument, serviceIdentity, type ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { serviceInvoiceBalance, validateBillingEntry } from "@/lib/service-billing";
import { billingAccess } from "./service";
import { depositSourceAvailable, repairDepositBalance, type RepairDepositEntry } from "./deposit-ledger";

export const DEPOSIT_ACTIONS = ["DEPOSIT", "REFUND_DEPOSIT", "APPLY_DEPOSIT", "UNAPPLY_DEPOSIT"];
const kinds = { DEPOSIT: "COLLECTION", REFUND_DEPOSIT: "REFUND", APPLY_DEPOSIT: "APPLY", UNAPPLY_DEPOSIT: "UNAPPLY" } as const;
const subjectType = "SERVICE_REPAIR_DEPOSIT";
const domain = "SHOP_OPERATIONS";
type Database = Prisma.TransactionClient;
function aggregateKey(organizationId: string, repairOrderId: string) { return { organizationId_domain_subjectType_subjectId: { organizationId, domain, subjectType, subjectId: repairOrderId } }; }
function text(value: unknown, label: string, min = 3) {
  if (typeof value !== "string" || value.trim().length < min || value.length > 500 || /\b(?:\d[ -]?){13,19}\b/.test(value)) throw new Error(`${label} is required; never store card or bank account numbers.`);
  return value.trim();
}
export function readRepairDeposits(db: Database, organizationId: string, repairOrderId: string) {
  return db.$queryRaw<RepairDepositEntry[]>`SELECT * FROM "ServiceRepairDepositEntry" WHERE "organizationId"=${organizationId} AND "repairOrderId"=${repairOrderId} ORDER BY "createdAt", id`;
}
async function collectionAvailability(db: Database, organizationId: string, repairOrderId: string, entries: RepairDepositEntry[]) {
  const order = await db.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { closedAt: true, origin: true, customerId: true } });
  let reason: string | null = !order || order.closedAt ? "An open repair order is required." : order.origin !== "CUSTOMER_REPAIR" || !order.customerId ? "Deposits require a customer-linked customer repair order." : null;
  const estimate = await db.repairEstimateVersion.findFirst({ where: { organizationId, repairOrderId }, orderBy: { version: "desc" }, select: { totalCents: true, presentedAt: true } });
  const invoice = await db.serviceInvoice.findFirst({ where: { organizationId, repairOrderId, status: "POSTED" }, select: { id: true } });
  if (!reason && invoice) reason = "An invoice is already posted. Record an invoice payment instead.";
  if (!reason && (!estimate?.presentedAt || estimate.totalCents <= 0)) reason = "Present a priced estimate before collecting a repair deposit.";
  const balance = repairDepositBalance(entries);
  const maxAmountCents = Math.max(0, (estimate?.totalCents ?? 0) - (balance.collectedCents - balance.refundedCents));
  if (!reason && maxAmountCents === 0) reason = "Deposits already cover the current estimate.";
  return { allowed: !reason, reason, maxAmountCents: reason ? 0 : maxAmountCents };
}
export async function getRepairDepositView(db: Database, organizationId: string, repairOrderId: string) {
  let entries: RepairDepositEntry[];
  try { entries = await readRepairDeposits(db, organizationId, repairOrderId); }
  catch (error) {
    const failure = error as { code?: string; meta?: { code?: string; message?: string } };
    if (failure.code !== "P2010" || failure.meta?.code !== "42P01" || !failure.meta.message?.includes("ServiceRepairDepositEntry")) throw error;
    return { storageReady: false, version: 0, entries: [] as (RepairDepositEntry & { documentId: string | null })[], balance: repairDepositBalance([]), collectionAvailability: { allowed: false, reason: "Repair deposits are not configured for this workspace. Ask your administrator to complete setup. Existing invoice payments remain available.", maxAmountCents: 0 } };
  }
  const aggregate = await db.enterpriseAggregateVersion.findUnique({ where: aggregateKey(organizationId, repairOrderId) });
  const documents = entries.length ? await db.serviceDocument.findMany({ where: { organizationId, repairOrderId, sourceId: { in: entries.map(entry => entry.id) }, kind: { in: ["DEPOSIT", "DEPOSIT_REFUND", "DEPOSIT_APPLICATION", "DEPOSIT_REVERSAL"] } }, select: { id: true, sourceId: true } }) : [];
  return { storageReady: true, version: aggregate?.version ?? 0, balance: repairDepositBalance(entries), collectionAvailability: await collectionAvailability(db, organizationId, repairOrderId, entries), entries: entries.map(entry => ({ ...entry, documentId: documents.find(document => document.sourceId === entry.id)?.id ?? null })) };
}

export async function executeRepairDeposit(actor: AuthenticatedUser | null, repairOrderId: string, raw: Record<string, unknown>, organizationId: string, enforceRollout = true) {
  const action = String(raw.action) as keyof typeof kinds;
  if (!DEPOSIT_ACTIONS.includes(action)) throw new Error("Unsupported deposit action.");
  const idempotencyKey = text(raw.idempotencyKey, "Idempotency key"), reason = text(raw.reason, "Detailed financial reason", 1), reference = text(raw.reference, "Receipt reference");
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.map(item => text(item, "Verified payment evidence")) : [];
  if (!evidence.length) throw new Error("Verified deposit evidence is required.");
  const amountCents = Number(raw.amountCents), expectedVersion = Number(raw.expectedVersion), occurredAt = new Date(String(raw.occurredAt));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 2147483647) throw new Error("Deposit amount must be positive whole cents.");
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error("Exact deposit version is required.");
  if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 60000) throw new Error("A valid nonfuture deposit time is required.");
  const relatedEntryId = action === "DEPOSIT" ? null : text(raw.relatedEntryId, "Original deposit/application ID");
  const transfer = action === "APPLY_DEPOSIT" || action === "UNAPPLY_DEPOSIT";
  const invoiceId = transfer ? text(raw.invoiceId, "Invoice ID") : null;
  const invoiceExpectedVersion = transfer ? Number(raw.invoiceExpectedVersion) : null;
  if (transfer && (!Number.isSafeInteger(invoiceExpectedVersion) || invoiceExpectedVersion! < 1)) throw new Error("Exact invoice version is required.");
  const requestedMethod = transfer ? null : String(raw.method);
  if (!transfer && !["CASH", "CHECK", "EXTERNAL_CARD", "BANK_TRANSFER", "OTHER"].includes(requestedMethod!)) throw new Error("Choose a supported payment method; this app does not process charges.");
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { locationId: true, closedAt: true, openedAt: true } });
  if (!order) throw new Error("Repair order was not found.");
  const user = await billingAccess(actor, order.locationId, true, organizationId, enforceRollout, amountCents);
  if (order.closedAt) throw new Error("Reopen the repair order before changing its financial ledger.");
  if (occurredAt < order.openedAt) throw new Error("Deposit activity cannot predate the repair order.");
  const data = { action, repairOrderId, amountCents, occurredAt: occurredAt.toISOString(), relatedEntryId, invoiceId, invoiceExpectedVersion, method: requestedMethod, reference, evidence };
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, domain, subjectType, subjectId: repairOrderId, commandType: action, expectedVersion, idempotencyKey, locationId: order.locationId, payload: data, reason });
  return executeAggregateMutation(prisma, command, "vehicle-operations.service-billing", async (tx, version) => {
    const currentOrder = await tx.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, select: { locationId: true } });
    if (!currentOrder || currentOrder.locationId !== order.locationId) throw new Error("Repair order changed. Reload before recording deposit activity.");
    const entries = await readRepairDeposits(tx, organizationId, repairOrderId);
    const source = entries.find(entry => entry.id === relatedEntryId);
    if (action !== "DEPOSIT" && (!source || occurredAt < source.occurredAt)) throw new Error("Original deposit/application was not found or its date is later than this event.");
    if (action === "DEPOSIT") {
      const availability = await collectionAvailability(tx, organizationId, repairOrderId, entries);
      if (!availability.allowed) throw new Error(availability.reason!);
      if (amountCents > availability.maxAmountCents) throw new Error("Deposit exceeds the remaining current estimate amount.");
    } else if (action === "REFUND_DEPOSIT" || action === "APPLY_DEPOSIT") {
      if (source!.kind !== "COLLECTION" || amountCents > depositSourceAvailable(entries, source!.id)) throw new Error("Deposit activity exceeds available funds from the original collection.");
      if (action === "REFUND_DEPOSIT" && requestedMethod !== source!.method) throw new Error("Refund method must match the original deposit.");
    } else {
      const reversed = entries.filter(entry => entry.kind === "UNAPPLY" && entry.relatedEntryId === source!.id).reduce((sum, entry) => sum + entry.amountCents, 0);
      if (source!.kind !== "APPLY" || source!.invoiceId !== invoiceId || amountCents > source!.amountCents - reversed) throw new Error("Reversal exceeds the original deposit application or belongs to another invoice.");
    }
    const method = requestedMethod ?? source!.method;
    let identity: ServiceDocumentContent["identity"];
    if (source) {
      const originalReceipt = await tx.serviceDocument.findFirst({ where: { organizationId, repairOrderId, sourceId: source.id, sourceVersion: 1, kind: { in: ["DEPOSIT", "DEPOSIT_APPLICATION"] } } });
      if (!originalReceipt || hashEnterpriseCommand({ templateVersion: originalReceipt.templateVersion, content: originalReceipt.content }) !== originalReceipt.sha256) throw new Error("Original deposit receipt is missing or failed integrity verification.");
      identity = (originalReceipt.content as unknown as ServiceDocumentContent).identity;
    } else identity = await serviceIdentity(tx, organizationId, repairOrderId, occurredAt);
    let invoiceEntryId: string | null = null, invoiceVersion: number | null = null, invoiceNumber = identity.repairOrderNumber, invoiceBalance: ReturnType<typeof serviceInvoiceBalance> | null = null;
    if (transfer) {
      const invoice = await tx.serviceInvoice.findFirst({ where: { id: invoiceId!, organizationId, repairOrderId } });
      if (!invoice || invoice.version !== invoiceExpectedVersion) throw new EnterpriseCommandConflictError("Invoice version changed. Reload before applying or reversing deposits.", "VERSION_CONFLICT");
      const invoiceEntries = await tx.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: invoice.id } });
      const kind = action === "APPLY_DEPOSIT" ? "PAYMENT" : "REFUND";
      const originalPaymentId = kind === "REFUND" ? source!.invoiceEntryId : null;
      validateBillingEntry(invoice, invoiceEntries, { kind, amountCents, relatedEntryId: originalPaymentId, occurredAt });
      const key = { organizationId_domain_subjectType_subjectId: { organizationId, domain, subjectType: "SERVICE_NATIVE_INVOICE", subjectId: invoice.id } };
      const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
      if (!aggregate || aggregate.version !== invoiceExpectedVersion) throw new EnterpriseCommandConflictError("Invoice aggregate version changed. Reload before applying deposits.", "VERSION_CONFLICT");
      const entry = await tx.serviceInvoiceEntry.create({ data: { id: randomUUID(), organizationId, invoiceId: invoice.id, kind, amountCents, method, reference: `deposit:${idempotencyKey}`, relatedEntryId: originalPaymentId, evidence: toJson({ references: evidence, depositTransfer: true, depositEntryId: relatedEntryId }), occurredAt, createdByUserId: user.id, reason } });
      invoiceEntryId = entry.id; invoiceVersion = invoice.version + 1; invoiceNumber = invoice.invoiceNumber;
      const aggregateUpdate = await tx.enterpriseAggregateVersion.updateMany({ where: { id: aggregate.id, version: invoiceExpectedVersion! }, data: { version: invoiceVersion } });
      const invoiceUpdate = await tx.serviceInvoice.updateMany({ where: { id: invoice.id, organizationId, repairOrderId, version: invoiceExpectedVersion! }, data: { version: invoiceVersion } });
      if (aggregateUpdate.count !== 1 || invoiceUpdate.count !== 1) throw new EnterpriseCommandConflictError("Invoice version changed. Reload before applying or reversing deposits.", "VERSION_CONFLICT");
      invoiceBalance = serviceInvoiceBalance(invoice, [...invoiceEntries, entry]);
      identity = await invoiceReceiptIdentity(tx, organizationId, repairOrderId, invoice.id, (invoice.ledger as unknown as { identity: ServiceDocumentContent["identity"] }).identity);
    }
    const entry: RepairDepositEntry = { id: randomUUID(), organizationId, repairOrderId, kind: kinds[action], amountCents, method, reference, relatedEntryId, invoiceId, invoiceEntryId, evidence: { references: evidence }, occurredAt, createdByUserId: user.id, reason, createdAt: new Date() };
    const balance = repairDepositBalance([...entries, entry]);
    await tx.$executeRaw`INSERT INTO "ServiceRepairDepositEntry" (id,"organizationId","repairOrderId",kind,"amountCents",method,reference,"relatedEntryId","invoiceId","invoiceEntryId",evidence,"occurredAt","createdByUserId",reason,"createdAt") VALUES (${entry.id},${organizationId},${repairOrderId},${entry.kind},${amountCents},${method},${reference},${relatedEntryId},${invoiceId},${invoiceEntryId},${JSON.stringify(entry.evidence)}::jsonb,${occurredAt},${user.id},${reason},${entry.createdAt})`;
    const documentKind = { DEPOSIT: "DEPOSIT", REFUND_DEPOSIT: "DEPOSIT_REFUND", APPLY_DEPOSIT: "DEPOSIT_APPLICATION", UNAPPLY_DEPOSIT: "DEPOSIT_REVERSAL" }[action];
    const document = await recordServiceDocument(tx, { organizationId, repairOrderId, kind: documentKind, sourceId: entry.id, sourceVersion: 1, createdByUserId: user.id, content: { title: action === "DEPOSIT" ? "Repair deposit" : `Repair deposit ${entry.kind.toLowerCase()} receipt`, number: entry.id, issuedAt: occurredAt.toISOString(), identity, receipt: { invoiceNumber, referenceLabel: transfer ? "Invoice" : "Repair order", balanceLabel: transfer ? "Invoice balance due" : "Unapplied deposit", kind: documentKind, amountCents, method, reference, balanceCents: invoiceBalance?.balanceCents ?? balance.availableCents }, lines: [{ key: entry.id, description: `${entry.kind}: ${reference}`, quantity: 1, unitPriceCents: amountCents, totalCents: amountCents }], notes: [transfer ? "Internal deposit transfer only. No new funds were collected or returned." : "Verified funds recorded by staff; no electronic charge was processed.", `Unapplied deposit remaining: ${(balance.availableCents / 100).toFixed(2)} USD.`, "A deposit is not repair authorization or a final invoice."] } });
    return { result: { entryId: entry.id, documentId: document.id, version, balance, invoiceId, invoiceVersion, invoiceBalance } };
  });
}
