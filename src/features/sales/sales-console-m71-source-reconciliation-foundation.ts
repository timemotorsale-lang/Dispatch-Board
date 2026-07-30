import type {
  CompletedSaleRecord,
  SalesConsoleRecordOwner,
  SourceReconciliationRecord,
  SourceReconciliationStatus
} from "./sales-console-m50-record-command-contract";
import { salesConsoleSampleSalesBookRecords } from "./sales-console-m70-sales-book-ledger-view";

export type SalesSourceSnapshot = {
  customerId?: string;
  customerName?: string;
  vehicleStockNumber?: string;
  inventoryStatus?: "available" | "pending" | "sold" | "unavailable" | "unknown";
  grossEstimateCents?: number;
  financeStatus?: "not-needed" | "pending" | "approved" | "declined" | "unknown";
  deliveryStatus?: "not-started" | "ready" | "complete" | "blocked" | "unknown";
  rentalStatus?: "not-rental" | "available" | "checked-out" | "returned" | "unknown";
  serviceStatus?: "not-service" | "estimate" | "authorized" | "closed" | "unknown";
  warrantyStatus?: "not-warranty" | "eligible" | "authorized" | "registered" | "unknown";
  duplicateSaleRecordIds?: string[];
};

export type SalesSourceMismatchCode =
  | "missing-customer-link"
  | "customer-mismatch"
  | "missing-vehicle-link"
  | "vehicle-mismatch"
  | "gross-mismatch"
  | "inventory-not-sold"
  | "finance-status-open"
  | "delivery-incomplete"
  | "rental-status-open"
  | "service-status-open"
  | "warranty-status-open"
  | "duplicate-sale-record";

export type SalesSourceReconciliationDecision = {
  status: SourceReconciliationStatus;
  mismatchCodes: SalesSourceMismatchCode[];
  sourceOwners: SalesConsoleRecordOwner[];
  routingLabel: string;
  sourceCorrectionWriteEnabled: false;
};

function addMismatch(
  codes: SalesSourceMismatchCode[],
  owners: Set<SalesConsoleRecordOwner>,
  code: SalesSourceMismatchCode,
  owner: SalesConsoleRecordOwner
) {
  codes.push(code);
  owners.add(owner);
}

