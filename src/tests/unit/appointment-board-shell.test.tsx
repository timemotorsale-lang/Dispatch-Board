import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppointmentBoardShell,
  buildOutcomeSuccessNotice,
  isProposedScheduleStartInPast,
  isUnscheduledDraftAppointment
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

  it("classifies missing-time draft appointments as unscheduled board items", () => {
    expect(
      isUnscheduledDraftAppointment({
        status: "draft",
        startsAtIso: null,
        endsAtIso: null
      })
    ).toBe(true);

    expect(
      isUnscheduledDraftAppointment({
        status: "draft",
        startsAtIso: "2026-07-06T15:00:00.000Z",
        endsAtIso: "2026-07-06T16:00:00.000Z"
      })
    ).toBe(false);

    expect(
      isUnscheduledDraftAppointment({
        status: "confirmed",
        startsAtIso: null,
        endsAtIso: null
      })
    ).toBe(false);
  });

  it("detects proposed draft schedule starts that are already in the past", () => {
    expect(
      isProposedScheduleStartInPast({
        localDate: "2026-07-06",
        startTime: "09:30",
        now: new Date("2026-07-06T15:00:00.000Z")
      })
    ).toBe(true);

    expect(
      isProposedScheduleStartInPast({
        localDate: "2026-07-06",
        startTime: "10:30",
        now: new Date("2026-07-06T15:00:00.000Z")
      })
    ).toBe(false);
  });
});
