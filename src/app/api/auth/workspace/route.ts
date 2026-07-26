import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  getDefaultLandingRoute,
  getPermittedWorkspaces,
  isWorkspaceKey
} from "@/server/auth/navigation";
import {
  buildWorkspacePreferenceCookie,
  resolveWorkspacePreference
} from "@/server/auth/workspace-preference";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  return NextResponse.json({
    workspaces: getPermittedWorkspaces(user).map((workspace) => ({
      key: workspace.key,
      label: workspace.label,
      description: workspace.description,
      landingRoute: workspace.landingRoute
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { workspace?: unknown } | null;
  if (!isWorkspaceKey(payload?.workspace)) {
    return NextResponse.json({ error: "A valid workspace is required." }, { status: 400 });
  }

  const workspace = resolveWorkspacePreference(user, payload.workspace);
  if (!workspace) {
    return NextResponse.json({ error: "That workspace is not assigned to this user." }, { status: 403 });
  }

  const preference = buildWorkspacePreferenceCookie(workspace);
  const cookieStore = await cookies();
  cookieStore.set(preference.name, preference.value, preference.options);

  return NextResponse.json({
    redirectTo: getDefaultLandingRoute(user, workspace),
    workspace
  });
}
