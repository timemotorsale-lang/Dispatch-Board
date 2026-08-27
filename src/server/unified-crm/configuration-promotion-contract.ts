export const UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION = "ucrm.configuration-promotion/v1" as const;
export const UNIFIED_CRM_CONFIGURATION_PROMOTION_ERROR_CONTRACT_VERSION = "ucrm.configuration-promotion-error/v1" as const;

export type UnifiedCrmConfigurationPromotionStatus = "PASS" | "HOLD";
export type UnifiedCrmConfigurationPromotionCheck = {
  category: "isolation" | "maskedData" | "diffReview" | "promotion" | "validation" | "audit" | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmConfigurationPromotionStatus;
};

export type UnifiedCrmConfigurationPromotionReadModel = {
  activation: { productionPromotionEnabled: false; sandboxConfigEnabled: false; state: "HELD" };
  checks: UnifiedCrmConfigurationPromotionCheck[];
  contractVersion: typeof UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION;
  generatedAt: string;
  rollback: { fallback: "manual-reviewed-configuration-change"; featureControl: "crm.enterprise.configurationPromotion.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmConfigurationPromotionFailureCode = "AUTHENTICATION_REQUIRED" | "CONFIGURATION_PROMOTION_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmConfigurationPromotionFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, CONFIGURATION_PROMOTION_NOT_AUTHORIZED: 403 };

export class UnifiedCrmConfigurationPromotionError extends Error {
  readonly code: UnifiedCrmConfigurationPromotionFailureCode;
  readonly contractVersion = UNIFIED_CRM_CONFIGURATION_PROMOTION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmConfigurationPromotionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmConfigurationPromotionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
