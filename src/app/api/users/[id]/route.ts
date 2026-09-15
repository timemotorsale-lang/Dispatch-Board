import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateManagedTeamUser } from "@/server/services/team-management";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getUserManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Team member id is required." ||
    message === "Team member update payload must be an object." ||
    message === "Team member name is required." ||
    message === "Team member email is required." ||
    message === "Team member roleIds must be a string array." ||
    message === "Team member dutyIds must be a string array." ||
    message === "Team member isActive must be boolean." ||
    message === "Temporary password is required." ||
    message === "Temporary password must be at least 12 characters." ||
    message === "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol." ||
    message === "Temporary password cannot use a common or default phrase." ||
    message === "Team member updates require at least one field." ||
    message === "At least one role must be assigned." ||
    message === "Every assigned role must reference an existing role." ||
    message === "Every assigned duty must reference an existing duty." ||
    message === "Only the General Manager can grant delegated manager capabilities." ||
    message === "A user with that email already exists."
  ) {
    return 400;
  }

  if (message === "Team member not found.") {
    return 404;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const teamUser = await updateManagedTeamUser(user, id, payload);

    return NextResponse.json({ user: teamUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the team member right now.";

    return NextResponse.json({ error: message }, { status: getUserManagementErrorStatus(message) });
  }
}
