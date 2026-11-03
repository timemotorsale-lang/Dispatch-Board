import { getDefaultLandingRoute, getPermittedWorkspaces } from "@/server/auth/navigation";
import type { AuthenticatedUser } from "@/server/auth/store";

export const UNIFIED_CRM_CAPABILITIES = [
  "crm.console.access",
  "crm.customer.view",
  "crm.sensitive.view",
  "crm.mutate",
  "crm.export",
  "crm.admin"
] as const;

export type UnifiedCrmCapability = (typeof UNIFIED_CRM_CAPABILITIES)[number];
export type UnifiedCrmWorkspace = "MANAGEMENT" | "SALES";
export type UnifiedCrmAccessReason =
  | "ALLOWED"
  | "AUTHENTICATION_REQUIRED"
  | "INACTIVE_USER"
  | "WORKSPACE_NOT_ELIGIBLE"
  | "CAPABILITY_NOT_GRANTED";

export type UnifiedCrmCapabilityDecision = {
  allowed: boolean;
  capability: UnifiedCrmCapability;
  fallbackHref: string;
  reason: UnifiedCrmAccessReason;
  workspace: UnifiedCrmWorkspace | null;
};

const FOUNDATION_ALLOWED_CAPABILITIES = new Set<UnifiedCrmCapability>([
  "crm.console.access",
  "crm.customer.view",
  "crm.mutate"
]);

export function resolveUnifiedCrmWorkspace(
  user: AuthenticatedUser | null
): UnifiedCrmWorkspace | null {
  if (!user?.isActive) return null;

  const workspaces = new Set(getPermittedWorkspaces(user).map((workspace) => workspace.key));
  if (workspaces.has("MANAGEMENT")) return "MANAGEMENT";
  // Coordinators prepare customer/deal work using the existing owner-scoped staff policy.
  // This does not grant the Sales workspace, organization-wide access, or manager powers.
  if (workspaces.has("SALES") || workspaces.has("OPERATIONS_COORDINATOR")) return "SALES";
  return null;
}

export function getUnifiedCrmFallbackHref(user: AuthenticatedUser | null) {
  if (!user?.isActive) return "/login";

  const workspace = resolveUnifiedCrmWorkspace(user);
  if (workspace === "MANAGEMENT") return "/manager-workspace";
  if (workspace === "SALES") return getPermittedWorkspaces(user).some(item => item.key === "SALES")
    ? "/tasks?department=SALES" : "/operations-coordinator";
  return getDefaultLandingRoute(user);
}

export function evaluateUnifiedCrmCapability(
  user: AuthenticatedUser | null,
  capability: UnifiedCrmCapability
): UnifiedCrmCapabilityDecision {
  const fallbackHref = getUnifiedCrmFallbackHref(user);
  if (!user) {
    return { allowed: false, capability, fallbackHref, reason: "AUTHENTICATION_REQUIRED", workspace: null };
  }
  if (!user.isActive) {
    return { allowed: false, capability, fallbackHref, reason: "INACTIVE_USER", workspace: null };
  }

  const workspace = resolveUnifiedCrmWorkspace(user);
  if (!workspace) {
    return { allowed: false, capability, fallbackHref, reason: "WORKSPACE_NOT_ELIGIBLE", workspace: null };
  }
  if (!FOUNDATION_ALLOWED_CAPABILITIES.has(capability)) {
    return { allowed: false, capability, fallbackHref, reason: "CAPABILITY_NOT_GRANTED", workspace };
  }

  return { allowed: true, capability, fallbackHref, reason: "ALLOWED", workspace };
}

export function getUnifiedCrmCapabilityMap(user: AuthenticatedUser | null) {
  return Object.fromEntries(
    UNIFIED_CRM_CAPABILITIES.map((capability) => [
      capability,
      evaluateUnifiedCrmCapability(user, capability).allowed
    ])
  ) as Record<UnifiedCrmCapability, boolean>;
}
