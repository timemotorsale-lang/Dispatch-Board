import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { EnterpriseCommandConflictError, hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { billingAccess } from "@/server/service-billing/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { presentRepairEstimate } from "@/server/shop-planning/service";
import { normalizeDocumentCustomer } from "@/lib/service-document-review";
import { normalizeServiceCharges, serviceChargeLines, serviceQuoteTax, SERVICE_CHARGES_POLICY, SHOP_SUPPLIES_KEY } from "@/lib/service-charges";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { commercialLines } from "@/lib/service-commercial-ledger";
import { recordServiceDocument, type ServiceDocumentContent } from "./service-documents";

const organizationId = INITIAL_ORGANIZATION.id;
async function context(actor: AuthenticatedUser | null, repairOrderId: string, documentId: string, manage: boolean) {
  const user = assertAuthenticatedUser(actor);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { id: true, locationId: true, version: true, closedAt: true } });
  if (!order) throw new Error("Repair order was not found.");
  const foundation = createEnterpriseCommandRepository(), grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: manage ? "REPAIR_ORDER_MANAGE" : "REPAIR_ORDER_VIEW" });
  if (manage && !evaluateVehicleOperationsFeature(await foundation.listFeatureFlags(organizationId), "SHOP_OPERATIONS", user.id, order.locationId).executable) throw new Error("Shop Operations is not enabled for this store.");
  const document = await prisma.serviceDocument.findFirst({ where: { id: documentId, repairOrderId, organizationId } });
  if (!document) throw new Error("Service document was not found.");
  if (!["RO", "ESTIMATE", "AUTHORIZATION"].includes(document.kind)) await billingAccess(user, order.locationId, manage);
  if (hashEnterpriseCommand({ templateVersion: document.templateVersion, content: document.content }) !== document.sha256) throw new Error("Document integrity verification failed.");
  const canManage = evaluateVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "REPAIR_ORDER_MANAGE" }).allowed && (document.kind !== "INVOICE" || evaluateVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "SERVICE_BILLING_MANAGE" }).allowed);
  return { user, order, document, canManage, content: document.content as unknown as ServiceDocumentContent };
}
export async function getServiceDocumentReview(actor: AuthenticatedUser | null, repairOrderId: string, documentId: string) {
  const current = await context(actor, repairOrderId, documentId, false);
  const [estimate, invoice, latestDocument] = await Promise.all([
    prisma.repairEstimateVersion.findFirst({ where: { organizationId, repairOrderId }, orderBy: { version: "desc" } }),
    prisma.serviceInvoice.findFirst({ where: { organizationId, repairOrderId, status: "POSTED" }, select: { id: true } }),
    prisma.serviceDocument.findFirst({ where: { organizationId, repairOrderId, kind: current.document.kind, sourceId: current.document.sourceId }, orderBy: { sourceVersion: "desc" }, select: { id: true } }),
  ]);
  const identity = current.content.identity;
  const lines = current.document.kind === "INVOICE" ? current.content.lines : estimate ? commercialLines(estimate.lineItems) : [];
  const options = estimate?.optionGroups as { servicePricing?: { taxRatePercent?: number } } | null;
  return { customer: { name: identity.customer, phone: identity.customerContact?.phone ?? "", email: identity.customerContact?.email ?? "", address: identity.customerContact?.address ?? "" }, documentHash: current.document.sha256,
    canEditCustomer: current.canManage && latestDocument?.id === current.document.id,
    canEditCharges: current.canManage && latestDocument?.id === current.document.id && !invoice && !current.order.closedAt && current.document.kind === "ESTIMATE" && current.document.sourceId === estimate?.id,
    chargeEditReason: !current.canManage ? "Your account has read-only access to these charges." : invoice ? "Charges on an issued invoice stay fixed. Use billing adjustments for corrections." : current.order.closedAt ? "Reopen this repair order before changing charges." : "Open the latest estimate to change charges.",
    estimateId: estimate?.id, expectedVersion: current.order.version, discountCents: current.document.kind === "INVOICE" ? current.content.totals?.discountCents ?? 0 : estimate?.discountCents ?? 0,
    workTaxableCents: lines.filter(line => line.type !== "FEE" && line.taxable === true).reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    savedTaxCents: current.content.totals?.taxCents ?? 0,
    workSubtotalCents: lines.filter(line => line.type !== "FEE").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    laborCents: lines.filter(line => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    charges: lines.filter(line => line.type === "FEE" && line.key !== SHOP_SUPPLIES_KEY).map(line => ({ id: line.key.replace(/^fee-other-/, "").replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 70), description: line.description, amountCents: line.quantity * line.unitPriceCents, taxable: line.taxable === true })),
    suppliesTaxable: lines.find(line => line.key === SHOP_SUPPLIES_KEY)?.taxable === true,
    taxRatePercent: options?.servicePricing?.taxRatePercent ?? null,
  };
}
export async function updateServiceDocumentCustomer(actor: AuthenticatedUser | null, repairOrderId: string, raw: Record<string, unknown>) {
  const documentId = String(raw.documentId ?? ""), current = await context(actor, repairOrderId, documentId, true);
  if (!["ESTIMATE", "INVOICE"].includes(current.document.kind)) throw new Error("Customer details can be edited on an estimate or invoice.");
  if (typeof raw.idempotencyKey !== "string" || raw.idempotencyKey.length > 200) throw new Error("Invalid save request key.");
  const customer = normalizeDocumentCustomer(raw.customer);
  const command = normalizeEnterpriseCommand({ organizationId, actorUserId: current.user.id, domain: "SHOP_OPERATIONS", subjectType: "SERVICE_DOCUMENT", subjectId: documentId, commandType: "UPDATE_DOCUMENT_CUSTOMER_DETAILS", expectedVersion: current.document.sourceVersion, idempotencyKey: String(raw.idempotencyKey ?? ""), locationId: current.order.locationId, payload: { documentId, expectedHash: raw.documentHash, customer }, reason: "Update customer billing/contact details during service document review; preserve financial charges and prior document." });
  return prisma.$transaction(async tx => {
    const receipt = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
    if (receipt) {
      if (receipt.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("This request key was used with different customer details.", "IDEMPOTENCY_KEY_REUSED");
      return receipt.resultSnapshot;
    }
    const latest = await tx.serviceDocument.findFirst({ where: { organizationId, repairOrderId, kind: current.document.kind, sourceId: current.document.sourceId }, orderBy: { sourceVersion: "desc" } });
    if (latest?.id !== documentId || latest.sha256 !== raw.documentHash) throw new EnterpriseCommandConflictError("This document changed. Open the latest version before editing customer details.", "VERSION_CONFLICT");
    const document = await recordServiceDocument(tx, { organizationId, repairOrderId, kind: current.document.kind, sourceId: current.document.sourceId, sourceVersion: latest.sourceVersion + 1, createdByUserId: current.user.id, content: { ...current.content, identity: { ...current.content.identity, customer: customer.name, customerContact: { phone: customer.phone, email: customer.email, address: customer.address } }, customerDetailsEdited: true, revisionLabel: "Customer details updated" } });
    const result = { documentId: document.id };
    const ledger = await tx.enterpriseCommandLedger.create({ data: { organizationId, locationId: current.order.locationId, actorUserId: current.user.id, domain: command.domain, subjectType: command.subjectType, subjectId: documentId, commandType: command.commandType, status: "SUCCEEDED", idempotencyKey: command.idempotencyKey, requestHash: command.requestHash, correlationId: command.correlationId, expectedVersion: latest.sourceVersion, resultingVersion: document.sourceVersion, resultSnapshot: result, completedAt: new Date() } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId, locationId: current.order.locationId, actorUserId: current.user.id, commandId: ledger.id, domain: command.domain, subjectType: command.subjectType, subjectId: documentId, eventType: "DOCUMENT_CUSTOMER_DETAILS_UPDATED", reason: command.reason, priorValue: { documentId, sha256: latest.sha256 }, newValue: { documentId: document.id, sha256: document.sha256 }, metadata: { financialAmountsChanged: false }, correlationId: command.correlationId } });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function reviseServiceDocumentCharges(actor: AuthenticatedUser | null, repairOrderId: string, raw: Record<string, unknown>) {
  const current = await context(actor, repairOrderId, String(raw.documentId ?? ""), true);
  if (current.document.kind !== "ESTIMATE" || current.order.closedAt) throw new Error("Other charges must be reviewed on the estimate before invoice issue.");
  if (await prisma.serviceInvoice.findFirst({ where: { organizationId, repairOrderId, status: "POSTED" }, select: { id: true } })) throw new Error("An issued invoice cannot be repriced. Use the billing adjustment workflow.");
  const estimate = await prisma.repairEstimateVersion.findFirst({ where: { id: String(raw.estimateId ?? ""), organizationId, repairOrderId } });
  if (!estimate || estimate.id !== current.document.sourceId) throw new Error("Open the current estimate to change charges.");
  const charges = normalizeServiceCharges(raw.charges), taxRatePercent = Number(raw.taxRatePercent);
  if (raw.taxRatePercent == null || raw.taxRatePercent === "" || !Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 30) throw new Error("Enter the applicable tax rate.");
  const source = commercialLines(estimate.lineItems), work = source.filter(line => line.type !== "FEE");
  const laborCents = work.filter(line => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const lineItems = [...work, ...serviceChargeLines(laborCents, charges, raw.suppliesTaxable === true)];
  const discountCents = raw.discountCents === undefined ? estimate.discountCents : Number(raw.discountCents);
  const taxCents = serviceQuoteTax(lineItems.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0), lineItems.filter(line => line.taxable === true).reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0), taxRatePercent, discountCents);
  const activeRate = await getActiveLaborRate(current.user);
  const result = await presentRepairEstimate(current.user, repairOrderId, { estimateWorkflow: "STAFF_QUOTE", chargesPolicy: SERVICE_CHARGES_POLICY, chargeRevisionFrom: estimate.id, documentReview: { documentId: current.document.id, documentHash: raw.documentHash, ...(raw.customer === undefined ? {} : { customer: normalizeDocumentCustomer(raw.customer) }) }, lineItems, taxCents, discountCents, expectedVersion: raw.expectedVersion, presentedAt: raw.presentedAt, expiresAt: raw.expiresAt, presentationChannel: estimate.presentationChannel, taxBoundary: `Staff-configured ${taxRatePercent}% tax on taxable parts and charges after proportional discount allocation.`, assumptions: estimate.assumptions, optionGroups: { ...(estimate.optionGroups && typeof estimate.optionGroups === "object" && !Array.isArray(estimate.optionGroups) ? estimate.optionGroups : {}), servicePricing: { taxRatePercent } }, reason: "Revise shop supplies, additional charges and discount during document review; obtain approval for the revised total.", idempotencyKey: raw.idempotencyKey, estimateControls: { version: 1, pricing: { ...initialEstimatePricing, laborRate: activeRate.laborRate, taxRatePercent }, fitment: {}, overlapResolution: "", reviewedScope: "" } });
  return result;
}
