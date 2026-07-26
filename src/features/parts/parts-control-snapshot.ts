import type { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;

export type PartsControlSeverity = "danger" | "warning" | "ready";

export type PartsControlQueueItem = {
  action: string;
  detail: string;
  href: string;
  id: string;
  label: string;
  meta: string;
  severity: PartsControlSeverity;
};

export type PartsControlSnapshot = {
  actionQueue: PartsControlQueueItem[];
  counts: {
    duplicateRisk: number;
    lateOrderRisk: number;
    openDemand: number;
    openPurchaseOrders: number;
    recoveryRiskCents: number;
    unreservedDemand: number;
    unverifiedPartReview: number;
    unknownLocation: number;
  };
  leakageQueues: {
    duplicateRisk: PartsControlQueueItem[];
    lateOrderRisk: PartsControlQueueItem[];
    receivingExceptions: PartsControlQueueItem[];
    recoveryRisk: PartsControlQueueItem[];
    unverifiedPartReview: PartsControlQueueItem[];
    unknownLocation: PartsControlQueueItem[];
  };
};

const ACTIVE_DEMAND_STATUSES = new Set(["REQUESTED", "OPEN", "PARTIALLY_RESERVED"]);
const CLOSED_RECOVERY_STATUSES = new Set(["CREDITED", "WRITTEN_OFF"]);
const OPEN_PURCHASE_ORDER_STATUSES = new Set(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"]);
const ISSUE_OR_INSTALL_CUSTODY_TYPES = new Set(["ISSUE", "INSTALL"]);
const VENDOR_CUTOFF_REVIEW_HOURS = 24;
const VENDOR_ETA_BUFFER_HOURS = 2;

function partsOperationsHref(view: string) {
  return `/vehicles/parts-operations?view=${encodeURIComponent(view)}`;
}

function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function linePartIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const partId = "partId" in line && typeof line.partId === "string" ? line.partId : null;
    return partId ? [partId] : [];
  });
}

function objectId(value: unknown, key: string) {
  return value && typeof value === "object" && key in value && typeof value[key as keyof typeof value] === "string"
    ? value[key as keyof typeof value] as string
    : null;
}

