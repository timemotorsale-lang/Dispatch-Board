export const UNIFIED_CRM_PROVIDER_DECISION_INTAKE_CONTRACT_VERSION = "ucrm.provider-decision-intake/v1" as const;
export const UNIFIED_CRM_PROVIDER_DECISION_INTAKE_ERROR_CONTRACT_VERSION = "ucrm.provider-decision-intake-error/v1" as const;

export type UnifiedCrmProviderDecisionChannel = "EMAIL_CALENDAR" | "SMS" | "TELEPHONY";
export type UnifiedCrmProviderDecisionStatus = "HELD";

export type UnifiedCrmProviderDecisionRequirement = {
  channel: UnifiedCrmProviderDecisionChannel;
  requiredDecision: string;
  owner: "product-owner" | "security-privacy" | "operations" | "architecture" | "data-owner";
};

export type UnifiedCrmProviderDecisionIntakeReadModel = {
  activation: {
    credentialEntryEnabled: false;
    providerSelectionEnabled: false;
    productionActivationEnabled: false;
    state: "HELD";
  };
  contractVersion: typeof UNIFIED_CRM_PROVIDER_DECISION_INTAKE_CONTRACT_VERSION;
  generatedAt: string;
  requirements: UnifiedCrmProviderDecisionRequirement[];
  rollback: {
    fallback: "readiness-hub-and-manual-business-decision-register";
    featureControl: "crm.communications.providerDecisionIntake.enabled";
    posture: "fail-closed";
  };
  state: UnifiedCrmProviderDecisionStatus;
  visibility: "management";
};

export type UnifiedCrmProviderDecisionIntakeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmProviderDecisionIntakeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED: 403
};

export class UnifiedCrmProviderDecisionIntakeError extends Error {
  readonly code: UnifiedCrmProviderDecisionIntakeFailureCode;
  readonly contractVersion = UNIFIED_CRM_PROVIDER_DECISION_INTAKE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmProviderDecisionIntakeFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmProviderDecisionIntakeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
