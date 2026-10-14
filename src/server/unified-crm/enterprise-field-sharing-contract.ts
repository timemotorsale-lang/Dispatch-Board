export const UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_CONTRACT_VERSION = "ucrm.enterprise-field-sharing/v1" as const;
export const UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_ERROR_CONTRACT_VERSION = "ucrm.enterprise-field-sharing-error/v1" as const;

export type UnifiedCrmEnterpriseFieldSharingStatus = "PASS" | "HOLD";

export type UnifiedCrmEnterpriseFieldSharingCheck = {
  category:
    | "formalAccessModel"
    | "fieldClassification"
    | "recordScope"
    | "territoryRules"
    | "policyProof"
    | "adminPreview"
    | "audit"
    | "migration"
    | "scaleTests"
    | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmEnterpriseFieldSharingStatus;
};

export type UnifiedCrmEnterpriseFieldSharingReadModel = {
  activation: {
    customRecordSharingEnabled: false;
    fieldOverrideEnabled: false;
    territorySharingEnabled: false;
    state: "HELD";
  };
  checks: UnifiedCrmEnterpriseFieldSharingCheck[];
  contractVersion: typeof UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "existing-role-and-organization-scope";
    featureControl: "crm.enterprise.fieldSharing.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmEnterpriseFieldSharingFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmEnterpriseFieldSharingFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED: 403
};

export class UnifiedCrmEnterpriseFieldSharingError extends Error {
  readonly code: UnifiedCrmEnterpriseFieldSharingFailureCode;
  readonly contractVersion = UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmEnterpriseFieldSharingFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmEnterpriseFieldSharingError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
