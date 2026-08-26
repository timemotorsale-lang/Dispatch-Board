import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_CONTRACT_VERSION,
  UnifiedCrmPerformanceObservabilityError,
  type UnifiedCrmPerformanceObservabilityCheck,
  type UnifiedCrmPerformanceObservabilityReadModel
} from "@/server/unified-crm/performance-observability-contract";

type Dependencies = {
  now?: () => Date;
};

const TARGETS = {
  dashboardReconciliationMs: 1_500,
  globalSearchMs: 800,
  pageInteractionMs: 1_000
} as const;

const CHECKS: UnifiedCrmPerformanceObservabilityCheck[] = [
  {
    category: "queryBudgets",
    evidence: "Dashboard reconciliation records measured query time against a 1500ms budget.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "freshnessLag",
    evidence: "CRM dashboard/search/reconciliation read models expose generatedAt, observedAt, and newest-record timestamps.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "correlation",
    evidence: "CRM mutating command paths preserve idempotency keys/request hashes for traceable retries.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "slos",
    evidence: "Final SLO acceptance must be run against representative release-candidate data volume.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "dataVolumes",
    evidence: "Representative CRM data-volume fixture remains pending for the release candidate.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "pageLatency",
    evidence: "Authenticated CRM page latency proof remains pending in browser automation.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "searchLatency",
    evidence: "Global search latency must be measured against representative data volume before pilot go/no-go.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "structuredLogs",
    evidence: "Structured log review and sensitive-field redaction proof remain pending.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "alerts",
    evidence: "Operational alert routing for CRM latency/error/freshness remains pending.",
    holdOwner: "operations",
    status: "HOLD"
  }
];

export async function getUnifiedCrmPerformanceObservability(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPerformanceObservabilityReadModel> {
  if (!actor) {
    throw new UnifiedCrmPerformanceObservabilityError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM performance and observability verification.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPerformanceObservabilityError(
      "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED",
      "CRM performance and observability verification is available to the manager workspace."
    );
  }
  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    targets: TARGETS,
    visibility: "management"
  };
}
