import { getDefaultLandingRoute, getPermittedWorkspaces } from "@/server/auth/navigation";
import type { AuthenticatedUser } from "@/server/auth/store";

export type CrmNextMode = "OFF" | "REVIEW" | "DOGFOOD";
export type CrmNextWorkspace = "MANAGEMENT" | "SALES";
export type CrmNextAccessReason =
  | "ALLOWED"
  | "AUTHENTICATION_REQUIRED"
  | "INACTIVE_USER"
  | "WORKSPACE_NOT_ELIGIBLE"
  | "CRM_NEXT_OFF";

export type CrmNextAccess = {
  allowed: boolean;
  contractVersion: "crm-next-access/v1";
  fallbackHref: string;
  mode: CrmNextMode;
  reason: CrmNextAccessReason;
  workspace: CrmNextWorkspace | null;
};

type CrmNextAccessOptions = {
  flag?: unknown;
};

function normalizeFlag(value: unknown): CrmNextMode {
  if (typeof value !== "string") return "OFF";
  const normalized = value.trim().toUpperCase();
  if (["DOGFOOD", "PILOT", "LIVE", "ACTIVE"].includes(normalized)) return "DOGFOOD";
  return ["1", "TRUE", "ON", "ENABLED", "REVIEW"].includes(normalized) ? "REVIEW" : "OFF";
}

export function resolveCrmNextMode(options: CrmNextAccessOptions = {}): CrmNextMode {
  return normalizeFlag(options.flag ?? process.env.CRM_NEXT);
}

export function resolveCrmNextWorkspace(user: AuthenticatedUser | null): CrmNextWorkspace | null {
  if (!user?.isActive) return null;

  const workspaces = new Set(getPermittedWorkspaces(user).map((workspace) => workspace.key));
  if (workspaces.has("MANAGEMENT")) return "MANAGEMENT";
  if (workspaces.has("SALES")) return "SALES";
  return null;
}

export function getCrmNextFallbackHref(user: AuthenticatedUser | null) {
  if (!user?.isActive) return "/login";

  const workspace = resolveCrmNextWorkspace(user);
  if (workspace === "MANAGEMENT") return "/manager-workspace";
  if (workspace === "SALES") return "/sales";
  return getDefaultLandingRoute(user);
}

export function resolveCrmNextAccess(
  user: AuthenticatedUser | null,
  options: CrmNextAccessOptions = {}
): CrmNextAccess {
  const mode = resolveCrmNextMode(options);
  const fallbackHref = getCrmNextFallbackHref(user);

  if (!user) {
    return { allowed: false, contractVersion: "crm-next-access/v1", fallbackHref, mode, reason: "AUTHENTICATION_REQUIRED", workspace: null };
  }
  if (!user.isActive) {
    return { allowed: false, contractVersion: "crm-next-access/v1", fallbackHref, mode, reason: "INACTIVE_USER", workspace: null };
  }

  const workspace = resolveCrmNextWorkspace(user);
  if (!workspace) {
    return { allowed: false, contractVersion: "crm-next-access/v1", fallbackHref, mode, reason: "WORKSPACE_NOT_ELIGIBLE", workspace: null };
  }
  if (mode === "OFF") {
    return { allowed: false, contractVersion: "crm-next-access/v1", fallbackHref, mode, reason: "CRM_NEXT_OFF", workspace };
  }

  return { allowed: true, contractVersion: "crm-next-access/v1", fallbackHref, mode, reason: "ALLOWED", workspace };
}

