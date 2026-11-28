/** Persist onProgress before each request. Resume with the same input and progress;
 * never discard an uncertain purchase request and start a new submission. */
export type CompactPartsEntryInput = {
  usage?: "NOT_YET" | "USED" | "RETURN"; receiptId?: string; lineIndex?: number;
  usageQuantity?: number; usageOccurredAt?: string; repairJobId?: string; matchRepairJob?: boolean; evidence?: string[];
  installationEvidence?: string; returnReason?: string; deadlineAt?: string;
  mode: "NEEDED" | "PURCHASED"; repairOrderId: string; locationId: string;
  description: string; quantity: number; partNumber?: string; partId?: string; vendorId?: string; vendorName?: string;
  unitPriceCents?: number; purchasedAt?: string; received?: boolean; receivedAt?: string;
  stockLocationId?: string; stockLocationName?: string; packingSource?: string; note: string; purchaseOrderId?: string; demandId?: string;
};
export type CompactPartsEntryModel = {
  repairOrders: { id: string; locationId: string; closedAt?: string | null }[];
  demands?: { id: string; repairOrderId: string; repairJobId?: string | null; partId: string; quantityRequired: number; quantityReserved: number; status: string }[];
  requisitions?: { id: string; demandId: string; status: string }[];
  catalog: { id: string; partNumber: string; description?: string; status?: string }[];
  vendors: { id: string; name: string; status?: string }[];
  stockLocations: { id: string; locationId: string; name?: string; status?: string; isActive?: boolean; type?: string }[];
  purchaseOrders: { id: string; repairOrderId: string; locationId: string; status: string; lines: { partId: string; quantity: number; unitCostCents: number }[] }[];
  receipts: { id?: string; purchaseOrderId: string; receivedAt?: string; stockLocationId?: string; discrepancyReviewRequired?: boolean; lines: { partId: string; quantity: number; damagedQuantity?: number }[] }[];
  repairJobs?: { id: string; repairOrderId: string; status: string }[];
  custodyEvents?: { sourceId: string; partId: string; quantity: number; type: string }[];
  recoveries?: { id: string; sourceReference: string; partId: string; quantity: number; status: string }[];
};
/** Advisory model calculation; the atomic command rechecks authoritative records. */
export function compactReceiptRemaining(model: CompactPartsEntryModel, receiptId: string, lineIndex: number): number | null {
  const receipt = model.receipts.find(item => item.id === receiptId);
  const line = Number.isInteger(lineIndex) && lineIndex >= 0 ? receipt?.lines[lineIndex] : undefined;
  const po = model.purchaseOrders.find(item => item.id === receipt?.purchaseOrderId);
  if (!line || !po) return null;
  const source = `${receiptId}:${lineIndex}`;
  const scoped = `RO:${po.repairOrderId}|RECEIPT:${source}|`;
  const matches = (value: string) => value === source || value.startsWith(`${source}:`) || value.startsWith(scoped);
  const used = (model.custodyEvents ?? []).filter(item => matches(item.sourceId) && ["INSTALL", "ISSUE"].includes(item.type)).reduce((sum, item) => sum + item.quantity, 0);
  const returns = (model.recoveries ?? []).filter(item => matches(item.sourceReference)).reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, line.quantity - (line.damagedQuantity ?? 0) - used - returns);
}
type Step = { path: string; body: Record<string, unknown>; result?: Record<string, unknown> };
export type CompactPartsEntryProgress = {
  submissionId: string; input: CompactPartsEntryInput; startedAt: string;
  steps: Record<string, Step>;
  partSelection?: { id: string; partNumber: string };
};
export type CompactPartsEntryResult = {
  status: "COMPLETE" | "AWAITING_APPROVAL" | "BLOCKED" | "RETRY";
  message: string; nextAction: string; progress: CompactPartsEntryProgress;
  partId?: string; demandId?: string; vendorId?: string; requisitionId?: string;
  outcomeId?: string; outcome?: "USED" | "RETURN"; remainingQuantity?: number;
  offerId?: string; purchaseOrderId?: string; receiptId?: string; receiptNeedsReview?: boolean; stockLocationId?: string; existingPurchaseOrderIds?: string[];
};
export type CompactPartsEntryOptions = {
  progress?: CompactPartsEntryProgress;
  onProgress: (progress: CompactPartsEntryProgress) => void | Promise<void>;
  request?: (path: string, body: Record<string, unknown>) => Promise<{ result: Record<string, unknown> }>;
};
export const generateCompactPartNumber = (seed = crypto.randomUUID()) => `PART-${seed.toUpperCase()}`;
export const generateCompactStockLocationCode = (seed = crypto.randomUUID()) => `BIN-${seed.toUpperCase()}`;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const partsRolloutDenied = (message?: string) => Boolean(message?.startsWith("Parts Operations mutations are not enabled."));

