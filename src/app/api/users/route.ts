import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createManagedTeamUser,
  getTeamManagementSnapshotForManager
} from "@/server/services/team-management";
import { isTeamMemberCreateInput } from "@/server/validation/team-management";

function getUserManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Name, email, password, and at least one role are required." ||
    message === "Team member name is required." ||
    message === "Team member email is required." ||
    message === "Temporary password is required." ||
    message === "Temporary password must be at least 12 characters." ||
    message === "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol." ||
    message === "Temporary password cannot use a common or default phrase." ||
    message === "At least one role must be assigned." ||
    message === "Every assigned role must reference an existing role." ||
    message === "Every assigned duty must reference an existing duty." ||
    message === "Only the General Manager can grant delegated manager capabilities." ||
    message === "A user with that email already exists."
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const snapshot = await getTeamManagementSnapshotForManager(user);

    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load team management right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getUserManagementErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isTeamMemberCreateInput(payload)) {
    return NextResponse.json(
      {
        error: "Name, email, password, and at least one role are required."
      },
      {
        status: 400
      }
    );
  }

  try {
    const createdUser = await createManagedTeamUser(user, payload);

    return NextResponse.json(
      {
        user: createdUser
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the team member right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getUserManagementErrorStatus(message)
      }
    );
  }
}
