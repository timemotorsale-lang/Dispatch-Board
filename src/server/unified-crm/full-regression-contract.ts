export const UNIFIED_CRM_FULL_REGRESSION_CONTRACT_VERSION = "ucrm.full-regression/v1" as const;
export const UNIFIED_CRM_FULL_REGRESSION_ERROR_CONTRACT_VERSION = "ucrm.full-regression-error/v1" as const;

export type UnifiedCrmFullRegressionStatus = "PASS" | "HOLD";

export type UnifiedCrmFullRegressionCheck = {
  category:
    | "schemaGeneration"
    | "typecheck"
    | "lint"
    | "unit"
    | "integration"
    | "policy"
    | "productionBuild"
    | "crmBrowser"
    | "dispatchRegression";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmFullRegressionStatus;
};

export type UnifiedCrmFullRegressionReadModel = {
  checks: UnifiedCrmFullRegressionCheck[];
  contractVersion: typeof UNIFIED_CRM_FULL_REGRESSION_CONTRACT_VERSION;
  generatedAt: string;
  state: "PASS" | "HELD";
  visibility: "management";
};

export type UnifiedCrmFullRegressionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "FULL_REGRESSION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmFullRegressionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  FULL_REGRESSION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmFullRegressionError extends Error {
  readonly code: UnifiedCrmFullRegressionFailureCode;
  readonly contractVersion = UNIFIED_CRM_FULL_REGRESSION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmFullRegressionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmFullRegressionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