export function canReplaceBlockedReceivingBin(progress: CompactPartsEntryProgress, message?: string) {
  const bin = progress.steps.stockLocation;
  return partsRolloutDenied(message) && bin?.path === "/api/parts/locations" && !bin.result
    && !progress.steps.receipt && !progress.steps.outcome && !progress.input.receiptId;
}

export function recoveryReceivingBins(progress: CompactPartsEntryProgress, model: CompactPartsEntryModel) {
  return model.stockLocations.filter(bin => bin.locationId === progress.input.locationId
    && bin.isActive !== false && bin.status !== "INACTIVE" && bin.type !== "DAMAGED");
}

export function replaceBlockedReceivingBin(progress: CompactPartsEntryProgress, message: string | undefined, stockLocationId: string, model: CompactPartsEntryModel) {
  if (!canReplaceBlockedReceivingBin(progress, message) || !recoveryReceivingBins(progress, model).some(bin => bin.id === stockLocationId)) return null;
  const next = copy(progress);
  delete next.steps.stockLocation;
  delete next.input.stockLocationName;
  next.input.stockLocationId = stockLocationId;
  return next;
}
const positive = (value: number) => Number.isSafeInteger(value) && value > 0;
const validDate = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now() + 60000);
async function request(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The request failed. Resume this entry after reviewing the error.");
  if (!data.result || typeof data.result !== "object") throw new Error("The command response is incomplete. Resume this same entry to recover its result.");
  return data as { result: Record<string, unknown> };
}
export async function runCompactPartsEntry(input: CompactPartsEntryInput, model: CompactPartsEntryModel, options: CompactPartsEntryOptions): Promise<CompactPartsEntryResult> {
  const progress = copy(options.progress ?? { submissionId: crypto.randomUUID(), input: copy(input), startedAt: new Date().toISOString(), steps: {} });
  const ids: Omit<CompactPartsEntryResult, "status" | "message" | "nextAction" | "progress"> = {};
  const finish = (status: CompactPartsEntryResult["status"], message: string, nextAction: string): CompactPartsEntryResult => {
    const receipt = progress.steps.receipt?.result;
    const refreshedReceipt = model.receipts.find(item => item.id === ids.receiptId);
    const receiptNeedsReview = (refreshedReceipt?.discrepancyReviewRequired ?? receipt?.discrepancyReviewRequired) === true;
    return { status, message, nextAction: receiptNeedsReview ? "Review the receiving discrepancy before continuing with these parts." : nextAction, progress: copy(progress), ...ids, ...(receipt ? { receiptNeedsReview } : {}) };
  };
  // Key-order independent input comparison; absent optional fields equal undefined.
  const keys = [...new Set([...Object.keys(input), ...Object.keys(progress.input)])].sort() as (keyof CompactPartsEntryInput)[];
  if (keys.some(key => JSON.stringify(input[key]) !== JSON.stringify(progress.input[key]))) return finish("BLOCKED", "This entry already started with different values.", "Resume the original entry unchanged; review saved records before starting another.");
  async function step(name: string, path: string, body: Record<string, unknown>) {
    if (!progress.steps[name]) progress.steps[name] = { path, body: { ...body, idempotencyKey: `compact-parts:${progress.submissionId}:${name}` } };
    const saved = progress.steps[name];
    if (!saved.result) {
      await options.onProgress(copy(progress)); // Durable pending request before sending.
      const body = copy(saved.body);
      if (["part", "vendor", "offer"].includes(name)) body.repairOrderId = input.repairOrderId;
      const response = await (options.request ?? request)(saved.path, body);
      saved.result = copy(response.result);
      await options.onProgress(copy(progress));
    }
    return saved.result;
  }
  const id = (result: Record<string, unknown>) => { if (typeof result.id !== "string" || !result.id) throw new Error("Missing saved record ID. Resume this entry to recover the exact record."); return result.id; };
  const command = (name: string, action: string, body: Record<string, unknown>) => step(name, "/api/service-close-parts", { action, reason: input.note, ...body });
  if (!input.repairOrderId || !input.locationId || !input.description.trim() || !positive(input.quantity) || !input.note.trim()) return finish("BLOCKED", "Repair order, location, description, whole quantity and note are required.", "Complete the entry before saving.");
  const order = model.repairOrders.find(order => order.id === input.repairOrderId);
  if (!order || order.locationId !== input.locationId || order.closedAt) return finish("BLOCKED", "Choose an open repair order at this location.", "Refresh the repair order before saving.");
  if (input.demandId && (!input.partId || !model.demands?.some(demand => demand.id === input.demandId && demand.repairOrderId === input.repairOrderId && demand.partId === input.partId))) return finish("BLOCKED", "The selected need does not match this repair order and part.", "Select the exact saved need.");
  const receiving = !input.receiptId && Boolean(input.received || input.purchaseOrderId);
  if (receiving && (!validDate(input.receivedAt) || !input.packingSource?.trim() || !(input.stockLocationId ? model.stockLocations.some(stock => stock.id === input.stockLocationId && stock.locationId === input.locationId && stock.status !== "INACTIVE" && stock.isActive !== false && stock.type !== "DAMAGED") : input.stockLocationName?.trim()))) return finish("BLOCKED", "Choose a receiving bin at this location, receipt date and packing reference.", "Complete the receipt details.");
  const wantsOutcome = input.usage === "USED" || input.usage === "RETURN";
  const quantity = input.usageQuantity ?? input.quantity;
  const evidence = input.evidence ?? (input.installationEvidence?.trim() ? [input.installationEvidence.trim()] : []);
  if (wantsOutcome && !progress.steps.outcome) {
    if ((!input.receiptId && !receiving) || !positive(quantity) || quantity > input.quantity || !validDate(input.usageOccurredAt)) return finish("BLOCKED", "Choose received parts, a valid outcome quantity and date.", "Complete the explicit parts outcome details.");
    if (input.usage === "USED" && (!evidence.length || evidence.some(item => !item.trim()) || !model.repairJobs?.some(job => job.id === input.repairJobId && job.repairOrderId === input.repairOrderId && job.status && !["UNKNOWN", "CANCELLED", "QC_PASSED"].includes(job.status)))) return finish("BLOCKED", "Installation needs an active job on this repair order and evidence.", "Refresh job status and record the installation details.");
    if (input.usage === "RETURN" && (!input.returnReason?.trim() || !input.deadlineAt || !Number.isFinite(Date.parse(input.deadlineAt)) || Date.parse(input.deadlineAt) < Date.parse(input.usageOccurredAt!))) return finish("BLOCKED", "Return follow-up needs a reason and a deadline on or after its recorded time.", "Complete the return follow-up details.");
  }
  const completeReceipt = async (message: string, nextAction: string, lineIndex = 0) => {
    if (!wantsOutcome) return finish("COMPLETE", message, nextAction);
    if ((model.receipts.find(item => item.id === ids.receiptId)?.discrepancyReviewRequired ?? progress.steps.receipt?.result?.discrepancyReviewRequired) === true && !progress.steps.outcome) return finish("BLOCKED", "Receipt saved; review its receiving discrepancy before recording an outcome.", "Resolve the receiving discrepancy, then resume.");
    if (!progress.steps.outcome && !input.receiptId && input.receivedAt && Date.parse(input.usageOccurredAt!) < Date.parse(input.receivedAt)) return finish("BLOCKED", "Outcome time cannot precede receiving.", "Review the outcome date before continuing.");
    const result = await command("outcome", "RECORD_RECEIVED_PART_OUTCOME", { repairOrderId: input.repairOrderId, receiptId: ids.receiptId, lineIndex, quantity, occurredAt: input.usageOccurredAt, outcome: input.usage, ...(input.usage === "USED" ? { repairJobId: input.repairJobId, evidence } : { returnReason: input.returnReason, deadlineAt: input.deadlineAt }) });
    ids.outcomeId = id(result); ids.outcome = input.usage as "USED" | "RETURN";
    if (typeof result.remainingQuantity === "number") ids.remainingQuantity = result.remainingQuantity;
    return finish("COMPLETE", input.usage === "USED" ? "Verified installation recorded." : "Unused-part return follow-up opened.", input.usage === "USED" ? "Continue the repair workflow; QC remains a separate step." : "Follow the recovery case; shipment and vendor credit are not yet recorded.");
  };
  const receive = async (purchaseOrderId: string, partId: string, unitCostCents: number) => {
    const matches = model.stockLocations.filter(stock => stock.locationId === input.locationId && stock.isActive !== false && stock.status !== "INACTIVE" && stock.type !== "DAMAGED" && stock.name?.trim().toLowerCase() === input.stockLocationName?.trim().toLowerCase());
    if (!input.stockLocationId && matches.length > 1 && !progress.steps.stockLocation) throw new Error("Multiple physical locations match this name. Select the exact receiving bin.");
    ids.stockLocationId = input.stockLocationId ?? (progress.steps.stockLocation ? id(await step("stockLocation", "", {})) : matches[0]?.id ?? id(await step("stockLocation", "/api/parts/locations", { locationId: input.locationId, name: input.stockLocationName?.trim(), code: generateCompactStockLocationCode(progress.submissionId), type: "BIN", reason: input.note })));

    ids.receiptId = id(await command("receipt", "RECEIVE_PURCHASE_ORDER", { strictRemaining: true, subjectId: purchaseOrderId, receivedAt: input.receivedAt, stockLocationId: ids.stockLocationId, packingSource: input.packingSource, lines: [{ partId, quantity: input.quantity, unitCostCents, damagedQuantity: 0 }] }));
  };
  try {
    if (input.receiptId) {
      const receipt = model.receipts.find(item => item.id === input.receiptId);
      const po = model.purchaseOrders.find(item => item.id === receipt?.purchaseOrderId);
      const lineIndex = input.lineIndex;
      const line = Number.isInteger(lineIndex) && lineIndex! >= 0 ? receipt?.lines[lineIndex!] : undefined;
      if (!receipt || !po || po.repairOrderId !== input.repairOrderId || po.locationId !== input.locationId || !line || (input.partId && input.partId !== line.partId)) return finish("BLOCKED", "Select the exact receipt line belonging to this repair order and store.", "Refresh and select the original receipt line.");
      ids.receiptId = input.receiptId; ids.purchaseOrderId = po.id; ids.partId = line.partId; ids.stockLocationId = receipt.stockLocationId;
      if (wantsOutcome && !progress.steps.outcome) {
        const remaining = compactReceiptRemaining(model, input.receiptId, lineIndex!) ?? 0;
        if ((line.damagedQuantity ?? 0) > 0 || quantity > remaining || !receipt.receivedAt || Date.parse(input.usageOccurredAt!) < Date.parse(receipt.receivedAt)) return finish("BLOCKED", "Outcome exceeds the undamaged remaining receipt quantity or predates receiving.", "Review this exact receipt line before continuing.");
      }
      return await completeReceipt("Parts remain received; no use or return recorded.", "Choose Used or Return only when explicitly recorded.", lineIndex!);
    }
    if (input.purchaseOrderId) {
      ids.purchaseOrderId = input.purchaseOrderId; ids.partId = input.partId;
      const po = model.purchaseOrders.find(order => order.id === input.purchaseOrderId);
      if (!po || po.repairOrderId !== input.repairOrderId || po.locationId !== input.locationId) return finish("BLOCKED", "The selected purchase order does not belong to this repair order and location.", "Select the exact matching purchase order.");
      if (progress.steps.receipt?.result) { ids.receiptId = id(progress.steps.receipt.result); return await completeReceipt("Receipt already recorded.", "Review the saved receipt."); }
      if (progress.steps.receipt) {
        ids.receiptId = id(await step("receipt", "", {}));
        return await completeReceipt("Existing purchase order receipt recovered.", "Review the exact saved receipt.");
      }
      if (po.status === "DRAFT") return finish("AWAITING_APPROVAL", "This purchase order needs approval before receiving.", "Ask an authorized approver to review this purchase order.");
      if (!["APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(po.status)) return finish("BLOCKED", "This purchase order is not open for receiving.", "Review its current status.");
      const lines = po.lines.filter(line => line.partId === input.partId);
      if (lines.length !== 1) return finish("BLOCKED", "Select one unambiguous part line from this purchase order.", "Review the purchase order lines.");
      const line = lines[0], received = model.receipts.filter(receipt => receipt.purchaseOrderId === po.id).flatMap(receipt => receipt.lines).filter(item => item.partId === line.partId).reduce((sum, item) => sum + item.quantity, 0);
      // A pending receipt may already have committed: replay its frozen request
      // even if a refreshed model now includes that receipt or marks the PO received.
      if (!progress.steps.receipt && input.quantity > line.quantity - received) return finish("BLOCKED", "Quantity exceeds the remaining quantity on this purchase order.", "Review earlier receipts and enter only the remaining quantity.");
      await receive(po.id, line.partId, line.unitCostCents);
      return await completeReceipt("Existing purchase order receipt recorded.", "Review receipt; installation is a separate action.");
    }
    if (input.mode === "PURCHASED" && (!validDate(input.purchasedAt) || !Number.isSafeInteger(input.unitPriceCents) || input.unitPriceCents! < 0 || (!input.vendorId && !input.vendorName?.trim()))) return finish("BLOCKED", "A vendor, valid purchase date and price in whole cents are required.", "Complete the purchase details.");
    if (receiving && input.mode !== "PURCHASED") return finish("BLOCKED", "Needed parts cannot be marked received without a purchase order.", "Select an existing purchase order or record a purchase.");
    if (receiving && Date.parse(input.receivedAt!) < Date.parse(input.purchasedAt!)) return finish("BLOCKED", "Receipt date cannot precede purchase date.", "Correct the dates.");
    let part = progress.partSelection;
    if (!part && !progress.steps.part) {
      const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
      const active = model.catalog.filter(item => !item.status || item.status === "ACTIVE");
      const matches = input.partId ? active.filter(item => item.id === input.partId) : input.partNumber?.trim() ? active.filter(item => item.partNumber.trim().toUpperCase() === input.partNumber!.trim().toUpperCase()) : active.filter(item => item.description && normalized(item.description) === normalized(input.description));
      if (input.partId && !matches.length) return finish("BLOCKED", "Selected catalog part is unavailable.", "Refresh the catalog.");
      if (matches.length > 1) return finish("BLOCKED", "Multiple catalog parts match this description.", "Select the exact catalog part before saving.");
      if (matches.length === 1) {
        part = { id: matches[0].id, partNumber: matches[0].partNumber };
        progress.partSelection = part;
      }
    }
    if (input.mode === "PURCHASED" && part && !progress.steps.demand && !progress.steps.part) {
      const purchases = model.purchaseOrders.filter(po => po.repairOrderId === input.repairOrderId && po.locationId === input.locationId && po.status !== "CANCELLED" && po.lines.some(line => line.partId === part.id));
      const needs = (model.demands ?? []).filter(demand => demand.repairOrderId === input.repairOrderId && demand.partId === part.id);
      const requisition = model.requisitions?.find(req => needs.some(demand => demand.id === req.demandId) && !["CANCELLED", "CLOSED"].includes(req.status));
      if (purchases.length || requisition) {
        ids.partId = part.id; ids.existingPurchaseOrderIds = purchases.map(po => po.id);
        if (purchases.length === 1) ids.purchaseOrderId = purchases[0].id;
        if (requisition) ids.requisitionId = requisition.id;
        return finish("BLOCKED", "Procurement already exists for this saved part.", purchases.length ? "Choose an existing purchase order and receive its remaining quantity." : "Continue the existing requisition.");
      }
    }
    if (part) await options.onProgress(copy(progress));
    ids.partId = part?.id ?? id(await step("part", "/api/parts", { description: input.description, partNumber: input.partNumber?.trim().toUpperCase() || generateCompactPartNumber(progress.submissionId), standardCostCents: input.unitPriceCents ?? 0, unitOfMeasure: "EACH", reason: input.note }));
    const eligible = (demand: NonNullable<CompactPartsEntryModel["demands"]>[number]) => demand.repairOrderId === input.repairOrderId && demand.partId === ids.partId && (!input.matchRepairJob || demand.repairJobId === input.repairJobId) && ["OPEN", "PARTIALLY_RESERVED"].includes(demand.status);
    const candidates = (model.demands ?? []).filter(demand => eligible(demand) && (!input.demandId || demand.id === input.demandId));
    if (!progress.steps.demand && candidates.length > 1) return finish("BLOCKED", "More than one saved need matches this part.", "Select the exact saved need.");
    if (!progress.steps.demand && input.demandId && !candidates.length) return finish("BLOCKED", "This saved need is no longer open.", "Refresh and select an open need.");
    const selected = candidates[0];
    if (!progress.steps.demand && selected) {
      progress.steps.demand = { path: "", body: {}, result: { id: selected.id, reused: true } };
      await options.onProgress(copy(progress));
    }
    const demand = progress.steps.demand?.result ?? await step("demand", `/api/repair-orders/${encodeURIComponent(input.repairOrderId)}/parts`, { partId: ids.partId, quantityRequired: input.quantity, ...(input.repairJobId ? { repairJobReference: input.repairJobId } : {}), requiredAt: input.purchasedAt ?? progress.startedAt, notes: input.note, reason: input.note });
    ids.demandId = id(demand);
    if (demand.reused === true && !progress.steps.requisition) {
      const existing = model.demands?.find(item => item.id === ids.demandId);
      if (!existing || !eligible(existing) || input.quantity !== existing.quantityRequired - existing.quantityReserved) return finish("BLOCKED", "Purchase quantity must match the remaining quantity of this saved need.", "Refresh the saved need and use its exact remaining quantity.");
      if (input.mode === "PURCHASED") {
        if (!model.requisitions) return finish("BLOCKED", "Purchase history is needed before converting this saved need.", "Refresh procurement records and resume this entry.");
        const conflict = model.requisitions.some(item => item.demandId === existing.id && !["CANCELLED", "CLOSED"].includes(item.status));
        const purchase = model.purchaseOrders.find(po => po.repairOrderId === input.repairOrderId && po.status !== "CANCELLED" && po.lines.some(line => line.partId === ids.partId));
        if (conflict || purchase) {
          if (purchase) ids.purchaseOrderId = purchase.id;
          return finish("BLOCKED", "This saved need already has procurement in progress.", purchase ? "Select this existing purchase order to receive its remaining parts." : "Finish the existing requisition before creating another purchase.");
        }
      }
    }
    if (input.mode === "NEEDED") return finish("COMPLETE", demand.reused ? "Existing part need selected." : "Part need recorded.", "Choose Purchased for this saved need when ready to buy.");
    const vendor = input.vendorId ? model.vendors.find(item => item.id === input.vendorId && item.status !== "INACTIVE") : undefined;
    if (input.vendorId && !vendor) return finish("BLOCKED", "Selected vendor is unavailable.", "Refresh the vendor list.");
    ids.vendorId = vendor?.id ?? id(await command("vendor", "CREATE_VENDOR", { name: input.vendorName, code: `ENTRY-${progress.submissionId}`, defaultReturnTerms: "Not recorded; verify with vendor", defaultWarranty: "Not recorded; verify with vendor", paymentTerms: "Not recorded; verify with vendor" }));
    ids.offerId = id(await command("offer", "CREATE_VENDOR_OFFER", { vendorId: ids.vendorId, partId: ids.partId, vendorPartNumber: part?.partNumber ?? (input.partNumber?.trim().toUpperCase() || generateCompactPartNumber(progress.submissionId)), availableQuantity: input.quantity, unitCostCents: input.unitPriceCents, effectiveFrom: input.purchasedAt, returnTerms: "Not recorded; verify with vendor", warrantyTerms: "Not recorded; verify with vendor" }));
    ids.requisitionId = id(await command("requisition", "CREATE_REQUISITION", { demandId: ids.demandId, quantity: input.quantity, requiredAt: input.purchasedAt }));
    await command("selection", "SELECT_REQUISITION_OFFER", { subjectId: ids.requisitionId, offerId: ids.offerId });
    const po = await command("purchase", "CREATE_PURCHASE_ORDER", { locationId: input.locationId, vendorId: ids.vendorId, requisitionId: ids.requisitionId, purchaseOrderNumber: `ENTRY-${progress.submissionId}`, lines: [{ partId: ids.partId, quantity: input.quantity, unitCostCents: input.unitPriceCents }], reason: `${input.note} Staff-reported purchase time: ${input.purchasedAt}.` });
    ids.purchaseOrderId = id(po);
    const current = model.purchaseOrders.find(order => order.id === ids.purchaseOrderId);
    const status = current?.status ?? po.status;
    if (status === "DRAFT") return finish("AWAITING_APPROVAL", "Purchase saved as draft; approval is required.", "Ask an authorized approver to review this exact purchase order.");
    if (!["APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(String(status)) && !progress.steps.receipt) return finish("BLOCKED", "Purchase order is not open for receiving.", "Review the saved purchase order.");
    if (receiving) await receive(ids.purchaseOrderId, ids.partId, input.unitPriceCents!);
    return await completeReceipt(receiving ? "Purchase and receipt recorded." : "Purchase recorded.", receiving ? "Review receipt; installation is a separate action." : "Receive this purchase order when the parts arrive.");
  } catch (error) {
    return finish("RETRY", error instanceof Error ? error.message : "The entry could not finish.", "Keep this entry and resume unchanged; do not create another purchase.");
  }
}
