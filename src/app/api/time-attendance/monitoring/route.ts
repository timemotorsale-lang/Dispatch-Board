import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendanceOperationalHealth, runTimeAttendanceOperationalNotificationScan } from "@/server/time-attendance";

export async function GET() {
  try {
    return NextResponse.json(await getTimeAttendanceOperationalHealth(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operational monitoring is unavailable.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : 400 });
  }
}

export async function POST() {
  try {
    return NextResponse.json(await runTimeAttendanceOperationalNotificationScan(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operational notification scan failed.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : 400 });
  }
}
