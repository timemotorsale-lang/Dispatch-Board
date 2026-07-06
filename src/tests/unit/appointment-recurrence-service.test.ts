import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  expandAppointmentRecurrence,
  previewRecurrenceEditImpact,
  type AppointmentRecurrenceDefinition
} from "@/server/appointments/appointment-recurrence-service";

const weeklyMondayAtNine: AppointmentRecurrenceDefinition = {
  seriesId: "series-internal-meeting",
  timezone: "America/Chicago",
  frequency: "WEEKLY",
  interval: 1,
  startsOnLocalDate: "2026-03-02",
  startMinuteOfDay: 9 * 60,
  durationMinutes: 60,
  weeklyBusinessDays: [BusinessDay.MONDAY],
  endMode: "NEVER"
};

describe("appointment recurrence service", () => {
  it("expands weekly occurrences while preserving local time across daylight saving", () => {
    const expansion = expandAppointmentRecurrence({
      definition: weeklyMondayAtNine,
      windowStartLocalDate: "2026-03-02",
      horizonEndLocalDate: "2026-03-16"
    });

    expect(expansion).toMatchObject({
      seriesId: "series-internal-meeting",
      timezone: "America/Chicago",
      windowStartLocalDate: "2026-03-02",
      horizonEndLocalDate: "2026-03-16",
      truncated: false
    });
    expect(expansion.occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16"
    ]);
    expect(expansion.occurrences.map((occurrence) => occurrence.startMinuteOfDay)).toEqual([
      540,
      540,
      540
    ]);
    expect(expansion.occurrences.map((occurrence) => occurrence.startsAt.toISOString())).toEqual([
      "2026-03-02T15:00:00.000Z",
      "2026-03-09T14:00:00.000Z",
      "2026-03-16T14:00:00.000Z"
    ]);
  });

  it("applies skipped and rescheduled occurrence exceptions with required reasons", () => {
    const expansion = expandAppointmentRecurrence({
      definition: weeklyMondayAtNine,
      windowStartLocalDate: "2026-03-02",
      horizonEndLocalDate: "2026-03-23",
      exceptions: [
        {
          occurrenceLocalDate: "2026-03-09",
          action: "SKIP",
          reasonCode: "MANAGER_TRAINING"
        },
        {
          occurrenceLocalDate: "2026-03-16",
          action: "RESCHEDULE",
          reasonCode: "STAFF_CONFLICT",
          replacementLocalDate: "2026-03-17",
          replacementStartMinuteOfDay: 10 * 60,
          replacementDurationMinutes: 45
        }
      ]
    });

    expect(expansion.skippedOccurrenceKeys).toEqual([
      "series-internal-meeting:2026-03-09"
    ]);
    expect(expansion.occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-03-02",
      "2026-03-17",
      "2026-03-23"
    ]);
    expect(expansion.occurrences[1]).toMatchObject({
      occurrenceKey: "series-internal-meeting:2026-03-16",
      originalLocalDate: "2026-03-16",
      localDate: "2026-03-17",
      startMinuteOfDay: 600,
      durationMinutes: 45,
      exceptionApplied: true,
      exceptionAction: "RESCHEDULE",
      exceptionReasonCode: "STAFF_CONFLICT"
    });

    expect(() =>
      expandAppointmentRecurrence({
        definition: weeklyMondayAtNine,
        windowStartLocalDate: "2026-03-02",
        horizonEndLocalDate: "2026-03-16",
        exceptions: [
          {
            occurrenceLocalDate: "2026-03-09",
            action: "SKIP",
            reasonCode: " "
          }
        ]
      })
    ).toThrow(/reason code/i);
  });

  it("honors count-based and date-based series endings", () => {
    const countExpansion = expandAppointmentRecurrence({
      definition: {
        ...weeklyMondayAtNine,
        endMode: "AFTER_OCCURRENCES",
        occurrenceCount: 2
      },
      windowStartLocalDate: "2026-03-02",
      horizonEndLocalDate: "2026-04-30"
    });
    const dateExpansion = expandAppointmentRecurrence({
      definition: {
        ...weeklyMondayAtNine,
        endMode: "ON_LOCAL_DATE",
        endsOnLocalDate: "2026-03-10"
      },
      windowStartLocalDate: "2026-03-02",
      horizonEndLocalDate: "2026-04-30"
    });

    expect(countExpansion.occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-03-02",
      "2026-03-09"
    ]);
    expect(dateExpansion.occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-03-02",
      "2026-03-09"
    ]);
    expect(dateExpansion.horizonEndLocalDate).toBe("2026-03-10");
  });

  it("rejects unbounded expansion requests beyond the enterprise horizon", () => {
    expect(() =>
      expandAppointmentRecurrence({
        definition: weeklyMondayAtNine,
        windowStartLocalDate: "2026-03-02",
        horizonEndLocalDate: "2027-06-01"
      })
    ).toThrow(/horizon/i);
  });

  it("previews this-occurrence, future, and entire-series edit scopes safely", () => {
    const occurrences = [
      {
        occurrenceKey: "series-internal-meeting:2026-03-02",
        localDate: "2026-03-02",
        status: "COMPLETED" as const
      },
      {
        occurrenceKey: "series-internal-meeting:2026-03-09",
        localDate: "2026-03-09",
        status: "SCHEDULED" as const
      },
      {
        occurrenceKey: "series-internal-meeting:2026-03-16",
        localDate: "2026-03-16",
        status: "CANCELLED" as const
      },
      {
        occurrenceKey: "series-internal-meeting:2026-03-23",
        localDate: "2026-03-23",
        status: "DRAFT" as const
      }
    ];

    expect(
      previewRecurrenceEditImpact({
        scope: "THIS_OCCURRENCE",
        targetOccurrenceKey: "series-internal-meeting:2026-03-09",
        occurrences
      })
    ).toEqual({
      scope: "THIS_OCCURRENCE",
      targetOccurrenceKey: "series-internal-meeting:2026-03-09",
      affectedOccurrenceKeys: ["series-internal-meeting:2026-03-09"],
      preservedOccurrenceKeys: [],
      requiresOccurrenceException: true
    });

    expect(
      previewRecurrenceEditImpact({
        scope: "THIS_AND_FUTURE",
        targetOccurrenceKey: "series-internal-meeting:2026-03-09",
        occurrences
      })
    ).toEqual({
      scope: "THIS_AND_FUTURE",
      targetOccurrenceKey: "series-internal-meeting:2026-03-09",
      affectedOccurrenceKeys: [
        "series-internal-meeting:2026-03-09",
        "series-internal-meeting:2026-03-23"
      ],
      preservedOccurrenceKeys: ["series-internal-meeting:2026-03-16"],
      requiresOccurrenceException: false
    });

    expect(
      previewRecurrenceEditImpact({
        scope: "ENTIRE_SERIES",
        targetOccurrenceKey: "series-internal-meeting:2026-03-09",
        occurrences
      })
    ).toEqual({
      scope: "ENTIRE_SERIES",
      targetOccurrenceKey: "series-internal-meeting:2026-03-09",
      affectedOccurrenceKeys: [
        "series-internal-meeting:2026-03-09",
        "series-internal-meeting:2026-03-23"
      ],
      preservedOccurrenceKeys: [
        "series-internal-meeting:2026-03-02",
        "series-internal-meeting:2026-03-16"
      ],
      requiresOccurrenceException: false
    });
  });
});
