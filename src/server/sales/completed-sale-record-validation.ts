import {
  salesConsoleRevenueLaneNames,
  type SalesConsoleRevenueLaneName
} from "@/features/sales/sales-console-operational-domain";
import type { SalesCompletionRequirementCode } from "@/features/sales/sales-console-m66-revenue-lane-completion-rules";

export type NormalizedCompletedSaleRecordRequest = {
  customerId: string;
  customerName: string;
  evidenceIds: string[];
  grossEstimateCents: number;
  idempotencyKey: string;
  managerId?: string;
  paymentPath: "cash" | "bhph" | "lease-to-own" | "finance" | "rental" | "repair" | "warranty" | "unknown";
  productLabel: string;
  reason: string;
  revenueLane: SalesConsoleRevenueLaneName;
  revenueOpportunityId: string;
  saleDate: string;
  salesOpportunityId: string;
  salespersonId: string;
  satisfied: SalesCompletionRequirementCode[];
  sourceRecordLinks: string[];
  vehicleStockNumber?: string;
};

const paymentPaths = ["cash", "bhph", "lease-to-own", "finance", "rental", "repair", "warranty", "unknown"] as const;

function readRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function optionalString(value: unknown, label: string, maxLength = 200) {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, label, maxLength);
}

function requiredNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return Math.round(value);
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} must be a list of strings.`);
  }

  return value.map((item) => item.trim());
}

function normalizeRevenueLane(value: unknown) {
  const normalized = requiredString(value, "Revenue lane", 80);
  if (!salesConsoleRevenueLaneNames.includes(normalized as SalesConsoleRevenueLaneName)) {
    throw new Error("Revenue lane is not supported by Sales Console.");
  }

  return normalized as SalesConsoleRevenueLaneName;
}

function normalizePaymentPath(value: unknown) {
  const normalized = requiredString(value, "Payment path", 40);
  if (!paymentPaths.includes(normalized as (typeof paymentPaths)[number])) {
    throw new Error("Payment path is not supported by Sales Console.");
  }

  return normalized as NormalizedCompletedSaleRecordRequest["paymentPath"];
}

export function normalizeCompletedSaleRecordRequest(value: unknown): NormalizedCompletedSaleRecordRequest {
  const record = readRecord(value, "Completed sale record request");

  return {
    customerId: requiredString(record.customerId, "Customer ID"),
    customerName: requiredString(record.customerName, "Customer name"),
    evidenceIds: stringArray(record.evidenceIds, "Evidence IDs"),
    grossEstimateCents: requiredNumber(record.grossEstimateCents, "Gross estimate cents"),
    idempotencyKey: requiredString(record.idempotencyKey, "Idempotency key"),
    managerId: optionalString(record.managerId, "Manager ID"),
    paymentPath: normalizePaymentPath(record.paymentPath),
    productLabel: requiredString(record.productLabel, "Product label"),
    reason: requiredString(record.reason, "Reason", 500),
    revenueLane: normalizeRevenueLane(record.revenueLane),
    revenueOpportunityId: requiredString(record.revenueOpportunityId, "Revenue opportunity ID"),
    saleDate: requiredString(record.saleDate, "Sale date", 20),
    salesOpportunityId: requiredString(record.salesOpportunityId, "Sales opportunity ID"),
    salespersonId: requiredString(record.salespersonId, "Salesperson ID"),
    satisfied: stringArray(record.satisfied, "Satisfied requirements") as SalesCompletionRequirementCode[],
    sourceRecordLinks: stringArray(record.sourceRecordLinks, "Source record links"),
    vehicleStockNumber: optionalString(record.vehicleStockNumber, "Vehicle stock number")
  };
}

export function completedSaleRecordValidationRequiresEvidence(value: unknown) {
  try {
    return normalizeCompletedSaleRecordRequest(value).evidenceIds.length > 0;
  } catch {
    return false;
  }
}
