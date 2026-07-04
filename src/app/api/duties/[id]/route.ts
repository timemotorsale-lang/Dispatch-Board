import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateManagedDuty } from "@/server/services/team-management";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getDutyManagementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Duty id is required." ||
    message === "Duty update payload must be an object." ||
    message === "Duty name is required." ||
    message === "Duty workflow area is required." ||
    message === "Duty description must be a string when provided." ||
    message === "Duty updates require at least one field." ||
    message === "Only the General Manager can grant delegated manager capabilities." ||
    message === "Only the General Manager can modify delegated manager capabilities." ||
    message === "A duty with that name already exists."
  ) {
    return 400;
  }

  if (message === "Duty not found.") {
    return 404;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const duty = await updateManagedDuty(user, id, payload);

    return NextResponse.json({ duty });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the duty right now.";

    return NextResponse.json({ error: message }, { status: getDutyManagementErrorStatus(message) });
  }
}
