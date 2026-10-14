export const UNIFIED_CRM_CONVERSATION_ENVELOPE_CONTRACT_VERSION = "ucrm.conversation-envelope/v1" as const;
export const UNIFIED_CRM_CONVERSATION_ENVELOPE_ERROR_CONTRACT_VERSION = "ucrm.conversation-envelope-error/v1" as const;

export type UnifiedCrmConversationEnvelopeChannel = "EMAIL" | "SMS" | "PHONE" | "MANUAL";
export type UnifiedCrmConversationEnvelopeCheckStatus = "PASS" | "HOLD";

export type UnifiedCrmConversationEnvelopeCheck = {
  category:
    | "storageAuthority"
    | "manualOutcomeBridge"
    | "providerEventBoundary"
    | "customerLink"
    | "consentSnapshot"
    | "retention"
    | "audit"
    | "reconciliation";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmConversationEnvelopeCheckStatus;
};

export type UnifiedCrmConversationEnvelopeReadModel = {
  activation: {
    externalProviderEventImportEnabled: false;
    manualOutcomeEnvelopeEnabled: true;
    providerSendEnabled: false;
    state: "IMPLEMENTED_UNVERIFIED";
  };
  channels: UnifiedCrmConversationEnvelopeChannel[];
  checks: UnifiedCrmConversationEnvelopeCheck[];
  contractVersion: typeof UNIFIED_CRM_CONVERSATION_ENVELOPE_CONTRACT_VERSION;
  generatedAt: string;
  sourceAuthority: {
    manualOutcomes: "CustomerInteraction";
    providerEvents: "HELD";
  };
  rollback: {
    fallback: "existing-customer-interaction-timeline";
    featureControl: "crm.communications.conversationEnvelope.enabled";
    posture: "read-only";
  };
  state: "IMPLEMENTED_UNVERIFIED";
  visibility: "management";
};

export type UnifiedCrmConversationEnvelopeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CONVERSATION_ENVELOPE_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmConversationEnvelopeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CONVERSATION_ENVELOPE_NOT_AUTHORIZED: 403
};

export class UnifiedCrmConversationEnvelopeError extends Error {
  readonly code: UnifiedCrmConversationEnvelopeFailureCode;
  readonly contractVersion = UNIFIED_CRM_CONVERSATION_ENVELOPE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmConversationEnvelopeFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmConversationEnvelopeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
