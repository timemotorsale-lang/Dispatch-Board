import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendancePolicyAdministration, runTimeAttendancePolicyAdministrationCommand } from "@/server/time-attendance/policy-admin-service";

function status(error: unknown) {
  const message = error instanceof Error ? error.message : "Time Attendance policy administration failed.";
  if (message === "Authentication required.") return 401;
  if (message.includes("capability required")) return 403;
  if (message.includes("overlapping") || message.includes("blocked")) return 409;
  return 400;
}

export async function GET() {
  try {
    return NextResponse.json(await getTimeAttendancePolicyAdministration(await getCurrentUser()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Policy administration failed." }, { status: status(error) });
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await runTimeAttendancePolicyAdministrationCommand(await getCurrentUser(), await request.json().catch(() => null)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Policy administration failed." }, { status: status(error) });
  }
}
