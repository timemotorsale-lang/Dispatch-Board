import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTimeAttendanceManagerReviewQueue } from "@/server/time-attendance";

export async function GET() {
  try {
    return NextResponse.json(await getTimeAttendanceManagerReviewQueue(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time attendance manager review failed.";
    const status = message === "Authentication required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
