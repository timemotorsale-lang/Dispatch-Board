import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { listMyTimeAttendanceNotifications, markTimeAttendanceNotificationRead } from "@/server/time-attendance";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json(await listMyTimeAttendanceNotifications({ userId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Notifications are unavailable." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const id = raw && typeof raw === "object" && !Array.isArray(raw) && typeof raw.id === "string" ? raw.id : "";
    return NextResponse.json(await markTimeAttendanceNotificationRead(await getCurrentUser(), id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification update failed.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
