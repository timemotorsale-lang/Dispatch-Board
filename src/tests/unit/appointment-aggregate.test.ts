import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_ATTENDANCE_STATUSES,
  APPOINTMENT_BOOKING_STATUSES,
  APPOINTMENT_CONFIRMATION_STATUSES,
  APPOINTMENT_EXECUTION_STATUSES,
  APPOINTMENT_SOURCE_TYPES
} from "@/server/appointments/appointment-domain";
import {
  normalizeAppointmentAggregate,
  type AppointmentAggregateInput
} from "@/server/validation/appointment";

const baseDraft: AppointmentAggregateInput = {
  appointmentNumber: "apt-10245",
  organizationId: "org-time-motor-sales",
  locationId: "loc-time-motor-sales-minneapolis",
  ownerUserId: null,
  createdByUserId: "user-manager",
  sourceType: "MANUAL",
  title: "Service / Repair",
  schedulingTimezone: "America/Chicago",
  bookingStatus: "DRAFT",
  confirmationStatus: "NOT_REQUIRED",
  attendanceStatus: "EXPECTED",
  executionStatus: "NOT_STARTED",
  version: 1
};

function scheduledAppointment(
  overrides: Partial<AppointmentAggregateInput> = {}
): AppointmentAggregateInput {
  return {
    ...baseDraft,
    ownerUserId: "user-service-advisor",
    bookingStatus: "SCHEDULED",
    confirmationStatus: "NOT_SENT",
    startsAt: new Date("2026-07-06T14:00:00.000Z"),
    endsAt: new Date("2026-07-06T15:00:00.000Z"),
    purposeSnapshot: {
      code: "SERVICE_REPAIR",
      version: 1,
      name: "Service / Repair"
    },
    ...overrides
  };
}

describe("appointment aggregate foundation", () => {
  it("keeps the approved independent state and source catalogs explicit", () => {
    expect(APPOINTMENT_BOOKING_STATUSES).toEqual([
      "DRAFT",
      "PENDING_APPROVAL",
      "SCHEDULED",
      "CANCELLED",
      "COMPLETED"
    ]);
    expect(APPOINTMENT_CONFIRMATION_STATUSES).toContain("DECLINED");
    expect(APPOINTMENT_ATTENDANCE_STATUSES).toContain("NO_SHOW");
    expect(APPOINTMENT_EXECUTION_STATUSES).toContain("WAITING");
    expect(APPOINTMENT_SOURCE_TYPES).toEqual([
      "MANUAL",
      "TASK",
      "AUTOMATION",
      "RECURRENCE",
      "COPY",
      "IMPORT"
    ]);
  });

  it("normalizes an incomplete draft without committing capacity", () => {
    expect(normalizeAppointmentAggregate(baseDraft)).toMatchObject({
      appointmentNumber: "APT-10245",
      ownerUserId: null,
      startsAt: null,
      endsAt: null,
      bookingStatus: "DRAFT",
      version: 1
    });
  });

  it("accepts a scheduled appointment with an owner, valid slot, and historical purpose snapshot", () => {
    expect(normalizeAppointmentAggregate(scheduledAppointment())).toMatchObject({
      ownerUserId: "user-service-advisor",
      bookingStatus: "SCHEDULED",
      purposeSnapshot: {
        code: "SERVICE_REPAIR",
        version: 1
      }
    });
  });

  it("rejects committed appointments without ownership, a complete slot, or a purpose snapshot", () => {
    expect(() =>
      normalizeAppointmentAggregate(scheduledAppointment({ ownerUserId: null }))
    ).toThrow(/accountable owner/);
    expect(() =>
      normalizeAppointmentAggregate(scheduledAppointment({ endsAt: null }))
    ).toThrow(/both be supplied/);
    expect(() =>
      normalizeAppointmentAggregate(scheduledAppointment({ purposeSnapshot: null }))
    ).toThrow(/purpose snapshot/);
  });

  it("requires complete cancellation, decline, no-show, waiting, and completion documentation", () => {
    expect(() =>
      normalizeAppointmentAggregate(
        scheduledAppointment({
          bookingStatus: "CANCELLED",
          cancelledAt: new Date("2026-07-06T13:00:00.000Z")
        })
      )
    ).toThrow(/cancellation reason code/);

    expect(() =>
      normalizeAppointmentAggregate(
        scheduledAppointment({
          confirmationStatus: "DECLINED",
          declinedAt: new Date("2026-07-06T13:00:00.000Z"),
          confirmationDeclineReasonCode: "CUSTOMER_DECLINED"
        })
      )
    ).toThrow(/follow-up disposition/);

    expect(() =>
      normalizeAppointmentAggregate(
        scheduledAppointment({
          attendanceStatus: "NO_SHOW",
          noShowAt: new Date("2026-07-06T14:15:00.000Z"),
          noShowReasonCode: "GRACE_PERIOD_EXPIRED"
        })
      )
    ).toThrow(/follow-up disposition/);

    expect(() =>
      normalizeAppointmentAggregate(
        scheduledAppointment({
          executionStatus: "WAITING",
          startedAt: new Date("2026-07-06T14:00:00.000Z"),
          waitingAt: new Date("2026-07-06T14:20:00.000Z"),
          waitingReasonCode: "WAITING_ON_PARTS"
        })
      )
    ).toThrow(/expected next step/);

    expect(() =>
      normalizeAppointmentAggregate(
        scheduledAppointment({
          bookingStatus: "COMPLETED",
          executionStatus: "FINISHED",
          startedAt: new Date("2026-07-06T14:00:00.000Z"),
          finishedAt: new Date("2026-07-06T14:50:00.000Z"),
          completedAt: new Date("2026-07-06T14:55:00.000Z"),
          followUpDispositionCode: "NONE_REQUIRED"
        })
      )
    ).toThrow(/outcome code/);
  });

  it("accepts a fully documented completed appointment", () => {
    expect(
      normalizeAppointmentAggregate(
        scheduledAppointment({
          bookingStatus: "COMPLETED",
          confirmationStatus: "CONFIRMED",
          attendanceStatus: "CHECKED_IN",
          executionStatus: "FINISHED",
          confirmedAt: new Date("2026-07-05T18:00:00.000Z"),
          checkedInAt: new Date("2026-07-06T13:55:00.000Z"),
          startedAt: new Date("2026-07-06T14:00:00.000Z"),
          finishedAt: new Date("2026-07-06T14:50:00.000Z"),
          completedAt: new Date("2026-07-06T14:55:00.000Z"),
          outcomeCode: "SERVICE_COMPLETED",
          followUpDispositionCode: "NONE_REQUIRED"
        })
      )
    ).toMatchObject({
      bookingStatus: "COMPLETED",
      confirmationStatus: "CONFIRMED",
      attendanceStatus: "CHECKED_IN",
      executionStatus: "FINISHED",
      outcomeCode: "SERVICE_COMPLETED"
    });
  });

  it("rejects stale-looking versions, invalid timezones, and impossible draft activity", () => {
    expect(() => normalizeAppointmentAggregate({ ...baseDraft, version: 0 })).toThrow(
      /positive integer/
    );
    expect(() =>
      normalizeAppointmentAggregate({ ...baseDraft, schedulingTimezone: "Mars/Olympus" })
    ).toThrow(/timezone must be valid/);
    expect(() =>
      normalizeAppointmentAggregate({
        ...baseDraft,
        attendanceStatus: "CHECKED_IN",
        checkedInAt: new Date()
      })
    ).toThrow(/cannot record attendance or execution/);
  });
});
