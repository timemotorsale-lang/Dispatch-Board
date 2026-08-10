const PO_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: [],
  PARTIALLY_RECEIVED: [],
  RECEIVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

const RECOVERY_TRANSITIONS: Record<string, string[]> = {
  ELIGIBLE: ["SHIPPED", "WRITTEN_OFF"],
  SHIPPED: ["ACKNOWLEDGED", "DISPUTED"],
  ACKNOWLEDGED: ["CREDITED", "DISPUTED"],
  DISPUTED: ["CREDITED", "WRITTEN_OFF"],
  CREDITED: [],
  WRITTEN_OFF: [],
};

export type JsonObject = Record<string, unknown>;
export type PurchaseLine = { partId: string; quantity: number; unitCostCents: number };
export type ReceiptLine = PurchaseLine & { damagedQuantity: number };
export type TransferLine = { partId: string; quantity: number; unitCostCents: number };

export function object(value: unknown, label = "Request"): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as JsonObject;
}

export function required(value: unknown, label: string, max = 500): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

export function optional(value: unknown, max = 500): string | null {
  if (value == null || value === "") return null;
  return required(value, "Value", max);
}

export function integer(value: unknown, label: string, min = 0): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min) throw new Error(`${label} must be a whole number of at least ${min}.`);
  return result;
}

export function date(value: unknown, label: string): Date {
  const result = new Date(required(value, label, 100));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`);
  return result;
}

export function optionalDate(value: unknown, label: string): Date | null {
  return value ? date(value, label) : null;
}

export function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  return [...new Set(value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean))];
}

function base(raw: JsonObject) {
  return {
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    reason: required(raw.reason, "Business reason", 500),
  };
}

function lines(value: unknown, label: string): PurchaseLine[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must contain at least one line.`);
  return value.map((item, index) => {
    const raw = object(item, `${label} line ${index + 1}`);
    return {
      partId: required(raw.partId, `${label} line ${index + 1} part`, 100),
      quantity: integer(raw.quantity, `${label} line ${index + 1} quantity`, 1),
      unitCostCents: integer(raw.unitCostCents, `${label} line ${index + 1} cost`),
    };
  });
}

export function normalizeInvoicePackage(value: unknown) {
  const raw = object(value);
  return { ...base(raw), generatedAt: date(raw.generatedAt, "Generation time") };
}

export function normalizeInvoiceHandoff(value: unknown) {
  const raw = object(value);
  const status = required(raw.status, "Handoff status", 30).toUpperCase();
  if (!["SUBMITTED", "ACCEPTED", "REJECTED"].includes(status)) throw new Error("Invoice handoff status is invalid.");
  return { ...base(raw), externalReference: optional(raw.externalReference, 200), externalSystemCode: optional(raw.externalSystemCode, 100), occurredAt: date(raw.occurredAt, "Handoff time"), status: status as "SUBMITTED" | "ACCEPTED" | "REJECTED" };
}

export function normalizeClose(value: unknown) {
  const raw = object(value);
  const evidence = strings(raw.handoffEvidence, "Handoff evidence");
  if (!evidence.length) throw new Error("At least one handoff evidence reference is required.");
  return { ...base(raw), finalOdometer: integer(raw.finalOdometer, "Final odometer"), handoffEvidence: evidence, keysVerified: raw.keysVerified === true, occurredAt: date(raw.occurredAt, "Close time"), recipientName: required(raw.recipientName, "Recipient name", 200) };
}

export function normalizeReopen(value: unknown) {
  const raw = object(value);
  return { ...base(raw), occurredAt: date(raw.occurredAt, "Reopen time") };
}

export function normalizeVendor(value: unknown) {
  const raw = object(value);
  return { ...base(raw), code: required(raw.code, "Vendor code", 50).toUpperCase(), defaultReturnTerms: required(raw.defaultReturnTerms, "Default return terms", 1000), defaultWarranty: required(raw.defaultWarranty, "Default warranty", 1000), name: required(raw.name, "Vendor name", 200), paymentTerms: required(raw.paymentTerms, "Payment terms", 500), reliabilityBasisPoints: integer(raw.reliabilityBasisPoints ?? 0, "Reliability", 0) };
}

