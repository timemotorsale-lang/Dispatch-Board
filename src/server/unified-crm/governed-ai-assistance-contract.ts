export const UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_CONTRACT_VERSION = "ucrm.governed-ai-assistance/v1" as const;
export const UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_ERROR_CONTRACT_VERSION = "ucrm.governed-ai-assistance-error/v1" as const;

export type UnifiedCrmGovernedAiAssistanceStatus = "PASS" | "HOLD";
export type UnifiedCrmGovernedAiAssistanceCheck = {
  category: "permissionAwareRetrieval" | "citationsProvenance" | "evaluationSet" | "promptInjectionDefense" | "humanApproval" | "costLatency" | "logging" | "optOut" | "killSwitch";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmGovernedAiAssistanceStatus;
};

export type UnifiedCrmGovernedAiAssistanceReadModel = {
  activation: { aiReceptionistEnabled: false; autonomousActionsEnabled: false; draftAssistanceEnabled: false; state: "HELD" };
  checks: UnifiedCrmGovernedAiAssistanceCheck[];
  contractVersion: typeof UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_CONTRACT_VERSION;
  generatedAt: string;
  rollback: { fallback: "deterministic-crm-workflows-and-manual-review"; featureControl: "crm.enterprise.aiAssistance.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmGovernedAiAssistanceFailureCode = "AUTHENTICATION_REQUIRED" | "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmGovernedAiAssistanceFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED: 403 };

export class UnifiedCrmGovernedAiAssistanceError extends Error {
  readonly code: UnifiedCrmGovernedAiAssistanceFailureCode;
  readonly contractVersion = UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmGovernedAiAssistanceFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmGovernedAiAssistanceError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
