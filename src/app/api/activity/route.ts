import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
<<<<<<< HEAD
import { listActivityFeedEventsForDate, listActivityFeedEventsForToday } from "@/server/services/activity-feed";

function getActivityErrorStatus(message: string) {
=======
import { getActivityFeedForDate, getActivityFeedForToday } from "@/server/services/activity-feed";

function getActivityFeedErrorStatus(message: string) {
>>>>>>> main
  if (message === "Authentication required.") {
    return 401;
  }

<<<<<<< HEAD
  if (message === "Board access required.") {
=======
  if (message === "Activity feed access required.") {
>>>>>>> main
    return 403;
  }

  if (
<<<<<<< HEAD
    message === "Board date is required." ||
=======
>>>>>>> main
    message === "Board date must use YYYY-MM-DD format." ||
    message === "Board date must be a valid calendar date."
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
<<<<<<< HEAD
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date");

  try {
    const payload = boardDate
      ? await listActivityFeedEventsForDate(user, boardDate)
      : await listActivityFeedEventsForToday(user);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load activity right now.";
=======
  const date = new URL(request.url).searchParams.get("date");

  try {
    const result = date
      ? await getActivityFeedForDate(user, date)
      : await getActivityFeedForToday(user);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the activity feed right now.";
>>>>>>> main

    return NextResponse.json(
      {
        error: message
      },
      {
<<<<<<< HEAD
        status: getActivityErrorStatus(message)
=======
        status: getActivityFeedErrorStatus(message)
>>>>>>> main
      }
    );
  }
}
