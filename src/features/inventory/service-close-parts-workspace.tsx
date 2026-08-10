"use client";

import { ArrowRight, Building2, ClipboardCheck, PackagePlus, RotateCcw, ShoppingCart, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

type Named = { id: string; name?: string; code?: string; part?: { partNumber: string }; partNumber?: string; description?: string; status?: string; type?: string; locationId?: string; standardCostCents?: number; orderedTotalCents?: number; quantity?: number; unitCostCents?: number };
type RepairOrder = Named & { closedAt: string | null; locationId: string; repairOrderNumber: string; stage: string; vehicle: { color?: string | null; make?: string | null; model?: string | null; stockNumber?: string | null; vehicleNumber: string; vin?: string | null; year?: number | null }; customer: { displayName: string } | null; invoicePackages: Array<{ id: string; mismatchCodes: string[]; repairOrderId: string; status: string; version: number }> };
type Demand = Named & { notes?: string | null; partId: string; quantityRequired: number; quantityReserved: number; requiredAt: string; part: { partNumber: string; description?: string }; repairOrder: { repairOrderNumber: string } };
type Offer = Named & { partId: string; unitCostCents: number; vendorId: string; vendor: { name: string }; part: { partNumber: string; description?: string } };
type Requisition = Named & { requiredAt?: string; selectedOfferId: string | null; demand: { part: { partNumber: string; description?: string }; repairOrder: { repairOrderNumber: string } }; selectedOffer?: { vendor: { name: string } } | null };
type PurchaseOrder = Named & { createdAt?: string; locationId: string; orderedTotalCents?: number; purchaseOrderNumber: string; vendorId: string; vendor?: { name: string } };
type Receipt = Named & { receivedAt?: string; purchaseOrder?: { purchaseOrderNumber: string; requisition?: { demand?: { repairOrder?: { repairOrderNumber: string } } | null } | null }; stockLocation?: { code: string; name: string } };
type Transfer = Named & { locationId: string; transferNumber: string };
type Recovery = Named & { actualCreditCents: number | null; expectedCreditCents?: number; partId: string; type: string; vendor?: { name: string } | null };
type Model = { custodyEvents: Named[]; demands: Demand[]; discrepancies: Named[]; interchanges: Named[]; locations: Named[]; offers: Offer[]; parts: Named[]; purchaseOrders: PurchaseOrder[]; receipts: Receipt[]; recoveries: Recovery[]; repairOrders: RepairOrder[]; requisitions: Requisition[]; stockLocations: Named[]; transfers: Transfer[]; vendors: Named[] };

type Props = { initial: Model; initialRepairOrderId?: string; returnLabel?: string; returnTo?: string };
type DeskMode = "need" | "source" | "order" | "receive" | "vendor" | "use" | "return";

const now = () => new Date().toISOString();
const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const first = (rows: Named[]) => rows[0]?.id ?? "";
const money = (value = 0) => `$${(value / 100).toFixed(2)}`;
const format = (value?: string | null) => (value || "Not recorded").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const safeDate = (value?: string | null) => {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleString();
};
const orderNumberFor = (order?: RepairOrder | null) => order?.repairOrderNumber ?? "";
const vehicleLabelFor = (order?: RepairOrder | null) => {
  const vehicle = order?.vehicle;
  if (!vehicle) return "No vehicle selected";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
};
const vehicleMetaFor = (order?: RepairOrder | null) => {
  const vehicle = order?.vehicle;
  if (!vehicle) return [];
  return [
    vehicle.color ? `Color ${vehicle.color}` : null,
    vehicle.stockNumber ? `Stock ${vehicle.stockNumber}` : null,
    vehicle.vin ? `VIN ${vehicle.vin}` : null,
    `Unit ${vehicle.vehicleNumber}`,
  ].filter(Boolean) as string[];
};

function reconBudgetFor(order?: RepairOrder | null) {
  const vehicle = order?.vehicle;
  const currentYear = new Date().getFullYear();
  const age = vehicle?.year ? Math.max(0, currentYear - vehicle.year) : 5;
  const premium = /toyota|honda|lexus|acura/i.test(vehicle?.make ?? "") ? 1.08 : /bmw|mercedes|audi/i.test(vehicle?.make ?? "") ? 1.18 : 1;
  const utility = /rav4|cr-v|pilot|highlander|tacoma|truck|suv/i.test(`${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`) ? 1.1 : 1;
  const estimatedRetailCents = Math.round(Math.max(900000, (3000000 - age * 165000) * premium * utility));
  const totalAcquisitionInvestmentCents = Math.round(estimatedRetailCents * 0.76);
  const targetGrossCents = Math.round(Math.max(250000, estimatedRetailCents * 0.12));
  const safetyReserveCents = Math.round(Math.max(50000, estimatedRetailCents * 0.025));
  const maxReconBudgetCents = Math.max(0, estimatedRetailCents - totalAcquisitionInvestmentCents - targetGrossCents - safetyReserveCents);
  return { estimatedRetailCents, maxReconBudgetCents, safetyReserveCents, targetGrossCents, totalAcquisitionInvestmentCents };
}

function cleanDescription(value: string) {
  return value.trim().replace(/^[-*]\s*/, "").replace(/\s+/g, " ");
}

function partNumberFrom(description: string) {
  return description.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || `PART-${Date.now()}`;
}

async function request(body?: Record<string, unknown>) {
  const response = await fetch("/api/service-close-parts", body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...body }) } : undefined);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

