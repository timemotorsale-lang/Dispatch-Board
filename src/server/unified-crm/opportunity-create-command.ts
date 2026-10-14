import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export const UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND = "CRM_OPPORTUNITY_CREATE" as const;
export const UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND_CONTRACT_VERSION = "ucrm.opportunity-create-command/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_CREATE_ERROR_CONTRACT_VERSION = "ucrm.opportunity-create-error/v1" as const;

export type UnifiedCrmOpportunityCreateCommandInput = {
  customerId?: unknown;
  estimatedValueCents?: unknown;
  expectedCloseAt?: unknown;
  idempotencyKey?: unknown;
  nextActionDueAt?: unknown;
  nextActionLabel?: unknown;
  ownerUserId?: unknown;
  sourceLeadId?: unknown;
  summary?: unknown;
  title?: unknown;
};

export type UnifiedCrmOpportunityCreateCommandResult = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND_CONTRACT_VERSION;
  duplicate: boolean;
  opportunity: {
    customerId: string | null;
    estimatedValueCents: number | null;
    expectedCloseAt: string | null;
    href: string;
    id: string;
    nextActionDueAt: string;
    nextActionLabel: string;
    opportunityNumber: string;
    ownerUserId: string;
    sourceLeadId: string | null;
    stage: UnifiedCrmOpportunityStage;
    summary: string | null;
    title: string;
    version: number;
  };
};

export type UnifiedCrmOpportunityCreateFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_NOT_AVAILABLE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_OPPORTUNITY_COMMAND"
  | "OPPORTUNITY_CREATE_NOT_AUTHORIZED"
  | "OPPORTUNITY_NOT_AUTHORIZED"
  | "OPPORTUNITY_OFF"
  | "OPPORTUNITY_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "OWNER_NOT_AVAILABLE"
  | "SOURCE_LEAD_NOT_AVAILABLE";

const STATUS: Record<UnifiedCrmOpportunityCreateFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_NOT_AVAILABLE: 404,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_OPPORTUNITY_COMMAND: 400,
  OPPORTUNITY_CREATE_NOT_AUTHORIZED: 403,
  OPPORTUNITY_NOT_AUTHORIZED: 403,
  OPPORTUNITY_OFF: 503,
  OPPORTUNITY_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  OWNER_NOT_AVAILABLE: 404,
  SOURCE_LEAD_NOT_AVAILABLE: 404
};

export class UnifiedCrmOpportunityCreateError extends Error {
  readonly code: UnifiedCrmOpportunityCreateFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_CREATE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityCreateFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityCreateError";
    this.code = code;
    this.httpStatus = STATUS[code];
    this.retryable = code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE";
  }
}

