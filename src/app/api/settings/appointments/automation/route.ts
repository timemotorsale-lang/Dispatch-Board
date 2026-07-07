import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getAppointmentAutomationOperationsConsoleForManager } from "@/server/services/appointment-automation-operations-console";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Manager access required.") return 403;
  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const console = await getAppointmentAutomationOperationsConsoleForManager(user);

    return NextResponse.json({ console });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load automation operations console.";

    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
