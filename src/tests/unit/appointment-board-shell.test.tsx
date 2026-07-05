import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentBoardShell } from "@/features/appointments/appointment-board-shell";

describe("appointment board shell", () => {
  it("renders the mockup-aligned board surface with enterprise controls", () => {
    const markup = renderToStaticMarkup(<AppointmentBoardShell />);

    expect(markup).toContain("Appointment Board");
    expect(markup).toContain("1101 E. Lake Street");
    expect(markup).toContain("New Appointment");
    expect(markup).toContain("Total Appointments");
    expect(markup).toContain("Service / Repair");
    expect(markup).toContain("Linked Tasks");
    expect(markup).toContain("Enterprise Controls");
    expect(markup).toContain("Upcoming Appointments");
  });
});
