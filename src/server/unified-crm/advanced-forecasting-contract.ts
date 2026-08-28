export const UNIFIED_CRM_ADVANCED_FORECASTING_CONTRACT_VERSION = "ucrm.advanced-forecasting/v1" as const;
export const UNIFIED_CRM_ADVANCED_FORECASTING_ERROR_CONTRACT_VERSION = "ucrm.advanced-forecasting-error/v1" as const;

export type UnifiedCrmAdvancedForecastingStatus = "PASS" | "HOLD";
export type UnifiedCrmAdvancedForecastingCheck = {
  category: "explainability" | "sourceFreshness" | "historicalEvaluation" | "overrideSeparation" | "biasErrorReview" | "deterministicFallback" | "approval";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmAdvancedForecastingStatus;
};

export type UnifiedCrmAdvancedForecastingReadModel = {
  activation: { attributionEnabled: false; predictiveForecastingEnabled: false; state: "HELD" };
  checks: UnifiedCrmAdvancedForecastingCheck[];
  contractVersion: typeof UNIFIED_CRM_ADVANCED_FORECASTING_CONTRACT_VERSION;
  generatedAt: string;
  rollback: { fallback: "existing-deterministic-forecast-baseline"; featureControl: "crm.enterprise.advancedForecasting.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmAdvancedForecastingFailureCode = "AUTHENTICATION_REQUIRED" | "ADVANCED_FORECASTING_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmAdvancedForecastingFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, ADVANCED_FORECASTING_NOT_AUTHORIZED: 403 };

export class UnifiedCrmAdvancedForecastingError extends Error {
  readonly code: UnifiedCrmAdvancedForecastingFailureCode;
  readonly contractVersion = UNIFIED_CRM_ADVANCED_FORECASTING_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmAdvancedForecastingFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmAdvancedForecastingError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
