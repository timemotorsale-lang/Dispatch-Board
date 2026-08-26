import type { AuthenticatedUser } from "@/server/auth/store";
import {
  baseUnifiedCrmOpportunityCapabilityMap,
  resolveUnifiedCrmOpportunityMode,
  type UnifiedCrmOpportunityAction,
  type UnifiedCrmOpportunityCapabilityMap,
  type UnifiedCrmOpportunityMode,
  type UnifiedCrmOpportunityRecordScope
} from "@/server/unified-crm/opportunity-contract";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";

export type UnifiedCrmOpportunityPolicyDecision = {
  allowed: boolean;
  fallbackHref: string;
  mode: UnifiedCrmOpportunityMode;
  reason:
    | "ALLOWED"
    | "AUTHENTICATION_REQUIRED"
    | "OPPORTUNITY_NOT_AUTHORIZED"
    | "OPPORTUNITY_OFF"
    | "OPPORTUNITY_MUTATION_HELD";
  recordScope: UnifiedCrmOpportunityRecordScope | null;
  capabilities: UnifiedCrmOpportunityCapabilityMap;
  workspace: "MANAGEMENT" | "SALES" | null;
};

function capabilities(readAllowed: boolean, mutateAllowed = false): UnifiedCrmOpportunityCapabilityMap {
  return {
    read: readAllowed,
    create: mutateAllowed,
    transition: mutateAllowed,
    linkTask: false,
    linkAppointment: false,
    linkDispatch: false
  };
}

export function evaluateUnifiedCrmOpportunityPolicy(
  actor: AuthenticatedUser | null,
  options: { action?: UnifiedCrmOpportunityAction; mode?: unknown; nodeEnv?: string } = {}
): UnifiedCrmOpportunityPolicyDecision {
  const mode = resolveUnifiedCrmOpportunityMode(options);
  const base = baseUnifiedCrmOpportunityCapabilityMap(actor);

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
      reason: "OPPORTUNITY_NOT_AUTHORIZED",
      recordScope: null,
      capabilities: capabilities(false),
      workspace: base.workspace
    };
  }

  const recordScope: UnifiedCrmOpportunityRecordScope = base.workspace === "MANAGEMENT"
    ? { kind: "ORGANIZATION" }
    : { kind: "OWNER", ownerUserId: actor.id };
  const resultCapabilities = capabilities(true, base.mutateAllowed);

  if (mode !== "REVIEW") {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "OPPORTUNITY_OFF",
      recordScope,
      capabilities: resultCapabilities,
      workspace: base.workspace
    };
  }

  if ((options.action === "create" || options.action === "transition") && base.mutateAllowed) {
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

  if (options.action && options.action !== "read") {
    return {
      allowed: false,
      fallbackHref: base.fallbackHref,
      mode,
      reason: "OPPORTUNITY_MUTATION_HELD",
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

export function requireUnifiedCrmOpportunityPolicy(
  actor: AuthenticatedUser | null,
  options: { action?: UnifiedCrmOpportunityAction; mode?: unknown; nodeEnv?: string } = {}
) {
  const decision = evaluateUnifiedCrmOpportunityPolicy(actor, options);
  if (!decision.allowed || !decision.recordScope || !decision.workspace) {
    const code = decision.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : decision.reason === "OPPORTUNITY_OFF"
        ? "OPPORTUNITY_OFF"
        : decision.reason === "OPPORTUNITY_MUTATION_HELD"
          ? "OPPORTUNITY_MUTATION_HELD"
          : "OPPORTUNITY_NOT_AUTHORIZED";
    throw new UnifiedCrmOpportunityError(code, "CRM opportunities are not available for this viewer.");
  }
  return decision;
}
