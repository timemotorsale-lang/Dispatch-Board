import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createManagedRole,
  getTeamManagementSnapshotForManager
} from "@/server/services/team-management";
import { isManagedRoleCreateInput } from "@/server/validation/team-management";

function getRoleManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Role name is required." ||
    message === "Every default duty must reference an existing duty." ||
    message === "A role with that name already exists."
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const snapshot = await getTeamManagementSnapshotForManager(user);

    return NextResponse.json({ roles: snapshot.roles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load roles right now.";

    return NextResponse.json({ error: message }, { status: getRoleManagementErrorStatus(message) });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isManagedRoleCreateInput(payload)) {
    return NextResponse.json({ error: "Role name is required." }, { status: 400 });
  }

  try {
    const role = await createManagedRole(user, payload);

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the role right now.";

    return NextResponse.json({ error: message }, { status: getRoleManagementErrorStatus(message) });
  }
}
