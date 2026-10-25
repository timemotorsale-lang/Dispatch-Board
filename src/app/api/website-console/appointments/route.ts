import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { canOpenWebsiteConsole } from "@/features/website-console/policy";
import { getInitialMinneapolisLocation } from "@/server/appointments/location-foundation";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import { listAppointmentReadModels } from "@/server/services/appointment-read-service";
import { isCalendarDate, minnesotaToday } from "../../../../../packages/appointment-preview/domain";

export const dynamic = "force-dynamic";

function response(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor?.isActive) return response({ error: "Sign in to review the staff calendar." }, 401);
    if (!canOpenWebsiteConsole(actor)) return response({ error: "Website appointment access is not permitted." }, 403);
    const query = new URL(request.url).searchParams;
    const date = query.get("date") ?? minnesotaToday();
    if (query.getAll("date").length > 1 || [...query.keys()].some(key => key !== "date") || !isCalendarDate(date)) return response({ error: "Choose one valid calendar date. Location and organization cannot be overridden." }, 400);
    const location = getInitialMinneapolisLocation();
    const result = await listAppointmentReadModels(actor, {
      locationId: location.id,
      windowStart: locationLocalDateMinuteToInstant({ localDate: date, minuteOfDay: 0, timezone: location.timezone }),
      windowEnd: locationLocalDateMinuteToInstant({ localDate: date, minuteOfDay: 1440, timezone: location.timezone }),
      includeCancelled: true
    });
    return response({ date, timezone: location.timezone, source: "SHARED_STAFF_CALENDAR", readOnly: true, websiteIntakeConnected: false, truncated: result.appointments.length > 100, rows: result.appointments.slice(0, 100).map(appointment => ({
      id: appointment.id, appointmentNumber: appointment.appointmentNumber, title: appointment.title,
      startsAt: appointment.startsAt, endsAt: appointment.endsAt, bookingStatus: appointment.bookingStatus,
      confirmationStatus: appointment.confirmationStatus, ownerName: appointment.owner?.name ?? "Unassigned"
    })) });
  } catch (problem) {
    if (problem instanceof Error && problem.message === "Appointment schedule is not authorized.") return response({ error: "Your staff account needs appointment access for this location." }, 403);
    return response({ error: "The shared calendar could not be loaded. This is not an empty calendar. Check the appointment backend and try again." }, 503);
  }
}
