import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import {
  getPermittedWorkspaces,
  isWorkspaceKey,
  type WorkspaceKey
} from "./navigation";
import type { AuthenticatedUser } from "./store";

export const WORKSPACE_COOKIE_NAME = "tms_active_workspace";

export function resolveWorkspacePreference(
  user: AuthenticatedUser,
  value: unknown
): WorkspaceKey | null {
  if (!isWorkspaceKey(value)) return null;
  return getPermittedWorkspaces(user).some((workspace) => workspace.key === value)
    ? value
    : null;
}

export function buildWorkspacePreferenceCookie(workspace: WorkspaceKey): {
  name: string;
  options: Partial<ResponseCookie>;
  value: string;
} {
  return {
    name: WORKSPACE_COOKIE_NAME,
    value: workspace,
    options: {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  };
}
