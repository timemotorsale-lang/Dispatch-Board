import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getActivityFeedForDate, getActivityFeedForToday } from "@/server/services/activity-feed";
import { getBoardReadErrorStatus } from "@/app/api/board/response";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  try {
    const date = new URL(request.url).searchParams.get("date");
    const result = date === null
      ? await getActivityFeedForToday(user)
      : await getActivityFeedForDate(user, date);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load activity right now.";
    return NextResponse.json({ error: message }, { status: getBoardReadErrorStatus(message) });
  }
}
