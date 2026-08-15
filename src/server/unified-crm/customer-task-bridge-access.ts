import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
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

export function requireUnifiedCrmCustomerTaskBridgePolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerRecordScope {
  if (!actor) {
    throw new UnifiedCrmCustomerTaskBridgeError(
      "AUTHENTICATION_REQUIRED",
      "CRM task handoff is temporarily unavailable."
    );
  }
  if (!actor.isActive) {
    throw new UnifiedCrmCustomerTaskBridgeError(
      "CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED",
      "CRM task handoff is temporarily unavailable."
    );
  }

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerTaskBridgeError(
    "CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED",
    "CRM task handoff is temporarily unavailable."
  );
}

export function requireUnifiedCrmCustomerTaskBridgeAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerTaskBridgeAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomerTaskBridgePolicy(actor);
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
