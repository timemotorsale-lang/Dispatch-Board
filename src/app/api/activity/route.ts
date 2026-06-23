import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getActivityFeedForDate, getActivityFeedForToday } from "@/server/services/activity-feed";

function getActivityFeedErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Activity feed access required.") {
    return 403;
  }

  if (
    message === "Board date must use YYYY-MM-DD format." ||
    message === "Board date must be a valid calendar date."
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const date = new URL(request.url).searchParams.get("date");

  try {
    const result = date
      ? await getActivityFeedForDate(user, date)
      : await getActivityFeedForToday(user);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the activity feed right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getActivityFeedErrorStatus(message)
      }
    );
  }
}
