import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomer360Policy } from "@/server/policies/unified-crm-customer-360";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerTaskBridgeError } from "@/server/unified-crm/customer-task-bridge-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerTaskBridgeMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerTaskBridgeAccessOptions = {
  bridgeMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function resolveUnifiedCrmCustomerTaskBridgeMode(
  options: Pick<UnifiedCrmCustomerTaskBridgeAccessOptions, "bridgeMode" | "nodeEnv"> = {}
): UnifiedCrmCustomerTaskBridgeMode {
  const explicit = typeof options.bridgeMode === "string" ? options.bridgeMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmCustomerTaskBridgeAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerTaskBridgeAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomer360Policy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });

  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomerTaskBridgeError(
      "CUSTOMER_TASK_BRIDGE_OFF",
      "CRM task handoff is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerTaskBridgeError(
      "CUSTOMER_TASK_BRIDGE_OFF",
      "CRM task handoff is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerTaskBridgeMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerTaskBridgeError(
      "CUSTOMER_TASK_BRIDGE_OFF",
      "CRM task handoff is temporarily unavailable."
    );
  }

  return {
    bridgeMode: "REVIEW" as const,
    readMode: "REVIEW" as const,
    recordScope,
    shellMode: "REVIEW" as const
  };
}