export function normalizeOffer(value: unknown) {
  const raw = object(value);
  const effectiveFrom = date(raw.effectiveFrom, "Effective start"), effectiveTo = optionalDate(raw.effectiveTo, "Effective end");
  if (effectiveTo && effectiveTo <= effectiveFrom) throw new Error("Effective end must follow effective start.");
  return { ...base(raw), availableQuantity: integer(raw.availableQuantity, "Available quantity"), effectiveFrom, effectiveTo, estimatedArrivalAt: optionalDate(raw.estimatedArrivalAt, "Estimated arrival"), partId: required(raw.partId, "Part ID", 100), returnTerms: required(raw.returnTerms, "Return terms", 1000), unitCostCents: integer(raw.unitCostCents, "Unit cost"), vendorId: required(raw.vendorId, "Vendor ID", 100), vendorPartNumber: required(raw.vendorPartNumber, "Vendor part number", 100), warrantyTerms: required(raw.warrantyTerms, "Warranty terms", 1000) };
}

export function normalizeInterchange(value: unknown) {
  const raw = object(value), type = required(raw.type, "Interchange type", 30).toUpperCase();
  if (!["SUBSTITUTE", "SUPERSESSION"].includes(type)) throw new Error("Interchange type is invalid.");
  const fitmentEvidence = strings(raw.fitmentEvidence, "Fitment evidence");
  if (!fitmentEvidence.length) throw new Error("Fitment evidence is required.");
  return { ...base(raw), alternatePartId: required(raw.alternatePartId, "Alternate part ID", 100), approved: raw.approved === true, fitmentEvidence, primaryPartId: required(raw.primaryPartId, "Primary part ID", 100), type: type as "SUBSTITUTE" | "SUPERSESSION" };
}

export function normalizeRequisition(value: unknown) {
  const raw = object(value);
  return { ...base(raw), demandId: required(raw.demandId, "Demand ID", 100), quantity: integer(raw.quantity, "Quantity", 1), requiredAt: date(raw.requiredAt, "Required time") };
}

export function normalizeOfferSelection(value: unknown) {
  const raw = object(value);
  return { ...base(raw), offerId: required(raw.offerId, "Offer ID", 100) };
}

export function normalizePurchaseOrder(value: unknown) {
  const raw = object(value), purchaseLines = lines(raw.lines, "Purchase order");
  return { ...base(raw), duplicateOverrideReason: optional(raw.duplicateOverrideReason, 500), lines: purchaseLines, locationId: required(raw.locationId, "Location ID", 100), purchaseOrderNumber: required(raw.purchaseOrderNumber, "Purchase order number", 100).toUpperCase(), requisitionId: optional(raw.requisitionId, 100), vendorId: required(raw.vendorId, "Vendor ID", 100) };
}

export function normalizePurchaseTransition(value: unknown, currentStatus: string) {
  const raw = object(value), toStatus = required(raw.toStatus, "Purchase order status", 30).toUpperCase();
  if (!PO_TRANSITIONS[currentStatus]?.includes(toStatus)) throw new Error(`Purchase order cannot transition from ${currentStatus} to ${toStatus}.`);
  return { ...base(raw), occurredAt: date(raw.occurredAt, "Transition time"), toStatus };
}

export function normalizeReceipt(value: unknown) {
  const raw = object(value), receiptLines = lines(raw.lines, "Receipt").map((line, index) => ({ ...line, damagedQuantity: integer((raw.lines as JsonObject[])[index]?.damagedQuantity ?? 0, `Receipt line ${index + 1} damaged quantity`) }));
  receiptLines.forEach((line, index) => { if (line.damagedQuantity > line.quantity) throw new Error(`Receipt line ${index + 1} damaged quantity cannot exceed received quantity.`); });
  return { ...base(raw), invoiceReference: optional(raw.invoiceReference, 200), lines: receiptLines, packingSource: required(raw.packingSource, "Packing source", 200), receivedAt: date(raw.receivedAt, "Received time"), stockLocationId: required(raw.stockLocationId, "Stock location ID", 100) };
}

export function normalizeDiscrepancyResolution(value: unknown) {
  const raw = object(value);
  return { ...base(raw), occurredAt: date(raw.occurredAt, "Resolution time"), resolution: required(raw.resolution, "Resolution", 1000) };
}

export function normalizeCustody(value: unknown) {
  const raw = object(value), type = required(raw.type, "Custody type", 40).toUpperCase();
  if (!["ISSUE", "INSTALL", "UNUSED_RETURN", "VENDOR_SHIP"].includes(type)) throw new Error("Direct custody type is invalid.");
  const evidence = strings(raw.evidence ?? [], "Evidence");
  if (type === "INSTALL" && !evidence.length) throw new Error("Installation evidence is required.");
  return { ...base(raw), evidence, occurredAt: date(raw.occurredAt, "Custody time"), partId: required(raw.partId, "Part ID", 100), quantity: integer(raw.quantity, "Quantity", 1), repairJobId: optional(raw.repairJobId, 100), reservationId: optional(raw.reservationId, 100), sourceId: required(raw.sourceId, "Source ID", 200), stockLocationId: required(raw.stockLocationId, "Stock location ID", 100), type: type as "ISSUE" | "INSTALL" | "UNUSED_RETURN" | "VENDOR_SHIP", unitCostCents: integer(raw.unitCostCents ?? 0, "Unit cost") };
}

