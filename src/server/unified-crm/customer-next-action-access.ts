import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerNextActionError } from "@/server/unified-crm/customer-next-action-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerNextActionMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerNextActionAccessOptions = {
  commandMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

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
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerNextActionError(
    "CUSTOMER_360_NOT_AUTHORIZED",
    "Customer next action is temporarily unavailable."
  );
}

export function requireUnifiedCrmCustomerNextActionAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNextActionAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomerNextActionPolicy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomerNextActionError(
      "CUSTOMER_360_OFF",
      "Customer next action is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerNextActionError(
      "CUSTOMER_360_OFF",
      "Customer next action is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerNextActionMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerNextActionError(
      "CUSTOMER_360_OFF",
      "Customer next action is temporarily unavailable."
    );
  }
  return {
    commandMode: "REVIEW" as const,
    recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
