import type {
  AppointmentHardConflictEvaluationInput,
  AppointmentHardConflictEvaluationResult
} from "@/server/appointments/appointment-hard-conflict-service";
import { evaluateAppointmentHardConflicts } from "@/server/appointments/appointment-hard-conflict-service";
import {
  evaluateAppointmentWarnings,
  type AppointmentWarningEvaluationResult,
  type AppointmentWarningSignal
} from "@/server/appointments/appointment-warning-service";
import {
  getBusinessDayForLocalDate,
  locationLocalDateMinuteToInstant
} from "@/server/appointments/location-time-service";

export const APPOINTMENT_AVAILABILITY_SLOT_STATUSES = [
  "AVAILABLE",
  "WARNING",
  "BLOCKED"
] as const;

export const APPOINTMENT_AVAILABILITY_SEARCH_LIMITS = {
  maximumHorizonDays: 31,
  maximumCandidateSlots: 1000,
  defaultMaximumResults: 25
} as const;

export type AppointmentAvailabilitySlotStatus =
  (typeof APPOINTMENT_AVAILABILITY_SLOT_STATUSES)[number];

export type AppointmentAvailabilitySearchInput = Omit<
  AppointmentHardConflictEvaluationInput,
  "startsAt" | "occurrenceKey"
> & {
  windowStartLocalDate: string;
  windowEndLocalDate: string;
  earliestStartMinuteOfDay?: number;
  latestStartMinuteOfDay?: number;
  slotIntervalMinutes?: number;
  maximumResults?: number;
  includeWarningSlots?: boolean;
  includeBlockedSlots?: boolean;
  warningSignals?: AppointmentWarningSignal[];
  warningSignalFactory?: (input: {
    localDate: string;
    startMinuteOfDay: number;
    startsAt: Date;
  }) => AppointmentWarningSignal[];
};

export type AppointmentAvailabilitySlot = {
  localDate: string;
  startMinuteOfDay: number;
  startsAt: Date;
  endsAt: Date | null;
  status: AppointmentAvailabilitySlotStatus;
  canCommit: boolean;
  hardConflictResult: AppointmentHardConflictEvaluationResult;
  warningResult: AppointmentWarningEvaluationResult;
};

export type AppointmentAvailabilitySearchResult = {
  windowStartLocalDate: string;
  windowEndLocalDate: string;
  searchedCandidateCount: number;
  truncated: boolean;
  slots: AppointmentAvailabilitySlot[];
  availableSlots: AppointmentAvailabilitySlot[];
  warningSlots: AppointmentAvailabilitySlot[];
  blockedSlotCount: number;
};

function assertLocalDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a real calendar date.`);
  }
}

function getDateValue(localDate: string) {
  assertLocalDate(localDate, "Availability search local date");
  return new Date(`${localDate}T00:00:00.000Z`);
}

function addDays(localDate: string, days: number) {
  const date = getDateValue(localDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(leftLocalDate: string, rightLocalDate: string) {
  return Math.floor(
    (getDateValue(rightLocalDate).getTime() - getDateValue(leftLocalDate).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function getDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isEffectiveForLocalDate(input: {
  validFrom: Date;
  validTo?: Date | null;
  localDate: string;
}) {
  const validFrom = getDateOnly(input.validFrom);
  const validTo = input.validTo ? getDateOnly(input.validTo) : null;

  return validFrom <= input.localDate && (!validTo || validTo >= input.localDate);
}

function assertMinute(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 1440) {
    throw new Error(`${label} must be a whole minute between 0 and 1440.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function getSearchDates(input: {
  windowStartLocalDate: string;
  windowEndLocalDate: string;
}) {
  assertLocalDate(input.windowStartLocalDate, "Availability search start date");
  assertLocalDate(input.windowEndLocalDate, "Availability search end date");

  if (input.windowStartLocalDate > input.windowEndLocalDate) {
    throw new Error("Availability search start date cannot be after end date.");
  }

  if (
    daysBetween(input.windowStartLocalDate, input.windowEndLocalDate) >
    APPOINTMENT_AVAILABILITY_SEARCH_LIMITS.maximumHorizonDays
  ) {
    throw new Error("Availability search horizon exceeds the enterprise maximum.");
  }

  const dates: string[] = [];

  for (
    let localDate = input.windowStartLocalDate;
    localDate <= input.windowEndLocalDate;
    localDate = addDays(localDate, 1)
  ) {
    dates.push(localDate);
  }

  return dates;
}

