import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateTimeAttendanceHardeningPilotReadiness } from "@/server/time-attendance";

export async function GET() {
  try {
    return NextResponse.json(evaluateTimeAttendanceHardeningPilotReadiness(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time Attendance hardening readiness failed.";
    const status = message === "Authentication required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
