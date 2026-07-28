import { type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleReportingMetric = "appointments" | "deals" | "inventory-risk" | "leads" | "units";

export type SalesConsoleStoreReportingRow = {
  aggregationRule: string;
  freshness: "current" | "stale" | "verify-first";
  metric: SalesConsoleReportingMetric;
  restricted: boolean;
  storeId: string;
  value: string;
  visibleTo: SalesConsoleEnterpriseRole[];
};

export type SalesConsoleMultiStoreReportingReadModel = {
  exportEnabled: false;
  guardrails: string[];
  readOnly: true;
  rows: SalesConsoleStoreReportingRow[];
};

export const salesConsoleMultiStoreReportingReadModel = {
  exportEnabled: false,
  guardrails: [
    "Multi-store reporting is read-only and export-disabled until explicit approval.",
    "Store managers can see only assigned store data; owners/admins can see all configured stores.",
    "Every report row must show aggregation rule and freshness.",
    "Restricted financial or cross-store data remains role-limited."
  ],
  readOnly: true,
  rows: [
    {
      aggregationRule: "Count active assigned lead records by store for current selling day.",
      freshness: "current",
      metric: "leads",
      restricted: false,
      storeId: "time-motor-sales-main",
      value: "42",
      visibleTo: ["sales-manager", "admin-owner"]
    },
    {
      aggregationRule: "Count active deal desk rows by assigned store and stage.",
      freshness: "current",
      metric: "deals",
      restricted: false,
      storeId: "time-motor-sales-main",
      value: "18",
      visibleTo: ["sales-manager", "admin-owner"]
    },
    {
      aggregationRule: "Count verify-first inventory rows by store.",
      freshness: "verify-first",
      metric: "inventory-risk",
      restricted: false,
      storeId: "time-motor-sales-main",
      value: "6",
      visibleTo: ["sales-manager", "admin-owner"]
    },
    {
      aggregationRule: "Aggregate unit forecast by all configured stores.",
      freshness: "stale",
      metric: "units",
      restricted: true,
      storeId: "all-stores",
      value: "148",
      visibleTo: ["admin-owner"]
    }
  ]
} as const satisfies SalesConsoleMultiStoreReportingReadModel;

export function multiStoreReportingIsReadOnly(readModel = salesConsoleMultiStoreReportingReadModel) {
  return readModel.readOnly === true && readModel.exportEnabled === false;
}

export function reportingRowsHaveAggregationAndFreshness(readModel = salesConsoleMultiStoreReportingReadModel) {
  return readModel.rows.every((row) => row.aggregationRule.length > 0 && row.freshness.length > 0);
}

export function unauthorizedStoreVisibilityIsBlocked(readModel = salesConsoleMultiStoreReportingReadModel) {
  return readModel.rows
    .filter((row) => row.storeId === "all-stores" || row.restricted)
    .every((row) => {
      const visibleTo: readonly SalesConsoleEnterpriseRole[] = row.visibleTo;
      return visibleTo.includes("admin-owner") && !visibleTo.includes("salesperson") && !visibleTo.includes("bdc-lead-coordinator");
    });
}

export function reportingExportsRemainDisabled(readModel = salesConsoleMultiStoreReportingReadModel) {
  return readModel.exportEnabled === false;
}
