import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { UNIFIED_CRM_ADVANCED_FORECASTING_CONTRACT_VERSION, UnifiedCrmAdvancedForecastingError, type UnifiedCrmAdvancedForecastingCheck, type UnifiedCrmAdvancedForecastingReadModel } from "@/server/unified-crm/advanced-forecasting-contract";

type Dependencies = { now?: () => Date };
const CHECKS: UnifiedCrmAdvancedForecastingCheck[] = [
  { category: "explainability", evidence: "Forecasts must show source facts, weight/reason labels, confidence, and excluded assumptions.", holdOwner: "product-owner", status: "HOLD" },
  { category: "sourceFreshness", evidence: "Advanced forecasts must expose source freshness and refuse stale source data as current.", holdOwner: null, status: "PASS" },
  { category: "historicalEvaluation", evidence: "Backtesting against historical outcomes is required before predictive or attribution claims are enabled.", holdOwner: "quality", status: "HOLD" },
  { category: "overrideSeparation", evidence: "Human overrides must remain separate from model/system forecast output with actor, reason, and timestamp.", holdOwner: null, status: "PASS" },
  { category: "biasErrorReview", evidence: "Bias, systematic error, edge cases, and adoption impact review remain pending.", holdOwner: "quality", status: "HOLD" },
  { category: "deterministicFallback", evidence: "Existing deterministic forecast baseline remains the fallback whenever advanced forecasting is disabled or stale.", holdOwner: null, status: "PASS" },
  { category: "approval", evidence: "Predictive forecasting and attribution activation requires Product Owner approval and browser proof.", holdOwner: "product-owner", status: "HOLD" }
];

export async function getUnifiedCrmAdvancedForecasting(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmAdvancedForecastingReadModel> {
  if (!actor) throw new UnifiedCrmAdvancedForecastingError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM advanced forecasting readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmAdvancedForecastingError("ADVANCED_FORECASTING_NOT_AUTHORIZED", "CRM advanced forecasting readiness is available to the manager workspace.");
  return {
    activation: { attributionEnabled: false, predictiveForecastingEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_ADVANCED_FORECASTING_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "existing-deterministic-forecast-baseline", featureControl: "crm.enterprise.advancedForecasting.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
