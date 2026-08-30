import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppointmentConsoleNewAppointment,
  AppointmentConsoleTodayFlow
} from "@/features/appointments/appointment-console-refinement";

describe("Appointment Console refinement", () => {
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

    expect(markup).toContain("New Appointment");
    expect(markup).toContain("Back to Appointment Console");
    expect(markup).toContain("Appointment Setup");
    expect(markup).toContain("Customer search");
    expect(markup).toContain("Vehicle search");
    expect(markup).toContain("Search name, phone, email, or customer #");
    expect(markup).toContain("VIN, stock #, plate, or vehicle");
    expect(markup).toContain("Purpose");
    expect(markup).toContain("Customer Issue / Resolution");
    expect(markup).toContain("Title / Documentation Issue");
    expect(markup).toContain("Daily Rental / Loaner");
    expect(markup).toContain("Photos / Marketing / Advertising");
    expect(markup).toContain("2:30 PM");
    expect(markup).toContain("8:00 AM");
    expect(markup).toContain("5:00 PM");
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