export function normalizeTransfer(value: unknown) {
  const raw = object(value), transferLines = lines(raw.lines, "Transfer");
  const fromStockLocationId = required(raw.fromStockLocationId, "Origin stock location", 100), toStockLocationId = required(raw.toStockLocationId, "Destination stock location", 100);
  if (fromStockLocationId === toStockLocationId) throw new Error("Transfer origin and destination must differ.");
  return { ...base(raw), fromStockLocationId, lines: transferLines, locationId: required(raw.locationId, "Location ID", 100), toStockLocationId, transferNumber: required(raw.transferNumber, "Transfer number", 100).toUpperCase() };
}

export function normalizeTransferTransition(value: unknown, currentStatus: string) {
  const raw = object(value), toStatus = required(raw.toStatus, "Transfer status", 30).toUpperCase();
  const allowed: Record<string, string[]> = { DRAFT: ["SHIPPED", "CANCELLED"], SHIPPED: ["RECEIVED", "DISCREPANCY"], DISCREPANCY: ["RECEIVED"], RECEIVED: [], CANCELLED: [] };
  if (!allowed[currentStatus]?.includes(toStatus)) throw new Error(`Transfer cannot transition from ${currentStatus} to ${toStatus}.`);
  return { ...base(raw), discrepancyNotes: optional(raw.discrepancyNotes, 1000), occurredAt: date(raw.occurredAt, "Transfer time"), toStatus };
}

export function normalizeRecovery(value: unknown) {
  const raw = object(value), type = required(raw.type, "Recovery type", 30).toUpperCase();
  if (!["CORE", "WARRANTY", "VENDOR_RETURN"].includes(type)) throw new Error("Recovery type is invalid.");
  return { ...base(raw), deadlineAt: date(raw.deadlineAt, "Recovery deadline"), expectedCreditCents: integer(raw.expectedCreditCents, "Expected credit"), partId: required(raw.partId, "Part ID", 100), quantity: integer(raw.quantity, "Quantity", 1), sourceReference: required(raw.sourceReference, "Source reference", 200), type: type as "CORE" | "WARRANTY" | "VENDOR_RETURN", vendorId: optional(raw.vendorId, 100) };
}

export function normalizeRecoveryTransition(value: unknown, currentStatus: string) {
  const raw = object(value), toStatus = required(raw.toStatus, "Recovery status", 30).toUpperCase();
  if (!RECOVERY_TRANSITIONS[currentStatus]?.includes(toStatus)) throw new Error(`Recovery cannot transition from ${currentStatus} to ${toStatus}.`);
  const actualCreditCents = raw.actualCreditCents == null ? null : integer(raw.actualCreditCents, "Actual credit");
  const disputeReason = optional(raw.disputeReason, 1000);
  if (toStatus === "CREDITED" && actualCreditCents == null) throw new Error("Credited recovery requires the actual credit amount.");
  if (toStatus === "DISPUTED" && !disputeReason) throw new Error("Disputed recovery requires a dispute reason.");
  return { ...base(raw), actualCreditCents, disputeReason, occurredAt: date(raw.occurredAt, "Recovery transition time"), stockLocationId: optional(raw.stockLocationId, 100), toStatus };
}

export function normalizePurchaseRevision(value: unknown, currentStatus: string) {
  if (!["DRAFT", "APPROVED"].includes(currentStatus)) throw new Error(`Purchase order cannot be revised from ${currentStatus}.`);
  const raw = object(value);
  return { ...base(raw), lines: lines(raw.lines, "Purchase order revision") };
}

export function assertIndependentPartsApproval(action: "PURCHASE_APPROVAL" | "TRANSFER_RELEASE" | "RECOVERY_WRITE_OFF", preparedByUserId: string, actorUserId: string) {
  if (preparedByUserId !== actorUserId) return;
  const labels = { PURCHASE_APPROVAL: "Purchase order approval", TRANSFER_RELEASE: "Transfer release", RECOVERY_WRITE_OFF: "Recovery write-off" } as const;
  throw new Error(`${labels[action]} requires a different authorized user than the preparer.`);
}