function objectDate(value: unknown, key: string) {
  const raw = value && typeof value === "object" ? value[key as keyof typeof value] : null;
  if (!raw) return null;
  const date = new Date(raw as string | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function demandPartId(demand: Model["service"]["demands"][number]) {
  return objectId(demand, "partId") ?? normalizeKey(demand.part.partNumber);
}

function offerPartId(offer: unknown) {
  return objectId(offer, "partId") ?? (offer && typeof offer === "object" && "part" in offer && offer.part && typeof offer.part === "object" ? normalizeKey(objectId(offer.part, "partNumber")) : null);
}

function vendorName(value: unknown) {
  return value && typeof value === "object" && "vendor" in value && value.vendor && typeof value.vendor === "object" && "name" in value.vendor && typeof value.vendor.name === "string"
    ? value.vendor.name
    : "Vendor";
}

function nestedRecord(value: unknown, key: string) {
  return value && typeof value === "object" && key in value && value[key as keyof typeof value] && typeof value[key as keyof typeof value] === "object"
    ? value[key as keyof typeof value] as Record<string, unknown>
    : {};
}

function receiptRepairOrderNumber(receipt: Model["service"]["receipts"][number]) {
  return objectId(nestedRecord(nestedRecord(nestedRecord(receipt.purchaseOrder, "requisition"), "demand"), "repairOrder"), "repairOrderNumber") ?? "RO pending";
}

function receiptStockLocationLabel(receipt: Model["service"]["receipts"][number]) {
  const location = nestedRecord(receipt, "stockLocation");
  const code = objectId(location, "code");
  const name = objectId(location, "name");
  return [code, name].filter(Boolean).join(" - ") || "Exact bin not recorded";
}

function receiptPlacementLabel(receipt: Model["service"]["receipts"][number]) {
  const repairOrderNumber = receiptRepairOrderNumber(receipt);
  return repairOrderNumber === "RO pending" ? receiptStockLocationLabel(receipt) : `${repairOrderNumber} bin / ${receiptStockLocationLabel(receipt)}`;
}

function isPast(value: string | Date, now: Date) {
  return new Date(value).getTime() < now.getTime();
}

function hoursUntil(value: string | Date, now: Date) {
  return (new Date(value).getTime() - now.getTime()) / 3_600_000;
}

function earliestOfferForDemand(model: Model, demand: Model["service"]["demands"][number]) {
  const partId = demandPartId(demand);
  const selectedOffers = model.service.requisitions.flatMap((requisition) => {
    const requisitionDemandId = requisition && typeof requisition === "object" && "demand" in requisition && requisition.demand && typeof requisition.demand === "object" ? objectId(requisition.demand, "id") : null;
    const selectedOffer = requisition && typeof requisition === "object" && "selectedOffer" in requisition ? requisition.selectedOffer : null;
    return requisitionDemandId === demand.id && selectedOffer ? [selectedOffer] : [];
  });
  const eligibleOffers = model.service.offers.filter((offer) => offerPartId(offer) === partId);
  return [...selectedOffers, ...eligibleOffers]
    .map((offer) => ({ estimatedArrivalAt: objectDate(offer, "estimatedArrivalAt"), vendor: vendorName(offer) }))
    .filter((offer): offer is { estimatedArrivalAt: Date; vendor: string } => Boolean(offer.estimatedArrivalAt))
    .sort((a, b) => a.estimatedArrivalAt.getTime() - b.estimatedArrivalAt.getTime())[0] ?? null;
}

function evaluateLateOrderRisk(model: Model, demand: Model["service"]["demands"][number], now: Date, openPurchaseOrderPartIds: Set<string>): PartsControlQueueItem | null {
  const requiredAt = new Date(demand.requiredAt);
  if (Number.isNaN(requiredAt.getTime())) return null;
  const partId = demandPartId(demand);
  const hoursToRequired = hoursUntil(requiredAt, now);
  const bestOffer = earliestOfferForDemand(model, demand);
  const ordered = openPurchaseOrderPartIds.has(partId);
  const detail = `${demand.part.partNumber} - ${demand.part.description}`;
  const label = demand.repairOrder.repairOrderNumber;
  const reservation = `${demand.quantityReserved}/${demand.quantityRequired} reserved`;

  if (requiredAt.getTime() < now.getTime()) {
    return {
      action: "Escalate missed parts target",
      detail,
      href: partsOperationsHref("demand"),
      id: `late-${demand.id}`,
      label,
      meta: `${reservation} - required ${dateLabel(requiredAt)}`,
      severity: "danger",
    };
  }

  if (bestOffer && bestOffer.estimatedArrivalAt.getTime() > requiredAt.getTime()) {
    return {
      action: "Escalate vendor ETA past repair target",
      detail,
      href: partsOperationsHref("demand"),
      id: `vendor-eta-${demand.id}`,
      label,
      meta: `${bestOffer.vendor} ETA ${dateLabel(bestOffer.estimatedArrivalAt)} - required ${dateLabel(requiredAt)}`,
      severity: "danger",
    };
  }

  if (bestOffer && hoursUntil(requiredAt, bestOffer.estimatedArrivalAt) <= VENDOR_ETA_BUFFER_HOURS) {
    return {
      action: "Confirm vendor cutoff before repair promise",
      detail,
      href: partsOperationsHref("demand"),
      id: `vendor-cutoff-${demand.id}`,
      label,
      meta: `${bestOffer.vendor} ETA ${dateLabel(bestOffer.estimatedArrivalAt)} leaves less than ${VENDOR_ETA_BUFFER_HOURS}h buffer`,
      severity: "warning",
    };
  }

  if (!ordered && !bestOffer && hoursToRequired <= VENDOR_CUTOFF_REVIEW_HOURS) {
    return {
      action: "Confirm vendor cutoff before ordering",
      detail,
      href: partsOperationsHref("demand"),
      id: `vendor-cutoff-${demand.id}`,
      label,
      meta: `${reservation} - no vendor ETA recorded - required ${dateLabel(requiredAt)}`,
      severity: "warning",
    };
  }

  if (hoursToRequired <= 4) {
    return {
      action: ordered ? "Confirm ordered part will arrive in time" : "Order before promise risk",
      detail,
      href: partsOperationsHref("demand"),
      id: `late-${demand.id}`,
      label,
      meta: `${reservation} - required ${dateLabel(requiredAt)}`,
      severity: "warning",
    };
  }

  return null;
}

function activeDemand(demand: Model["service"]["demands"][number]) {
  return ACTIVE_DEMAND_STATUSES.has(demand.status);
}

export function buildPartsControlSnapshot(model: Model, now = new Date()): PartsControlSnapshot {
  const demands = model.service.demands.filter(activeDemand);
  const unreservedDemands = demands.filter((demand) => demand.quantityReserved < demand.quantityRequired);
  const openPurchaseOrders = model.service.purchaseOrders.filter((order) => OPEN_PURCHASE_ORDER_STATUSES.has(order.status));
  const openDiscrepancies = model.service.discrepancies.filter((item) => item.status === "OPEN");
  const openRecoveries = model.service.recoveries.filter((item) => !CLOSED_RECOVERY_STATUSES.has(item.status));
  const openPurchaseOrderPartIds = new Set(openPurchaseOrders.flatMap((order) => linePartIds(order.lines)));

  const demandGroups = new Map<string, typeof demands>();
  for (const demand of demands) {
    const key = `${normalizeKey(demand.repairOrder.repairOrderNumber)}:${normalizeKey(demand.part.partNumber)}`;
    const list = demandGroups.get(key) ?? [];
    list.push(demand);
    demandGroups.set(key, list);
  }

  const duplicateRisk = [
    ...Array.from(demandGroups.values())
      .filter((group) => group.length > 1)
      .map((group) => {
        const demand = group[0];
        return {
          action: "Review possible duplicate demand",
          detail: `${demand.part.partNumber} - ${demand.part.description}`,
          href: partsOperationsHref("demand"),
          id: `duplicate-demand-${demand.id}`,
          label: demand.repairOrder.repairOrderNumber,
          meta: `${group.length} active demands for the same RO and part`,
          severity: "danger" as const,
        };
      }),
    ...unreservedDemands
      .filter((demand) => openPurchaseOrderPartIds.has(demand.partId))
      .map((demand) => ({
        action: "Check existing open PO before ordering",
        detail: `${demand.part.partNumber} - ${demand.part.description}`,
        href: partsOperationsHref("purchase-orders"),
        id: `duplicate-po-${demand.id}`,
        label: demand.repairOrder.repairOrderNumber,
        meta: "A purchase order already contains this part",
        severity: "warning" as const,
      })),
  ].slice(0, 6);

  const lateOrderRisk = unreservedDemands
    .flatMap((demand) => evaluateLateOrderRisk(model, demand, now, openPurchaseOrderPartIds) ?? [])
    .slice(0, 6);

  const issuedOrInstalledReceiptLines = new Set(
    model.service.custodyEvents
      .filter((event) => ISSUE_OR_INSTALL_CUSTODY_TYPES.has(event.type))
      .map((event) => `${event.sourceType}:${event.sourceId}`),
  );

  const unverifiedPartReview = model.service.receipts
    .flatMap((receipt) => {
      const lines = Array.isArray(receipt.lines) ? receipt.lines : [];
      return lines.flatMap((line, index) => {
        if (!line || typeof line !== "object") return [];
        const sourceId = `${receipt.id}:${index}`;
        const issuedOrInstalled = issuedOrInstalledReceiptLines.has(`PART_RECEIPT_LINE:${sourceId}`);
        return issuedOrInstalled ? [] : [{
          action: "Review unverified received part",
          detail: `${receipt.purchaseOrder.purchaseOrderNumber} receipt line ${index + 1}`,
          href: partsOperationsHref("receiving"),
          id: `unverified-part-${sourceId}`,
          label: receiptRepairOrderNumber(receipt),
          meta: `Label: ${receiptPlacementLabel(receipt)} - received ${dateLabel(receipt.receivedAt)}`,
          severity: "warning" as const,
        }];
      });
    })
    .slice(0, 6);
  const unknownLocation = unverifiedPartReview;

  const receivingExceptions = openDiscrepancies.map((item) => ({
    action: "Resolve receiving exception",
    detail: item.type.replaceAll("_", " "),
    href: partsOperationsHref("receiving"),
    id: `discrepancy-${item.id}`,
    label: "Receipt discrepancy",
    meta: `Expected ${item.expectedQuantity} - received ${item.receivedQuantity}`,
    severity: "danger" as const,
  })).slice(0, 6);

  const recoveryRisk = openRecoveries.map((item) => ({
    action: isPast(item.deadlineAt, now) ? "Escalate overdue credit" : "Review return / recovery",
    detail: `${item.part.partNumber} - ${item.type.replaceAll("_", " ")}`,
    href: partsOperationsHref("returns-recovery"),
    id: `recovery-${item.id}`,
    label: item.vendor?.name ?? "Vendor pending",
    meta: `${money(item.expectedCreditCents)} expected - due ${dateLabel(item.deadlineAt)}`,
    severity: isPast(item.deadlineAt, now) ? "danger" as const : "warning" as const,
  })).slice(0, 6);

  const actionQueue = [
    ...duplicateRisk,
    ...lateOrderRisk,
    ...receivingExceptions,
    ...unknownLocation,
    ...recoveryRisk,
    ...unreservedDemands.slice(0, 4).map((demand) => ({
      action: demand.quantityReserved ? "Complete reservation" : "Source / reserve part",
      detail: `${demand.part.partNumber} - ${demand.part.description}`,
      href: partsOperationsHref("demand"),
      id: `demand-${demand.id}`,
      label: demand.repairOrder.repairOrderNumber,
      meta: `${demand.quantityReserved}/${demand.quantityRequired} reserved - due ${dateLabel(demand.requiredAt)}`,
      severity: isPast(demand.requiredAt, now) ? "danger" as const : "warning" as const,
    })),
  ].slice(0, 10);

  return {
    actionQueue,
    counts: {
      duplicateRisk: duplicateRisk.length,
      lateOrderRisk: lateOrderRisk.length,
      openDemand: demands.length,
      openPurchaseOrders: openPurchaseOrders.length,
      recoveryRiskCents: openRecoveries.reduce((sum, item) => sum + Math.max(0, item.expectedCreditCents - (item.actualCreditCents ?? 0)), 0),
      unreservedDemand: unreservedDemands.length,
      unverifiedPartReview: unverifiedPartReview.length,
      unknownLocation: unknownLocation.length,
    },
    leakageQueues: {
      duplicateRisk,
      lateOrderRisk,
      receivingExceptions,
      recoveryRisk,
      unverifiedPartReview,
      unknownLocation,
    },
  };
}
