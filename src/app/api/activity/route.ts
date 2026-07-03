import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForDate, listActivityFeedEventsForToday } from "@/server/services/activity-feed";

function getActivityErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Board access required.") {
    return 403;
  }

  if (
    message === "Board date is required." ||
    message === "Board date must use YYYY-MM-DD format." ||
    message === "Board date must be a valid calendar date."
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date");

  try {
    const payload = boardDate
      ? await listActivityFeedEventsForDate(user, boardDate)
      : await listActivityFeedEventsForToday(user);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load activity right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getActivityErrorStatus(message)
      }
    );
  }
}
