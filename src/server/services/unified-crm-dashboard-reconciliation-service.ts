import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmDashboardReconciliationRepository,
  type UnifiedCrmDashboardReconciliationRepository,
  type UnifiedCrmDashboardReconciliationRow
} from "@/server/repositories/unified-crm-dashboard-reconciliation-repository";
import {
  UNIFIED_CRM_DASHBOARD_RECONCILIATION_CONTRACT_VERSION,
  UnifiedCrmDashboardReconciliationError,
  type UnifiedCrmDashboardReconciliationCheck,
  type UnifiedCrmDashboardReconciliationMetric,
  type UnifiedCrmDashboardReconciliationMetricId,
  type UnifiedCrmDashboardReconciliationReadModel,
  type UnifiedCrmDashboardReconciliationStatus
} from "@/server/unified-crm/dashboard-reconciliation-contract";

type Dependencies = {
  now?: () => Date;
  performanceBudgetMs?: number;
  repository?: UnifiedCrmDashboardReconciliationRepository;
};

const METRICS: Array<{ href: string; id: UnifiedCrmDashboardReconciliationMetricId; label: string }> = [
  { href: "/crm?view=work", id: "ownedWork", label: "Team work" },
  { href: "/crm/opportunities/queue?crmReturnTo=%2Fcrm", id: "overdueFollowUp", label: "Overdue follow-up" },
  { href: "/crm?view=pipeline", id: "pipeline", label: "Pipeline" },
  { href: "/crm/quotes?crmReturnTo=%2Fcrm", id: "quotes", label: "Quotes" },
  { href: "/crm/opportunities?crmReturnTo=%2Fcrm", id: "dispatchHandoffs", label: "Dispatch handoffs" }
];

function status(checks: UnifiedCrmDashboardReconciliationCheck[]): UnifiedCrmDashboardReconciliationStatus {
  if (checks.some((check) => check.status === "FAIL")) return "FAIL";
  if (checks.some((check) => check.status === "WARN")) return "WARN";
  return "PASS";
}

function isMasked(row: UnifiedCrmDashboardReconciliationRow) {
  return !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(row.label) && !/\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/.test(row.label);
}

export async function getUnifiedCrmDashboardReconciliation(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmDashboardReconciliationReadModel> {
  if (!actor) {
    throw new UnifiedCrmDashboardReconciliationError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM dashboard reconciliation.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmDashboardReconciliationError(
      "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED",
      "CRM dashboard reconciliation is available to the manager workspace."
    );
  }

  const repository = dependencies.repository ?? createUnifiedCrmDashboardReconciliationRepository();
  const now = dependencies.now?.() ?? new Date();
  const startedAt = Date.now();

  try {
    const organizationIds = await repository.listActiveOrganizationIds(actor.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmDashboardReconciliationError(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "CRM dashboard reconciliation is not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmDashboardReconciliationError(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before reconciling CRM dashboards."
      );
    }

    const rows = await repository.listRows({ now, organizationId: organizationIds[0], sampleLimit: 5 });
    const queryTimeMs = Math.max(0, Date.now() - startedAt);
    const metrics: UnifiedCrmDashboardReconciliationMetric[] = METRICS.map((metric) => {
      const samples = rows.filter((row) => row.metricId === metric.id);
      return {
        ...metric,
        count: samples.length,
        samples: samples.map((row) => ({
          entity: row.entity,
          href: row.href,
          id: row.id,
          label: row.label,
          updatedAt: row.updatedAt.toISOString()
        }))
      };
    });
    const newestUpdatedAt = rows.reduce<Date | null>((latest, row) =>
      latest && latest > row.updatedAt ? latest : row.updatedAt, null);
    const checks: UnifiedCrmDashboardReconciliationCheck[] = [
      {
        detail: newestUpdatedAt ? `Newest reconciled CRM record changed at ${newestUpdatedAt.toISOString()}.` : "No active CRM records currently require dashboard reconciliation.",
        id: "freshness",
        status: "PASS"
      },
      {
        detail: "Every reconciliation metric exposes a manager-safe drill-through href and sampled source records.",
        id: "drillThrough",
        status: metrics.every((metric) => metric.href.startsWith("/crm") && metric.samples.every((sample) => sample.href.startsWith("/crm"))) ? "PASS" : "FAIL"
      },
      {
        detail: "Sample labels are restricted to operational labels and avoid email/phone contact payloads.",
        id: "masking",
        status: rows.every(isMasked) ? "PASS" : "FAIL"
      },
      {
        detail: `Reconciliation query completed in ${queryTimeMs}ms.`,
        id: "performance",
        status: queryTimeMs <= (dependencies.performanceBudgetMs ?? 1_500) ? "PASS" : "WARN"
      },
      {
        detail: "The gate is manager-only and returns organization-scoped evidence.",
        id: "managerWorkflow",
        status: "PASS"
      }
    ];

    return {
      checks,
      contractVersion: UNIFIED_CRM_DASHBOARD_RECONCILIATION_CONTRACT_VERSION,
      generatedAt: now.toISOString(),
      metrics,
      queryTimeMs,
      state: status(checks),
      visibility: "organization"
    };
  } catch (error) {
    if (error instanceof UnifiedCrmDashboardReconciliationError) throw error;
    throw new UnifiedCrmDashboardReconciliationError(
      "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE",
      "CRM dashboard reconciliation is temporarily unavailable.",
      { cause: error }
    );
  }
}
