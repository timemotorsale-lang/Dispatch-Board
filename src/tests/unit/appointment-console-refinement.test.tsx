import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { appointmentPurposeGroup, appointmentPurposeGroups, appointmentPurposes } from "@/features/appointments/appointment-purposes";
import { placeCalendarEvents, type CalendarGridEvent } from "@/features/appointments/calendar-time-grid";

import {
  AppointmentConsoleNewAppointment,
  AppointmentConsoleTodayFlow,
  findPlannerDuplicateAppointment
} from "@/features/appointments/appointment-console-refinement";

describe("Appointment Console refinement", () => {
  it("offers a unique purpose code and an Other option in every dealership category", () => {
    expect(appointmentPurposeGroups).toHaveLength(13);
    expect(new Set(appointmentPurposes.map(purpose => purpose.value)).size).toBe(appointmentPurposes.length);
    for (const group of appointmentPurposeGroups) {
      expect(group.options.at(-1)?.label).toBe("Other");
      expect(appointmentPurposeGroup(group.category, group.options.at(-1)?.value)).toBe(group);
    }
    expect(appointmentPurposeGroup("warranty", "WARRANTY_REVIEW").label).toBe("Service & Warranty");
    expect(appointmentPurposeGroup("sales", "DEAL_REVIEW").label).toBe("Financing, Leasing & Signing");
    expect(appointmentPurposeGroup("delivery", null, "Transportation / Logistics").label).toBe("Inventory, Recon & Transport");
  });

  it("only flags a separate active booking for the same customer and time", () => {
    const startsAt = "2026-11-09T15:30:00.000Z";
    const input = { startsAt, customerId: "customer-1", customerName: "Example Customer", alreadySaved: false };
    const booking = {
      id: "appointment-1", startsAt, bookingStatus: "SCHEDULED",
      customer: { customerId: "customer-1", displayName: input.customerName, phoneNumber: null, email: null }
    };

    expect(findPlannerDuplicateAppointment([booking], input)).toBe(booking);
    expect(findPlannerDuplicateAppointment([booking], { ...input, alreadySaved: true })).toBeNull();
    expect(findPlannerDuplicateAppointment([booking], { ...input, editingId: booking.id })).toBeNull();
    expect(findPlannerDuplicateAppointment([booking], { ...input, customerId: "customer-2" })).toBeNull();
    expect(findPlannerDuplicateAppointment([booking], { ...input, startsAt: "2026-11-09T16:00:00.000Z" })).toBeNull();
    expect(findPlannerDuplicateAppointment([{ ...booking, bookingStatus: "CANCELLED" }], input)).toBeNull();
  });

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
    for (const group of appointmentPurposeGroups) {
      expect(markup).toContain(`value="${group.id}"`);
    }
    expect(markup).toContain("OTHER_CARE");
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
