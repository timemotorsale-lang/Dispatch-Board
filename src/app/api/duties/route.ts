import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createManagedDuty,
  getTeamManagementSnapshotForManager
} from "@/server/services/team-management";
import { isManagedDutyCreateInput } from "@/server/validation/team-management";

function getDutyManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Duty name and workflow area are required." ||
    message === "Duty name is required." ||
    message === "Duty workflow area is required." ||
    message === "A duty with that name already exists."
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const snapshot = await getTeamManagementSnapshotForManager(user);

    return NextResponse.json({ duties: snapshot.duties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load duties right now.";

    return NextResponse.json({ error: message }, { status: getDutyManagementErrorStatus(message) });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isManagedDutyCreateInput(payload)) {
    return NextResponse.json({ error: "Duty name and workflow area are required." }, { status: 400 });
  }

  try {
    const duty = await createManagedDuty(user, payload);

    return NextResponse.json({ duty }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the duty right now.";

    return NextResponse.json({ error: message }, { status: getDutyManagementErrorStatus(message) });
  }
}
