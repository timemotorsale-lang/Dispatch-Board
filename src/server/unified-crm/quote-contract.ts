import type { AuthenticatedUser } from "@/server/auth/store";

import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";

export const UNIFIED_CRM_QUOTE_CONTRACT_VERSION = "ucrm.quote/v1" as const;
export const UNIFIED_CRM_QUOTE_ERROR_CONTRACT_VERSION = "ucrm.quote-error/v1" as const;

export type UnifiedCrmQuoteMode = "OFF" | "REVIEW";

export type UnifiedCrmQuoteRecordScope =
  | { kind: "ORGANIZATION" }
  | { kind: "OWNER"; ownerUserId: string };

export type UnifiedCrmQuoteAction = "read" | "draft" | "present" | "approve";

export type UnifiedCrmQuoteCapabilityMap = {
  read: boolean;
  draft: boolean;
  present: boolean;
  approve: boolean;
};

export type UnifiedCrmQuoteAccessContext = {
  actorUserId: string;
  capabilities: UnifiedCrmQuoteCapabilityMap;
  fallbackHref: string;
  mode: UnifiedCrmQuoteMode;
  organizationId: string;
  recordScope: UnifiedCrmQuoteRecordScope;
  workspace: "MANAGEMENT" | "SALES";
};

export type UnifiedCrmQuoteFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "QUOTE_NOT_AUTHORIZED"
  | "QUOTE_OFF"
  | "QUOTE_MUTATION_HELD"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS";

const FAILURE_STATUS: Record<UnifiedCrmQuoteFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  QUOTE_NOT_AUTHORIZED: 403,
  QUOTE_OFF: 503,
  QUOTE_MUTATION_HELD: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409
};

export class UnifiedCrmQuoteError extends Error {
  readonly code: UnifiedCrmQuoteFailureCode;
  readonly contractVersion = UNIFIED_CRM_QUOTE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmQuoteFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmQuoteError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "QUOTE_OFF";
  }
}

export function resolveUnifiedCrmQuoteMode(options: { nodeEnv?: string | undefined; mode?: unknown } = {}): UnifiedCrmQuoteMode {
  const configured = options.mode ?? process.env.UNIFIED_CRM_QUOTE_MODE;
  if (configured !== undefined && configured !== null) {
    return typeof configured === "string" && configured.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }
  return (options.nodeEnv ?? process.env.NODE_ENV) === "production" ? "OFF" : "REVIEW";
}

export function baseUnifiedCrmQuoteCapabilityMap(
  actor: AuthenticatedUser | null
): {
  fallbackHref: string;
  readAllowed: boolean;
  workspace: "MANAGEMENT" | "SALES" | null;
} {
  const consoleAccess = evaluateUnifiedCrmCapability(actor, "crm.console.access");
  const customerView = evaluateUnifiedCrmCapability(actor, "crm.customer.view");
  return {
    fallbackHref: consoleAccess.fallbackHref,
    readAllowed: consoleAccess.allowed && customerView.allowed && Boolean(consoleAccess.workspace),
    workspace: consoleAccess.workspace
  };
}
