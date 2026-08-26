import type { AuthenticatedUser } from "@/server/auth/store";

import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";

export const UNIFIED_CRM_OPPORTUNITY_CONTRACT_VERSION = "ucrm.opportunity/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_ERROR_CONTRACT_VERSION = "ucrm.opportunity-error/v1" as const;

export type UnifiedCrmOpportunityMode = "OFF" | "REVIEW";
export type UnifiedCrmOpportunityId = string & { readonly __brand: "UnifiedCrmOpportunityId" };

export type UnifiedCrmOpportunityRecordScope =
  | { kind: "ORGANIZATION" }
  | { kind: "OWNER"; ownerUserId: string };

export type UnifiedCrmOpportunityAction =
  | "read"
  | "create"
  | "transition"
  | "link-task"
  | "link-appointment"
  | "link-dispatch";

export type UnifiedCrmOpportunityCapabilityMap = {
  read: boolean;
  create: boolean;
  transition: boolean;
  linkTask: boolean;
  linkAppointment: boolean;
  linkDispatch: boolean;
};

export type UnifiedCrmOpportunityAccessContext = {
  actorUserId: string;
  capabilities: UnifiedCrmOpportunityCapabilityMap;
  fallbackHref: string;
  mode: UnifiedCrmOpportunityMode;
  organizationId: string;
  recordScope: UnifiedCrmOpportunityRecordScope;
  workspace: "MANAGEMENT" | "SALES";
};

export type UnifiedCrmOpportunitySourceReference = {
  sourceType: "CUSTOMER_LEAD";
  sourceRecordId: string;
  customerId: string;
  organizationId: string;
  ownerUserId: string | null;
};

export type UnifiedCrmOpportunityBridgeState =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING"
  | "FAILED";

export type UnifiedCrmOpportunityBridgeRequest = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_CONTRACT_VERSION;
  correlationId: string;
  expectedVersion: number;
  idempotencyKey: string;
  opportunityId: UnifiedCrmOpportunityId;
  organizationId: string;
  purpose: string;
  source: UnifiedCrmOpportunitySourceReference | null;
};

export type UnifiedCrmOpportunityBridgeReceipt<TTargetReference> = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_CONTRACT_VERSION;
  correlationId: string;
  idempotencyKey: string;
  opportunityId: UnifiedCrmOpportunityId;
  organizationId: string;
  state: UnifiedCrmOpportunityBridgeState;
  target: TTargetReference | null;
};

export type UnifiedCrmOpportunityFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "OPPORTUNITY_NOT_AUTHORIZED"
  | "OPPORTUNITY_OFF"
  | "OPPORTUNITY_MUTATION_HELD"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "INVALID_OPPORTUNITY_ID"
  | "INVALID_OPPORTUNITY_REFERENCE";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  OPPORTUNITY_NOT_AUTHORIZED: 403,
  OPPORTUNITY_OFF: 503,
  OPPORTUNITY_MUTATION_HELD: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  INVALID_OPPORTUNITY_ID: 400,
  INVALID_OPPORTUNITY_REFERENCE: 400
};

export class UnifiedCrmOpportunityError extends Error {
  readonly code: UnifiedCrmOpportunityFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "OPPORTUNITY_OFF";
  }
}

export function resolveUnifiedCrmOpportunityMode(options: {
  nodeEnv?: string | undefined;
  mode?: unknown;
} = {}): UnifiedCrmOpportunityMode {
  const configured = options.mode ?? process.env.UNIFIED_CRM_OPPORTUNITY_MODE;
  if (configured !== undefined && configured !== null) {
    return typeof configured === "string" && configured.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }
  return (options.nodeEnv ?? process.env.NODE_ENV) === "production" ? "OFF" : "REVIEW";
}

export function baseUnifiedCrmOpportunityCapabilityMap(
  actor: AuthenticatedUser | null
): {
  fallbackHref: string;
  mutateAllowed: boolean;
  readAllowed: boolean;
  workspace: "MANAGEMENT" | "SALES" | null;
} {
  const consoleAccess = evaluateUnifiedCrmCapability(actor, "crm.console.access");
  const customerView = evaluateUnifiedCrmCapability(actor, "crm.customer.view");
  const mutate = evaluateUnifiedCrmCapability(actor, "crm.mutate");
  return {
    fallbackHref: consoleAccess.fallbackHref,
    mutateAllowed: consoleAccess.allowed && mutate.allowed && Boolean(consoleAccess.workspace),
    readAllowed: consoleAccess.allowed && customerView.allowed && Boolean(consoleAccess.workspace),
    workspace: consoleAccess.workspace
  };
}