async function createDemand(repairOrderId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/parts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...body }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Part demand could not be recorded.");
  return result;
}

async function createPartFromDescription(description: string) {
  const response = await fetch("/api/parts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      categoryCode: "RECON",
      description,
      idempotencyKey: crypto.randomUUID(),
      partNumber: partNumberFrom(description),
      reason: "Create needed recon part from simple parts entry.",
      standardCostCents: 0,
      unitOfMeasure: "EACH",
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Could not create ${description}.`);
  const id = result.result?.id ?? result.id;
  if (!id) throw new Error(`Created ${description}, but the new part ID was not returned.`);
  return id as string;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="scp-field"><span>{label}</span>{children}</label>;
}

function Notice({ value }: { value: string }) {
  if (!value) return null;
  const danger = /failed|required|cannot|invalid|not found|not enabled|must|missing/i.test(value);
  return <div className={`scp-notice ${danger ? "danger" : "success"}`} role="status">{value}</div>;
}

export function ServiceClosePartsWorkspace({ initial, initialRepairOrderId, returnLabel, returnTo }: Props) {
  const initialOrderId = initial.repairOrders.some((order) => order.id === initialRepairOrderId) ? initialRepairOrderId! : first(initial.repairOrders);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const [model, setModel] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderId, setOrderId] = useState(initialOrderId);
  const [mode, setMode] = useState<DeskMode>("need");

  const [demand, setDemand] = useState(() => ({ partId: first(initial.parts), quantityRequired: "1", requiredAt: local(new Date(Date.now() + 24 * 60 * 60 * 1000)), substitutionAllowed: true, notes: "" }));
  const [notes, setNotes] = useState<Record<DeskMode, string>>({ need: "", order: "", receive: "", return: "", source: "", use: "", vendor: "" });

  const selectedOrder = model.repairOrders.find((item) => item.id === orderId) ?? model.repairOrders[0] ?? null;
  const selectedNumber = orderNumberFor(selectedOrder);
  const selectedVehicleLabel = vehicleLabelFor(selectedOrder);
  const selectedVehicleMeta = vehicleMetaFor(selectedOrder);
  const scopedDemands = model.demands.filter((item) => !selectedNumber || item.repairOrder.repairOrderNumber === selectedNumber);
  const openNeededParts = scopedDemands.filter((item) => !["RESERVED", "RELEASED", "CANCELLED"].includes(item.status ?? ""));
  const scopedRequisitions = model.requisitions.filter((item) => !selectedNumber || item.demand.repairOrder.repairOrderNumber === selectedNumber);
  const scopedReceipts = model.receipts.filter((item) => item.purchaseOrder?.requisition?.demand?.repairOrder?.repairOrderNumber === selectedNumber);
  const openPurchaseOrders = model.purchaseOrders.filter((item) => !["CLOSED", "CANCELLED"].includes(item.status ?? ""));
  const openRecoveries = model.recoveries.filter((item) => !["CREDITED", "WRITTEN_OFF"].includes(item.status ?? ""));
  const activeInvoice = selectedOrder?.invoicePackages[0] ?? null;
  const budget = reconBudgetFor(selectedOrder);
  const partsCommittedCents = openPurchaseOrders.reduce((sum, item) => sum + (item.orderedTotalCents ?? 0), 0) + model.custodyEvents.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitCostCents ?? 0), 0);
  const remainingReconBudgetCents = budget.maxReconBudgetCents - partsCommittedCents;
  const budgetRatio = budget.maxReconBudgetCents ? partsCommittedCents / budget.maxReconBudgetCents : 1;
  const budgetTone = remainingReconBudgetCents < 0 ? "danger" : budgetRatio >= 0.8 ? "warning" : "success";
  const budgetDecision = remainingReconBudgetCents < 0 ? "Manager approval required" : budgetRatio >= 0.8 ? "Review before more spend" : "Spend room available";

  const laneCounts = {
    need: openNeededParts.length,
    source: scopedRequisitions.filter((item) => !["ORDERED", "CANCELLED"].includes(item.status ?? "")).length,
    order: openPurchaseOrders.length,
    receive: model.purchaseOrders.filter((item) => ["ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(item.status ?? "")).length + model.discrepancies.filter((item) => item.status === "OPEN").length,
    vendor: model.custodyEvents.filter((item) => item.type === "VENDOR_SHIP").length,
    use: model.custodyEvents.length,
    return: openRecoveries.length,
  };

  async function refresh() {
    setModel(await request());
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const reason = (action: string) => `Record ${action.toLowerCase().replaceAll("_", " ")} from the enterprise parts workspace.`;
  const defaultLocationId = selectedOrder?.locationId ?? first(model.locations);
  const defaultStockLocationId = first(model.stockLocations);

  function noteLines(value: string) {
    return value.split(/\r?\n/).map((line) => cleanDescription(line.replace(/^\d+[.)]\s*/, ""))).filter(Boolean);
  }

  function amountFrom(line: string) {
    const match = line.match(/\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
    return match ? Math.round(Number(match[1].replaceAll(",", "")) * 100) : 0;
  }

  function quantityFrom(line: string) {
    const match = line.match(/\bqty\s*[:x-]?\s*(\d+)|\bx\s*(\d+)\b/i);
    return Number(match?.[1] ?? match?.[2] ?? 1);
  }

  function descriptionFrom(line: string) {
    return cleanDescription(line.split(/\s+-\s+|\s+\$|,\s*vendor/i)[0] ?? line);
  }

  function vendorFrom(line: string) {
    const pieces = line.split(/\s+-\s+/).map(cleanDescription).filter(Boolean);
    const vendorCandidate = pieces.find((piece, index) => index > 0 && !/\$|qty|used|received|return/i.test(piece));
    return vendorCandidate ?? "Manual vendor note";
  }

  function noteTotalCents(lines: string[]) {
    return lines.reduce((sum, line) => sum + amountFrom(line) * quantityFrom(line), 0);
  }

  async function ensurePart(description: string) {
    const generatedPartNumber = partNumberFrom(description);
    const existingPart = model.parts.find((part) => part.partNumber?.toUpperCase() === generatedPartNumber || part.description?.toUpperCase() === description.toUpperCase());
    return existingPart?.id ?? await createPartFromDescription(description);
  }

  async function ensureVendor(name: string) {
    const existingVendor = model.vendors.find((vendorItem) => vendorItem.name?.toUpperCase() === name.toUpperCase() || vendorItem.code?.toUpperCase() === name.toUpperCase());
    if (existingVendor) return existingVendor.id;
    const response = await request({ action: "CREATE_VENDOR", code: partNumberFrom(name).slice(0, 20), defaultReturnTerms: "Return authorization required", defaultWarranty: "Vendor warranty per invoice", name, paymentTerms: "Net 30", reason: "Create vendor from simple parts note.", reliabilityBasisPoints: 9000 });
    const id = response.result?.id ?? response.id;
    if (!id) throw new Error(`Created ${name}, but the new vendor ID was not returned.`);
    return id as string;
  }

  async function ensurePurchaseOrderAcknowledged(purchaseOrder: PurchaseOrder) {
    if (purchaseOrder.status === "DRAFT") {
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-approve purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "APPROVED" });
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-issue purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "ISSUED" });
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-acknowledge purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "ACKNOWLEDGED" });
      return;
    }
    if (purchaseOrder.status === "APPROVED") {
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-issue purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "ISSUED" });
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-acknowledge purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "ACKNOWLEDGED" });
      return;
    }
    if (purchaseOrder.status === "ISSUED") {
      await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: "Auto-acknowledge purchase order from simple received-parts note.", subjectId: purchaseOrder.id, toStatus: "ACKNOWLEDGED" });
    }
  }

  async function recordModeNote(target: DeskMode) {
    if (!selectedOrder) throw new Error("Repair order is required.");
    const lines = noteLines(notes[target]);
    if (!lines.length) throw new Error("Type at least one parts note.");
    if (target === "need") {
      const descriptions = lines.map(descriptionFrom);
      for (const description of descriptions) {
        const partId = await ensurePart(description);
        await createDemand(selectedOrder.id, { notes: "Added from simple parts note.", partId, quantityRequired: quantityFrom(description), reason: "Record needed part from simple parts note.", requiredAt: new Date(demand.requiredAt).toISOString(), substitutionAllowed: true });
      }
    }
    if (target === "source") {
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description);
        const demandResult = await createDemand(selectedOrder.id, { notes: `Sourcing note: ${line}`, partId, quantityRequired: quantityFrom(line), reason: "Create sourcing demand from simple parts note.", requiredAt: new Date(demand.requiredAt).toISOString(), substitutionAllowed: true });
        const demandId = demandResult.result?.id;
        if (!demandId) throw new Error(`Sourcing demand was created for ${description}, but the demand ID was not returned.`);
        await request({ action: "CREATE_REQUISITION", demandId, quantity: quantityFrom(line), reason: `Sourcing requisition note: ${line}`, requiredAt: new Date(demand.requiredAt).toISOString() });
      }
    }
    if (target === "order") {
      const proposedSpendCents = noteTotalCents(lines);
      if (proposedSpendCents > 0 && partsCommittedCents + proposedSpendCents > budget.maxReconBudgetCents) {
        throw new Error(`Recon budget guardrail: this note would move the unit over its recommended max recon budget by ${money(partsCommittedCents + proposedSpendCents - budget.maxReconBudgetCents)}. Manager approval is required before buying more parts.`);
      }
      for (const [index, line] of lines.entries()) {
        const description = descriptionFrom(line), partId = await ensurePart(description), vendorId = await ensureVendor(vendorFrom(line));
        await request({ action: "CREATE_PURCHASE_ORDER", duplicateOverrideReason: "Simple parts note added another bought/ordered part for this repair order during advisor test-drive.", lines: [{ partId, quantity: quantityFrom(line), unitCostCents: amountFrom(line) }], locationId: defaultLocationId, purchaseOrderNumber: `PO-${Date.now()}-${index + 1}`, reason: `Ordered parts note: ${line}`, requisitionId: null, vendorId });
      }
    }
    if (target === "receive") {
      if (!model.purchaseOrders.length) throw new Error("A purchase order is required before receiving parts.");
      for (const line of lines) {
        const purchaseOrder = model.purchaseOrders.find((item) => !["CLOSED", "CANCELLED"].includes(item.status ?? "")) ?? model.purchaseOrders[0], description = descriptionFrom(line), partId = await ensurePart(description);
        await ensurePurchaseOrderAcknowledged(purchaseOrder);
        await request({ action: "RECEIVE_PURCHASE_ORDER", invoiceReference: null, lines: [{ damagedQuantity: /damaged/i.test(line) ? quantityFrom(line) : 0, partId, quantity: quantityFrom(line), unitCostCents: amountFrom(line) }], packingSource: `NOTE-${Date.now()}`, reason: `Received parts note: ${line}`, receivedAt: now(), stockLocationId: defaultStockLocationId, subjectId: purchaseOrder.id });
      }
    }
    if (target === "use") {
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description), notUsed = /not used|unused|return/i.test(line);
        await request({ action: "RECORD_PART_CUSTODY", evidence: /photo|invoice|receipt/i.test(line) ? [line] : notUsed ? [] : [line], occurredAt: now(), partId, quantity: quantityFrom(line), reason: `Used parts note: ${line}`, repairJobId: null, reservationId: null, sourceId: `NOTE-${Date.now()}`, stockLocationId: defaultStockLocationId, type: notUsed ? "UNUSED_RETURN" : "INSTALL", unitCostCents: amountFrom(line) });
        if (notUsed) await request({ action: "CREATE_PART_RECOVERY", deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), expectedCreditCents: amountFrom(line), partId, quantity: quantityFrom(line), reason: "Automatically open return ticket because the part was marked not used.", sourceReference: line, type: "VENDOR_RETURN", vendorId: null });
      }
    }
    if (target === "vendor") {
      for (const [index, line] of lines.entries()) {
        const description = descriptionFrom(line), partId = await ensurePart(description), vendorName = vendorFrom(line);
        await ensureVendor(vendorName);
        await request({ action: "RECORD_PART_CUSTODY", evidence: [line], occurredAt: now(), partId, quantity: quantityFrom(line), reason: `Delivered part to outside vendor ${vendorName}: ${line}`, repairJobId: null, reservationId: null, sourceId: `VENDOR-${Date.now()}-${index + 1}`, stockLocationId: defaultStockLocationId, type: "VENDOR_SHIP", unitCostCents: amountFrom(line) });
      }
    }
    if (target === "return") {
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description);
        await request({ action: "CREATE_PART_RECOVERY", deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), expectedCreditCents: amountFrom(line), partId, quantity: quantityFrom(line), reason: `Return parts note: ${line}`, sourceReference: line, type: /core/i.test(line) ? "CORE" : /warranty/i.test(line) ? "WARRANTY" : "VENDOR_RETURN", vendorId: null });
      }
    }
    setNotes((value) => ({ ...value, [target]: "" }));
  }

  const lanes: Array<{ id: DeskMode; icon: React.ElementType; label: string; sub: string }> = [
    { id: "need", icon: PackagePlus, label: "Needed", sub: "List required parts" },
    { id: "source", icon: ClipboardCheck, label: "Source", sub: "Compare vendor options" },
    { id: "order", icon: ShoppingCart, label: "Bought / Ordered", sub: "Create and track purchases" },
    { id: "receive", icon: Truck, label: "Received", sub: "Post receipts and exceptions" },
    { id: "vendor", icon: Building2, label: "Delivered to vendor", sub: "Track outside custody" },
    { id: "use", icon: Wrench, label: "Used", sub: "Issue, install, return unused" },
    { id: "return", icon: RotateCcw, label: "Returns", sub: "Core, warranty, vendor credit" },
  ];
  const modeConfig: Record<DeskMode, { action: string; label: string; placeholder: string; title: string }> = {
    need: { action: "Save needed parts", label: "Needed parts note", placeholder: "Type needed parts here. Use the list tools or press Enter to continue a list.", title: "Add needed parts" },
    source: { action: "Save sourcing note", label: "Sourcing note", placeholder: "Add vendor quote, availability, contact, and any sourcing detail.", title: "Document sourcing" },
    order: { action: "Record bought parts", label: "Bought / ordered parts note", placeholder: "Add part bought, vendor, amount, date bought/ordered, and any purchase detail.", title: "Document bought / ordered parts" },
    receive: { action: "Record received parts", label: "Received parts note", placeholder: "Add what arrived, condition, quantity, packing slip, and any exception.", title: "Document received parts" },
    vendor: { action: "Record vendor delivery", label: "Vendor delivery note", placeholder: "Example: front bumper cover - Diego Auto Body - delivered Friday by Alex.", title: "Document parts delivered to vendor" },
    use: { action: "Record used or unused", label: "Used parts note", placeholder: "Add what was used. If not used, write not used or return.", title: "Document used parts" },
    return: { action: "Open return tickets", label: "Return note", placeholder: "Add part being returned, vendor, credit/core/warranty detail, and reason.", title: "Document returns" },
  };
  const activeConfig = modeConfig[mode];
  const nextAction = mode === "need"
    ? openNeededParts.length
      ? `Source or buy ${openNeededParts.length} needed part${openNeededParts.length === 1 ? "" : "s"} before the vendor can continue.`
      : "No needed parts are blocking this repair order."
    : mode === "order"
      ? remainingReconBudgetCents < 0 ? "Stop: manager approval is required before more buying." : "Record bought parts only after checking the recon budget."
      : mode === "vendor"
        ? "Record parts physically delivered to Diego or another outside vendor."
        : mode === "receive"
          ? "Record what arrived and any damaged, missing, or wrong parts."
          : mode === "use"
            ? "Only mark parts used after installation is confirmed."
            : mode === "return"
              ? "Open credit, warranty, core, or vendor-return tickets."
              : "Record sourcing quotes and availability.";
  const lineBounds = (value: string, cursor: number) => {
    const start = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
    const nextBreak = value.indexOf("\n", cursor);
    return { end: nextBreak === -1 ? value.length : nextBreak, start };
  };
  const placeCursor = (position: number) => requestAnimationFrame(() => {
    noteRef.current?.focus();
    noteRef.current?.setSelectionRange(position, position);
  });
  const setModeNote = (next: string, cursor?: number) => {
    setNotes((value) => ({ ...value, [mode]: next }));
    if (typeof cursor === "number") placeCursor(cursor);
  };
  const previousNumber = (value: string, lineStart: number) => {
    const previousLine = value.slice(0, lineStart).split(/\r?\n/).filter(Boolean).at(-1) ?? "";
    const match = previousLine.match(/^\s*(\d+)\.\s+/);
    return match ? Number(match[1]) : 0;
  };
  const applyListFormat = (kind: "bullet" | "number") => {
    const current = notes[mode];
    const cursor = noteRef.current?.selectionStart ?? current.length;
    const { end, start } = lineBounds(current, cursor);
    const line = current.slice(start, end);
    const existingMarker = line.match(/^(\s*)(?:[-*]|\d+[.)])\s+/);
    const marker = kind === "bullet" ? "- " : `${previousNumber(current, start) + 1 || 1}. `;

    if (line.trim() && !existingMarker && cursor >= end) {
      const separator = current.endsWith("\n") || !current ? "" : "\n";
      const next = `${current}${separator}${kind === "bullet" ? "- " : "1. "}`;
      setModeNote(next, next.length);
      return;
    }

    const content = existingMarker ? line.slice(existingMarker[0].length) : line.trimStart();
    const nextLine = `${existingMarker?.[1] ?? ""}${marker}${content}`;
    const next = `${current.slice(0, start)}${nextLine}${current.slice(end)}`;
    setModeNote(next, start + nextLine.length);
  };
  const wrapSelection = (before: string, after = before) => {
    const current = notes[mode];
    const textarea = noteRef.current;
    const selectionStart = textarea?.selectionStart ?? current.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const selected = current.slice(selectionStart, selectionEnd);
    const next = `${current.slice(0, selectionStart)}${before}${selected}${after}${current.slice(selectionEnd)}`;
    setModeNote(next, selectionStart + before.length + selected.length + after.length);
  };
  const handleNoteKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    const current = notes[mode];
    const cursor = event.currentTarget.selectionStart;
    const { end, start } = lineBounds(current, cursor);
    const line = current.slice(start, end);
    const bullet = line.match(/^(\s*)[-*]\s*(.*)$/);
    const numbered = line.match(/^(\s*)(\d+)\.\s*(.*)$/);
    if (!bullet && !numbered) return;
    event.preventDefault();

    if (bullet) {
      const [, indent, body] = bullet;
      if (!body.trim()) {
        const next = `${current.slice(0, start)}${indent}${current.slice(end)}`;
        setModeNote(next, start + indent.length);
        return;
      }
      const insert = `\n${indent}- `;
      setModeNote(`${current.slice(0, cursor)}${insert}${current.slice(cursor)}`, cursor + insert.length);
      return;
    }

    if (numbered) {
      const [, indent, number, body] = numbered;
      if (!body.trim()) {
        const next = `${current.slice(0, start)}${indent}${current.slice(end)}`;
        setModeNote(next, start + indent.length);
        return;
      }
      const insert = `\n${indent}${Number(number) + 1}. `;
      setModeNote(`${current.slice(0, cursor)}${insert}${current.slice(cursor)}`, cursor + insert.length);
    }
  };

  return <section className="scp-workspace">
    <header className="scp-header">
      <div>
        {returnTo ? <Link className="workspace-return-link" href={returnTo}>{returnLabel ?? "Return to source workspace"}</Link> : null}
        <span>Parts Workspace</span>
        <h1>Parts execution desk</h1>
        <p>List needed parts, source them, order, receive, issue, install, return, and recover credit from one focused workspace.</p>
      </div>
      <aside>
        <span>Active work</span>
        <strong>{selectedOrder?.repairOrderNumber ?? "No repair order"}</strong>
        <b>{selectedVehicleLabel}</b>
        <small>{selectedVehicleMeta.join(" · ") || "Select a repair order to confirm the vehicle."}</small>
        {selectedOrder?.customer?.displayName ? <em>{selectedOrder.customer.displayName}</em> : null}
      </aside>
    </header>

    <Notice value={notice} />

    <section className="scp-context">
      <Field label="Repair order">
        <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
          {model.repairOrders.map((item) => <option key={item.id} value={item.id}>{item.repairOrderNumber} - {vehicleLabelFor(item)} - {item.vehicle.stockNumber ?? item.vehicle.vehicleNumber} - {format(item.stage)}</option>)}
        </select>
      </Field>
      <div className="scp-vehicle-context"><span>Vehicle</span><strong>{selectedVehicleLabel}</strong><small>{selectedVehicleMeta.join(" · ")}</small></div>
      <div><span>Needed</span><strong>{laneCounts.need}</strong></div>
      <div><span>Open POs</span><strong>{laneCounts.order}</strong></div>
      <div><span>Receiving issues</span><strong>{model.discrepancies.filter((item) => item.status === "OPEN").length}</strong></div>
      <div><span>Returns</span><strong>{laneCounts.return}</strong></div>
    </section>

    <section className={`scp-budget ${budgetTone}`} aria-label="Recon budget guardrail">
      <div>
        <span>TAI recon budget guardrail</span>
        <strong>{budgetDecision}</strong>
        <small>Estimated retail {money(budget.estimatedRetailCents)} · TAI {money(budget.totalAcquisitionInvestmentCents)} · target gross {money(budget.targetGrossCents)} · reserve {money(budget.safetyReserveCents)}</small>
      </div>
      <div><span>Max recon budget</span><strong>{money(budget.maxReconBudgetCents)}</strong></div>
      <div><span>Committed parts spend</span><strong>{money(partsCommittedCents)}</strong></div>
      <div><span>Remaining</span><strong>{money(remainingReconBudgetCents)}</strong></div>
    </section>

    <nav className="scp-lanes" aria-label="Parts process">
      {lanes.map(({ id, icon: Icon, label, sub }) => <button aria-current={mode === id ? "step" : undefined} className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)} type="button"><Icon size={18} /><span>{label}<small>{sub}</small></span><b>{laneCounts[id]}</b></button>)}
    </nav>

    <main className="scp-grid">
      <section className="scp-panel scp-primary">
        <section className="scp-next-action" aria-label="Selected lane next action">
          <header><span>Next action</span><h2>{nextAction}</h2><small>{mode === "need" ? "This is the current parts blocker list for the selected repair order." : "This guidance follows the selected parts lane."}</small></header>
          {mode === "need" && openNeededParts.length ? (
            <div className="scp-needed-strip">
              {openNeededParts.map((item) => <article key={item.id}><strong>{item.part.description ?? item.part.partNumber}</strong><span>{item.quantityReserved}/{item.quantityRequired} reserved</span><small>{format(item.status)} · needed {safeDate(item.requiredAt)}</small></article>)}
            </div>
          ) : null}
        </section>
        <form className="scp-comment-composer" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(() => recordModeNote(mode), `${activeConfig.label} saved.`); }}>
          <header><span>{activeConfig.label}</span><h2>{activeConfig.title}</h2><small>Write the note the way you received the information. The system will structure the parts record after you save.</small></header>
          <label className="scp-big-entry">
            <span>{activeConfig.label}</span>
            <div className="scp-editor-box">
              <div className="scp-comment-toolbar" aria-label="Comment formatting">
                <button aria-label="Bold" type="button" onClick={() => wrapSelection("**")}>B</button>
                <button aria-label="Italic" type="button" onClick={() => wrapSelection("_")}>I</button>
                <button aria-label="Underline" type="button" onClick={() => wrapSelection("<u>", "</u>")}>U</button>
                <button type="button" onClick={() => applyListFormat("bullet")}>Bullet list</button>
                <button type="button" onClick={() => applyListFormat("number")}>1. Number</button>
              </div>
              <textarea ref={noteRef} value={notes[mode]} onChange={(event) => setNotes((value) => ({ ...value, [mode]: event.target.value }))} onKeyDown={handleNoteKeyDown} placeholder={activeConfig.placeholder} />
            </div>
          </label>
          {mode === "need" ? <div className="scp-note-options"><Field label="Default needed by"><input type="datetime-local" value={demand.requiredAt} onChange={(event) => setDemand({ ...demand, requiredAt: event.target.value })} /></Field><Field label="Optional note"><input value={demand.notes} onChange={(event) => setDemand({ ...demand, notes: event.target.value })} placeholder="OEM, color, trim, damage note" /></Field></div> : null}
          <button className="scp-primary-button" disabled={busy || !selectedOrder}>{activeConfig.action} <ArrowRight size={16} /></button>
        </form>
      </section>

      <aside className="scp-panel scp-queue">
        <header><span>Live parts board</span><h2>{selectedNumber || "All work"}</h2><small>{selectedVehicleLabel}</small></header>
        <div className="scp-list">
          <h3>Needed parts</h3>
          {scopedDemands.length ? scopedDemands.map((item) => <article key={item.id}><strong>{item.part.partNumber}</strong><span>{item.part.description ?? "Part"} - {item.quantityReserved}/{item.quantityRequired} reserved</span><small>{format(item.status)} - needed {safeDate(item.requiredAt)}</small></article>) : <p>No needed parts recorded.</p>}
          <h3>Requisitions</h3>
          {scopedRequisitions.length ? scopedRequisitions.map((item) => <article key={item.id}><strong>{item.demand.part.partNumber}</strong><span>{item.selectedOffer?.vendor.name ?? "No vendor selected"}</span><small>{format(item.status)}</small></article>) : <p>No sourcing requisitions yet.</p>}
          <h3>Purchase orders</h3>
          {openPurchaseOrders.length ? openPurchaseOrders.slice(0, 8).map((item) => <article key={item.id}><strong>{item.purchaseOrderNumber}</strong><span>{item.vendor?.name ?? "Vendor"} - {money(item.orderedTotalCents)}</span><small>{format(item.status)}</small><div>{item.status === "DRAFT" ? <button disabled={busy} onClick={() => void run(() => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: reason("TRANSITION_PURCHASE_ORDER"), subjectId: item.id, toStatus: "APPROVED" }), "Purchase order approved.")} type="button">Approve</button> : null}{item.status === "APPROVED" ? <button disabled={busy} onClick={() => void run(() => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: reason("TRANSITION_PURCHASE_ORDER"), subjectId: item.id, toStatus: "ISSUED" }), "Purchase order issued.")} type="button">Issue</button> : null}{item.status === "ISSUED" ? <button disabled={busy} onClick={() => void run(() => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: reason("TRANSITION_PURCHASE_ORDER"), subjectId: item.id, toStatus: "ACKNOWLEDGED" }), "Vendor acknowledgement recorded.")} type="button">Acknowledge</button> : null}</div></article>) : <p>No open purchase orders.</p>}
          <h3>Received and used</h3>
          {scopedReceipts.length ? scopedReceipts.map((item) => <article key={item.id}><strong>{item.purchaseOrder?.purchaseOrderNumber ?? "Receipt"}</strong><span>{item.stockLocation?.code ?? "Stock"} - {safeDate(item.receivedAt)}</span><small>{format(item.status)}</small></article>) : <p>No receipts linked to this RO yet.</p>}
          {model.custodyEvents.slice(0, 5).map((item) => <article key={item.id}><strong>{item.partNumber ?? item.part?.partNumber ?? "Part"}</strong><span>{format(item.type)} movement</span><small>{format(item.status)}</small></article>)}
          <h3>Returns and recovery</h3>
          {openRecoveries.length ? openRecoveries.map((item) => <article key={item.id}><strong>{format(item.type)}</strong><span>{item.vendor?.name ?? "Vendor pending"} - expected {money(item.expectedCreditCents)}</span><small>{format(item.status)}</small></article>) : <p>No active returns or credit cases.</p>}
        </div>
      </aside>
    </main>

    <section className="scp-panel scp-close">
      <div><span>Financial close</span><strong>{activeInvoice ? `Package v${activeInvoice.version} - ${format(activeInvoice.status)}` : "No invoice package yet"}</strong><small>{activeInvoice?.mismatchCodes.length ? activeInvoice.mismatchCodes.join(", ") : "Use only when the repair order is ready to close."}</small></div>
      <button disabled={busy || !selectedOrder || Boolean(selectedOrder.closedAt)} onClick={() => selectedOrder && void run(() => request({ action: "GENERATE_INVOICE_PACKAGE", generatedAt: now(), reason: reason("GENERATE_INVOICE_PACKAGE"), subjectId: selectedOrder.id }), "Invoice package generated.")} type="button">Generate package</button>
      <Link href="/vehicles/parts-operations">Back to parts overview</Link>
    </section>
  </section>;
}
