import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export const UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND = "CRM_OPPORTUNITY_STAGE_TRANSITION" as const;
export const UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND_CONTRACT_VERSION = "ucrm.opportunity-transition-command/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_TRANSITION_ERROR_CONTRACT_VERSION = "ucrm.opportunity-transition-error/v1" as const;

export type UnifiedCrmOpportunityTransitionCommandInput = {
  expectedVersion?: unknown;
  handoffTarget?: unknown;
  idempotencyKey?: unknown;
  lostReason?: unknown;
  nextActionDueAt?: unknown;
  nextActionLabel?: unknown;
  reason?: unknown;
  toStage?: unknown;
  wonEvidence?: unknown;
};

export type UnifiedCrmOpportunityTransitionReceipt = {
  fromStage: UnifiedCrmOpportunityStage;
  href: string;
  id: string;
  nextActionDueAt: string | null;
  nextActionLabel: string | null;
  opportunityNumber: string;
  stage: UnifiedCrmOpportunityStage;
  version: number;
};

export type UnifiedCrmOpportunityTransitionCommandResult = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND_CONTRACT_VERSION;
  duplicate: boolean;
  opportunity: UnifiedCrmOpportunityTransitionReceipt;
};

export type UnifiedCrmOpportunityTransitionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_OPPORTUNITY_TRANSITION"
  | "OPPORTUNITY_NOT_AUTHORIZED"
  | "OPPORTUNITY_NOT_AVAILABLE"
  | "OPPORTUNITY_OFF"
  | "OPPORTUNITY_SOURCE_UNAVAILABLE"
  | "OPPORTUNITY_TRANSITION_NOT_ALLOWED"
  | "OPPORTUNITY_TRANSITION_NOT_AUTHORIZED"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "VERSION_CONFLICT";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityTransitionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_OPPORTUNITY_TRANSITION: 400,
  OPPORTUNITY_NOT_AUTHORIZED: 403,
  OPPORTUNITY_NOT_AVAILABLE: 404,
  OPPORTUNITY_OFF: 503,
  OPPORTUNITY_SOURCE_UNAVAILABLE: 503,
  OPPORTUNITY_TRANSITION_NOT_ALLOWED: 409,
  OPPORTUNITY_TRANSITION_NOT_AUTHORIZED: 403,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  VERSION_CONFLICT: 409
};

export class UnifiedCrmOpportunityTransitionError extends Error {
  readonly code: UnifiedCrmOpportunityTransitionFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_TRANSITION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityTransitionFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityTransitionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE";
  }
}
