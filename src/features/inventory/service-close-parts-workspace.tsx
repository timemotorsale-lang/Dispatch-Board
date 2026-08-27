"use client";

import { buildReconBudgetSummary, formatMoneyCents } from "@/lib/recon-budget";
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck, ListChecks, PackagePlus, RotateCcw, ShoppingCart, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

type Named = { id: string; name?: string; code?: string; part?: { partNumber: string }; partNumber?: string; description?: string; status?: string; type?: string; locationId?: string; standardCostCents?: number; orderedTotalCents?: number; quantity?: number; unitCostCents?: number };
type VendorWork = { approvalStatus: string; approvedAmountCents: number | null; currentLocation: string; directFromSource: boolean; estimateAmountCents: number | null; expectedReturnAt: string | null; id: string; keysCustodian: string; lastUpdateSummary?: string | null; nextAction?: string | null; nextFollowUpAt: string | null; scope: string; sentFrom: string; status: string; supplementalAmountCents: number | null; transportMethod: string | null; vendorName: string };
type RepairOrder = Named & { closedAt: string | null; inventoryUnit?: { acquisitionAppraisals?: Array<{ estimatedReconCents?: number | null; estimatedRetailCents?: number | null }>; acquisitionCase?: { appraisalSnapshot?: unknown } | null; id: string; inventoryNumber?: string | null } | null; locationId: string; nextAction?: string | null; repairOrderNumber: string; stage: string; vehicle: { color?: string | null; make?: string | null; model?: string | null; stockNumber?: string | null; vehicleNumber: string; vin?: string | null; year?: number | null }; customer: { displayName: string } | null; invoicePackages: Array<{ id: string; mismatchCodes: string[]; repairOrderId: string; status: string; version: number }>; repairJobs?: Array<{ id: string; jobNumber: string }>; vendorWorks?: VendorWork[] };
type Demand = Named & { notes?: string | null; partId: string; quantityRequired: number; quantityReserved: number; requiredAt: string; part: { partNumber: string; description?: string }; repairOrder: { repairOrderNumber: string } };
type Offer = Named & { partId: string; unitCostCents: number; vendorId: string; vendor: { name: string }; part: { partNumber: string; description?: string } };
type Requisition = Named & { requiredAt?: string; selectedOfferId: string | null; demand: { part: { partNumber: string; description?: string }; repairOrder: { repairOrderNumber: string } }; selectedOffer?: { vendor: { name: string } } | null };
type PartLine = { damagedQuantity?: number; partId?: string; quantity?: number; unitCostCents?: number };
type PurchaseOrder = Named & { createdAt?: string; lines?: PartLine[]; locationId: string; orderedTotalCents?: number; purchaseOrderNumber: string; requisition?: { demand?: { repairOrder?: { id?: string; repairOrderNumber: string } } | null } | null; vendorId: string; vendor?: { name: string } };
type Receipt = Named & { lines?: PartLine[]; receivedAt?: string; purchaseOrder?: { purchaseOrderNumber: string; requisition?: { demand?: { repairOrder?: { repairOrderNumber: string } } | null } | null }; stockLocation?: { code: string; name: string } };
type Discrepancy = Named & { receipt?: { purchaseOrder?: { requisition?: { demand?: { repairOrder?: { id?: string; repairOrderNumber: string } } | null } | null } | null } | null };
type CustodyEvent = Named & { repairJob?: { jobNumber: string; repairOrder?: { id?: string; repairOrderNumber: string } } | null };
type Transfer = Named & { locationId: string; transferNumber: string };
type Recovery = Named & { actualCreditCents: number | null; expectedCreditCents?: number; partId: string; sourceReference?: string; type: string; vendor?: { name: string } | null };
type Model = { custodyEvents: CustodyEvent[]; demands: Demand[]; discrepancies: Discrepancy[]; interchanges: Named[]; locations: Named[]; offers: Offer[]; parts: Named[]; purchaseOrders: PurchaseOrder[]; receipts: Receipt[]; recoveries: Recovery[]; repairOrders: RepairOrder[]; requisitions: Requisition[]; stockLocations: Named[]; transfers: Transfer[]; vendors: Named[] };

type Props = { initial: Model; initialRepairOrderId?: string; returnLabel?: string; returnTo?: string };
type DeskMode = "need" | "source" | "order" | "budget" | "receive" | "vendor" | "progress" | "use" | "return";
type BudgetRequestStatus = "DRAFT" | "REQUESTED" | "APPROVED" | "DENIED";

const now = () => new Date().toISOString();
const future = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};
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

