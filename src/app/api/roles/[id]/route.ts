import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateManagedRole } from "@/server/services/team-management";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getRoleManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Role id is required." ||
    message === "Role update payload must be an object." ||
    message === "Role name is required." ||
    message === "Role description must be a string when provided." ||
    message === "Role dutyIds must be a string array." ||
    message === "Role updates require at least one field." ||
    message === "Every default duty must reference an existing duty." ||
    message === "A role with that name already exists."
  ) {
    return 400;
  }

  if (message === "Role not found.") {
    return 404;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const role = await updateManagedRole(user, id, payload);

    return NextResponse.json({ role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the role right now.";

    return NextResponse.json({ error: message }, { status: getRoleManagementErrorStatus(message) });
  }
}
