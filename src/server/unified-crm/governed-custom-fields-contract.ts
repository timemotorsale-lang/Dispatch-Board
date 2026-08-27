export const UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_CONTRACT_VERSION = "ucrm.governed-custom-fields/v1" as const;
export const UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_ERROR_CONTRACT_VERSION = "ucrm.governed-custom-fields-error/v1" as const;

export type UnifiedCrmGovernedCustomFieldsStatus = "PASS" | "HOLD";

export type UnifiedCrmGovernedCustomFieldsCheck = {
  category:
    | "namespace"
    | "types"
    | "versioning"
    | "validation"
    | "indexing"
    | "permissions"
    | "reportingImpact"
    | "limits"
    | "adminPreview"
    | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmGovernedCustomFieldsStatus;
};

export type UnifiedCrmGovernedCustomFieldsReadModel = {
  activation: {
    customFieldPublishEnabled: false;
    layoutPublishEnabled: false;
    runtimeMutationEnabled: false;
    state: "HELD";
  };
  checks: UnifiedCrmGovernedCustomFieldsCheck[];
  contractVersion: typeof UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "standard-crm-fields-and-layouts";
    featureControl: "crm.enterprise.customFields.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmGovernedCustomFieldsFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmGovernedCustomFieldsFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED: 403
};

export class UnifiedCrmGovernedCustomFieldsError extends Error {
  readonly code: UnifiedCrmGovernedCustomFieldsFailureCode;
  readonly contractVersion = UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmGovernedCustomFieldsFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmGovernedCustomFieldsError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
