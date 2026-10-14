export const UNIFIED_CRM_LIFECYCLE_MODULES_CONTRACT_VERSION = "ucrm.lifecycle-modules/v1" as const;
export const UNIFIED_CRM_LIFECYCLE_MODULES_ERROR_CONTRACT_VERSION = "ucrm.lifecycle-modules-error/v1" as const;

export type UnifiedCrmLifecycleModulesStatus = "PASS" | "HOLD";
export type UnifiedCrmLifecycleModulesCheck = {
  category: "domainBoundary" | "securityModel" | "sourceAuthority" | "testing" | "pilot" | "releaseGate" | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmLifecycleModulesStatus;
};

export type UnifiedCrmLifecycleModulesReadModel = {
  activation: {
    accountHealthEnabled: false;
    marketingExpansionEnabled: false;
    renewalModuleEnabled: false;
    serviceCaseExpansionEnabled: false;
    state: "HELD";
  };
  checks: UnifiedCrmLifecycleModulesCheck[];
  contractVersion: typeof UNIFIED_CRM_LIFECYCLE_MODULES_CONTRACT_VERSION;
  generatedAt: string;
  rollback: { fallback: "existing-crm-core-and-source-domain-consoles"; featureControl: "crm.enterprise.lifecycleModules.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmLifecycleModulesFailureCode = "AUTHENTICATION_REQUIRED" | "LIFECYCLE_MODULES_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmLifecycleModulesFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, LIFECYCLE_MODULES_NOT_AUTHORIZED: 403 };

export class UnifiedCrmLifecycleModulesError extends Error {
  readonly code: UnifiedCrmLifecycleModulesFailureCode;
  readonly contractVersion = UNIFIED_CRM_LIFECYCLE_MODULES_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmLifecycleModulesFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmLifecycleModulesError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
