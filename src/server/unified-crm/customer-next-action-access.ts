import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerNextActionError } from "@/server/unified-crm/customer-next-action-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerNextActionMode = "OFF" | "REVIEW";
export type UnifiedCrmCustomerNextActionAccessReason =
  | "ALLOWED"
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF";

export type UnifiedCrmCustomerNextActionAccessOptions = {
  commandMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function canManageUnifiedCrmCustomerNextAction(
  actor: AuthenticatedUser | null,
  ownerUserId: string | null | undefined,
  options: UnifiedCrmCustomerNextActionAccessOptions = {}
) {
  if (!ownerUserId) return false;
  if (!actor?.isActive) return false;
  if (!evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) return false;

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (!workspace) return false;
  if (workspace === "SALES" && ownerUserId !== actor.id) return false;

  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerNextActionMode(options) !== "REVIEW") return false;

  return true;
}

export function resolveUnifiedCrmCustomerNextActionMode(
  options: Pick<UnifiedCrmCustomerNextActionAccessOptions, "commandMode" | "nodeEnv"> = {}
): UnifiedCrmCustomerNextActionMode {
  const explicit = typeof options.commandMode === "string" ? options.commandMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmCustomerNextActionPolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerRecordScope {
  if (!actor) {
    throw new UnifiedCrmCustomerNextActionError(
      "AUTHENTICATION_REQUIRED",
      "Customer next action is temporarily unavailable."
    );
  }
  if (!actor.isActive) {
    throw new UnifiedCrmCustomerNextActionError(
      "CUSTOMER_360_NOT_AUTHORIZED",
      "Customer next action is temporarily unavailable."
    );
  }

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (!evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) {
    throw new UnifiedCrmCustomerNextActionError(
      "CUSTOMER_360_NOT_AUTHORIZED",
      "Customer next action is temporarily unavailable."
    );
  }
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerNextActionError(
    "CUSTOMER_360_NOT_AUTHORIZED",
    "Customer next action is temporarily unavailable."
  );
}

export type UnifiedCrmCustomerNextActionAccessDecision = {
  allowed: boolean;
  commandMode: UnifiedCrmCustomerNextActionMode;
  readMode: "OFF" | "REVIEW";
  recordScope: UnifiedCrmCustomerRecordScope | null;
  reason: UnifiedCrmCustomerNextActionAccessReason;
  shellMode: "OFF" | "REVIEW";
};

export function evaluateUnifiedCrmCustomerNextActionAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNextActionAccessOptions = {}
): UnifiedCrmCustomerNextActionAccessDecision {
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  const readMode = resolveUnifiedCrmCustomerReadMode(options);
  const commandMode = resolveUnifiedCrmCustomerNextActionMode(options);

  try {
    const recordScope = requireUnifiedCrmCustomerNextActionPolicy(actor);
    if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
      return {
        allowed: false,
        commandMode,
        readMode,
        recordScope,
        reason: "CUSTOMER_360_OFF",
        shellMode: shellAccess.mode
      };
    }
    if (readMode !== "REVIEW" || commandMode !== "REVIEW") {
      return {
        allowed: false,
        commandMode,
        readMode,
        recordScope,
        reason: "CUSTOMER_360_OFF",
        shellMode: shellAccess.mode
      };
    }
    return {
      allowed: true,
      commandMode,
      readMode,
      recordScope,
      reason: "ALLOWED",
      shellMode: shellAccess.mode
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerNextActionError) {
      return {
        allowed: false,
        commandMode,
        readMode,
        recordScope: null,
        reason: error.code === "AUTHENTICATION_REQUIRED"
          ? "AUTHENTICATION_REQUIRED"
          : error.code === "CUSTOMER_360_NOT_AUTHORIZED"
            ? "CUSTOMER_360_NOT_AUTHORIZED"
            : "CUSTOMER_360_OFF",
        shellMode: shellAccess.mode
      };
    }
    throw error;
  }
}

export function requireUnifiedCrmCustomerNextActionAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNextActionAccessOptions = {}
) {
  const decision = evaluateUnifiedCrmCustomerNextActionAccess(actor, options);
  if (!decision.allowed || !decision.recordScope) {
    throw new UnifiedCrmCustomerNextActionError(
      decision.reason === "AUTHENTICATION_REQUIRED"
        ? "AUTHENTICATION_REQUIRED"
        : decision.reason === "CUSTOMER_360_NOT_AUTHORIZED"
          ? "CUSTOMER_360_NOT_AUTHORIZED"
          : "CUSTOMER_360_OFF",
      "Customer next action is temporarily unavailable."
    );
  }
  return {
    commandMode: "REVIEW" as const,
    mutationAuthority: "CUSTOMER_NEXT_ACTION_REVIEW_COMMAND" as const,
    recordScope: decision.recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
