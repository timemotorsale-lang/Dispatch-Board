import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppointmentBoardShell,
  buildAppointmentExceptionQueues,
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
    expect(markup).toContain("Command Center Exception Queues");
    expect(markup).toContain("Needs Scheduling");
    expect(markup).toContain("Conflict Watch");
    expect(markup).toContain("No-Show Recovery");
    expect(markup).toContain("Follow-Up Required");
  });

  it("renders admin-provided board settings when available", () => {
    const markup = renderToStaticMarkup(
      <AppointmentBoardShell
        boardSettings={{
          organizationId: "org-time-motor-sales",
          locationId: "loc-time-motor-sales-minneapolis",
          locationName: "Time Motor Sales — Minneapolis",
          timezone: "America/Chicago",
          addressLine: "1101 E. Lake Street, Minneapolis MN 55407",
          phoneNumber: "(612) 724-3631",
          businessHoursLabel: "9:00 AM - 6:00 PM"
        }}
      />
    );

    expect(markup).toContain("1101 E. Lake Street, Minneapolis MN 55407");
    expect(markup).toContain("(612) 724-3631");
    expect(markup).toContain("9:00 AM - 6:00 PM");
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

  it("builds manager exception queues for scheduling gaps, conflicts, no-shows, and follow-up work", () => {
    const queues = buildAppointmentExceptionQueues([
      {
        id: "APT-DRAFT",
        title: "Follow-up Draft",
        customer: "Amina Said",
        vehicle: "Registration",
        category: "dmv",
        status: "draft",
        staffId: "rayana",
        staffName: "Rayana Hassan",
        startMinutes: 0,
        durationMinutes: 60,
        phone: "612-555-0100",
        complaint: "Draft needs scheduling",
        location: "Front office",
        confirmation: "Needs schedule placement",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: null,
        endsAtIso: null
      },
      {
        id: "APT-CONFLICT",
        title: "Service / Repair",
        customer: "Khalid Mohamud",
        vehicle: "Brake Inspection",
        category: "service",
        status: "confirmed",
        staffId: "brock",
        staffName: "Brock Peterson",
        startMinutes: 600,
        durationMinutes: 60,
        phone: "612-555-0101",
        complaint: "Conflict active",
        location: "Service bay",
        confirmation: "Resource conflict needs manager review",
        conflict: true,
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T15:00:00.000Z",
        endsAtIso: "2026-07-07T16:00:00.000Z"
      },
      {
        id: "APT-NOSHOW",
        title: "Test Drive",
        customer: "Ahmed Ibrahim",
        vehicle: "2018 Toyota Camry",
        category: "sales",
        status: "no-show",
        staffId: "abdi",
        staffName: "Abdi Farah",
        startMinutes: 540,
        durationMinutes: 60,
        phone: "612-555-0102",
        complaint: "Customer did not arrive",
        location: "Sales floor",
        confirmation: "No-show follow-up required",
        attendanceStatus: "NO_SHOW",
        followUpDispositionCode: "CALLBACK_REQUIRED",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T14:00:00.000Z",
        endsAtIso: "2026-07-07T15:00:00.000Z"
      },
      {
        id: "APT-FOLLOWUP",
        title: "Vehicle Delivery",
        customer: "Farah Abdi",
        vehicle: "2021 Toyota RAV4",
        category: "delivery",
        status: "follow-up",
        staffId: "mohamed",
        staffName: "Mohamed Ali",
        startMinutes: 780,
        durationMinutes: 60,
        phone: "612-555-0103",
        complaint: "Delivery follow-up",
        location: "Delivery bay",
        confirmation: "Callback required",
        needsFollowUp: true,
        followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T18:00:00.000Z",
        endsAtIso: "2026-07-07T19:00:00.000Z"
      }
    ] as any);

    expect(queues.find((queue) => queue.key === "needs-scheduling")?.items.map((item) => item.id)).toEqual([
      "APT-DRAFT"
    ]);
    expect(queues.find((queue) => queue.key === "conflict-watch")?.items.map((item) => item.id)).toEqual([
      "APT-CONFLICT"
    ]);
    expect(queues.find((queue) => queue.key === "no-show-recovery")?.items.map((item) => item.id)).toEqual([
      "APT-NOSHOW"
    ]);
    expect(queues.find((queue) => queue.key === "follow-up-required")?.items.map((item) => item.id)).toEqual([
      "APT-NOSHOW",
      "APT-FOLLOWUP"
    ]);
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
