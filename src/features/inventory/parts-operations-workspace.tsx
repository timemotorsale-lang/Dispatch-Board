"use client";

import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  Edit3,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BackToVehicleOperationsWorkspace } from "./workspace-return-link";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { BackToPartsWorkspace } from "@/features/parts/parts-return-link";

type Balance = {
  allocatedQuantity: number;
  availableQuantity: number;
  damagedQuantity: number;
  onHandQuantity: number;
  orderedQuantity: number;
  stockLocation: { code: string; locationId: string; name: string };
};

type Model = {
  capability: { barcodeHardware: string; recommendations: string; vendorAdapters: string };
  contractVersion: string;
  generatedAt: string;
  ledger: {
    repairOrders: Array<{
      id: string;
      locationId: string;
      partDemands: Array<{ id: string; status: string }>;
      readinessEvaluations: Array<{ evaluatedAt: string; ready: boolean }>;
      repairOrderNumber: string;
      vehicle: { make: string; model: string; vehicleNumber: string; year: number };
    }>;
  };
  service: {
    custodyEvents: Array<{ id: string; occurredAt: string; part: { partNumber: string }; type: string }>;
    demands: Array<{
      id: string;
      quantityRequired: number;
      quantityReserved: number;
      requiredAt: string;
      status: string;
      part: { description: string; partNumber: string };
      repairOrder: { locationId: string; repairOrderNumber: string };
    }>;
    discrepancies: Array<{
      createdAt: string;
      expectedQuantity: number;
      id: string;
      receivedQuantity: number;
      status: string;
      type: string;
      receipt: { purchaseOrder: { locationId: string } };
    }>;
    locations: Array<{ id: string; name: string }>;
    offers: Array<{ estimatedArrivalAt: string | null; id: string; vendor: { name: string } }>;
    purchaseOrders: Array<{
      acknowledgedAt: string | null;
      createdAt: string;
      id: string;
      locationId: string;
      location: { name: string };
      orderedTotalCents: number;
      purchaseOrderNumber: string;
      receivedTotalCents: number;
      status: string;
      vendor: { name: string };
    }>;
    recoveries: Array<{
      actualCreditCents: number | null;
      deadlineAt: string;
      expectedCreditCents: number;
      id: string;
      part: { partNumber: string };
      status: string;
      type: string;
      vendor: { name: string } | null;
    }>;
    requisitions: Array<{
      id: string;
      requiredAt: string;
      status: string;
      demand: { part: { description: string; partNumber: string }; repairOrder: { locationId: string; repairOrderNumber: string } };
      selectedOffer: { vendor: { name: string } } | null;
    }>;
    transfers: Array<{
      createdAt: string;
      discrepancyNotes: string | null;
      fromStockLocationId: string;
      id: string;
      locationId: string;
      status: string;
      toStockLocationId: string;
      transferNumber: string;
    }>;
  };
  waveOne: {
    counts: Array<{ countNumber: string; id: string; status: string; stockLocation: { code: string; locationId: string; name: string } }>;
    discrepancies: Array<{ id: string; type: string }>;
    parts: Array<{ balances: Balance[]; description: string; id: string; partNumber: string }>;
    recommendations: Array<{
      confidence: string;
      estimatedCostCents: number;
      id: string;
      part: { description: string; partNumber: string };
      reasonCodes: string[];
      recommendedQuantity: number;
      status: string;
      stockLocation: { code: string; locationId: string; name: string };
      type: string;
    }>;
    reservations: Array<{
      id: string;
      part: { description: string; partNumber: string };
      quantity: number;
      stockLocation: { code: string; name: string };
      demand: { repairOrder: { repairOrderNumber: string } };
    }>;
    stockLocations: Array<{ code: string; id: string; location: { name: string }; name: string }>;
  };
};

type QueueRow = {
  action: string;
  availability: string;
  blocker: string;
  href: string;
  id: string;
  kind: string;
  locationId: string | null;
  owner: string;
  part: string;
  reference: string;
  repairOrderId?: string;
  reservation: string;
  required: string;
  status: string;
  tone: "danger" | "success" | "warning";
  vehicle: string;
  vendorEta: string;
};

