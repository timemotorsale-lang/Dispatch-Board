import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getTimeAttendanceCaptureState, submitTimeAttendanceCaptureCommand } from "@/server/time-attendance";

export async function GET() {
  try {
    return NextResponse.json(await getTimeAttendanceCaptureState(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time attendance state failed.";
    const status = message === "Authentication required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const result = await submitTimeAttendanceCaptureCommand(
      await getCurrentUser(),
      await request.json().catch(() => null)
    );
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time attendance capture failed.";
    const status = message === "Authentication required."
      ? 401
      : message.includes("Only the staff member or a manager")
        ? 403
        : error instanceof EnterpriseCommandConflictError ||
            message.includes("Cannot apply") ||
            message.includes("version")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