function initialDeskMode(model: Model, repairOrderId: string): DeskMode {
  const order = model.repairOrders.find((item) => item.id === repairOrderId) ?? model.repairOrders[0] ?? null;
  if (!order) return "need";
  const hasActiveVendor = Boolean(order.vendorWorks?.some((work) => !["COMPLETED", "CANCELLED"].includes(work.status)));
  const hasReturnOrQcVendor = Boolean(order.vendorWorks?.some((work) => ["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(work.status)));
  const hasOpenPurchaseOrder = model.purchaseOrders.some((item) =>
    item.requisition?.demand?.repairOrder?.repairOrderNumber === order.repairOrderNumber &&
    !["CLOSED", "CANCELLED"].includes(item.status ?? "")
  );
  return hasActiveVendor && (hasOpenPurchaseOrder || hasReturnOrQcVendor) ? "vendor" : "need";
}

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

function initialRepairProgressState() {
  return {
    nextCheckAt: local(new Date(Date.now() + 4 * 60 * 60 * 1000)),
    note: "",
    nextAction: "Continue the repair work that can be completed now, then install pending parts when they arrive.",
    status: "CONTINUING_WITH_PENDING_PARTS",
  };
}

function initialVendorDeliveryProgressState() {
  return {
    deliveredAt: local(new Date()),
    nextAction: "Vendor has the needed part. Continue repair and report the next ETA or blocker.",
    note: "",
    receivedBy: "",
    status: "AT_VENDOR",
  };
}

function vendorProgressOptions(status?: string | null) {
  if (status === "READY_FOR_PICKUP") {
    return [
      { label: "Start pickup back", nextAction: "Pick up the vehicle from the vendor and deliver it back to the dealership.", value: "RETURN_TRANSPORT" },
      { label: "Back: start QC", nextAction: "Start dealership QC and record pass or fail.", value: "QC_REQUIRED" },
    ];
  }
  if (status === "RETURN_TRANSPORT") {
    return [
      { label: "Back: start QC", nextAction: "Start dealership QC and record pass or fail.", value: "QC_REQUIRED" },
    ];
  }
  if (status === "RETURNED") {
    return [
      { label: "Ready for QC", nextAction: "Complete dealership QC and record pass or fail.", value: "QC_REQUIRED" },
    ];
  }
  if (status === "QC_REQUIRED") {
    return [
      { label: "QC passed: handoff", nextAction: "Continue inventory lifecycle handoff after QC.", value: "COMPLETED" },
      { label: "QC failed", nextAction: "Decide whether to return to vendor, repair internally, approve supplement, or stop work.", value: "AT_VENDOR" },
    ];
  }
  return [
    { label: "Still repairing", nextAction: "Vendor has the needed part. Continue repair and report the next ETA or blocker.", value: "AT_VENDOR" },
    { label: "Still waiting", nextAction: "Resolve the remaining parts blocker so the vendor can continue.", value: "WAITING_PARTS" },
    { label: "Needs supplement", nextAction: "Review the vendor supplement before more work continues.", value: "SUPPLEMENT_NEEDED" },
    { label: "Repair complete", nextAction: "Pick up the vehicle from the vendor and deliver it back to the dealership.", value: "READY_FOR_PICKUP" },
  ];
}

function defaultVendorProgressStatus(status?: string | null) {
  return vendorProgressOptions(status)[0]?.value ?? "AT_VENDOR";
}

function vendorProgressHeading(status?: string | null) {
  if (status === "READY_FOR_PICKUP") return "Repair complete. Bring it back.";
  if (status === "RETURN_TRANSPORT") return "Back from vendor? Start QC.";
  if (status === "RETURNED") return "Back at dealership. Start QC.";
  if (status === "QC_REQUIRED") return "QC decision: pass or fail.";
  return "Document repair progress";
}

function vendorProgressContext(status?: string | null) {
  if (status === "READY_FOR_PICKUP") return "Repair is complete at the vendor. Bring the vehicle back to the dealership for QC.";
  if (status === "RETURN_TRANSPORT") return "Pickup is already moving. When it arrives, send it straight to dealership QC.";
  if (status === "RETURNED") return "The vehicle is back. Start QC and record pass or fail.";
  if (status === "QC_REQUIRED") return "Record the QC result. Pass moves to handoff. Fail sends it back to a repair decision.";
  return "Record progress only when work is still happening. When repairs are complete, choose Repair complete.";
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

async function createTemporaryStockLocation(locationId: string) {
  const code = `TMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const response = await fetch("/api/parts/locations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      idempotencyKey: crypto.randomUUID(),
      locationId,
      name: "Temporary receiving bin",
      reason: "Create temporary testing stock location so parts receiving can continue.",
      type: "STAGING",
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Temporary stock location could not be created.");
  const id = result.result?.id ?? result.id;
  if (!id) throw new Error("Temporary stock location was created, but its record ID was not returned.");
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
  const [mode, setMode] = useState<DeskMode>(() => initialDeskMode(initial, initialOrderId));
  const [budgetIncreaseDollars, setBudgetIncreaseDollars] = useState("");
  const [budgetReason, setBudgetReason] = useState("");
  const [budgetRequestStatus, setBudgetRequestStatus] = useState<BudgetRequestStatus>("DRAFT");
  const [budgetDecisionNote, setBudgetDecisionNote] = useState("");
  const [editingPurchaseOrderId, setEditingPurchaseOrderId] = useState("");
  const [purchaseOrderDraft, setPurchaseOrderDraft] = useState("");
  const [pickupPlan, setPickupPlan] = useState({ assignedTo: "", deliveryAt: "", method: "Dealership driver", pickupAt: "" });
  const [repairProgress, setRepairProgress] = useState(initialRepairProgressState);
  const [vendorDeliveryProgress, setVendorDeliveryProgress] = useState(initialVendorDeliveryProgressState);

  const [demand, setDemand] = useState(() => ({ partId: first(initial.parts), quantityRequired: "1", requiredAt: local(new Date(Date.now() + 24 * 60 * 60 * 1000)), substitutionAllowed: true, notes: "" }));
  const [notes, setNotes] = useState<Record<DeskMode, string>>({ budget: "", need: "", order: "", progress: "", receive: "", return: "", source: "", use: "", vendor: "" });

  const selectedOrder = model.repairOrders.find((item) => item.id === orderId) ?? model.repairOrders[0] ?? null;
  const activeVendorWork = selectedOrder?.vendorWorks?.[0] ?? null;
  const availableVendorProgressOptions = vendorProgressOptions(activeVendorWork?.status);
  const selectedVendorProgressStatus = availableVendorProgressOptions.some((option) => option.value === vendorDeliveryProgress.status)
    ? vendorDeliveryProgress.status
    : defaultVendorProgressStatus(activeVendorWork?.status);
  const selectedVendorProgressOption = availableVendorProgressOptions.find((option) => option.value === selectedVendorProgressStatus);
  const vendorNextActionValue = vendorDeliveryProgress.status === selectedVendorProgressStatus
    ? vendorDeliveryProgress.nextAction
    : selectedVendorProgressOption?.nextAction ?? vendorDeliveryProgress.nextAction;
  const showPickupPlanner = !["RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(activeVendorWork?.status ?? "");
  const canCorrectOutsideRepair = Boolean(activeVendorWork && !["RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"].includes(activeVendorWork.status));
  const selectedNumber = orderNumberFor(selectedOrder);
  const selectedVehicleLabel = vehicleLabelFor(selectedOrder);
  const selectedVehicleMeta = vehicleMetaFor(selectedOrder);
  const scopedDemands = model.demands.filter((item) => !selectedNumber || item.repairOrder.repairOrderNumber === selectedNumber);
  const openNeededParts = scopedDemands.filter((item) => !["RESERVED", "RELEASED", "CANCELLED"].includes(item.status ?? ""));
  const scopedRequisitions = model.requisitions.filter((item) => !selectedNumber || item.demand.repairOrder.repairOrderNumber === selectedNumber);
  const scopedReceipts = model.receipts.filter((item) => item.purchaseOrder?.requisition?.demand?.repairOrder?.repairOrderNumber === selectedNumber);
  const scopedPurchaseOrders = model.purchaseOrders.filter((item) => item.requisition?.demand?.repairOrder?.repairOrderNumber === selectedNumber);
  const openPurchaseOrders = scopedPurchaseOrders.filter((item) => !["CLOSED", "CANCELLED"].includes(item.status ?? ""));
  const purchaseOrdersNeedingApproval = openPurchaseOrders.filter((item) => item.status === "DRAFT");
  const scopedDiscrepancies = model.discrepancies.filter((item) => item.receipt?.purchaseOrder?.requisition?.demand?.repairOrder?.repairOrderNumber === selectedNumber);
  const scopedCustodyEvents = model.custodyEvents.filter((item) => item.repairJob?.repairOrder?.repairOrderNumber === selectedNumber);
  const openRecoveries = model.recoveries.filter((item) => item.sourceReference?.includes(`RO:${selectedOrder?.id}|`) && !["CREDITED", "WRITTEN_OFF"].includes(item.status ?? ""));
  const activeInvoice = selectedOrder?.invoicePackages[0] ?? null;
  const fallbackBudget = reconBudgetFor(selectedOrder);
  const appraisalBudget = buildReconBudgetSummary(selectedOrder?.inventoryUnit ? {
    acquisitionAppraisals: selectedOrder.inventoryUnit.acquisitionAppraisals ?? [],
    acquisitionCase: selectedOrder.inventoryUnit.acquisitionCase ?? null,
  } : {});
  const partsCommittedCents = openPurchaseOrders.reduce((sum, item) => sum + (item.orderedTotalCents ?? 0), 0);
  const maxReconBudgetCents = appraisalBudget?.estimatedReconBudgetCents ?? fallbackBudget.maxReconBudgetCents;
  const expectedRetailCents = appraisalBudget?.expectedRetailCents ?? fallbackBudget.estimatedRetailCents;
  const remainingReconBudgetCents = maxReconBudgetCents - partsCommittedCents;
  const overBudgetCents = Math.max(0, -remainingReconBudgetCents);
  const budgetRatio = maxReconBudgetCents ? partsCommittedCents / maxReconBudgetCents : 1;
  const budgetTone = remainingReconBudgetCents < 0 ? "danger" : budgetRatio >= 0.8 ? "warning" : "success";
  const budgetDecision = remainingReconBudgetCents < 0 ? "Manager approval required" : budgetRatio >= 0.8 ? "Review before more spend" : "Spend room available";
  const budgetSourceLabel = appraisalBudget?.source === "TAI" ? "TAI recon budget guardrail" : appraisalBudget?.source === "APPRAISAL" ? "Approved recon budget guardrail" : "TAI recon budget guardrail";
  const canRaiseBudget = Boolean(selectedOrder?.inventoryUnit?.id);

  function changeRepairOrder(nextOrderId: string) {
    setOrderId(nextOrderId);
    setMode("need");
    setNotice("");
    setNotes({ budget: "", need: "", order: "", progress: "", receive: "", return: "", source: "", use: "", vendor: "" });
    setDemand({ partId: first(model.parts), quantityRequired: "1", requiredAt: local(new Date(Date.now() + 24 * 60 * 60 * 1000)), substitutionAllowed: true, notes: "" });
    setBudgetIncreaseDollars("");
    setBudgetReason("");
    setBudgetRequestStatus("DRAFT");
    setBudgetDecisionNote("");
    setEditingPurchaseOrderId("");
    setPurchaseOrderDraft("");
    setPickupPlan({ assignedTo: "", deliveryAt: "", method: "Dealership driver", pickupAt: "" });
    setRepairProgress(initialRepairProgressState());
    setVendorDeliveryProgress(initialVendorDeliveryProgressState());
  }

  function openBudgetApproval() {
    setBudgetIncreaseDollars(overBudgetCents > 0 ? (overBudgetCents / 100).toFixed(2) : "");
    setBudgetReason("");
    setBudgetDecisionNote("");
    setMode("budget");
  }

  const laneCounts = {
    need: openNeededParts.length,
    source: scopedRequisitions.filter((item) => !["ORDERED", "CANCELLED"].includes(item.status ?? "")).length,
    order: openPurchaseOrders.length,
    budget: remainingReconBudgetCents < 0 || budgetRequestStatus !== "DRAFT" ? 1 : 0,
    progress: selectedOrder ? 1 : 0,
    receive: openPurchaseOrders.filter((item) => ["ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(item.status ?? "")).length + scopedDiscrepancies.filter((item) => item.status === "OPEN").length,
    vendor: scopedCustodyEvents.filter((item) => item.type === "VENDOR_SHIP").length,
    use: scopedCustodyEvents.length,
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
      // A multi-step parts save may have completed one of its governed records
      // before a later step failed. Always reload so the next click resumes from
      // the server's real state instead of retrying a stale requisition status.
      try { await refresh(); } catch { /* Preserve the original action error. */ }
      const message = error instanceof Error ? error.message : "Request failed.";
      setNotice(message === "Sourcing requisition was not found."
        ? "This parts request had already advanced. The parts board was refreshed—please click Record bought parts once more to continue."
        : message);
    } finally {
      setBusy(false);
    }
  }

  const reason = (action: string) => `Record ${action.toLowerCase().replaceAll("_", " ")} from the enterprise parts workspace.`;
  const defaultLocationId = selectedOrder?.locationId ?? first(model.locations);

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
    return (vendorCandidate ?? "Manual vendor note").split(/\s+(?:request[\s_-]*quote|quote|phone|contact)\b/i)[0].trim();
  }

  const vendorKey = (value: string) => value
    .split(/\s+(?:request[\s_-]*quote|quote|phone|contact)\b/i)[0]
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  function noteTotalCents(lines: string[]) {
    return lines.reduce((sum, line) => sum + amountFrom(line) * quantityFrom(line), 0);
  }

  function partLabel(partId?: string) {
    const part = model.parts.find((item) => item.id === partId);
    return part ? `${part.partNumber ?? part.id}${part.description ? ` — ${part.description}` : ""}` : partId ?? "Unknown part";
  }

  function partNumberFor(partId?: string) {
    return model.parts.find((item) => item.id === partId)?.partNumber ?? partId ?? "";
  }

  function cleanPartLines(value: unknown): PartLine[] {
    return Array.isArray(value) ? value.filter((line): line is PartLine => Boolean(line) && typeof line === "object") : [];
  }

  function formatPartLine(line: PartLine) {
    return `${partNumberFor(line.partId)} | qty ${line.quantity ?? 1} | ${money(line.unitCostCents ?? 0)}`;
  }

  function beginPurchaseOrderEdit(purchaseOrder: PurchaseOrder) {
    setEditingPurchaseOrderId(purchaseOrder.id);
    setPurchaseOrderDraft(cleanPartLines(purchaseOrder.lines).map(formatPartLine).join("\n"));
  }

  function parsePurchaseOrderDraft() {
    return noteLines(purchaseOrderDraft).map((line) => {
      const pieces = line.split("|").map((piece) => piece.trim()).filter(Boolean);
      const partToken = pieces[0] ?? "";
      const part = model.parts.find((item) => item.id === partToken || item.partNumber?.toUpperCase() === partToken.toUpperCase() || item.description?.toUpperCase() === partToken.toUpperCase());
      if (!part) throw new Error(`Part "${partToken}" was not found. Use the exact part number shown in the list.`);
      const quantity = Number((pieces.find((piece) => /qty/i.test(piece)) ?? "qty 1").replace(/[^0-9]/g, "")) || 1;
      const costPiece = pieces.find((piece) => /\$|cost|price|[0-9]+\.[0-9]{2}/i.test(piece)) ?? "$0";
      const unitCostCents = amountFrom(costPiece);
      return { partId: part.id, quantity, unitCostCents };
    });
  }

  async function ensurePart(description: string) {
    const generatedPartNumber = partNumberFrom(description);
    const existingPart = model.parts.find((part) => part.partNumber?.toUpperCase() === generatedPartNumber || part.description?.toUpperCase() === description.toUpperCase());
    return existingPart?.id ?? await createPartFromDescription(description);
  }

  async function ensureVendor(name: string) {
    const existingVendor = model.vendors.find((vendorItem) => vendorKey(vendorItem.name ?? vendorItem.code ?? "") === vendorKey(name));
    if (existingVendor) return existingVendor.id;
    const response = await request({ action: "CREATE_VENDOR", code: partNumberFrom(name).slice(0, 20), defaultReturnTerms: "Return authorization required", defaultWarranty: "Vendor warranty per invoice", name, paymentTerms: "Net 30", reason: "Create vendor from simple parts note.", reliabilityBasisPoints: 9000 });
    const id = response.result?.id ?? response.id;
    if (!id) throw new Error(`Created ${name}, but the new vendor ID was not returned.`);
    return id as string;
  }

  async function ensureStockLocationFor(locationId: string) {
    if (!locationId) throw new Error("Business location is required before parts can be received.");
    const existingLocation = model.stockLocations.find((stockLocation) => stockLocation.locationId === locationId);
    return existingLocation?.id ?? await createTemporaryStockLocation(locationId);
  }

  async function createAndSelectManualOffer(requisitionId: string, partId: string, vendorId: string, line: string) {
    const offerResult = await request({
      action: "CREATE_VENDOR_OFFER",
      availableQuantity: quantityFrom(line),
      effectiveFrom: now(),
      effectiveTo: null,
      estimatedArrivalAt: new Date(demand.requiredAt).toISOString(),
      partId,
      reason: `Record the vendor quote used to buy ${descriptionFrom(line)}.`,
      returnTerms: "Confirm return eligibility with vendor.",
      unitCostCents: amountFrom(line),
      vendorId,
      vendorPartNumber: partNumberFor(partId),
      warrantyTerms: "Vendor warranty terms require confirmation."
    });
    const offerId = offerResult.result?.id ?? offerResult.id;
    if (!offerId) throw new Error(`The vendor quote was saved, but its record ID was not returned for ${descriptionFrom(line)}.`);
    await request({ action: "SELECT_REQUISITION_OFFER", offerId, reason: `Select the entered vendor quote for ${descriptionFrom(line)}.`, subjectId: requisitionId });
    return requisitionId;
  }

  async function ensureSelectedRequisition(partId: string, demandId: string, vendorId: string, vendorName: string, line: string) {
    const matching = scopedRequisitions.find((item) => item.demand.part.partNumber === partNumberFor(partId) && !["CANCELLED", "ORDERED"].includes(item.status ?? ""));
    if (matching?.status === "SELECTED" && vendorKey(matching.selectedOffer?.vendor.name ?? "") === vendorKey(vendorName)) return matching.id;
    if (matching?.status === "SOURCING") return createAndSelectManualOffer(matching.id, partId, vendorId, line);
    const requisitionResult = await request({ action: "CREATE_REQUISITION", demandId, quantity: quantityFrom(line), reason: `Order ${descriptionFrom(line)} for ${selectedOrder?.repairOrderNumber}.`, requiredAt: new Date(demand.requiredAt).toISOString() });
    const requisitionId = requisitionResult.result?.id ?? requisitionResult.id;
    if (!requisitionId) throw new Error(`The purchase request could not be created for ${descriptionFrom(line)}.`);
    return createAndSelectManualOffer(requisitionId as string, partId, vendorId, line);
  }

  async function ensurePurchaseOrderAcknowledged(purchaseOrder: PurchaseOrder) {
    if (purchaseOrder.status === "DRAFT") {
      throw new Error(`Manager approval needed before receiving ${purchaseOrder.purchaseOrderNumber}. Approve the purchase order first, then receive after an authorized user okays the PO.`);
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
      if (proposedSpendCents > 0 && partsCommittedCents + proposedSpendCents > maxReconBudgetCents) {
        throw new Error(`Recon budget guardrail: this note would move the unit over its recommended max recon budget by ${money(partsCommittedCents + proposedSpendCents - maxReconBudgetCents)}. Manager approval is required before buying more parts.`);
      }
      for (const [index, line] of lines.entries()) {
        const description = descriptionFrom(line), partId = await ensurePart(description), vendorName = vendorFrom(line), vendorId = await ensureVendor(vendorName);
        const existingDemand = scopedDemands.find((item) => item.partId === partId && !["RELEASED", "CANCELLED"].includes(item.status ?? ""));
        const demandResult = existingDemand ? null : await createDemand(selectedOrder.id, { notes: `Ordered parts note: ${line}`, partId, quantityRequired: quantityFrom(line), reason: "Link bought part to this repair order.", requiredAt: new Date(demand.requiredAt).toISOString(), substitutionAllowed: true });
        const demandId = existingDemand?.id ?? demandResult?.result?.id;
        if (!demandId) throw new Error(`The repair-order link could not be created for ${description}.`);
        const requisitionId = await ensureSelectedRequisition(partId, demandId, vendorId, vendorName, line);
        await request({ action: "CREATE_PURCHASE_ORDER", duplicateOverrideReason: "Additional purchase confirmed by staff for this repair order.", lines: [{ partId, quantity: quantityFrom(line), unitCostCents: amountFrom(line) }], locationId: defaultLocationId, purchaseOrderNumber: `PO-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${index + 1}`, reason: `Ordered parts note: ${line}`, requisitionId, vendorId });
      }
    }
    if (target === "receive") {
      if (!openPurchaseOrders.length) throw new Error("This repair order has no open purchase order to receive.");
      const receiptsByPurchaseOrder = new Map<string, { lines: PartLine[]; notes: string[]; purchaseOrder: PurchaseOrder }>();
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description);
        const purchaseOrder = openPurchaseOrders.find((item) => cleanPartLines(item.lines).some((purchaseLine) => purchaseLine.partId === partId)) ?? openPurchaseOrders[0];
        const draft = receiptsByPurchaseOrder.get(purchaseOrder.id) ?? { lines: [], notes: [], purchaseOrder };
        draft.lines.push({ damagedQuantity: /damaged/i.test(line) ? quantityFrom(line) : 0, partId, quantity: quantityFrom(line), unitCostCents: amountFrom(line) });
        draft.notes.push(line);
        receiptsByPurchaseOrder.set(purchaseOrder.id, draft);
      }
      for (const draft of receiptsByPurchaseOrder.values()) {
        await ensurePurchaseOrderAcknowledged(draft.purchaseOrder);
        const stockLocationId = await ensureStockLocationFor(draft.purchaseOrder.locationId);
        await request({ action: "RECEIVE_PURCHASE_ORDER", invoiceReference: null, lines: draft.lines, packingSource: `NOTE-${crypto.randomUUID()}`, reason: `Received parts note: ${draft.notes.join("; ")}`, receivedAt: now(), stockLocationId, subjectId: draft.purchaseOrder.id });
      }
    }
    if (target === "use") {
      const stockLocationId = await ensureStockLocationFor(defaultLocationId);
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description), notUsed = /not used|unused|return/i.test(line);
        await request({ action: "RECORD_PART_CUSTODY", evidence: /photo|invoice|receipt/i.test(line) ? [line] : notUsed ? [] : [line], occurredAt: now(), partId, quantity: quantityFrom(line), reason: `Used parts note: ${line}`, repairJobId: selectedOrder.repairJobs?.[0]?.id ?? null, reservationId: null, sourceId: `RO:${selectedOrder.id}|NOTE-${crypto.randomUUID()}`, stockLocationId, type: notUsed ? "UNUSED_RETURN" : "INSTALL", unitCostCents: amountFrom(line) });
        if (notUsed) await request({ action: "CREATE_PART_RECOVERY", deadlineAt: future(7), expectedCreditCents: amountFrom(line), partId, quantity: quantityFrom(line), reason: "Automatically open return ticket because the part was marked not used.", sourceReference: `RO:${selectedOrder.id}|${line}`, type: "VENDOR_RETURN", vendorId: null });
      }
    }
    if (target === "vendor") {
      const stockLocationId = await ensureStockLocationFor(defaultLocationId);
      for (const [index, line] of lines.entries()) {
        const description = descriptionFrom(line), partId = await ensurePart(description), vendorName = vendorFrom(line);
        await ensureVendor(vendorName);
        await request({ action: "RECORD_PART_CUSTODY", evidence: [line], occurredAt: now(), partId, quantity: quantityFrom(line), reason: `Delivered part to outside vendor ${vendorName}: ${line}`, repairJobId: selectedOrder.repairJobs?.[0]?.id ?? null, reservationId: null, sourceId: `RO:${selectedOrder.id}|VENDOR-${crypto.randomUUID()}-${index + 1}`, stockLocationId, type: "VENDOR_SHIP", unitCostCents: amountFrom(line) });
      }
    }
    if (target === "return") {
      for (const line of lines) {
        const description = descriptionFrom(line), partId = await ensurePart(description);
        await request({ action: "CREATE_PART_RECOVERY", deadlineAt: future(7), expectedCreditCents: amountFrom(line), partId, quantity: quantityFrom(line), reason: `Return parts note: ${line}`, sourceReference: `RO:${selectedOrder.id}|${line}`, type: /core/i.test(line) ? "CORE" : /warranty/i.test(line) ? "WARRANTY" : "VENDOR_RETURN", vendorId: null });
      }
    }
    setNotes((value) => ({ ...value, [target]: "" }));
  }

  async function savePickupPlan() {
    if (!selectedOrder || !activeVendorWork || !nextPurchaseOrder) throw new Error("A bought part and an assigned outside repair vendor are required before planning delivery.");
    if (!pickupPlan.assignedTo.trim() || !pickupPlan.pickupAt || !pickupPlan.deliveryAt) throw new Error("Enter who is handling the move, the pickup time, and the expected delivery time.");
    if (new Date(pickupPlan.deliveryAt) <= new Date(pickupPlan.pickupAt)) throw new Error("Expected delivery must be after pickup.");
    const supplier = (nextPurchaseOrder.vendor?.name ?? "the parts supplier").split(/\s+(?:request[\s_-]*quote|quote|phone|contact)\b/i)[0].trim();
    const destination = activeVendorWork.vendorName;
    const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/vendor-work`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE",
        approvalStatus: activeVendorWork.approvalStatus,
        approvedAmountCents: activeVendorWork.approvedAmountCents,
        currentLocation: activeVendorWork.currentLocation,
        customerVisibleSummary: `The purchased part is scheduled for pickup from ${supplier} and delivery to ${destination}.`,
        directFromSource: activeVendorWork.directFromSource,
        estimateAmountCents: activeVendorWork.estimateAmountCents,
        evidence: [],
        expectedReturnAt: activeVendorWork.expectedReturnAt,
        idempotencyKey: crypto.randomUUID(),
        internalNotes: `${pickupPlan.assignedTo.trim()} will use ${pickupPlan.method} to pick up the part from ${supplier} at ${new Date(pickupPlan.pickupAt).toLocaleString()} and deliver it to ${destination} by ${new Date(pickupPlan.deliveryAt).toLocaleString()}.`,
        keysCustodian: activeVendorWork.keysCustodian,
        lastUpdateSummary: `Part pickup scheduled from ${supplier} for delivery to ${destination}.`,
        nextAction: `Confirm the part was delivered to ${destination}, then notify the vendor to continue repairs.`,
        nextFollowUpAt: new Date(pickupPlan.deliveryAt).toISOString(),
        occurredAt: now(),
        reason: "Coordinate pickup and delivery of a dealership-supplied part so outside repair can continue.",
        scope: activeVendorWork.scope,
        sentFrom: activeVendorWork.sentFrom,
        status: activeVendorWork.status,
        supplementalAmountCents: activeVendorWork.supplementalAmountCents,
        transportMethod: pickupPlan.method,
        vendorWorkId: activeVendorWork.id,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Pickup and delivery plan could not be saved.");
  }

  async function saveVendorDeliveryProgress() {
    if (!selectedOrder || !activeVendorWork) throw new Error("An assigned outside repair vendor is required before saving the next repair step.");
    const deliveredAt = vendorDeliveryProgress.deliveredAt ? new Date(vendorDeliveryProgress.deliveredAt) : null;
    if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) throw new Error("Enter when the part reached the repair vendor.");
    const note = vendorDeliveryProgress.note.trim();
    const receivedBy = vendorDeliveryProgress.receivedBy.trim();
    const nextAction = vendorNextActionValue.trim();
    if (note.length < 10) throw new Error("Add the vendor repair progress or handoff note before saving.");
    if (!nextAction) throw new Error("Add the vendor's next action before saving.");
    const supplier = (nextPurchaseOrder?.vendor?.name ?? "the parts handoff").split(/\s+(?:request[\s_-]*quote|quote|phone|contact)\b/i)[0].trim();
    const destination = activeVendorWork.vendorName;
    const deliveredLine = `Part from ${supplier} delivered to ${destination}${receivedBy ? ` and received by ${receivedBy}` : ""} at ${deliveredAt.toLocaleString()}.`;
    const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/vendor-work`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE",
        approvalStatus: activeVendorWork.approvalStatus,
        approvedAmountCents: activeVendorWork.approvedAmountCents,
        currentLocation: activeVendorWork.currentLocation || destination,
        customerVisibleSummary: `${deliveredLine} ${note}`,
        directFromSource: activeVendorWork.directFromSource,
        estimateAmountCents: activeVendorWork.estimateAmountCents,
        evidence: [nextPurchaseOrder?.purchaseOrderNumber, receivedBy ? `Vendor receiver: ${receivedBy}` : ""].filter(Boolean),
        expectedReturnAt: activeVendorWork.expectedReturnAt,
        idempotencyKey: crypto.randomUUID(),
        internalNotes: `${deliveredLine}\nVendor progress: ${note}`,
        keysCustodian: activeVendorWork.keysCustodian,
        lastUpdateSummary: note,
        nextAction,
        nextFollowUpAt: deliveredAt.toISOString(),
        occurredAt: deliveredAt.toISOString(),
        reason: "Confirm dealership-supplied parts delivery and record outside vendor repair progress.",
        scope: activeVendorWork.scope,
        sentFrom: activeVendorWork.sentFrom,
        status: selectedVendorProgressStatus,
        supplementalAmountCents: activeVendorWork.supplementalAmountCents,
        transportMethod: pickupPlan.method || activeVendorWork.transportMethod,
        vendorWorkId: activeVendorWork.id,
      }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(result?.error ?? "Vendor delivery and repair progress could not be saved.");
    setVendorDeliveryProgress(initialVendorDeliveryProgressState());
  }

  async function saveRepairProgress() {
    if (!selectedOrder) throw new Error("Repair order is required.");
    const progressNote = repairProgress.note.trim();
    const nextAction = repairProgress.nextAction.trim();
    if (progressNote.length < 10) throw new Error("Add a short repair progress note before saving.");
    if (!nextAction) throw new Error("Add the next action so the handoff is clear.");
    const followUpAt = repairProgress.nextCheckAt ? new Date(repairProgress.nextCheckAt).toISOString() : null;
    const statusLabel = repairProgress.status === "CONTINUING_WITH_PENDING_PARTS"
      ? "Repair continuing while parts are pending"
      : repairProgress.status === "PARTIAL_REPAIR_DONE"
        ? "Partial repair completed while waiting on parts"
        : "Repair paused pending parts";

    await fetch(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/planning`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "RECORD_REPAIR_PROGRESS",
        contactChannel: "INTERNAL",
        contactDirection: "INTERNAL",
        contactOutcome: statusLabel,
        customerVisibleSummary: progressNote,
        exceptionCodes: repairProgress.status === "PAUSED_PENDING_PARTS" ? ["PARTS_DELAY"] : ["PARTS_PENDING_REPAIR_CONTINUES"],
        idempotencyKey: crypto.randomUUID(),
        internalNotes: `Parts are still pending. Repair progress update: ${progressNote}`,
        nextContactAt: followUpAt,
        occurredAt: now(),
        promiseAt: selectedOrder.vendorWorks?.[0]?.expectedReturnAt ?? null,
        reason: "Record urgent repair progress while ordered parts are still pending.",
        statusCode: repairProgress.status,
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Repair progress could not be saved.");
    });

    if (activeVendorWork && !["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"].includes(activeVendorWork.status)) {
      const nextVendorStatus = repairProgress.status === "PAUSED_PENDING_PARTS"
        ? "WAITING_PARTS"
        : activeVendorWork.status === "WAITING_PARTS"
          ? "AT_VENDOR"
          : activeVendorWork.status;
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/vendor-work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          approvalStatus: activeVendorWork.approvalStatus,
          approvedAmountCents: activeVendorWork.approvedAmountCents,
          currentLocation: activeVendorWork.currentLocation,
          customerVisibleSummary: progressNote,
          directFromSource: activeVendorWork.directFromSource,
          estimateAmountCents: activeVendorWork.estimateAmountCents,
          evidence: [],
          expectedReturnAt: activeVendorWork.expectedReturnAt,
          idempotencyKey: crypto.randomUUID(),
          internalNotes: `Urgent repair progress while ordered parts are pending: ${progressNote}`,
          keysCustodian: activeVendorWork.keysCustodian,
          lastUpdateSummary: statusLabel,
          nextAction,
          nextFollowUpAt: followUpAt,
          occurredAt: now(),
          reason: "Record repair progress while ordered parts are still pending.",
          scope: activeVendorWork.scope,
          sentFrom: activeVendorWork.sentFrom,
          status: nextVendorStatus,
          supplementalAmountCents: activeVendorWork.supplementalAmountCents,
          transportMethod: activeVendorWork.transportMethod,
          vendorWorkId: activeVendorWork.id,
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Outside repair progress could not be saved.");
    }

    setRepairProgress(initialRepairProgressState());
  }

  async function correctOutsideRepairToInternal() {
    if (!selectedOrder || !activeVendorWork) throw new Error("An outside repair record is required before it can be corrected.");
    if (!canCorrectOutsideRepair) throw new Error("This outside repair record has already moved into return or QC. Use the repair workbench to correct the final handoff.");
    const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedOrder.id)}/vendor-work`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE",
        approvalStatus: activeVendorWork.approvalStatus,
        approvedAmountCents: activeVendorWork.approvedAmountCents,
        currentLocation: "Dealership",
        customerVisibleSummary: "The vehicle is being repaired internally at the dealership.",
        directFromSource: false,
        estimateAmountCents: activeVendorWork.estimateAmountCents,
        evidence: [],
        expectedReturnAt: null,
        idempotencyKey: crypto.randomUUID(),
        internalNotes: "Corrected outside-vendor status: this vehicle is being repaired internally, not by an outside vendor.",
        keysCustodian: activeVendorWork.keysCustodian,
        lastUpdateSummary: "Corrected to internal dealership repair.",
        nextAction: "Continue internal repair progress, track pending parts, then move to Final QC when work is complete.",
        nextFollowUpAt: null,
        occurredAt: now(),
        reason: "Correct misinformation that this repair order is assigned to an outside vendor.",
        scope: activeVendorWork.scope,
        sentFrom: "Dealership",
        status: "CANCELLED",
        supplementalAmountCents: activeVendorWork.supplementalAmountCents,
        transportMethod: activeVendorWork.transportMethod,
        vendorWorkId: activeVendorWork.id,
      }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(result?.error ?? "Outside repair correction could not be saved.");
  }

  async function approveBudgetException() {
    if (!selectedOrder) throw new Error("Repair order is required.");
    if (!selectedOrder.inventoryUnit?.id) throw new Error("This repair order is not linked to an inventory unit, so the recon budget cannot be raised here.");
    const dollars = Number(budgetIncreaseDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Enter a budget increase amount greater than 0.");
    await request({
      action: "APPROVE_RECON_BUDGET_EXCEPTION",
      currentMaxReconBudgetCents: maxReconBudgetCents,
      idempotencyKey: crypto.randomUUID(),
      increaseByCents: Math.round(dollars * 100),
      reason: budgetReason.trim() || "Approve additional recon spend.",
      subjectId: selectedOrder.id,
    });
    setBudgetRequestStatus("APPROVED");
  }

  async function requestBudgetApproval() {
    if (!selectedOrder) throw new Error("Repair order is required.");
    if (!selectedOrder.inventoryUnit?.id) throw new Error("This repair order is not linked to an inventory unit, so the recon budget request cannot be recorded here.");
    const dollars = Number(budgetIncreaseDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Enter a requested budget increase greater than 0.");
    if (!budgetReason.trim()) throw new Error("Add the reason the extra recon spend is needed before sending it to the General Manager.");
    await request({
      action: "REQUEST_RECON_BUDGET_EXCEPTION",
      currentMaxReconBudgetCents: maxReconBudgetCents,
      idempotencyKey: crypto.randomUUID(),
      increaseByCents: Math.round(dollars * 100),
      reason: budgetReason.trim(),
      subjectId: selectedOrder.id,
    });
    setBudgetRequestStatus("REQUESTED");
    setMode("budget");
  }

  async function denyBudgetException() {
    if (!selectedOrder) throw new Error("Repair order is required.");
    if (!selectedOrder.inventoryUnit?.id) throw new Error("This repair order is not linked to an inventory unit, so the recon budget decision cannot be recorded here.");
    const dollars = Number(budgetIncreaseDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Enter the denied budget increase amount.");
    const reason = budgetDecisionNote.trim() || "Revise the parts plan before buying more parts.";
    await request({
      action: "DENY_RECON_BUDGET_EXCEPTION",
      currentMaxReconBudgetCents: maxReconBudgetCents,
      idempotencyKey: crypto.randomUUID(),
      increaseByCents: Math.round(dollars * 100),
      reason,
      subjectId: selectedOrder.id,
    });
    setBudgetRequestStatus("DENIED");
  }

  const lanes: Array<{ id: DeskMode; icon: React.ElementType; label: string; sub: string }> = [
    { id: "need", icon: PackagePlus, label: "Needed", sub: "List required parts" },
    { id: "order", icon: ShoppingCart, label: "Bought / Ordered", sub: "Create and track purchases" },
    { id: "progress", icon: ListChecks, label: "Repair progress", sub: "Continue while parts wait" },
    { id: "receive", icon: Truck, label: "Received", sub: "Post receipts and exceptions" },
    { id: "use", icon: Wrench, label: "Finished", sub: "Used, installed, or unused" },
  ];
  const extraLanes: Array<{ id: DeskMode; icon: React.ElementType; label: string }> = [
    { id: "source", icon: ClipboardCheck, label: "Add sourcing details" },
    { id: "vendor", icon: Building2, label: "Pickup & delivery" },
    { id: "return", icon: RotateCcw, label: "Return or recover credit" },
  ];
  const modeConfig: Record<DeskMode, { action: string; label: string; placeholder: string; title: string }> = {
    need: { action: "Save needed parts", label: "Needed parts note", placeholder: "Type needed parts here. Use the list tools or press Enter to continue a list.", title: "Add needed parts" },
    source: { action: "Save sourcing note", label: "Sourcing note", placeholder: "Add vendor quote, availability, contact, and any sourcing detail.", title: "Document sourcing" },
    order: { action: "Record bought parts", label: "Bought / ordered parts note", placeholder: "Add part bought, vendor, amount, date bought/ordered, and any purchase detail.", title: "Document bought / ordered parts" },
    budget: { action: "Request approval", label: "Budget approval request", placeholder: "Explain the overage, why it is needed, and what happens if it is denied.", title: "Request manager approval" },
    progress: { action: "Save repair progress", label: "Repair progress update", placeholder: "Record what repair work is moving forward while ordered parts are still pending.", title: "Update repair progress" },
    receive: { action: "Record received parts", label: "Received parts note", placeholder: "Add what arrived, condition, quantity, packing slip, and any exception.", title: "Document received parts" },
    vendor: { action: "Save pickup plan", label: "Pickup and delivery", placeholder: "", title: "Coordinate pickup and delivery" },
    use: { action: "Record used or unused", label: "Used parts note", placeholder: "Add what was used. If not used, write not used or return.", title: "Document used parts" },
    return: { action: "Open return tickets", label: "Return note", placeholder: "Add part being returned, vendor, credit/core/warranty detail, and reason.", title: "Document returns" },
  };
  const activeConfig = modeConfig[mode];
  const nextPurchaseOrder = openPurchaseOrders[0];
  const pickupSupplierName = (nextPurchaseOrder?.vendor?.name ?? "the parts supplier").split(/\s+(?:request[\s_-]*quote|quote|phone|contact)\b/i)[0].trim();
  const nextAction = mode === "need"
    ? openNeededParts.length
      ? `Source or buy ${openNeededParts.length} needed part${openNeededParts.length === 1 ? "" : "s"} before the vendor can continue.`
      : "No needed parts are blocking this repair order."
    : mode === "order"
      ? remainingReconBudgetCents < 0 ? "Stop: manager approval is required before more buying." : nextPurchaseOrder ? `Coordinate pickup from ${pickupSupplierName} and delivery to ${activeVendorWork?.vendorName ?? "the repair vendor"}.` : "Record the bought part so its movement can be coordinated."
      : mode === "budget"
        ? remainingReconBudgetCents < 0
          ? `General Manager decision required: this RO is ${money(overBudgetCents)} over the recommended recon budget.`
          : budgetRatio >= 0.8
            ? "Staff may request General Manager review before the next purchase pushes this unit over budget."
            : "Budget is currently inside the guardrail; no exception is required."
        : mode === "progress"
          ? openPurchaseOrders.length
            ? "Record the repair work that is continuing while ordered parts are still pending."
            : "Record the current repair progress and the next handoff action."
        : mode === "vendor"
          ? `Plan pickup from ${pickupSupplierName} and delivery to ${activeVendorWork?.vendorName ?? "the assigned repair vendor"}.`
          : mode === "receive"
            ? purchaseOrdersNeedingApproval.length ? `Approve ${purchaseOrdersNeedingApproval.length} draft PO${purchaseOrdersNeedingApproval.length === 1 ? "" : "s"} before receiving parts.` : "Record what arrived and any damaged, missing, or wrong parts."
            : mode === "use"
              ? "Only mark parts used after installation is confirmed."
              : mode === "return"
                ? "Open credit, warranty, core, or vendor-return tickets."
                : "Record sourcing quotes and availability.";
  const workflowStep: { detail: string; label: string; mode: DeskMode; title: string } = remainingReconBudgetCents < 0
    ? { detail: `The purchase is ${money(overBudgetCents)} over the recon limit. Resolve the exception before committing more money.`, label: "Review budget exception", mode: "budget", title: "Resolve the recon budget exception" }
    : nextPurchaseOrder
      ? activeVendorWork
        ? { detail: `Arrange movement from ${pickupSupplierName} to ${activeVendorWork.vendorName} so repairs can continue.`, label: "Plan pickup & delivery", mode: "vendor", title: `Coordinate delivery to ${activeVendorWork.vendorName}` }
        : { detail: "Parts are ordered. Record what repair work is continuing now and what remains for the pending parts.", label: "Record repair progress", mode: "progress", title: "Continue repair while parts are pending" }
      : openNeededParts.length
            ? { detail: `${openNeededParts.length} needed part${openNeededParts.length === 1 ? " is" : "s are"} still open for this repair order.`, label: "Open buying step", mode: "order", title: "Source or buy the needed parts" }
            : { detail: "Parts work is complete. Return to the repair workflow and continue the vehicle.", label: "Review completed parts", mode: "use", title: "Continue the repair workflow" };
  const openWorkflowStep = () => {
    setMode(workflowStep.mode);
    requestAnimationFrame(() => document.getElementById("parts-work-area")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const returnToPreviousWork = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/vehicles/parts-operations");
  };
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
  const approvePurchaseOrder = (purchaseOrder: PurchaseOrder) => {
    void run(
      () => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: `Approve ${purchaseOrder.purchaseOrderNumber} from the parts workspace so receiving can continue.`, subjectId: purchaseOrder.id, toStatus: "APPROVED" }),
      `${purchaseOrder.purchaseOrderNumber} approved. You can now issue, acknowledge, or receive parts.`,
    );
  };
  const revisePurchaseOrder = (purchaseOrder: PurchaseOrder) => {
    void run(
      async () => {
        await request({ action: "REVISE_PURCHASE_ORDER", lines: parsePurchaseOrderDraft(), reason: `Correct ${purchaseOrder.purchaseOrderNumber} after staff review for duplicate-buy or clerical error.`, subjectId: purchaseOrder.id });
        setEditingPurchaseOrderId("");
      },
      `${purchaseOrder.purchaseOrderNumber} corrected.`,
    );
  };
  const cancelMistakenPurchaseOrder = (purchaseOrder: PurchaseOrder) => {
    void run(
      async () => {
        await request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: `Cancel ${purchaseOrder.purchaseOrderNumber} because staff identified a duplicate buy or clerical error before issue.`, subjectId: purchaseOrder.id, toStatus: "CANCELLED" });
        setEditingPurchaseOrderId("");
      },
      `${purchaseOrder.purchaseOrderNumber} removed from active bought/ordered work as a cancelled clerical error.`,
    );
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

    {activeVendorWork ? (
      <section className="scp-internal-repair-correction" aria-label="Correct outside repair status">
        <div>
          <span>Repair location correction</span>
          <strong>Currently marked as outside repair at {activeVendorWork.vendorName}</strong>
          <small>If this vehicle is actually being repaired internally, clear the outside-vendor record and keep moving from the internal repair progress step.</small>
        </div>
        <button
          disabled={busy || !canCorrectOutsideRepair}
          onClick={() => void run(correctOutsideRepairToInternal, "Corrected: this vehicle is now tracked as an internal dealership repair. Use Repair progress to update what is happening while parts are pending.")}
          type="button"
        >
          Mark repair as internal
        </button>
      </section>
    ) : null}

    <section className="scp-workflow-handoff" aria-label="Continue your workflow">
      <div className="scp-workflow-copy">
        <ListChecks aria-hidden="true" size={24} />
        <div><span>What happens next</span><strong>{workflowStep.title}</strong><small>{workflowStep.detail}</small></div>
      </div>
      <div className="scp-workflow-actions">
        {returnTo
          ? <Link className="scp-return-action" href={returnTo}><ArrowLeft size={17} />{returnLabel ?? "Return and continue previous work"}</Link>
          : <button className="scp-return-action" onClick={returnToPreviousWork} type="button"><ArrowLeft size={17} />Return to previous work</button>}
        <button className="scp-next-step-action" onClick={openWorkflowStep} type="button">{workflowStep.label}<ArrowRight size={17} /></button>
      </div>
    </section>

    <section className="scp-context">
      <Field label="Repair order">
        <select value={orderId} onChange={(event) => changeRepairOrder(event.target.value)}>
          {model.repairOrders.map((item) => <option key={item.id} value={item.id}>{item.repairOrderNumber} - {vehicleLabelFor(item)} - {item.vehicle.stockNumber ?? item.vehicle.vehicleNumber} - {format(item.stage)}</option>)}
        </select>
      </Field>
      <div className="scp-vehicle-context"><span>Vehicle</span><strong>{selectedVehicleLabel}</strong><small>{selectedVehicleMeta.join(" · ")}</small></div>
      <div><span>Needed</span><strong>{laneCounts.need}</strong></div>
      <div><span>Open POs</span><strong>{laneCounts.order}</strong></div>
      <div><span>Receiving issues</span><strong>{scopedDiscrepancies.filter((item) => item.status === "OPEN").length}</strong></div>
      <div><span>Returns</span><strong>{laneCounts.return}</strong></div>
    </section>

    <section className={`scp-budget ${budgetTone}`} aria-label="Recon budget guardrail">
      <div>
        <span>{budgetSourceLabel}</span>
        <strong>{budgetDecision}</strong>
        <small>{appraisalBudget?.estimatedReconBudgetCents != null ? `Expected retail ${formatMoneyCents(expectedRetailCents)} · approved recon ceiling ${formatMoneyCents(appraisalBudget.estimatedReconBudgetCents)}` : `Estimated retail ${money(fallbackBudget.estimatedRetailCents)} · TAI ${money(fallbackBudget.totalAcquisitionInvestmentCents)} · target gross ${money(fallbackBudget.targetGrossCents)} · reserve ${money(fallbackBudget.safetyReserveCents)}`}</small>
      </div>
      <div><span>Max recon budget</span><strong>{formatMoneyCents(maxReconBudgetCents)}</strong></div>
      <div><span>Committed parts spend</span><strong>{money(partsCommittedCents)}</strong></div>
      <div><span>Remaining</span><strong>{money(remainingReconBudgetCents)}</strong></div>
      {remainingReconBudgetCents < 0 ? <div className="scp-budget-approval">
        <div>
          <span>Manager exception</span>
          <strong>This vehicle needs approval for {money(overBudgetCents)} before another purchase.</strong>
        </div>
        <button disabled={!canRaiseBudget} onClick={openBudgetApproval} type="button">Review this overage</button>
      </div> : null}
    </section>

    <nav className="scp-lanes" aria-label="Parts process">
      {lanes.map(({ id, icon: Icon, label, sub }) => <button aria-current={mode === id ? "step" : undefined} className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)} type="button"><Icon size={18} /><span>{label}<small>{sub}</small></span><b>{laneCounts[id]}</b></button>)}
    </nav>
    <details className="scp-more-actions">
      <summary>Other parts actions</summary>
      <div>{extraLanes.map(({ id, icon: Icon, label }) => <button className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)} type="button"><Icon size={16} />{label}{laneCounts[id] ? <b>{laneCounts[id]}</b> : null}</button>)}</div>
    </details>

    <main className="scp-grid" id="parts-work-area">
      <section className="scp-panel scp-primary">
        <section className="scp-next-action" aria-label="Selected lane next action">
          <header><span>Next action</span><h2>{nextAction}</h2><small>{mode === "need" ? "This is the current parts blocker list for the selected repair order." : "This guidance follows the selected parts lane."}</small></header>
          {mode === "need" && openNeededParts.length ? (
            <div className="scp-needed-strip">
              {openNeededParts.map((item) => <article key={item.id}><strong>{item.part.description ?? item.part.partNumber}</strong><span>{item.quantityReserved}/{item.quantityRequired} reserved</span><small>{format(item.status)} · needed {safeDate(item.requiredAt)}</small></article>)}
            </div>
          ) : null}
          {mode === "receive" && purchaseOrdersNeedingApproval.length ? (
            <div className="scp-needed-strip scp-approval-strip">
              {purchaseOrdersNeedingApproval.map((item) => <article key={item.id}><strong>{item.purchaseOrderNumber}</strong><span>{item.vendor?.name ?? "Vendor"} · {money(item.orderedTotalCents)}</span><small>Approval age {safeDate(item.createdAt)}</small><button disabled={busy} onClick={() => approvePurchaseOrder(item)} type="button">Approve purchase order</button></article>)}
            </div>
          ) : null}
          {mode !== "budget" ? <section className="scp-lane-audit" aria-label={`${activeConfig.label} records behind the count`}>
            <header><span>Saved for this repair order</span><strong>{lanes.find((lane) => lane.id === mode)?.label ?? activeConfig.label} · {laneCounts[mode]}</strong><small>Only records linked to {selectedNumber} are shown.</small></header>
            {mode === "need" ? <div className="scp-audit-list">{scopedDemands.length ? scopedDemands.map((item) => <article key={item.id}><div><strong>{item.part.description ?? item.part.partNumber}</strong><span>{item.part.partNumber} · Qty {item.quantityRequired} · {item.quantityReserved} reserved</span></div><small>{format(item.status)} · needed {safeDate(item.requiredAt)}</small></article>) : <p>No needed parts recorded for this repair order.</p>}</div> : null}
            {mode === "source" ? <div className="scp-audit-list">{scopedRequisitions.length ? scopedRequisitions.map((item) => <article key={item.id}><div><strong>{item.demand.part.description ?? item.demand.part.partNumber}</strong><span>{item.demand.part.partNumber} · {item.selectedOffer?.vendor.name ?? "No vendor selected"}</span></div><small>{format(item.status)} · required {safeDate(item.requiredAt)}</small></article>) : <p>No sourcing requisitions are open for this repair order.</p>}</div> : null}
            {mode === "order" ? <div className="scp-audit-list">{openPurchaseOrders.length ? openPurchaseOrders.map((item) => {
              const lines = cleanPartLines(item.lines);
              const editable = ["DRAFT", "APPROVED"].includes(item.status ?? "");
              return <article className={editingPurchaseOrderId === item.id ? "editing" : ""} key={item.id}>
                <div><strong>{item.purchaseOrderNumber}</strong><span>{item.vendor?.name ?? "Vendor"} · {money(item.orderedTotalCents)} · {format(item.status)}</span></div>
                {lines.length ? <ul>{lines.map((line, index) => <li key={`${item.id}-${index}`}><span>{partLabel(line.partId)}</span><b>Qty {line.quantity ?? 1} · {money(line.unitCostCents ?? 0)}</b></li>)}</ul> : <small>No line detail was captured on this PO.</small>}
                {editingPurchaseOrderId === item.id ? <div className="scp-inline-edit"><textarea aria-label={`Edit ${item.purchaseOrderNumber} lines`} onChange={(event) => setPurchaseOrderDraft(event.target.value)} value={purchaseOrderDraft} /><small>Use one line per part: PART-NUMBER | qty 1 | $64.50. Corrections stay attached to this PO for audit review.</small><div><button disabled={busy} onClick={() => revisePurchaseOrder(item)} type="button">Save correction</button>{editable ? <button className="danger" disabled={busy} onClick={() => cancelMistakenPurchaseOrder(item)} type="button">Remove mistaken PO</button> : null}<button disabled={busy} onClick={() => setEditingPurchaseOrderId("")} type="button">Cancel</button></div></div> : <div className="scp-record-actions"><button disabled={busy} onClick={() => beginPurchaseOrderEdit(item)} type="button">Edit line</button></div>}
              </article>;
            }) : <p>No open purchase orders.</p>}</div> : null}
            {mode === "progress" ? <div className="scp-audit-list"><article><div><strong>{selectedOrder?.repairOrderNumber ?? "Repair order"}</strong><span>{openPurchaseOrders.length ? `${openPurchaseOrders.length} ordered part${openPurchaseOrders.length === 1 ? "" : "s"} still pending or open.` : "No open purchase orders are linked to this repair order."}</span></div><small>{selectedOrder?.stage ? `${format(selectedOrder.stage)} · ${selectedOrder.nextAction ?? "Continue repair progress"}` : "Select a repair order to update progress."}</small></article>{activeVendorWork ? <article><div><strong>Outside-vendor flag is still active</strong><span>{activeVendorWork.vendorName} · {format(activeVendorWork.status)}</span></div><small>Use Mark repair as internal above if this is misinformation.</small></article> : null}</div> : null}
            {mode === "receive" ? <div className="scp-audit-list">{scopedReceipts.length ? scopedReceipts.map((item) => <article key={item.id}><div><strong>{item.purchaseOrder?.purchaseOrderNumber ?? "Receipt"}</strong><span>{item.stockLocation?.code ?? "Stock"} · {safeDate(item.receivedAt)}</span></div>{cleanPartLines(item.lines).length ? <ul>{cleanPartLines(item.lines).map((line, index) => <li key={`${item.id}-${index}`}><span>{partLabel(line.partId)}</span><b>Qty {line.quantity ?? 1} · damaged {line.damagedQuantity ?? 0}</b></li>)}</ul> : <small>No receipt line detail captured.</small>}</article>) : <p>No receipts linked to this repair order yet.</p>}{scopedDiscrepancies.filter((item) => item.status === "OPEN").map((item) => <article key={item.id}><div><strong>Receiving issue</strong><span>{item.description ?? item.code ?? "Exception"}</span></div><small>{format(item.status)}</small></article>)}</div> : null}
            {mode === "vendor" ? <div className="scp-audit-list">{scopedCustodyEvents.filter((item) => item.type === "VENDOR_SHIP").length ? scopedCustodyEvents.filter((item) => item.type === "VENDOR_SHIP").map((item) => <article key={item.id}><div><strong>{item.partNumber ?? item.part?.partNumber ?? "Part delivered"}</strong><span>Qty {item.quantity ?? 1} · {money(item.unitCostCents ?? 0)}</span></div><small>{format(item.status)} · vendor custody</small></article>) : <p>No parts have been marked delivered to vendor.</p>}</div> : null}
            {mode === "use" ? <div className="scp-audit-list">{scopedCustodyEvents.length ? scopedCustodyEvents.map((item) => <article key={item.id}><div><strong>{item.partNumber ?? item.part?.partNumber ?? "Part movement"}</strong><span>{format(item.type)} · Qty {item.quantity ?? 1} · {money(item.unitCostCents ?? 0)}</span></div><small>{format(item.status)}</small></article>) : <p>No used, installed, or unused-return part movements recorded.</p>}</div> : null}
            {mode === "return" ? <div className="scp-audit-list">{openRecoveries.length ? openRecoveries.map((item) => <article key={item.id}><div><strong>{item.part?.partNumber ?? "Return / recovery"}</strong><span>{format(item.type)} · {item.vendor?.name ?? "Vendor pending"}</span></div><small>{format(item.status)} · expected {money(item.expectedCreditCents)}</small></article>) : <p>No active returns, cores, warranty, or credit cases.</p>}</div> : null}
          </section> : null}
        </section>
        {mode === "budget" ? (
          <section className="scp-budget-workflow" aria-label="General Manager budget approval workspace">
            <header><span>Budget approval workspace</span><h2>Request, approve, or deny extra recon spend</h2><small>Staff asks for the exception here. The General Manager makes the final decision before more parts are bought.</small></header>
            <div className="scp-budget-summary">
              <article><span>Current ceiling</span><strong>{formatMoneyCents(maxReconBudgetCents)}</strong></article>
              <article><span>Committed spend</span><strong>{money(partsCommittedCents)}</strong></article>
              <article className={remainingReconBudgetCents < 0 ? "danger" : ""}><span>{remainingReconBudgetCents < 0 ? "Over budget" : "Remaining"}</span><strong>{money(remainingReconBudgetCents < 0 ? overBudgetCents : remainingReconBudgetCents)}</strong></article>
              <article><span>Request status</span><strong>{format(budgetRequestStatus)}</strong></article>
            </div>
            <div className="scp-two-col scp-budget-columns">
              <form onSubmit={(event: FormEvent) => { event.preventDefault(); void run(requestBudgetApproval, "Budget approval request recorded for General Manager review."); }}>
                <header><span>Staff request</span><h2>Ask for approval</h2><small>Use plain language: what part is needed, why it matters, and what happens if we wait.</small></header>
                <Field label="Requested increase">
                  <input inputMode="decimal" onChange={(event) => setBudgetIncreaseDollars(event.target.value)} value={budgetIncreaseDollars} />
                </Field>
                <label className="scp-field scp-textarea-field">
                  <span>Reason for the General Manager</span>
                  <textarea onChange={(event) => setBudgetReason(event.target.value)} value={budgetReason} />
                </label>
                <button className="scp-primary-button" disabled={busy || !selectedOrder} type="submit">Send approval request</button>
              </form>
              <section className="scp-manager-decision">
                <header><span>General Manager decision</span><h2>Approve or deny</h2><small>Approval raises the governed recon budget. Denial keeps buying blocked and tells staff what to do next.</small></header>
                <label className="scp-field scp-textarea-field">
                  <span>Decision note</span>
                  <textarea onChange={(event) => setBudgetDecisionNote(event.target.value)} value={budgetDecisionNote} />
                </label>
                <div className="scp-manager-actions">
                  <button className="scp-primary-button" disabled={busy || !canRaiseBudget} onClick={() => void run(approveBudgetException, `Recon budget approved and raised by $${Number(budgetIncreaseDollars || 0).toFixed(2)}.`)} type="button">Approve extra spend</button>
                  <button disabled={busy || !canRaiseBudget} onClick={() => void run(denyBudgetException, `Budget exception denied. Next step: ${budgetDecisionNote.trim() || "Revise the parts plan before buying more parts."}`)} type="button">Deny / revise plan</button>
                </div>
              </section>
            </div>
          </section>
        ) : mode === "progress" ? <form aria-busy={busy} className="scp-progress-update" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(saveRepairProgress, "Repair progress saved. Parts remain ordered, and the repair order timeline now shows work is continuing while parts are pending."); }}>
          <header><span>Urgent repair progress</span><h2>Continue repair while parts are pending</h2><small>Use this when the vehicle can keep moving without waiting for every ordered part to arrive.</small></header>
          <div className="scp-progress-status">
            <button className={repairProgress.status === "CONTINUING_WITH_PENDING_PARTS" ? "active" : ""} onClick={() => setRepairProgress((value) => ({ ...value, status: "CONTINUING_WITH_PENDING_PARTS" }))} type="button"><ListChecks size={17} />Continuing now</button>
            <button className={repairProgress.status === "PARTIAL_REPAIR_DONE" ? "active" : ""} onClick={() => setRepairProgress((value) => ({ ...value, status: "PARTIAL_REPAIR_DONE" }))} type="button"><Wrench size={17} />Partial repair done</button>
            <button className={repairProgress.status === "PAUSED_PENDING_PARTS" ? "active" : ""} onClick={() => setRepairProgress((value) => ({ ...value, status: "PAUSED_PENDING_PARTS" }))} type="button"><Truck size={17} />Paused for parts</button>
          </div>
          <label className="scp-field scp-textarea-field">
            <span>What work is happening now?</span>
            <textarea onChange={(event) => setRepairProgress((value) => ({ ...value, note: event.target.value }))} placeholder="Example: Started body repair and prep work. Brake vacuum pump is ordered; vehicle will be finished after the part arrives." value={repairProgress.note} />
          </label>
          <div className="scp-form-grid">
            <Field label="Next action">
              <input onChange={(event) => setRepairProgress((value) => ({ ...value, nextAction: event.target.value }))} value={repairProgress.nextAction} />
            </Field>
            <Field label="Next check">
              <input onChange={(event) => setRepairProgress((value) => ({ ...value, nextCheckAt: event.target.value }))} type="datetime-local" value={repairProgress.nextCheckAt} />
            </Field>
          </div>
          <div className="scp-progress-context">
            <strong>{openPurchaseOrders.length ? `${openPurchaseOrders.length} open purchase order${openPurchaseOrders.length === 1 ? "" : "s"} stay active.` : "No ordered parts are linked to this repair order."}</strong>
            <span>This update does not receive, install, or close parts. It only records that repair work is continuing or paused while parts are pending.</span>
          </div>
          <div className="scp-save-row"><button className="scp-primary-button" disabled={busy || !selectedOrder || repairProgress.note.trim().length < 10} type="submit">{busy ? "Saving progress..." : "Save repair progress"}<ArrowRight size={16} /></button><span className="scp-save-help">The next person will see this on the repair order timeline.</span></div>
        </form> : mode === "vendor" ? <section className="scp-vendor-delivery-workflow" aria-label="Vendor delivery and repair progress">
          {showPickupPlanner ? <form aria-busy={busy} className="scp-pickup-plan" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(savePickupPlan, `Pickup and delivery to ${activeVendorWork?.vendorName ?? "the repair vendor"} scheduled.`); }}>
            <header><span>Repair-advancing action</span><h2>Coordinate pickup and delivery</h2><small>Move the bought part from its supplier to the shop that already has the vehicle.</small></header>
            <div className="scp-route-summary"><article><span>Pick up from</span><strong>{nextPurchaseOrder ? pickupSupplierName : "No bought-part supplier"}</strong></article><ArrowRight /><article><span>Deliver to</span><strong>{activeVendorWork?.vendorName ?? "No outside repair vendor assigned"}</strong></article></div>
            <div className="scp-form-grid">
              <Field label="Who is handling it?"><input onChange={(event) => setPickupPlan({ ...pickupPlan, assignedTo: event.target.value })} placeholder="Staff member, courier, or vendor" value={pickupPlan.assignedTo} /></Field>
              <Field label="Transportation"><select onChange={(event) => setPickupPlan({ ...pickupPlan, method: event.target.value })} value={pickupPlan.method}><option>Dealership driver</option><option>Courier / tow company</option><option>Supplier delivery</option><option>Repair vendor pickup</option></select></Field>
              <Field label="Pickup time"><input onChange={(event) => setPickupPlan({ ...pickupPlan, pickupAt: event.target.value })} type="datetime-local" value={pickupPlan.pickupAt} /></Field>
              <Field label="Expected at repair vendor"><input onChange={(event) => setPickupPlan({ ...pickupPlan, deliveryAt: event.target.value })} type="datetime-local" value={pickupPlan.deliveryAt} /></Field>
            </div>
            <div className="scp-save-row"><button className="scp-primary-button" disabled={busy || !activeVendorWork || !nextPurchaseOrder || !pickupPlan.assignedTo.trim() || !pickupPlan.pickupAt || !pickupPlan.deliveryAt} type="submit">{busy ? "Saving plan..." : "Save pickup & delivery plan"}<ArrowRight size={16} /></button><span className="scp-save-help">After delivery, confirm the handoff and notify {activeVendorWork?.vendorName ?? "the repair vendor"} to continue repairs.</span></div>
          </form> : null}
          <form aria-busy={busy} className="scp-pickup-plan" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(saveVendorDeliveryProgress, `Vendor repair step saved for ${activeVendorWork?.vendorName ?? "the repair vendor"}.`); }}>
            <header><span>Next move</span><h2>{vendorProgressHeading(activeVendorWork?.status)}</h2><small>{vendorProgressContext(activeVendorWork?.status)}</small></header>
            <div className="scp-progress-context">
              <strong>Current step: {format(activeVendorWork?.status)}</strong>
              <span>{selectedVendorProgressOption?.nextAction ?? "Choose the next step and save a short note."}</span>
            </div>
            <div className="scp-form-grid">
              <Field label={activeVendorWork?.status === "READY_FOR_PICKUP" ? "Pickup time" : ["RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(activeVendorWork?.status ?? "") ? "Decision time" : "Update time"}><input onChange={(event) => setVendorDeliveryProgress({ ...vendorDeliveryProgress, deliveredAt: event.target.value })} type="datetime-local" value={vendorDeliveryProgress.deliveredAt} /></Field>
              <Field label={["RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(activeVendorWork?.status ?? "") ? "Checked by" : "Received by"}><input onChange={(event) => setVendorDeliveryProgress({ ...vendorDeliveryProgress, receivedBy: event.target.value })} placeholder={["RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"].includes(activeVendorWork?.status ?? "") ? "Staff member" : "Vendor contact or desk"} value={vendorDeliveryProgress.receivedBy} /></Field>
              <Field label="Next simple step"><select onChange={(event) => {
                const option = availableVendorProgressOptions.find((item) => item.value === event.target.value);
                setVendorDeliveryProgress({ ...vendorDeliveryProgress, nextAction: option?.nextAction ?? vendorDeliveryProgress.nextAction, status: event.target.value });
              }} value={selectedVendorProgressStatus}>{availableVendorProgressOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <label className="scp-field scp-textarea-field">
                <span>Short note</span>
                <textarea onChange={(event) => setVendorDeliveryProgress({ ...vendorDeliveryProgress, note: event.target.value })} placeholder={activeVendorWork?.status === "QC_REQUIRED" ? "Example: QC passed. No rework found. Ready for inventory handoff." : activeVendorWork?.status === "READY_FOR_PICKUP" ? "Example: Gil Tires says repair is complete. Eli will pick it up and bring it back for QC." : "Example: Vehicle is back from Gil Tires. Start QC now."} value={vendorDeliveryProgress.note} />
              </label>
            </div>
            <div className="scp-save-row"><button className="scp-primary-button" disabled={busy || !activeVendorWork || !vendorDeliveryProgress.deliveredAt || vendorDeliveryProgress.note.trim().length < 10} type="submit">{busy ? "Saving..." : "Save next move"}<ArrowRight size={16} /></button><span className="scp-save-help">{activeVendorWork?.status === "QC_REQUIRED" ? "Pass moves to handoff. Fail returns to a repair decision." : "Keep it moving with one clear next step."}</span></div>
          </form>
        </section> : <form aria-busy={busy} className="scp-comment-composer" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(() => recordModeNote(mode), `${activeConfig.label} saved. The parts board has been updated.`); }}>
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
          <div className="scp-save-row">
            <button className="scp-primary-button" disabled={busy || !selectedOrder || !notes[mode].trim()} type="submit">{busy ? "Saving parts…" : activeConfig.action} {busy ? null : <ArrowRight size={16} />}</button>
            {notice ? <Notice value={notice} /> : <span className="scp-save-help" role="status">{notes[mode].trim() ? "Ready to save." : "Enter at least one part before saving."}</span>}
          </div>
        </form>}
      </section>

      <aside className="scp-panel scp-queue">
        <header><span>Live parts board</span><h2>{selectedNumber || "All work"}</h2><small>{selectedVehicleLabel}</small></header>
        <div className="scp-list">
          <h3>Needed parts</h3>
          {scopedDemands.length ? scopedDemands.map((item) => <article key={item.id}><strong>{item.part.partNumber}</strong><span>{item.part.description ?? "Part"} - {item.quantityReserved}/{item.quantityRequired} reserved</span><small>{format(item.status)} - needed {safeDate(item.requiredAt)}</small></article>) : <p>No needed parts recorded.</p>}
          <h3>Requisitions</h3>
          {scopedRequisitions.length ? scopedRequisitions.map((item) => <article key={item.id}><strong>{item.demand.part.partNumber}</strong><span>{item.selectedOffer?.vendor.name ?? "No vendor selected"}</span><small>{format(item.status)}</small></article>) : <p>No sourcing requisitions yet.</p>}
          <h3>Purchase orders</h3>
          {openPurchaseOrders.length ? openPurchaseOrders.slice(0, 8).map((item) => <article key={item.id}><strong>{item.purchaseOrderNumber}</strong><span>{item.vendor?.name ?? "Vendor"} - {money(item.orderedTotalCents)}</span><small>{format(item.status)}</small><div>{item.status === "DRAFT" ? <button disabled={busy} onClick={() => approvePurchaseOrder(item)} type="button">Approve</button> : null}{item.status === "APPROVED" ? <button disabled={busy} onClick={() => void run(() => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: reason("TRANSITION_PURCHASE_ORDER"), subjectId: item.id, toStatus: "ISSUED" }), "Purchase order issued.")} type="button">Issue</button> : null}{item.status === "ISSUED" ? <button disabled={busy} onClick={() => void run(() => request({ action: "TRANSITION_PURCHASE_ORDER", occurredAt: now(), reason: reason("TRANSITION_PURCHASE_ORDER"), subjectId: item.id, toStatus: "ACKNOWLEDGED" }), "Vendor acknowledgement recorded.")} type="button">Acknowledge</button> : null}</div></article>) : <p>No open purchase orders.</p>}
          <h3>Received and used</h3>
          {scopedReceipts.length ? scopedReceipts.map((item) => <article key={item.id}><strong>{item.purchaseOrder?.purchaseOrderNumber ?? "Receipt"}</strong><span>{item.stockLocation?.code ?? "Stock"} - {safeDate(item.receivedAt)}</span><small>{format(item.status)}</small></article>) : <p>No receipts linked to this RO yet.</p>}
          {scopedCustodyEvents.slice(0, 5).map((item) => <article key={item.id}><strong>{item.partNumber ?? item.part?.partNumber ?? "Part"}</strong><span>{format(item.type)} movement</span><small>{format(item.status)}</small></article>)}
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