const closedPurchaseStates = new Set(["CANCELLED", "CLOSED"]);
const resolvedRecoveryStates = new Set(["CREDITED", "WRITTEN_OFF"]);

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function ageLabel(value: string, now: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown age";
  const hours = Math.max(0, Math.floor((now - date.getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const localTabs = [
  ["Overview", "overview"],
  ["Demand", "demand"],
  ["Requisitions", "requisitions"],
  ["Purchase Orders", "purchase-orders"],
  ["Receiving", "receiving"],
  ["Inventory", "inventory"],
  ["Transfers", "transfers"],
  ["Returns & Recovery", "returns-recovery"],
  ["Counts & Exceptions", "counts-exceptions"]
] as const;

type PartsView = (typeof localTabs)[number][1];
const validViews = new Set<PartsView>(localTabs.map(([, view]) => view));
type NeededPartDraft = { description: string; partNumber: string; quantity: string };

function partsHref(view: PartsView, repairOrderId?: string, returnTo?: string, returnLabel?: string) {
  const params = new URLSearchParams();
  if (view !== "overview") params.set("view", view);
  if (repairOrderId) params.set("repairOrderId", repairOrderId);
  if (returnTo) params.set("returnTo", returnTo);
  if (returnLabel) params.set("returnLabel", returnLabel);
  const query = params.toString();
  return query ? `/vehicles/parts-operations?${query}` : "/vehicles/parts-operations";
}

function encodeOrderingParts(parts: Array<{ id: string; partNumber: string; description: string; quantity: number }>) {
  return JSON.stringify(parts.map((part) => ({
    id: part.id,
    name: part.description,
    number: part.partNumber,
    quantity: part.quantity,
    sourceLabel: "RO needed part",
    totalLabel: "Quote needed",
  })));
}

export function PartsOperationsWorkspace({ initial, initialRepairOrderId, initialView, returnLabel, returnTo, showAdvisorReturn = false, showPartsReturn = false, showWorkspaceReturn = false }: { initial: Model; initialRepairOrderId?: string; initialView?: string; returnLabel?: string; returnTo?: string; showAdvisorReturn?: boolean; showPartsReturn?: boolean; showWorkspaceReturn?: boolean }) {
  const currentView: PartsView = validViews.has(initialView as PartsView) ? initialView as PartsView : "overview";
  const [renderedAt] = useState(() => Date.now());
  const [locationId, setLocationId] = useState("ALL");
  const [workType, setWorkType] = useState("ALL");
  const [queueView, setQueueView] = useState<"MY" | "TEAM" | "EXCEPTIONS">("MY");
  const [approvalView, setApprovalView] = useState<"REVIEWS" | "APPROVALS">("REVIEWS");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editNeededParts, setEditNeededParts] = useState(false);
  const [neededPartDraft, setNeededPartDraft] = useState<NeededPartDraft>({ description: "", partNumber: "", quantity: "1" });

  const balances = initial.waveOne.parts.flatMap((part) => part.balances);
  const balanceTotals = balances.reduce(
    (total, balance) => ({
      allocated: total.allocated + balance.allocatedQuantity,
      available: total.available + balance.availableQuantity,
      damaged: total.damaged + balance.damagedQuantity,
      onHand: total.onHand + balance.onHandQuantity,
      ordered: total.ordered + balance.orderedQuantity
    }),
    { allocated: 0, available: 0, damaged: 0, onHand: 0, ordered: 0 }
  );
  const readyOrders = initial.ledger.repairOrders.filter((order) => order.readinessEvaluations[0]?.ready).length;
  const readiness = initial.ledger.repairOrders.length ? Math.round((readyOrders / initial.ledger.repairOrders.length) * 100) : 0;
  const openPurchaseOrders = initial.service.purchaseOrders.filter((order) => !closedPurchaseStates.has(order.status));
  const openDiscrepancies = initial.service.discrepancies.filter((item) => item.status === "OPEN");
  const openRecoveries = initial.service.recoveries.filter((item) => !resolvedRecoveryStates.has(item.status));
  const recoveryAtRisk = openRecoveries.reduce((sum, item) => sum + Math.max(0, item.expectedCreditCents - (item.actualCreditCents ?? 0)), 0);
  const today = new Date(renderedAt).toISOString().slice(0, 10);
  const arrivingToday = initial.service.offers.filter((offer) => offer.estimatedArrivalAt?.slice(0, 10) === today).length;
  const repairOrdersByNumber = new Map(initial.ledger.repairOrders.map((order) => [order.repairOrderNumber, order]));
  const repairOrderIdFor = (repairOrderNumber: string) => repairOrdersByNumber.get(repairOrderNumber)?.id;
  const reservationQuantityByOrder = new Map<string, number>();
  for (const reservation of initial.waveOne.reservations) {
    const orderNumber = reservation.demand.repairOrder.repairOrderNumber;
    reservationQuantityByOrder.set(orderNumber, (reservationQuantityByOrder.get(orderNumber) ?? 0) + reservation.quantity);
  }
  const vehicleFor = (repairOrderNumber: string) => {
    const vehicle = repairOrdersByNumber.get(repairOrderNumber)?.vehicle;
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.vehicleNumber}` : "—";
  };
  const selectedRepairOrder = initialRepairOrderId ? initial.ledger.repairOrders.find((order) => order.id === initialRepairOrderId) : null;
  const selectedRepairOrderNumber = selectedRepairOrder?.repairOrderNumber;
  const selectedRoDemands = selectedRepairOrderNumber ? initial.service.demands.filter((demand) => demand.repairOrder.repairOrderNumber === selectedRepairOrderNumber) : [];
  const groupedDemandMap = new Map<string, {
    demandIds: string[];
    description: string;
    partNumber: string;
    quantityRequired: number;
    quantityReserved: number;
    requiredAt: string;
    status: string;
  }>();
  for (const demand of selectedRoDemands) {
    const key = demand.part.partNumber;
    const current = groupedDemandMap.get(key);
    if (!current) {
      groupedDemandMap.set(key, {
        demandIds: [demand.id],
        description: demand.part.description,
        partNumber: demand.part.partNumber,
        quantityRequired: demand.quantityRequired,
        quantityReserved: demand.quantityReserved,
        requiredAt: demand.requiredAt,
        status: demand.status,
      });
      continue;
    }
    current.demandIds.push(demand.id);
    current.quantityRequired = Math.max(current.quantityRequired, demand.quantityRequired);
    current.quantityReserved = Math.max(current.quantityReserved, demand.quantityReserved);
    if (new Date(demand.requiredAt).getTime() < new Date(current.requiredAt).getTime()) current.requiredAt = demand.requiredAt;
    if (demand.status !== "RESERVED") current.status = demand.status;
  }
  const groupedRoDemands = Array.from(groupedDemandMap.values());
  const duplicateDemandCount = selectedRoDemands.length - groupedRoDemands.length;
  const groupedOrderingHref = groupedRoDemands.length ? `/diagnostics/parts-ordering?${new URLSearchParams({
    parts: encodeOrderingParts(groupedRoDemands.map((demand) => ({ id: demand.demandIds[0] ?? demand.partNumber, partNumber: demand.partNumber, description: demand.description, quantity: Math.max(1, demand.quantityRequired - demand.quantityReserved) }))),
    ...(selectedRepairOrder ? { repairOrderId: selectedRepairOrder.id, repairOrderNumber: selectedRepairOrder.repairOrderNumber, vehicle: vehicleFor(selectedRepairOrder.repairOrderNumber) } : {}),
    returnLabel: "Return to Parts Operations",
    returnTo: partsHref("demand", initialRepairOrderId, returnTo, returnLabel),
  }).toString()}` : "";
  const repeatedDemandIds = groupedRoDemands.flatMap((demand) => demand.demandIds.slice(1));
  const queueDefaults = { availability: "—", owner: "—", reservation: "—", vehicle: "—", vendorEta: "—" };

  async function cancelRepeatedDemandRecords() {
    if (!selectedRepairOrder || !repeatedDemandIds.length) return;
    setBusy(true);
    setNotice("");
    try {
      for (const demandId of repeatedDemandIds) {
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/parts/${encodeURIComponent(demandId)}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), reason: "Cancel repeated part demand created during estimate workflow cleanup." }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Repeated demand could not be cancelled.");
      }
      setNotice(`Cancelled ${repeatedDemandIds.length} repeated demand record${repeatedDemandIds.length === 1 ? "" : "s"}. Refreshing parts operations.`);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Repeated demand could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDemandRecords(demandIds: string[], message: string) {
    if (!selectedRepairOrder || !demandIds.length) return;
    setBusy(true);
    setNotice("");
    try {
      for (const demandId of demandIds) {
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/parts/${encodeURIComponent(demandId)}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), reason: message }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Needed part could not be removed.");
      }
      setNotice(`Removed ${demandIds.length} needed part record${demandIds.length === 1 ? "" : "s"}. Refreshing parts operations.`);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Needed part could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function addNeededPart() {
    if (!selectedRepairOrder) return;
    const partNumber = neededPartDraft.partNumber.trim().toUpperCase();
    const description = neededPartDraft.description.trim();
    const quantity = Number(neededPartDraft.quantity);
    if (!partNumber || !description || !Number.isInteger(quantity) || quantity <= 0) {
      setNotice("Enter a part number, description, and positive whole quantity before adding a needed part.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const partLookup = await fetch(`/api/parts?query=${encodeURIComponent(partNumber)}`, { cache: "no-store" });
      const lookupBody = await partLookup.json().catch(() => ({}));
      if (!partLookup.ok) throw new Error(lookupBody.error || "Part lookup failed.");
      let partId = (lookupBody.parts as Array<{ id: string; partNumber: string }> | undefined)?.find((part) => part.partNumber.toUpperCase() === partNumber)?.id;
      if (!partId) {
        const created = await fetch("/api/parts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            description,
            idempotencyKey: crypto.randomUUID(),
            partNumber,
            reason: "Create manual part while editing the repair order needed-parts list.",
            standardCostCents: 0,
            unitOfMeasure: "EACH",
          }),
        });
        const createdBody = await created.json().catch(() => ({}));
        if (!created.ok) throw new Error(createdBody.error || "Manual part could not be created.");
        partId = createdBody.result?.id;
      }
      if (!partId) throw new Error("Part could not be resolved.");
      const demand = await fetch(`/api/repair-orders/${encodeURIComponent(selectedRepairOrder.id)}/parts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          notes: `Needed part added from Parts Operations: ${description}.`,
          partId,
          quantityRequired: quantity,
          reason: "Add needed part from Parts Operations edit mode.",
          repairJobReference: null,
          requiredAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
          substitutionAllowed: true,
        }),
      });
      const demandBody = await demand.json().catch(() => ({}));
      if (!demand.ok) throw new Error(demandBody.error || "Needed part could not be added.");
      setNotice(`Added ${description}. Refreshing parts operations.`);
      setNeededPartDraft({ description: "", partNumber: "", quantity: "1" });
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Needed part could not be added.");
    } finally {
      setBusy(false);
    }
  }

  const queue: QueueRow[] = (() => {
    const demandRows = initial.service.demands.slice(0, 4).map((demand) => ({
      action: demand.quantityReserved ? "Review reservation" : "Source part",
      availability: demand.quantityReserved >= demand.quantityRequired ? "Reserved" : demand.quantityReserved ? "Partial" : "Unreserved",
      blocker: demand.quantityReserved ? `${demand.quantityReserved}/${demand.quantityRequired} reserved` : "Not reserved",
      href: "/vehicles/parts",
      id: `demand-${demand.id}`,
      kind: "Demand",
      locationId: demand.repairOrder.locationId,
      part: `${demand.part.partNumber} · ${demand.part.description}`,
      reference: demand.repairOrder.repairOrderNumber,
      repairOrderId: repairOrderIdFor(demand.repairOrder.repairOrderNumber),
      reservation: `${demand.quantityReserved}/${demand.quantityRequired}`,
      required: dateLabel(demand.requiredAt),
      status: demand.status,
      tone: (new Date(demand.requiredAt).getTime() < renderedAt ? "danger" : "warning") as QueueRow["tone"],
      vehicle: vehicleFor(demand.repairOrder.repairOrderNumber)
    }));
    const discrepancyRows = openDiscrepancies.slice(0, 2).map((item) => ({
      action: "Resolve discrepancy",
      blocker: `Expected ${item.expectedQuantity} · received ${item.receivedQuantity}`,
      href: "/vehicles/parts-counter",
      id: `discrepancy-${item.id}`,
      kind: "Receiving",
      locationId: item.receipt.purchaseOrder.locationId,
      part: item.type.replaceAll("_", " "),
      reference: "Receipt exception",
      required: ageLabel(item.createdAt, renderedAt),
      status: item.status,
      tone: "danger" as const
    }));
    const requisitionRows = initial.service.requisitions.filter((item) => item.status !== "CANCELLED" && item.status !== "ORDERED").slice(0, 3).map((item) => ({
      action: item.selectedOffer ? "Review selected source" : "Compare sources",
      availability: item.selectedOffer ? "Source selected" : "Sourcing",
      blocker: item.selectedOffer ? `Selected ${item.selectedOffer.vendor.name}` : "Source decision pending",
      href: "/vehicles/service-close-parts",
      id: `requisition-${item.id}`,
      kind: "Requisition",
      locationId: item.demand.repairOrder.locationId,
      part: `${item.demand.part.partNumber} · ${item.demand.part.description}`,
      reference: item.demand.repairOrder.repairOrderNumber,
      repairOrderId: repairOrderIdFor(item.demand.repairOrder.repairOrderNumber),
      reservation: reservationQuantityByOrder.has(item.demand.repairOrder.repairOrderNumber) ? `${reservationQuantityByOrder.get(item.demand.repairOrder.repairOrderNumber)} reserved` : "None",
      required: dateLabel(item.requiredAt),
      status: item.status,
      tone: (new Date(item.requiredAt).getTime() < renderedAt ? "danger" : "warning") as QueueRow["tone"],
      vehicle: vehicleFor(item.demand.repairOrder.repairOrderNumber),
      vendorEta: item.selectedOffer?.vendor.name ?? "Pending source"
    }));
    const purchaseRows = openPurchaseOrders.slice(0, 4).map((item) => ({
      action: item.status === "DRAFT" ? "Review approval" : "Track order",
      blocker: item.acknowledgedAt ? "Vendor acknowledgement recorded" : "External acknowledgement pending",
      href: "/vehicles/service-close-parts",
      id: `purchase-${item.id}`,
      kind: "Purchase Order",
      locationId: item.locationId,
      part: `${item.purchaseOrderNumber} · ${item.vendor.name}`,
      reference: item.location.name,
      required: ageLabel(item.createdAt, renderedAt),
      status: item.status,
      tone: (item.status === "DRAFT" ? "danger" : "warning") as QueueRow["tone"],
      vendorEta: item.vendor.name
    }));
    const transferRows = initial.service.transfers.filter((item) => item.status !== "RECEIVED" && item.status !== "CANCELLED").slice(0, 2).map((item) => ({
      action: item.status === "DRAFT" ? "Review transfer" : "Track transfer",
      blocker: item.discrepancyNotes ?? "Custody in progress",
      href: "/vehicles/service-close-parts",
      id: `transfer-${item.id}`,
      kind: "Transfer",
      locationId: item.locationId,
      part: item.transferNumber,
      reference: "Cross-location custody",
      required: ageLabel(item.createdAt, renderedAt),
      status: item.status,
      tone: (item.status === "DISCREPANCY" ? "danger" : "warning") as QueueRow["tone"]
    }));
    const recoveryRows = openRecoveries.slice(0, 2).map((item) => ({
      action: "Review recovery",
      blocker: `${money(item.expectedCreditCents)} expected credit`,
      href: "/vehicles/service-close-parts",
      id: `recovery-${item.id}`,
      kind: "Recovery",
      locationId: null,
      part: `${item.part.partNumber} · ${item.type}`,
      reference: item.vendor?.name ?? "Vendor pending",
      required: dateLabel(item.deadlineAt),
      status: item.status,
      tone: (new Date(item.deadlineAt).getTime() < renderedAt + 3 * 86_400_000 ? "danger" : "warning") as QueueRow["tone"],
      vendorEta: item.vendor?.name ?? "Vendor pending"
    }));
    const countRows = initial.waveOne.counts.filter((item) => !["POSTED", "CANCELLED"].includes(item.status)).slice(0, 3).map((item) => ({
      action: item.status === "REVIEW_REQUIRED" ? "Review variance" : "Continue count",
      blocker: `${item.stockLocation.code} · ${item.stockLocation.name}`,
      href: "/vehicles/parts-counter",
      id: `count-${item.id}`,
      kind: "Count",
      locationId: item.stockLocation.locationId,
      part: item.countNumber,
      reference: "Inventory control",
      required: "Open count",
      status: item.status,
      tone: (item.status === "REVIEW_REQUIRED" ? "danger" : "warning") as QueueRow["tone"]
    }));
    const recommendationRows = initial.waveOne.recommendations.filter((item) => item.status === "OPEN" && item.type !== "NO_ACTION").slice(0, 3).map((item) => ({
      action: "Review advice",
      blocker: `${item.confidence} confidence · non-executing`,
      href: "/vehicles/parts-counter",
      id: `recommendation-${item.id}`,
      kind: "Recommendation",
      locationId: item.stockLocation.locationId,
      part: `${item.part.partNumber} · ${item.type.replaceAll("_", " ")}`,
      reference: item.stockLocation.code,
      required: money(item.estimatedCostCents),
      status: item.status,
      tone: "warning" as const
    }));
    return [...demandRows, ...requisitionRows, ...purchaseRows, ...discrepancyRows, ...transferRows, ...recoveryRows, ...countRows, ...recommendationRows].map((row) => ({ ...queueDefaults, ...row }));
  })();

  const visibleQueue = queue.filter((row) => {
    const matchesType = workType === "ALL" || row.kind.toUpperCase() === workType;
    const matchesLocation = locationId === "ALL" || row.locationId === locationId;
    const kindsByView: Partial<Record<PartsView, string[]>> = {
      demand: ["Demand"], requisitions: ["Requisition"], "purchase-orders": ["Purchase Order"], receiving: ["Receiving"], inventory: ["Demand", "Count", "Recommendation"], transfers: ["Transfer"], "returns-recovery": ["Recovery"], "counts-exceptions": ["Count", "Recommendation", "Receiving"]
    };
    const matchesView = currentView === "overview" || kindsByView[currentView]?.includes(row.kind);
    const matchesQueueView = queueView !== "EXCEPTIONS" || row.tone === "danger";
    const matchesRepairOrder = !initialRepairOrderId || row.repairOrderId === initialRepairOrderId;
    return matchesType && matchesLocation && matchesView && matchesQueueView && matchesRepairOrder;
  });

  const milestones = [
    ["Demand", initial.service.demands.length, "success"],
    ["Requisition", initial.service.requisitions.filter((item) => !["ORDERED", "CANCELLED"].includes(item.status)).length, "success"],
    ["Approval", initial.service.purchaseOrders.filter((item) => item.status === "DRAFT").length + initial.waveOne.counts.filter((item) => item.status === "REVIEW_REQUIRED").length, "warning"],
    ["Ordered", openPurchaseOrders.length, "warning"],
    ["In Transit", initial.service.transfers.filter((item) => item.status === "SHIPPED").length + initial.service.purchaseOrders.filter((item) => ["ISSUED", "ACKNOWLEDGED"].includes(item.status)).length, "warning"],
    ["Received", initial.service.purchaseOrders.filter((item) => ["PARTIALLY_RECEIVED", "RECEIVED"].includes(item.status)).length, openDiscrepancies.length ? "danger" : "success"],
    ["Reserved", initial.waveOne.reservations.length, "success"],
    ["Issued / Installed", initial.service.custodyEvents.filter((item) => ["ISSUE", "INSTALL"].includes(item.type)).length, "success"],
    ["Reconciled", initial.service.purchaseOrders.filter((item) => item.status === "CLOSED").length + initial.service.recoveries.filter((item) => item.status === "CREDITED").length, "success"]
  ] as const;

  const approvals = [
    ...initial.service.purchaseOrders.filter((item) => item.status === "DRAFT").slice(0, 3).map((item) => ({ age: ageLabel(item.createdAt, renderedAt), amount: money(item.orderedTotalCents), href: "/vehicles/service-close-parts", label: `Purchase approval · ${item.purchaseOrderNumber}`, owner: "—", state: "Approve", view: "APPROVALS" as const })),
    ...initial.waveOne.counts.filter((item) => item.status === "REVIEW_REQUIRED").slice(0, 3).map((item) => ({ age: "Open", amount: "—", href: "/vehicles/parts-counter", label: `Inventory adjustment · ${item.countNumber}`, owner: "—", state: "Review", view: "REVIEWS" as const })),
    ...initial.waveOne.recommendations.filter((item) => item.status === "OPEN" && item.type !== "NO_ACTION").slice(0, 3).map((item) => ({ age: "Open", amount: money(item.estimatedCostCents), href: "/vehicles/parts-counter", label: `${item.type.replaceAll("_", " ")} · ${item.part.partNumber}`, owner: "—", state: "Review", view: "REVIEWS" as const }))
  ].slice(0, 5);
  const visibleApprovals = approvals.filter((item) => item.view === approvalView);

  const selectedRecommendation = initial.waveOne.recommendations.find((item) => item.status === "OPEN" && item.type !== "NO_ACTION");
  const kpiCards: Array<{ href: string; icon: LucideIcon; label: string; tone: string; value: number | string }> = [
    { icon: Boxes, label: "Open Demand", value: initial.service.demands.length, tone: "blue", href: "/vehicles/parts" },
    { icon: CheckCircle2, label: "Jobs Ready", value: `${readiness}%`, tone: "green", href: "/vehicles/parts" },
    { icon: Clock3, label: "Waiting on Parts", value: initial.ledger.repairOrders.filter((order) => order.partDemands.some((demand) => demand.status !== "RESERVED")).length, tone: "orange", href: "/vehicles/parts" },
    { icon: ShoppingCart, label: "Open POs", value: openPurchaseOrders.length, tone: "blue", href: "/vehicles/service-close-parts" },
    { icon: Truck, label: "Arriving Today", value: arrivingToday, tone: "purple", href: "/vehicles/service-close-parts" },
    { icon: AlertTriangle, label: "Receiving Exceptions", value: openDiscrepancies.length, tone: "red", href: "/vehicles/parts-counter" },
    { icon: CircleDollarSign, label: "Recovery at Risk", value: money(recoveryAtRisk), tone: "purple", href: "/vehicles/service-close-parts" }
  ];

  return (
    <section aria-label={`Parts Operations; Vendor adapters: ${initial.capability.vendorAdapters}; barcode: ${initial.capability.barcodeHardware}; recommendations: ${initial.capability.recommendations}`} className="parts-operations-page">
      <header className="parts-operations-header">
        <div>
          {returnTo ? <Link href={returnTo}>&larr; {returnLabel ?? "Return to source workspace"}</Link> : showAdvisorReturn ? <BackToServiceAdvisorWorkspace /> : showPartsReturn ? <BackToPartsWorkspace /> : showWorkspaceReturn ? <BackToVehicleOperationsWorkspace /> : null}
          <p><Link href={returnTo ?? "/vehicles/inventory"}>Inventory Lifecycle</Link><span>/</span><Link href="/vehicles/recon-repair-advisor">Recon / Repair Advisor</Link><span>/</span>Parts Operations</p>
          <h1>Parts Operations</h1>
          <small>Demand, sourcing, custody, availability, and recovery control</small>
        </div>
        <div className="parts-operations-actions">
          <Link className="parts-action-primary" href="/vehicles/service-close-parts"><ShoppingCart size={15} />Start Parts Workflow</Link>
          <Link href="/vehicles/parts-counter"><Barcode size={15} />Scan Part</Link>
          <button disabled title="Saved views are not activated in R8" type="button"><ClipboardCheck size={15} />Saved Views</button>
          <button disabled title="Parts export is not activated in R8" type="button"><Download size={15} />Export</button>
        </div>
      </header>

      <nav aria-label="Parts Operations workspace" className="parts-operations-tabs">
        {localTabs.map(([label, view]) => <Link aria-current={currentView === view ? "page" : undefined} className={currentView === view ? "active" : ""} href={partsHref(view, initialRepairOrderId, returnTo, returnLabel)} key={label}>{label}</Link>)}
      </nav>

      <section aria-label="Parts Operations filters" className="parts-operations-filters">
        <label><span>Location</span><select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="ALL">All locations</option>{initial.service.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Work type</span><select value={workType} onChange={(event) => setWorkType(event.target.value)}><option value="ALL">All work</option><option value="DEMAND">Demand</option><option value="REQUISITION">Requisition</option><option value="PURCHASE ORDER">Purchase Order</option><option value="RECEIVING">Receiving</option><option value="TRANSFER">Transfer</option><option value="RECOVERY">Recovery</option><option value="COUNT">Count</option><option value="RECOMMENDATION">Recommendation</option></select></label>
        <label><span>Vendor</span><select disabled><option>All vendors</option></select></label>
        <label><span>Availability</span><select disabled><option>All availability</option></select></label>
        <label><span>Owner</span><select disabled><option>All permitted owners</option></select></label>
        <label><span>Date Range</span><select disabled><option>{dateLabel(initial.generatedAt)}</option></select></label>
      </section>

      {selectedRepairOrder ? <section className="parts-ro-action-panel" aria-label="Selected repair order parts action">
        <div>
          <span>Do this next</span>
          <h2>Review the actual needed parts for {selectedRepairOrder.repairOrderNumber}</h2>
          <p>{duplicateDemandCount > 0 ? `${duplicateDemandCount} repeated demand record${duplicateDemandCount === 1 ? "" : "s"} detected. The ordering worksheet will use the unique needed parts below so staff can order deliberately.` : "No repeated demand records detected for this repair order."}</p>
          {notice ? <p className="parts-ro-notice" role="status">{notice}</p> : null}
        </div>
        <div className="parts-ro-demand-list">
          {groupedRoDemands.length ? groupedRoDemands.map((demand) => <article key={demand.partNumber}>
            <span>
              <strong>{demand.description}</strong>
              <small>{demand.partNumber} - {demand.quantityReserved}/{demand.quantityRequired} reserved</small>
              {demand.demandIds.length > 1 ? <small>{demand.demandIds.length} repeated demand records grouped</small> : <small>{formatStatus(demand.status)} - needed {dateLabel(demand.requiredAt)}</small>}
            </span>
            {editNeededParts ? <button disabled={busy || demand.quantityReserved > 0} onClick={() => void cancelDemandRecords(demand.demandIds, "Remove unneeded part demand from Parts Operations edit mode.")} type="button"><Trash2 size={14} />Remove</button> : null}
          </article>) : <p>No open needed parts are recorded for this repair order.</p>}
          {editNeededParts ? <section className="parts-ro-add-needed" aria-label="Add needed part">
            <label><span>Part #</span><input onChange={(event) => setNeededPartDraft((draft) => ({ ...draft, partNumber: event.target.value }))} placeholder="Example: DOOR-GLASS-LH" value={neededPartDraft.partNumber} /></label>
            <label><span>Description</span><input onChange={(event) => setNeededPartDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Example: Left rear door glass" value={neededPartDraft.description} /></label>
            <label><span>Qty</span><input inputMode="numeric" min="1" onChange={(event) => setNeededPartDraft((draft) => ({ ...draft, quantity: event.target.value }))} type="number" value={neededPartDraft.quantity} /></label>
            <button disabled={busy} onClick={() => void addNeededPart()} type="button"><Plus size={14} />Add needed part</button>
          </section> : null}
        </div>
        <div className="parts-ro-actions">
          <button className="parts-ro-edit-button" disabled={busy} onClick={() => setEditNeededParts((value) => !value)} type="button"><Edit3 size={14} />{editNeededParts ? "Done editing" : "Edit needed parts"}</button>
          {groupedOrderingHref ? <Link className="parts-action-primary" href={groupedOrderingHref}>Order reviewed needed parts</Link> : null}
          {repeatedDemandIds.length ? <button disabled={busy} onClick={() => void cancelRepeatedDemandRecords()} type="button">{busy ? "Cancelling..." : "Cancel repeated records"}</button> : null}
          <Link href={partsHref("demand", initialRepairOrderId, returnTo, returnLabel)}>Review demand records</Link>
          {returnTo ? <Link href={returnTo}>{returnLabel ?? "Return to source workspace"}</Link> : null}
        </div>
      </section> : null}

      <section aria-label="Parts Operations KPIs" className="parts-operations-kpis">
        {kpiCards.map(({ href, icon: Icon, label, tone, value }) => (
          <Link className={`parts-kpi parts-tone-${tone}`} href={href} key={label}>
            <Icon size={21} /><span>{label}<strong>{value}</strong><small>Open live work</small></span><ChevronRight size={15} />
          </Link>
        ))}
      </section>

      <section className="parts-operations-panel parts-milestone-panel">
        <header><strong>Parts Milestones</strong><span><i className="success" />On track <i className="warning" />At risk <i className="danger" />Action needed</span></header>
        <div className="parts-milestones">
          {milestones.map(([label, value, tone], index) => (
            <div className="parts-milestone-wrap" key={label}>
              <Link className={`parts-milestone parts-state-${tone}`} href={partsHref(localTabs[Math.min(index + 1, localTabs.length - 1)][1], initialRepairOrderId, returnTo, returnLabel)}><span>{label}</span><strong>{value}</strong><i /></Link>
              {index < milestones.length - 1 ? <ArrowRight aria-hidden="true" size={14} /> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="parts-operations-primary-grid">
        <section className="parts-operations-panel parts-work-queue">
          <header><div><strong>Parts Work Queue</strong><span className="parts-segmented-control" role="group" aria-label="Parts work categories">{([["MY", "My Work"], ["TEAM", "Team"], ["EXCEPTIONS", "Exceptions"]] as const).map(([value, label]) => <button aria-pressed={queueView === value} className={queueView === value ? "active" : ""} key={value} onClick={() => setQueueView(value)} type="button">{label}</button>)}</span></div><small>{visibleQueue.length} visible</small></header>
          <div className="parts-table-scroll"><table><thead><tr><th>Type</th><th>Part # / Description</th><th>Repair Order / Job</th><th>Vehicle</th><th>Required By</th><th>Availability</th><th>Vendor / ETA</th><th>Reservation</th><th>Owner</th><th>Blocker</th><th>Action</th></tr></thead><tbody>
            {visibleQueue.map((row) => <tr key={row.id}><td><span className={`parts-status parts-status-${row.tone}`}>{row.kind}</span></td><td><strong>{row.part}</strong></td><td>{row.reference}</td><td>{row.vehicle}</td><td>{row.required}</td><td>{row.availability}</td><td>{row.vendorEta}</td><td>{row.reservation}</td><td>{row.owner}</td><td><span className={`parts-status parts-status-${row.tone}`}>{row.blocker}</span></td><td><Link href={row.href}>{row.action}</Link></td></tr>)}
          </tbody></table></div>
          {!visibleQueue.length ? <div className="parts-empty"><CheckCircle2 size={22} /><strong>No work matches this view</strong><span>Clear filters or open another local workspace.</span></div> : null}
          <p className="parts-advisory"><ShieldCheck size={14} /><strong>Recommendations are {initial.capability.recommendations.replaceAll("_", " ").toLowerCase()}.</strong> Authorized approval is required for purchase, substitution, transfer, adjustment, issue, installation, reconciliation, write-off, or policy exception.</p>
        </section>

        <section className="parts-operations-panel parts-approvals">
          <header><div><strong>Reviews &amp; Approvals</strong><span className="parts-segmented-control" role="group" aria-label="Review and approval categories"><button aria-pressed={approvalView === "REVIEWS"} className={approvalView === "REVIEWS" ? "active" : ""} onClick={() => setApprovalView("REVIEWS")} type="button">Reviews <b>{approvals.filter((item) => item.view === "REVIEWS").length}</b></button><button aria-pressed={approvalView === "APPROVALS"} className={approvalView === "APPROVALS" ? "active" : ""} onClick={() => setApprovalView("APPROVALS")} type="button">Approvals <b>{approvals.filter((item) => item.view === "APPROVALS").length}</b></button></span></div><Link href="/manager-review">View all</Link></header>
          <div className="parts-approval-table"><table><thead><tr><th>Item</th><th>Owner</th><th>Age</th><th>Amount</th><th>Action</th></tr></thead><tbody>{visibleApprovals.map((item) => <tr key={`${item.label}-${item.amount}`}><td><strong>{item.label}</strong></td><td>{item.owner}</td><td>{item.age}</td><td>{item.amount}</td><td><Link href={item.href}>{item.state}</Link></td></tr>)}</tbody></table></div>
          {!visibleApprovals.length ? <div className="parts-empty"><CheckCircle2 size={20} /><strong>No pending parts {approvalView.toLowerCase()}</strong><span>Restricted actions still enforce server-side authority.</span></div> : null}
        </section>
      </div>

      <section className="parts-operations-detail-grid">
        <article className="parts-operations-panel">
          <header><strong>Supply &amp; Availability</strong><Link href="/vehicles/parts-counter">Full inventory <ArrowRight size={13} /></Link></header>
          {["On Hand", "Allocated", "Available", "Ordered", "Damaged"].map((label) => {
            const key = label === "On Hand" ? "onHand" : label.toLowerCase() as keyof typeof balanceTotals;
            return <div className="parts-metric-row" key={label}><span>{label}</span><strong>{balanceTotals[key].toLocaleString()}</strong><i className={label === "Damaged" && balanceTotals.damaged ? "danger" : "success"} /></div>;
          })}
        </article>

        <article className="parts-operations-panel">
          <header><strong>Purchase Orders &amp; Receiving</strong><Link href="/vehicles/service-close-parts">View all <ArrowRight size={13} /></Link></header>
          {initial.service.purchaseOrders.slice(0, 5).map((order) => <div className="parts-metric-row parts-po-row" key={order.id}><span><strong>{order.purchaseOrderNumber}</strong><small>{order.vendor.name} · {order.location.name}</small></span><em>{order.status.replaceAll("_", " ")}</em><b>{money(order.orderedTotalCents)}</b></div>)}
          {!initial.service.purchaseOrders.length ? <div className="parts-empty compact"><PackageOpen size={18} /><span>No purchase orders recorded.</span></div> : null}
        </article>

        <article className="parts-operations-panel">
          <header><strong>Transfers &amp; Custody</strong><Link href="/vehicles/service-close-parts">View all <ArrowRight size={13} /></Link></header>
          {initial.service.transfers.slice(0, 5).map((transfer) => <div className="parts-metric-row" key={transfer.id}><span><strong>{transfer.transferNumber}</strong><small>{ageLabel(transfer.createdAt, renderedAt)} · controlled custody</small></span><em>{transfer.status.replaceAll("_", " ")}</em><i className={transfer.status === "DISCREPANCY" ? "danger" : "success"} /></div>)}
          {!initial.service.transfers.length ? <div className="parts-empty compact"><Truck size={18} /><span>No transfers recorded.</span></div> : null}
        </article>

        <article className="parts-operations-panel">
          <header><strong>Returns &amp; Recovery</strong><Link href="/vehicles/service-close-parts">View all <ArrowRight size={13} /></Link></header>
          {openRecoveries.slice(0, 5).map((recovery) => <div className="parts-metric-row parts-po-row" key={recovery.id}><span><strong>{recovery.type} · {recovery.part.partNumber}</strong><small>{recovery.vendor?.name ?? "Vendor pending"} · due {dateLabel(recovery.deadlineAt)}</small></span><em>{recovery.status}</em><b>{money(recovery.expectedCreditCents)}</b></div>)}
          {!openRecoveries.length ? <div className="parts-empty compact"><PackageCheck size={18} /><span>No recovery cases at risk.</span></div> : null}
        </article>

        <article className="parts-operations-panel parts-recommendation">
          <header><strong>Recommendation Explanation</strong><Link href="/vehicles/parts-counter">Full explanation <ArrowRight size={13} /></Link></header>
          {selectedRecommendation ? <div>
            <p><span>Selected</span><strong>{selectedRecommendation.part.partNumber} · {selectedRecommendation.stockLocation.code}</strong></p>
            <p><span>Recommendation</span><strong>{selectedRecommendation.type.replaceAll("_", " ")} · {selectedRecommendation.recommendedQuantity}</strong></p>
            <p><span>Why recommended</span><strong>{selectedRecommendation.reasonCodes.join(" · ") || "Policy and ledger evidence"}</strong></p>
            <p><span>Fitment evidence</span><strong>Not available in the current recommendation projection</strong></p>
            <p><span>Vendor comparison / ETA</span><strong>{initial.capability.vendorAdapters === "DISABLED" ? "Unavailable · vendor adapters disabled" : "Open sourcing evidence"}</strong></p>
            <p><span>Alternatives</span><strong>None supplied by the authoritative recommendation</strong></p>
            <p><span>Confidence</span><strong>{selectedRecommendation.confidence}</strong></p>
            <p><span>Uncertainty</span><strong>{selectedRecommendation.confidence === "HIGH" ? "Low · verify fitment and availability before approval" : "Material · human review required"}</strong></p>
            <p><span>Estimated value</span><strong>{money(selectedRecommendation.estimatedCostCents)}</strong></p>
            <p><span>Last refreshed</span><strong>{dateLabel(initial.generatedAt)}</strong></p>
          </div> : <div className="parts-empty"><RefreshCw size={20} /><strong>No open recommendation</strong><span>Run the governed analysis from Inventory Control.</span></div>}
        </article>
      </section>
    </section>
  );
}

