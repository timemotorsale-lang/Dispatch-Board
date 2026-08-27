export const UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_CONTRACT_VERSION = "ucrm.ai-receptionist-requirements/v1" as const;
export const UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_ERROR_CONTRACT_VERSION = "ucrm.ai-receptionist-requirements-error/v1" as const;

export type UnifiedCrmAiReceptionistRequirement = {
  id: string;
  category: "CONSENT" | "HUMAN_HANDOFF" | "RETRIEVAL" | "ESCALATION" | "NO_ACTION_DEFAULT" | "AUDIT" | "COST";
  state: "HELD" | "CONTRACTED";
  title: string;
  requirement: string;
  blockedBehavior: string;
  requiredDecision: string | null;
};

export type UnifiedCrmAiReceptionistRequirementsReadModel = {
  contractVersion: typeof UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_CONTRACT_VERSION;
  generatedAt: string;
  state: "HELD";
  visibility: "management";
  activation: {
    liveCallsEnabled: false;
    liveTextsEnabled: false;
    autonomousActionsEnabled: false;
    simulatorAllowed: true;
  };
  requirements: UnifiedCrmAiReceptionistRequirement[];
  summary: {
    heldRequirementCount: number;
    contractedRequirementCount: number;
    liveBehaviorBlocked: true;
  };
  rollback: {
    fallback: "human-reception-and-manual-crm-outcome";
    featureControl: "crm.ai.receptionist.enabled";
    posture: "fail-closed";
  };
};

export type UnifiedCrmAiReceptionistRequirementsFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmAiReceptionistRequirementsFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED: 403
};

export class UnifiedCrmAiReceptionistRequirementsError extends Error {
  readonly code: UnifiedCrmAiReceptionistRequirementsFailureCode;
  readonly contractVersion = UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmAiReceptionistRequirementsFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmAiReceptionistRequirementsError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
