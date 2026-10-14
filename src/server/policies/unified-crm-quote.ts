import type { AuthenticatedUser } from "@/server/auth/store";

import {
  baseUnifiedCrmQuoteCapabilityMap,
  resolveUnifiedCrmQuoteMode,
  type UnifiedCrmQuoteAction,
  type UnifiedCrmQuoteCapabilityMap,
  type UnifiedCrmQuoteMode,
  type UnifiedCrmQuoteRecordScope,
  UnifiedCrmQuoteError
} from "@/server/unified-crm/quote-contract";

export type UnifiedCrmQuotePolicyDecision = {
  allowed: boolean;
  fallbackHref: string;
  mode: UnifiedCrmQuoteMode;
  reason:
    | "ALLOWED"
    | "AUTHENTICATION_REQUIRED"
    | "QUOTE_NOT_AUTHORIZED"
    | "QUOTE_OFF"
    | "QUOTE_MUTATION_HELD";
  recordScope: UnifiedCrmQuoteRecordScope | null;
  capabilities: UnifiedCrmQuoteCapabilityMap;
  workspace: "MANAGEMENT" | "SALES" | null;
};

function capabilities(readAllowed: boolean): UnifiedCrmQuoteCapabilityMap {
  return {
    read: readAllowed,
    draft: readAllowed,
    present: false,
    approve: false
  };
}

export function evaluateUnifiedCrmQuotePolicy(
  actor: AuthenticatedUser | null,
  options: { action?: UnifiedCrmQuoteAction; mode?: unknown; nodeEnv?: string } = {}
): UnifiedCrmQuotePolicyDecision {
  const mode = resolveUnifiedCrmQuoteMode(options);
  const base = baseUnifiedCrmQuoteCapabilityMap(actor);

  if (!actor) {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "AUTHENTICATION_REQUIRED",
      recordScope: null,
      capabilities: capabilities(false),
      workspace: null
    };
  }

  if (!base.readAllowed || !base.workspace) {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "QUOTE_NOT_AUTHORIZED",
      recordScope: null,
      capabilities: capabilities(false),
      workspace: base.workspace
    };
  }

  const recordScope: UnifiedCrmQuoteRecordScope = base.workspace === "MANAGEMENT"
    ? { kind: "ORGANIZATION" }
    : { kind: "OWNER", ownerUserId: actor.id };
  const resultCapabilities: UnifiedCrmQuoteCapabilityMap = {
    read: true,
    draft: true,
    present: false,
    approve: false
  };

  if (mode !== "REVIEW") {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "QUOTE_OFF",
      recordScope,
      capabilities: resultCapabilities,
      workspace: base.workspace
    };
  }

  if (options.action === "draft" && resultCapabilities.draft) {
    return {
      allowed: true,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "ALLOWED",
      recordScope,
      capabilities: resultCapabilities,
      workspace: base.workspace
    };
  }

  if (options.action && options.action !== "read" && options.action !== "draft") {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "QUOTE_MUTATION_HELD",
      recordScope,
      capabilities: resultCapabilities,
      workspace: base.workspace
    };
  }

  return {
    allowed: true,
    fallbackHref: base.fallbackHref,
    mode,
    reason: "ALLOWED",
    recordScope,
    capabilities: resultCapabilities,
    workspace: base.workspace
  };
}

export function requireUnifiedCrmQuotePolicy(
  actor: AuthenticatedUser | null,
  options: { action?: UnifiedCrmQuoteAction; mode?: unknown; nodeEnv?: string } = {}
) {
  const decision = evaluateUnifiedCrmQuotePolicy(actor, options);
  if (!decision.allowed || !decision.recordScope || !decision.workspace) {
    const code = decision.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : decision.reason === "QUOTE_OFF"
        ? "QUOTE_OFF"
        : decision.reason === "QUOTE_MUTATION_HELD"
          ? "QUOTE_MUTATION_HELD"
          : "QUOTE_NOT_AUTHORIZED";
    throw new UnifiedCrmQuoteError(code, "CRM quotes are not available for this viewer.");
  }
  return decision;
}
