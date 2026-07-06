import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppointmentBoardShell,
  buildOutcomeSuccessNotice
} from "@/features/appointments/appointment-board-shell";

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

  it("summarizes generated follow-up automation after outcome save", () => {
    expect(
      buildOutcomeSuccessNotice({
        appointmentId: "APT-10245",
        result: {
          execution: {
            resultSnapshot: {
              generatedFollowUpAppointmentNumbers: ["FUP-APT-10245-MOCK"],
              automatedTaskCount: 1
            }
          }
        }
      })
    ).toBe(
      "Outcome saved for APT-10245. Completion, outcome, follow-up, history, and command ledger were updated. Draft follow-up appointment created: FUP-APT-10245-MOCK. 1 follow-up task created."
    );
  });
});
