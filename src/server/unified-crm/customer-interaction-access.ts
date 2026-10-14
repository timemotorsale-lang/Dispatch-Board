import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { evaluateUnifiedCrmCapability, resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerInteractionError } from "@/server/unified-crm/customer-interaction-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerInteractionMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerInteractionAccessOptions = {
  commandMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function canLogUnifiedCrmCustomerInteraction(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerInteractionAccessOptions = {}
) {
  if (!actor?.isActive) return false;
  if (!evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) return false;

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (!workspace) return false;

  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerInteractionMode(options) !== "REVIEW") return false;

  return true;
}

export function resolveUnifiedCrmCustomerInteractionMode(
  options: Pick<UnifiedCrmCustomerInteractionAccessOptions, "commandMode" | "nodeEnv"> = {}
): UnifiedCrmCustomerInteractionMode {
  const explicit = typeof options.commandMode === "string" ? options.commandMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmCustomerInteractionPolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerRecordScope {
  if (!actor) {
    throw new UnifiedCrmCustomerInteractionError(
      "AUTHENTICATION_REQUIRED",
      "Customer interaction is temporarily unavailable."
    );
  }
  if (!actor.isActive || !evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) {
    throw new UnifiedCrmCustomerInteractionError(
      "CUSTOMER_360_NOT_AUTHORIZED",
      "Customer interaction is temporarily unavailable."
    );
  }

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerInteractionError(
    "CUSTOMER_360_NOT_AUTHORIZED",
    "Customer interaction is temporarily unavailable."
  );
}

export function requireUnifiedCrmCustomerInteractionAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerInteractionAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomerInteractionPolicy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });

  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomerInteractionError(
      "CUSTOMER_360_OFF",
      "Customer interaction is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerInteractionError(
      "CUSTOMER_360_OFF",
      "Customer interaction is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerInteractionMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerInteractionError(
      "CUSTOMER_360_OFF",
      "Customer interaction is temporarily unavailable."
    );
  }

  return {
    commandMode: "REVIEW" as const,
    mutationAuthority: "CUSTOMER_INTERACTION_REVIEW_COMMAND" as const,
    recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
