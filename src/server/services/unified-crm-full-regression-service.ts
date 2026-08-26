import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_FULL_REGRESSION_CONTRACT_VERSION,
  UnifiedCrmFullRegressionError,
  type UnifiedCrmFullRegressionCheck,
  type UnifiedCrmFullRegressionReadModel
} from "@/server/unified-crm/full-regression-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmFullRegressionCheck[] = [
  {
    category: "schemaGeneration",
    evidence: "Prisma schema validation and deployable additive CRM migrations have passed through UCRM-055.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "lint",
    evidence: "Focused CRM milestone source and tests pass lint with max warnings set to zero.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "unit",
    evidence: "Focused CRM service/route/component unit suites pass for implemented CRM milestones.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "integration",
    evidence: "Database-backed CRM integration proofs pass for global search, forecast history, saved views, dashboard reconciliation, and pilot-load rehearsal.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "policy",
    evidence: "Manager-only, owner-scoped, idempotency, duplicate, and safe-error policy paths are covered by focused CRM tests.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "typecheck",
    evidence: "Source-filtered typecheck is clear after fixing service intake and shop-planning result typing; full typecheck remains held by stale AppData Next validator includes.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "productionBuild",
    evidence: "Production build is held until Prisma generation and Next generated type cache are proven clean on the release-candidate workspace.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "crmBrowser",
    evidence: "Authenticated CRM browser regression suite remains pending for the release candidate.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "dispatchRegression",
    evidence: "Impacted Dispatch Board regression remains pending after CRM gates are consolidated on the release-candidate commit.",
    holdOwner: "engineering",
    status: "HOLD"
  }
];

export async function getUnifiedCrmFullRegression(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmFullRegressionReadModel> {
  if (!actor) {
    throw new UnifiedCrmFullRegressionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM full regression verification.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmFullRegressionError(
      "FULL_REGRESSION_NOT_AUTHORIZED",
      "CRM full regression verification is available to the manager workspace."
    );
  }
  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_FULL_REGRESSION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    visibility: "management"
  };
}
