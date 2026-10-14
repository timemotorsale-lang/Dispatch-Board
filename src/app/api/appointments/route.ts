import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getInitialMinneapolisLocation } from "@/server/appointments/location-foundation";
import {
  getLocationLocalDate,
  locationLocalDateMinuteToInstant
} from "@/server/appointments/location-time-service";
import { listAppointmentReadModels } from "@/server/services/appointment-read-service";

const defaultLocation = getInitialMinneapolisLocation();

function getAppointmentReadErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment schedule is not authorized.") {
    return 403;
  }

  if (
    message.includes("must be a valid date") ||
    message.includes("must use YYYY-MM-DD") ||
    message.includes("must be provided together") ||
    message.includes("requires a location")
  ) {
    return 400;
  }

  return 500;
}

function parseBoolean(value: string | null) {
  return value === "true" || value === "1";
}

function getReadWindow(searchParams: URLSearchParams, now: Date) {
  const timezone = defaultLocation.timezone;
  const date = searchParams.get("date") ?? getLocationLocalDate(now, timezone);
  const windowStart = searchParams.get("windowStart");
  const windowEnd = searchParams.get("windowEnd");

  if (windowStart || windowEnd) {
    if (!windowStart || !windowEnd) {
      throw new Error("Appointment read query windowStart and windowEnd must be provided together.");
    }

    return {
      date,
      windowStart: new Date(windowStart),
      windowEnd: new Date(windowEnd)
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Appointment read query date must use YYYY-MM-DD.");
  }

  return {
    date,
    windowStart: locationLocalDateMinuteToInstant({
      localDate: date,
      minuteOfDay: 0,
      timezone
    }),
    windowEnd: locationLocalDateMinuteToInstant({
      localDate: date,
      minuteOfDay: 1440,
      timezone
    })
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  try {
    const url = new URL(request.url);
    const now = new Date();
    const locationId = url.searchParams.get("locationId") ?? defaultLocation.id;
    const readWindow = getReadWindow(url.searchParams, now);
    const result = await listAppointmentReadModels(user, {
      locationId,
      windowStart: readWindow.windowStart,
      windowEnd: readWindow.windowEnd,
      includeCancelled: parseBoolean(url.searchParams.get("includeCancelled")),
      searchText: url.searchParams.get("search") ?? url.searchParams.get("q")
    });

    return NextResponse.json({
      ...result,
      date: readWindow.date,
      location: {
        id: defaultLocation.id,
        name: defaultLocation.name,
        timezone: defaultLocation.timezone
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load appointments right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentReadErrorStatus(message)
      }
    );
  }
}
