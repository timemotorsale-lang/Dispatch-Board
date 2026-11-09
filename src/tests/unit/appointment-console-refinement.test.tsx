import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { placeCalendarEvents, type CalendarGridEvent } from "@/features/appointments/calendar-time-grid";

import {
  AppointmentConsoleNewAppointment,
  AppointmentConsoleTodayFlow
} from "@/features/appointments/appointment-console-refinement";

describe("Appointment Console refinement", () => {
  it("gives overlapping appointments separate lanes and restores full width for later appointments", () => {
    const event = (id: string, startMinute: number, endMinute: number): CalendarGridEvent => ({
      id, startMinute, endMinute, title: id, timeLabel: "", style: {}, onOpen: () => {}
    });
    const placed = placeCalendarEvents([
      event("Test drive", 480, 525),
      event("Quick visit", 510, 525),
      event("Delivery", 540, 600)
    ]);

    expect(placed.map(({ lane, laneCount }) => [lane, laneCount])).toEqual([[0, 2], [1, 2], [0, 1]]);
  });

  it("opens the dedicated calendar in Week view with direct creation and date controls", () => {
    const markup = renderToStaticMarkup(<AppointmentConsoleNewAppointment initialFullCalendar />);

    expect(markup).toContain('aria-label="Full-page appointment calendar"');
    expect(markup).toContain('aria-label="Week time grid"');
    expect(markup).toContain('aria-label="Toggle calendar sidebar"');
    expect(markup).toContain('aria-label="Create appointment on');
    expect(markup).toContain('aria-label="Calendar view"');
    expect(markup).toContain("Appointment categories");
    expect(markup).toContain("My calendars");
    expect(markup).toContain("Time Motor Sales");
    expect(markup).toContain("Personal calendar");
  });

  it("renders the approved Today Flow landing without duplicating the app shell sidebar", () => {
    const markup = renderToStaticMarkup(<AppointmentConsoleTodayFlow />);

    expect(markup).toContain("Appointment Console");
    expect(markup).toContain("Today Flow");
    expect(markup).toContain("Schedule Board");
    expect(markup).toContain("Capacity Confidence");
    expect(markup).toContain("Confirmation Queue");
    expect(markup).toContain("Follow-up Scheduling");
    expect(markup).toContain("Exceptions / Manager Review");
    expect(markup).not.toContain("Appointment Console navigation");
    expect(markup).not.toContain("Coordinator Home");
  });

  it("renders the approved calendar-first new appointment workspace", () => {
    const markup = renderToStaticMarkup(<AppointmentConsoleNewAppointment />);

    expect(markup).toContain("New appointment");
    expect(markup).toContain("Back to Appointment Console");
    expect(markup).toContain("Appointment Setup");
    expect(markup).toContain("Open full calendar");
    expect(markup).toContain(">Agenda</button>");
    expect(markup).not.toContain("Expand calendar");
    expect(markup).toContain("Customer search");
    expect(markup).toContain("Vehicle search");
    expect(markup).toContain("Search name, phone, email, or customer #");
    expect(markup).toContain("VIN, stock #, plate, or vehicle");
    expect(markup).toContain("Purpose");
    expect(markup).toContain("Customer Issue / Resolution");
    expect(markup).toContain("Title / Documentation Issue");
    expect(markup).toContain("Daily Rental / Loaner");
    expect(markup).toContain("Photos / Marketing / Advertising");
    expect(markup).toContain("Business Appointment");
    expect(markup).toContain("Banker / Lender Appointment");
    expect(markup).toContain("Licensing / Permit Appointment");
    expect(markup).toContain("Phone Company / Utility Appointment");
    expect(markup).toContain("Managerial Appointment");
    expect(markup).toContain("2:30 PM");
    expect(markup).toContain("8:00 AM");
    expect(markup).toContain("5:00 PM");
    expect(markup).toContain("5:30 PM");
    expect(markup).toContain("Quick appointment slots");
    expect(markup).toContain("selected");
    expect(markup).toContain("Appointment Summary");
    expect(markup).toContain("Appointment reason");
    expect(markup).toContain("Add appointment reason");
    expect(markup).toContain("Ready to create appointment.");
    expect(markup).toContain("Create Appointment");
    expect(markup).toContain("Staff conflicts");
    expect(markup).not.toContain("command ledger");
    expect(markup).not.toContain("Canonical command");
    expect(markup).not.toContain("Coordinator Home");
  });
});
