export const UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_CONTRACT_VERSION = "ucrm.ai-receptionist-simulator/v1" as const;
export const UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_ERROR_CONTRACT_VERSION = "ucrm.ai-receptionist-simulator-error/v1" as const;

export type UnifiedCrmAiReceptionistScenario = {
  id: string;
  title: string;
  channel: "PHONE" | "SMS";
  customerIntent: "STATUS_REQUEST" | "APPOINTMENT_REQUEST" | "PRICE_QUESTION" | "COMPLAINT" | "OPT_OUT";
  simulationOnly: true;
  expectedDisposition: "ANSWER_WITH_SAFE_CONTEXT" | "HANDOFF_TO_HUMAN" | "ABSTAIN_AND_LOG";
  allowedContext: string[];
  blockedActions: string[];
  sampleSafeResponse: string;
};

export type UnifiedCrmAiReceptionistSimulatorReadModel = {
  contractVersion: typeof UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_CONTRACT_VERSION;
  generatedAt: string;
  state: "READY_REVIEW";
  visibility: "management";
  activation: {
    simulationEnabled: true;
    liveProviderTrafficEnabled: false;
    autonomousActionsEnabled: false;
  };
  scenarios: UnifiedCrmAiReceptionistScenario[];
  rollback: {
    fallback: "human-reception-and-manual-crm-outcome";
    featureControl: "crm.ai.receptionistSimulator.enabled";
    posture: "simulation-only";
  };
};

export type UnifiedCrmAiReceptionistSimulatorFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmAiReceptionistSimulatorFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED: 403
};

export class UnifiedCrmAiReceptionistSimulatorError extends Error {
  readonly code: UnifiedCrmAiReceptionistSimulatorFailureCode;
  readonly contractVersion = UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmAiReceptionistSimulatorFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmAiReceptionistSimulatorError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
