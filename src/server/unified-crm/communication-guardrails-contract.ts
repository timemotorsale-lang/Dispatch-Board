export const UNIFIED_CRM_COMMUNICATION_GUARDRAILS_CONTRACT_VERSION = "ucrm.communication-guardrails/v1" as const;
export const UNIFIED_CRM_COMMUNICATION_GUARDRAILS_ERROR_CONTRACT_VERSION = "ucrm.communication-guardrails-error/v1" as const;

export type UnifiedCrmCommunicationGuardrailRule = {
  id: string;
  channel: "EMAIL" | "SMS" | "PHONE" | "ALL";
  category: "QUIET_HOURS" | "RATE_LIMIT" | "COST_CONTROL" | "CONSENT" | "KILL_SWITCH";
  state: "HELD" | "REVIEW_READY";
  enforcementEnabled: false;
  title: string;
  detail: string;
  requiredDecision: string | null;
};

export type UnifiedCrmCommunicationGuardrailsReadModel = {
  contractVersion: typeof UNIFIED_CRM_COMMUNICATION_GUARDRAILS_CONTRACT_VERSION;
  generatedAt: string;
  state: "HELD";
  visibility: "management";
  activation: {
    automatedSendingEnabled: false;
    providerTrafficEnabled: false;
    enforcementPreviewOnly: true;
  };
  rules: UnifiedCrmCommunicationGuardrailRule[];
  summary: {
    heldRuleCount: number;
    previewRuleCount: number;
    enforceableRuleCount: 0;
  };
  rollback: {
    fallback: "manual-consent-and-cost-review";
    featureControl: "crm.communications.guardrails.enabled";
    posture: "fail-closed";
  };
};

export type UnifiedCrmCommunicationGuardrailsFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmCommunicationGuardrailsFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED: 403
};

export class UnifiedCrmCommunicationGuardrailsError extends Error {
  readonly code: UnifiedCrmCommunicationGuardrailsFailureCode;
  readonly contractVersion = UNIFIED_CRM_COMMUNICATION_GUARDRAILS_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmCommunicationGuardrailsFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCommunicationGuardrailsError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
