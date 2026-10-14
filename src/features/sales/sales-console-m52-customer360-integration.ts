import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";
import { withSalesConsoleReturnTo } from "./sales-console-cross-console-integration";

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

export type SalesLeadPipelineOrchestration = {
  customerId: string;
  customerName: string;
  leadQualificationScore: number;
  funnelStage: "new" | "contacted" | "qualified" | "proposal" | "manager-review" | "blocked" | "dormant";
  customerHistoryWeight: number;
  buyingIntentScore: number;
  dormantLead: boolean;
  repeatBuyerOpportunity: boolean;
  missingDocumentBlockers: string[];
  openPromiseRisks: string[];
  followUpRecommendation: string;
  sourceVerification: "verified" | "verify-first" | "stale" | "blocked";
  sourceLink: string;
  safeActions: string[];
  governedActions: string[];
};

export const salesCustomer360Integration = {
  sourceOwner: "CRM / Customers",
  readRoutes: ["/customers/customer-360", "/api/customers/rollout", "/api/customer-lifecycle"],
  governedWrites: ["change customer identity", "change consent", "merge customer", "send customer message"],
  allowedSalesConsoleActions: ["view context", "add internal sales note", "log internal sales activity"]
} as const;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveFunnelStage(source: SalesCustomer360SourceRecord, freshness: SalesConsoleFreshness): SalesLeadPipelineOrchestration["funnelStage"] {
  const timeline = source.timelineSummary.join(" ").toLowerCase();

  if (source.documentSummary.some((document) => document.status === "missing") || source.openCases.length > 0) return "blocked";
  if (freshness === "stale") return "dormant";
  if (timeline.includes("manager review")) return "manager-review";
  if (timeline.includes("proposal") || timeline.includes("final numbers")) return "proposal";
  if (source.activeRevenueLanes.length > 0 || timeline.includes("qualified")) return "qualified";
  if (timeline.includes("appointment") || timeline.includes("contact")) return "contacted";

  return "new";
}

export function orchestrateSalesCustomer360LeadPipeline(
  source: SalesCustomer360SourceRecord,
  now = new Date()
): SalesLeadPipelineOrchestration {
  const mapped = mapSalesCustomer360(source, now);
  const missingDocumentBlockers = source.documentSummary.filter((document) => document.status === "missing").map((document) => document.label);
  const openPromiseRisks = source.promiseSummary.filter((promise) => promise.status === "open" || promise.status === "missed").map((promise) => promise.label);
  const customerHistoryWeight = Math.min(25, source.timelineSummary.length * 4 + source.activeOpportunityIds.length * 3);
  const buyingIntentScore =
    source.activeOpportunityIds.length * 12 +
    source.activeRevenueLanes.length * 10 +
    (source.promiseSummary.length ? 10 : 0) +
    (source.timelineSummary.some((event) => event.toLowerCase().includes("appointment")) ? 12 : 0) +
    (source.timelineSummary.some((event) => event.toLowerCase().includes("vehicle")) ? 10 : 0);
  const blockerPenalty = missingDocumentBlockers.length * 12 + source.openCases.length * 8 + (mapped.freshness === "stale" ? 18 : 0);
  const leadQualificationScore = clampScore(35 + customerHistoryWeight + buyingIntentScore - blockerPenalty);
  const funnelStage = deriveFunnelStage(source, mapped.freshness);
  const dormantLead = mapped.freshness === "stale" || source.timelineSummary.some((event) => event.toLowerCase().includes("dormant"));
  const repeatBuyerOpportunity = source.timelineSummary.some((event) => event.toLowerCase().includes("purchase")) || source.activeOpportunityIds.length > 1;
  const sourceVerification: SalesLeadPipelineOrchestration["sourceVerification"] =
    missingDocumentBlockers.length > 0 || source.openCases.length > 0
      ? "blocked"
      : mapped.freshness === "stale"
        ? "stale"
        : source.consentStatus === "verified"
          ? "verified"
          : "verify-first";
  const followUpRecommendation =
    missingDocumentBlockers.length > 0
      ? `Resolve customer blocker: ${missingDocumentBlockers[0]}`
      : openPromiseRisks.length > 0
        ? `Follow up on promise: ${openPromiseRisks[0]}`
        : dormantLead
          ? "Re-verify Customer 360 and restart contact cadence"
          : repeatBuyerOpportunity
            ? "Review repeat-buyer opportunity and matching revenue lane"
            : "Advance lead to next qualified sales step";

  return {
    customerId: source.customerId,
    customerName: source.displayName,
    leadQualificationScore,
    funnelStage,
    customerHistoryWeight,
    buyingIntentScore: clampScore(buyingIntentScore),
    dormantLead,
    repeatBuyerOpportunity,
    missingDocumentBlockers,
    openPromiseRisks,
    followUpRecommendation,
    sourceVerification,
    sourceLink: mapped.sourceLink,
    safeActions: ["open Customer 360", "open sales context", "request manager review when eligible"],
    governedActions: ["customer messaging", "identity changes", "consent changes", "CRM merge"]
  };
}

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
    sourceLink: withSalesConsoleReturnTo(source.sourceRoute),
    freshness,
    crmWriteEnabled: false,
    writeAuthority: "CRM / Customers"
  };
}

export function salesCustomer360PreservesCrmAuthority(viewModel: SalesCustomer360ViewModel) {
  return viewModel.writeAuthority === "CRM / Customers" && viewModel.crmWriteEnabled === false;
}