function getCandidateMinutes(input: {
  searchInput: AppointmentAvailabilitySearchInput;
  localDate: string;
}) {
  const { searchInput, localDate } = input;
  const businessDay = getBusinessDayForLocalDate(localDate);
  const interval = searchInput.slotIntervalMinutes ?? searchInput.template.startIntervalMinutes;
  const earliestStartMinuteOfDay = searchInput.earliestStartMinuteOfDay ?? 0;
  const latestStartMinuteOfDay = searchInput.latestStartMinuteOfDay ?? 1440;

  assertPositiveInteger(interval, "Availability search slot interval");
  assertMinute(earliestStartMinuteOfDay, "Availability search earliest start minute");
  assertMinute(latestStartMinuteOfDay, "Availability search latest start minute");

  if (earliestStartMinuteOfDay > latestStartMinuteOfDay) {
    throw new Error("Availability search earliest start minute cannot be after latest start minute.");
  }

  const minutes = new Set<number>();

  for (const window of searchInput.locationOperatingWindows) {
    if (window.businessDay !== businessDay) {
      continue;
    }

    if (!isEffectiveForLocalDate({ ...window, localDate })) {
      continue;
    }

    const startsAt = Math.max(window.opensAtMinute, earliestStartMinuteOfDay);
    const endsAt = Math.min(window.closesAtMinute, latestStartMinuteOfDay);
    const firstAlignedMinute = Math.ceil(startsAt / interval) * interval;

    for (let minute = firstAlignedMinute; minute <= endsAt; minute += interval) {
      minutes.add(minute);
    }
  }

  return [...minutes].sort((left, right) => left - right);
}

function getSlotStatus(input: {
  hardConflictResult: AppointmentHardConflictEvaluationResult;
  warningResult: AppointmentWarningEvaluationResult;
}): AppointmentAvailabilitySlotStatus {
  if (!input.hardConflictResult.canCommit) {
    return "BLOCKED";
  }

  if (!input.warningResult.canCommit) {
    return "WARNING";
  }

  return "AVAILABLE";
}

function shouldIncludeSlot(input: {
  status: AppointmentAvailabilitySlotStatus;
  includeWarningSlots: boolean;
  includeBlockedSlots: boolean;
}) {
  if (input.status === "AVAILABLE") {
    return true;
  }

  if (input.status === "WARNING") {
    return input.includeWarningSlots;
  }

  return input.includeBlockedSlots;
}

export function searchAppointmentAvailability(
  input: AppointmentAvailabilitySearchInput
): AppointmentAvailabilitySearchResult {
  const dates = getSearchDates(input);
  const includeWarningSlots = input.includeWarningSlots ?? true;
  const includeBlockedSlots = input.includeBlockedSlots ?? false;
  const maximumResults =
    input.maximumResults ?? APPOINTMENT_AVAILABILITY_SEARCH_LIMITS.defaultMaximumResults;
  const slots: AppointmentAvailabilitySlot[] = [];
  let searchedCandidateCount = 0;
  let blockedSlotCount = 0;
  let truncated = false;

  assertPositiveInteger(maximumResults, "Availability search maximum results");

  for (const localDate of dates) {
    const candidateMinutes = getCandidateMinutes({
      searchInput: input,
      localDate
    });

    for (const startMinuteOfDay of candidateMinutes) {
      if (
        searchedCandidateCount >=
        APPOINTMENT_AVAILABILITY_SEARCH_LIMITS.maximumCandidateSlots
      ) {
        truncated = true;
        break;
      }

      const startsAt = locationLocalDateMinuteToInstant({
        localDate,
        minuteOfDay: startMinuteOfDay,
        timezone: input.location.timezone
      });
      const hardConflictResult = evaluateAppointmentHardConflicts({
        ...input,
        startsAt
      });
      const warningResult = evaluateAppointmentWarnings({
        hardConflictResult,
        warningSignals: [
          ...(input.warningSignals ?? []),
          ...(input.warningSignalFactory?.({
            localDate,
            startMinuteOfDay,
            startsAt
          }) ?? [])
        ]
      });
      const status = getSlotStatus({
        hardConflictResult,
        warningResult
      });
      const slot: AppointmentAvailabilitySlot = {
        localDate,
        startMinuteOfDay,
        startsAt,
        endsAt: hardConflictResult.timeFootprint?.appointmentEndsAt ?? null,
        status,
        canCommit: warningResult.canCommit,
        hardConflictResult,
        warningResult
      };

      searchedCandidateCount += 1;

      if (status === "BLOCKED") {
        blockedSlotCount += 1;
      }

      if (
        shouldIncludeSlot({
          status,
          includeWarningSlots,
          includeBlockedSlots
        })
      ) {
        slots.push(slot);
      }

      if (slots.length >= maximumResults) {
        truncated = true;
        break;
      }
    }

    if (truncated) {
      break;
    }
  }

  return {
    windowStartLocalDate: input.windowStartLocalDate,
    windowEndLocalDate: input.windowEndLocalDate,
    searchedCandidateCount,
    truncated,
    slots,
    availableSlots: slots.filter((slot) => slot.status === "AVAILABLE"),
    warningSlots: slots.filter((slot) => slot.status === "WARNING"),
    blockedSlotCount
  };
}
