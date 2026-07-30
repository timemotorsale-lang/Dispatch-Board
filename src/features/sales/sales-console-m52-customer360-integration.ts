import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";

export type SalesCustomer360SourceRecord = {
  customerId: string;
  displayName: string;
  preferredContact: "phone" | "email" | "text" | "in-person" | "unknown";
  consentStatus: "verified" | "missing" | "restricted" | "unknown";
  activeOpportunityIds: string[];
  activeRevenueLanes: SalesConsoleRevenueLaneName[];
  openCases: Array<{ caseId: string; label: string; ownerSystem: "CRM / Customers" | "Service / Repairs" | "Finance" }>;
  timelineSummary: string[];
  documentSummary: Array<{ label: string; status: "missing" | "received" | "verified" }>;
  promiseSummary: Array<{ label: string; dueAt: string; status: "open" | "kept" | "missed" }>;
  sourceRoute: string;
  updatedAt: string;
};

export type SalesCustomer360ViewModel = {
  id: string;
  identityLabel: string;
  consentLabel: string;
  activeOpportunityCount: number;
  activeRevenueLanes: SalesConsoleRevenueLaneName[];
  openCaseCount: number;
  timelinePreview: string[];
  documentsAndPromises: string[];
  sourceLink: string;
  freshness: SalesConsoleFreshness;
  crmWriteEnabled: false;
  writeAuthority: "CRM / Customers";
};

export const salesCustomer360Integration = {
  sourceOwner: "CRM / Customers",
  readRoutes: ["/customers/customer-360", "/api/customers/rollout", "/api/customer-lifecycle"],
  governedWrites: ["change customer identity", "change consent", "merge customer", "send customer message"],
  allowedSalesConsoleActions: ["view context", "add internal sales note", "log internal sales activity"]
} as const;

export function mapSalesCustomer360(source: SalesCustomer360SourceRecord, now = new Date()): SalesCustomer360ViewModel {
  const ageMs = now.getTime() - new Date(source.updatedAt).getTime();
  const freshness: SalesConsoleFreshness = ageMs > 1000 * 60 * 60 * 12 ? "stale" : "current";

  return {
    id: source.customerId,
    identityLabel: source.displayName,
    consentLabel: `${source.preferredContact} · ${source.consentStatus}`,
    activeOpportunityCount: source.activeOpportunityIds.length,
    activeRevenueLanes: source.activeRevenueLanes,
    openCaseCount: source.openCases.length,
    timelinePreview: source.timelineSummary.slice(0, 3),
    documentsAndPromises: [
      ...source.documentSummary.map((document) => `${document.label}: ${document.status}`),
      ...source.promiseSummary.map((promise) => `${promise.label}: ${promise.status}`)
    ],
    sourceLink: source.sourceRoute,
    freshness,
    crmWriteEnabled: false,
    writeAuthority: "CRM / Customers"
  };
}

export function salesCustomer360PreservesCrmAuthority(viewModel: SalesCustomer360ViewModel) {
  return viewModel.writeAuthority === "CRM / Customers" && viewModel.crmWriteEnabled === false;
}