export function evaluateSalesSourceReconciliation(
  record: CompletedSaleRecord,
  snapshot: SalesSourceSnapshot
): SalesSourceReconciliationDecision {
  const mismatchCodes: SalesSourceMismatchCode[] = [];
  const sourceOwners = new Set<SalesConsoleRecordOwner>(["Sales Console Internal"]);

  if (!record.sourceRecordLinks.some((link) => link.includes("customer"))) addMismatch(mismatchCodes, sourceOwners, "missing-customer-link", "CRM / Customers");
  if (snapshot.customerId && snapshot.customerId !== record.customerId) addMismatch(mismatchCodes, sourceOwners, "customer-mismatch", "CRM / Customers");

  if (record.revenueLane.startsWith("Inventory") && !record.vehicleStockNumber) {
    addMismatch(mismatchCodes, sourceOwners, "missing-vehicle-link", "Inventory / Vehicles");
  }
  if (snapshot.vehicleStockNumber && snapshot.vehicleStockNumber !== record.vehicleStockNumber) {
    addMismatch(mismatchCodes, sourceOwners, "vehicle-mismatch", "Inventory / Vehicles");
  }
  if (typeof snapshot.grossEstimateCents === "number" && Math.abs(snapshot.grossEstimateCents - record.grossEstimateCents) > 100) {
    addMismatch(mismatchCodes, sourceOwners, "gross-mismatch", "DMS");
  }
  if (record.revenueLane.startsWith("Inventory") && snapshot.inventoryStatus && snapshot.inventoryStatus !== "sold") {
    addMismatch(mismatchCodes, sourceOwners, "inventory-not-sold", "Inventory / Vehicles");
  }
  if ((record.paymentPath === "bhph" || record.paymentPath === "finance" || record.paymentPath === "lease-to-own") && snapshot.financeStatus !== "approved") {
    addMismatch(mismatchCodes, sourceOwners, "finance-status-open", "Finance");
  }
  if (snapshot.deliveryStatus && snapshot.deliveryStatus !== "complete") {
    addMismatch(mismatchCodes, sourceOwners, "delivery-incomplete", "DMS");
  }
  if (record.revenueLane === "Daily Rental" && snapshot.rentalStatus !== "returned") {
    addMismatch(mismatchCodes, sourceOwners, "rental-status-open", "Rental");
  }
  if (record.revenueLane === "Public Auto Repair" && snapshot.serviceStatus !== "closed") {
    addMismatch(mismatchCodes, sourceOwners, "service-status-open", "Service / Repair");
  }
  if (record.revenueLane === "Warranty Product" && snapshot.warrantyStatus !== "registered") {
    addMismatch(mismatchCodes, sourceOwners, "warranty-status-open", "Warranty");
  }
  if (snapshot.duplicateSaleRecordIds?.length) {
    addMismatch(mismatchCodes, sourceOwners, "duplicate-sale-record", "Sales Console Internal");
  }

  const status: SourceReconciliationStatus =
    mismatchCodes.length === 0
      ? "source-verified"
      : mismatchCodes.includes("duplicate-sale-record")
        ? "needs-manager-review"
        : "needs-source-owner-correction";

  return {
    status,
    mismatchCodes,
    sourceOwners: [...sourceOwners],
    routingLabel: mismatchCodes.length === 0
      ? "Source verified"
      : `Route ${mismatchCodes.length} mismatch${mismatchCodes.length === 1 ? "" : "es"} to ${[...sourceOwners].filter((owner) => owner !== "Sales Console Internal").join(", ") || "Sales Manager"}`,
    sourceCorrectionWriteEnabled: false
  };
}

export function buildSourceReconciliationRecord(
  record: CompletedSaleRecord,
  snapshot: SalesSourceSnapshot
): SourceReconciliationRecord {
  const decision = evaluateSalesSourceReconciliation(record, snapshot);

  return {
    id: `REC-${record.id}`,
    completedSaleRecordId: record.id,
    status: decision.status,
    sourceOwners: decision.sourceOwners,
    sourceRecordLinks: record.sourceRecordLinks,
    mismatchCodes: decision.mismatchCodes,
    routingLabel: decision.routingLabel,
    sourceCorrectionWriteEnabled: false,
    audit: {
      actorId: "SYSTEM",
      actorRole: "Admin / Owner",
      storeId: "TMS-001",
      occurredAt: "2026-07-30T18:00:00.000Z",
      commandId: `REC-${record.id}`,
      correlationId: `CORR-${record.id}`,
      idempotencyKey: `IDEMP-REC-${record.id}`,
      sourceLink: "/sales"
    }
  };
}

export const salesConsoleSampleReconciliationQueue = salesConsoleSampleSalesBookRecords.map((record) =>
  buildSourceReconciliationRecord(record, {
    customerId: record.customerId,
    vehicleStockNumber: record.vehicleStockNumber,
    grossEstimateCents: record.id === "SALE-M70-1002" ? record.grossEstimateCents + 50000 : record.grossEstimateCents,
    inventoryStatus: record.revenueLane.startsWith("Inventory") ? "pending" : "unknown",
    financeStatus: record.paymentPath === "bhph" ? "pending" : "not-needed",
    deliveryStatus: "not-started",
    warrantyStatus: record.revenueLane === "Warranty Product" ? "eligible" : "not-warranty"
  })
);

export function sourceReconciliationNeverWritesToSourceSystems() {
  return salesConsoleSampleReconciliationQueue.every((record) => record.sourceCorrectionWriteEnabled === false);
}
