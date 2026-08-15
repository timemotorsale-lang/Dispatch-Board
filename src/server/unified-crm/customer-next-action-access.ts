import type { AuthenticatedUser } from "@/server/auth/store";
import {
  requireUnifiedCrmCustomer360Policy
} from "@/server/policies/unified-crm-customer-360";
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

export function requireUnifiedCrmCustomerNextActionAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNextActionAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomer360Policy(actor);
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
