import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCapability,
  getUnifiedCrmCapabilityMap,
  type UnifiedCrmAccessReason,
  type UnifiedCrmCapability,
  type UnifiedCrmWorkspace
} from "@/server/policies/unified-crm-access";

export type UnifiedCrmShellMode = "OFF" | "REVIEW";
export type UnifiedCrmShellAccessReason = UnifiedCrmAccessReason | "SHELL_OFF";

export type UnifiedCrmShellAccess = {
  allowed: boolean;
  capabilities: Record<UnifiedCrmCapability, boolean>;
  contractVersion: "ucrm-shell-access/v1";
  fallbackHref: string;
  mode: UnifiedCrmShellMode;
  reason: UnifiedCrmShellAccessReason;
  workspace: UnifiedCrmWorkspace | null;
};

type ShellAccessOptions = {
  nodeEnv?: string;
  shellMode?: unknown;
};

export function resolveUnifiedCrmShellMode(options: ShellAccessOptions = {}): UnifiedCrmShellMode {
  const configuredValue = options.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE;
  if (configuredValue !== undefined && configuredValue !== null) {
    return typeof configuredValue === "string" && configuredValue.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function resolveUnifiedCrmShellAccess(
  user: AuthenticatedUser | null,
  options: ShellAccessOptions = {}
): UnifiedCrmShellAccess {
  const access = evaluateUnifiedCrmCapability(user, "crm.console.access");
  const mode = resolveUnifiedCrmShellMode(options);
  const allowed = access.allowed && mode === "REVIEW";

  return {
    allowed,
    capabilities: getUnifiedCrmCapabilityMap(user),
    contractVersion: "ucrm-shell-access/v1",
    fallbackHref: access.fallbackHref,
    mode,
    reason: access.allowed && mode === "OFF" ? "SHELL_OFF" : access.reason,
    workspace: access.workspace
  };
}
