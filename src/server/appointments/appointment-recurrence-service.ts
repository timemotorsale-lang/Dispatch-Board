import { BusinessDay } from "@prisma/client";

import {
  getBusinessDayForLocalDate,
  locationLocalDateMinuteToInstant
} from "@/server/appointments/location-time-service";

export const APPOINTMENT_RECURRENCE_LIMITS = {
  maximumExpansionHorizonDays: 366,
  maximumOccurrencesPerExpansion: 500,
  minimumStartMinuteOfDay: 0,
  maximumStartMinuteOfDay: 1439,
  minimumDurationMinutes: 5,
  maximumDurationMinutes: 8 * 60
} as const;

export const APPOINTMENT_RECURRENCE_FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY"
] as const;

export const APPOINTMENT_RECURRENCE_END_MODES = [
  "NEVER",
  "ON_LOCAL_DATE",
  "AFTER_OCCURRENCES"
] as const;

export const APPOINTMENT_RECURRENCE_EXCEPTION_ACTIONS = [
  "SKIP",
  "RESCHEDULE"
] as const;

export const APPOINTMENT_RECURRENCE_EDIT_SCOPES = [
  "THIS_OCCURRENCE",
  "THIS_AND_FUTURE",
  "ENTIRE_SERIES"
] as const;

export const APPOINTMENT_RECURRENCE_OCCURRENCE_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED"
] as const;

export type AppointmentRecurrenceFrequency =
  (typeof APPOINTMENT_RECURRENCE_FREQUENCIES)[number];
export type AppointmentRecurrenceEndMode =
  (typeof APPOINTMENT_RECURRENCE_END_MODES)[number];
export type AppointmentRecurrenceExceptionAction =
  (typeof APPOINTMENT_RECURRENCE_EXCEPTION_ACTIONS)[number];
export type AppointmentRecurrenceEditScope =
  (typeof APPOINTMENT_RECURRENCE_EDIT_SCOPES)[number];
export type AppointmentRecurrenceOccurrenceStatus =
  (typeof APPOINTMENT_RECURRENCE_OCCURRENCE_STATUSES)[number];

export type AppointmentRecurrenceDefinition = {
  seriesId: string;
  timezone: string;
  frequency: AppointmentRecurrenceFrequency;
  interval: number;
  startsOnLocalDate: string;
  startMinuteOfDay: number;
  durationMinutes: number;
  weeklyBusinessDays?: BusinessDay[];
  monthlyDayOfMonth?: number;
  endMode: AppointmentRecurrenceEndMode;
  endsOnLocalDate?: string | null;
  occurrenceCount?: number | null;
};

export type AppointmentRecurrenceException = {
  occurrenceLocalDate: string;
  action: AppointmentRecurrenceExceptionAction;
  reasonCode: string;
  reasonNote?: string | null;
  replacementLocalDate?: string | null;
  replacementStartMinuteOfDay?: number | null;
  replacementDurationMinutes?: number | null;
};

export type ExpandedAppointmentOccurrence = {
  seriesId: string;
  sequenceNumber: number;
  occurrenceKey: string;
  originalLocalDate: string;
  localDate: string;
  startsAt: Date;
  endsAt: Date;
  startMinuteOfDay: number;
  durationMinutes: number;
  exceptionApplied: boolean;
  exceptionAction: AppointmentRecurrenceExceptionAction | null;
  exceptionReasonCode: string | null;
};

export type RecurrenceExpansionResult = {
  seriesId: string;
  timezone: string;
  windowStartLocalDate: string;
  horizonEndLocalDate: string;
  occurrences: ExpandedAppointmentOccurrence[];
  skippedOccurrenceKeys: string[];
  truncated: boolean;
};

export type AppointmentRecurrenceOccurrenceForEdit = {
  occurrenceKey: string;
  localDate: string;
  status: AppointmentRecurrenceOccurrenceStatus;
};

export type RecurrenceEditImpactPreview = {
  scope: AppointmentRecurrenceEditScope;
  targetOccurrenceKey: string;
  affectedOccurrenceKeys: string[];
  preservedOccurrenceKeys: string[];
  requiresOccurrenceException: boolean;
};

const protectedOccurrenceStatuses = new Set<AppointmentRecurrenceOccurrenceStatus>([
  "CANCELLED",
  "COMPLETED"
]);

function assertLocalDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a real calendar date.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertMinuteOfDay(value: number, label: string) {
  if (
    !Number.isInteger(value) ||
    value < APPOINTMENT_RECURRENCE_LIMITS.minimumStartMinuteOfDay ||
    value > APPOINTMENT_RECURRENCE_LIMITS.maximumStartMinuteOfDay
  ) {
    throw new Error(`${label} must be a whole minute between 0 and 1439.`);
  }
}

function assertDuration(value: number, label: string) {
  if (
    !Number.isInteger(value) ||
    value < APPOINTMENT_RECURRENCE_LIMITS.minimumDurationMinutes ||
    value > APPOINTMENT_RECURRENCE_LIMITS.maximumDurationMinutes
  ) {
    throw new Error(
      `${label} must be between ${APPOINTMENT_RECURRENCE_LIMITS.minimumDurationMinutes} and ${APPOINTMENT_RECURRENCE_LIMITS.maximumDurationMinutes} minutes.`
    );
  }
}

function getDateValue(localDate: string) {
  assertLocalDate(localDate, "Local date");
  return new Date(`${localDate}T00:00:00.000Z`);
}

function formatLocalDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(localDate: string, days: number) {
  const date = getDateValue(localDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatLocalDate(date);
}

function daysBetween(leftLocalDate: string, rightLocalDate: string) {
  return Math.floor(
    (getDateValue(rightLocalDate).getTime() - getDateValue(leftLocalDate).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function monthsBetween(leftLocalDate: string, rightLocalDate: string) {
  const [leftYearText, leftMonthText] = leftLocalDate.split("-");
  const [rightYearText, rightMonthText] = rightLocalDate.split("-");
  const leftYear = Number.parseInt(leftYearText ?? "", 10);
  const leftMonth = Number.parseInt(leftMonthText ?? "", 10);
  const rightYear = Number.parseInt(rightYearText ?? "", 10);
  const rightMonth = Number.parseInt(rightMonthText ?? "", 10);

  return (rightYear - leftYear) * 12 + (rightMonth - leftMonth);
}

function getDayOfMonth(localDate: string) {
  return Number.parseInt(localDate.slice(8, 10), 10);
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function trimRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function getOccurrenceKey(seriesId: string, originalLocalDate: string) {
  return `${seriesId}:${originalLocalDate}`;
}

function assertDefinition(definition: AppointmentRecurrenceDefinition) {
  trimRequiredText(definition.seriesId, "Recurrence series ID");
  assertLocalDate(definition.startsOnLocalDate, "Recurrence start local date");
  assertPositiveInteger(definition.interval, "Recurrence interval");
  assertMinuteOfDay(definition.startMinuteOfDay, "Recurrence start minute");
  assertDuration(definition.durationMinutes, "Recurrence duration");

  if (!APPOINTMENT_RECURRENCE_FREQUENCIES.includes(definition.frequency)) {
    throw new Error(`Recurrence frequency is invalid: "${definition.frequency}".`);
  }

  if (!APPOINTMENT_RECURRENCE_END_MODES.includes(definition.endMode)) {
    throw new Error(`Recurrence end mode is invalid: "${definition.endMode}".`);
  }

  if (definition.endMode === "ON_LOCAL_DATE") {
    if (!definition.endsOnLocalDate) {
      throw new Error("Recurrence end local date is required.");
    }

    assertLocalDate(definition.endsOnLocalDate, "Recurrence end local date");
  }

  if (definition.endMode === "AFTER_OCCURRENCES") {
    assertPositiveInteger(
      definition.occurrenceCount ?? 0,
      "Recurrence occurrence count"
    );
  }

  if (definition.frequency === "MONTHLY") {
    const dayOfMonth = definition.monthlyDayOfMonth ?? getDayOfMonth(definition.startsOnLocalDate);

    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error("Monthly recurrence day must be between 1 and 31.");
    }
  }
}

function getWeeklyBusinessDays(definition: AppointmentRecurrenceDefinition) {
  const days = definition.weeklyBusinessDays?.length
    ? definition.weeklyBusinessDays
    : [getBusinessDayForLocalDate(definition.startsOnLocalDate)];

  return new Set(days);
}

function matchesPattern(input: {
  definition: AppointmentRecurrenceDefinition;
  localDate: string;
  weeklyBusinessDays: Set<BusinessDay>;
}) {
  const { definition, localDate } = input;

  if (localDate < definition.startsOnLocalDate) {
    return false;
  }

  if (definition.frequency === "DAILY") {
    return daysBetween(definition.startsOnLocalDate, localDate) % definition.interval === 0;
  }

  if (definition.frequency === "WEEKLY") {
    const daysFromStart = daysBetween(definition.startsOnLocalDate, localDate);
    const weeksFromStart = Math.floor(daysFromStart / 7);

    return (
      daysFromStart >= 0 &&
      weeksFromStart % definition.interval === 0 &&
      input.weeklyBusinessDays.has(getBusinessDayForLocalDate(localDate))
    );
  }

  const monthsFromStart = monthsBetween(definition.startsOnLocalDate, localDate);
  const monthlyDayOfMonth =
    definition.monthlyDayOfMonth ?? getDayOfMonth(definition.startsOnLocalDate);

  return (
    monthsFromStart >= 0 &&
    monthsFromStart % definition.interval === 0 &&
    getDayOfMonth(localDate) === monthlyDayOfMonth
  );
}

function getEffectiveHorizon(input: {
  definition: AppointmentRecurrenceDefinition;
  horizonEndLocalDate: string;
}) {
  const { definition, horizonEndLocalDate } = input;

  if (definition.endMode === "ON_LOCAL_DATE" && definition.endsOnLocalDate) {
    return definition.endsOnLocalDate < horizonEndLocalDate
      ? definition.endsOnLocalDate
      : horizonEndLocalDate;
  }

  return horizonEndLocalDate;
}

function normalizeException(exception: AppointmentRecurrenceException) {
  assertLocalDate(exception.occurrenceLocalDate, "Recurrence exception local date");
  trimRequiredText(exception.reasonCode, "Recurrence exception reason code");

  if (!APPOINTMENT_RECURRENCE_EXCEPTION_ACTIONS.includes(exception.action)) {
    throw new Error(`Recurrence exception action is invalid: "${exception.action}".`);
  }

  if (exception.action === "RESCHEDULE") {
    if (!exception.replacementLocalDate) {
      throw new Error("Rescheduled recurrence exceptions require a replacement local date.");
    }

    assertLocalDate(exception.replacementLocalDate, "Replacement local date");

    if (exception.replacementStartMinuteOfDay !== null && exception.replacementStartMinuteOfDay !== undefined) {
      assertMinuteOfDay(
        exception.replacementStartMinuteOfDay,
        "Replacement start minute"
      );
    }

    if (exception.replacementDurationMinutes !== null && exception.replacementDurationMinutes !== undefined) {
      assertDuration(exception.replacementDurationMinutes, "Replacement duration");
    }
  }

  return {
    ...exception,
    reasonCode: exception.reasonCode.trim()
  };
}

function buildOccurrence(input: {
  definition: AppointmentRecurrenceDefinition;
  sequenceNumber: number;
  originalLocalDate: string;
  exception?: AppointmentRecurrenceException;
}) {
  const { definition, sequenceNumber, originalLocalDate, exception } = input;
  const localDate = exception?.replacementLocalDate ?? originalLocalDate;
  const startMinuteOfDay =
    exception?.replacementStartMinuteOfDay ?? definition.startMinuteOfDay;
  const durationMinutes = exception?.replacementDurationMinutes ?? definition.durationMinutes;
  const startsAt = locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: startMinuteOfDay,
    timezone: definition.timezone
  });

  return {
    seriesId: definition.seriesId,
    sequenceNumber,
    occurrenceKey: getOccurrenceKey(definition.seriesId, originalLocalDate),
    originalLocalDate,
    localDate,
    startsAt,
    endsAt: addMinutes(startsAt, durationMinutes),
    startMinuteOfDay,
    durationMinutes,
    exceptionApplied: Boolean(exception),
    exceptionAction: exception?.action ?? null,
    exceptionReasonCode: exception?.reasonCode ?? null
  };
}

export function expandAppointmentRecurrence(input: {
  definition: AppointmentRecurrenceDefinition;
  exceptions?: AppointmentRecurrenceException[];
  windowStartLocalDate: string;
  horizonEndLocalDate: string;
}): RecurrenceExpansionResult {
  const { definition } = input;

  assertDefinition(definition);
  assertLocalDate(input.windowStartLocalDate, "Recurrence window start local date");
  assertLocalDate(input.horizonEndLocalDate, "Recurrence horizon end local date");

  if (input.windowStartLocalDate > input.horizonEndLocalDate) {
    throw new Error("Recurrence window start cannot be after the horizon end.");
  }

  if (
    daysBetween(input.windowStartLocalDate, input.horizonEndLocalDate) >
    APPOINTMENT_RECURRENCE_LIMITS.maximumExpansionHorizonDays
  ) {
    throw new Error("Recurrence expansion horizon exceeds the enterprise maximum.");
  }

  const normalizedExceptions = new Map(
    (input.exceptions ?? []).map((exception) => {
      const normalized = normalizeException(exception);
      return [normalized.occurrenceLocalDate, normalized] as const;
    })
  );
  const weeklyBusinessDays = getWeeklyBusinessDays(definition);
  const effectiveHorizon = getEffectiveHorizon({
    definition,
    horizonEndLocalDate: input.horizonEndLocalDate
  });
  const occurrences: ExpandedAppointmentOccurrence[] = [];
  const skippedOccurrenceKeys: string[] = [];
  const maximumCount =
    definition.endMode === "AFTER_OCCURRENCES"
      ? definition.occurrenceCount ?? 0
      : APPOINTMENT_RECURRENCE_LIMITS.maximumOccurrencesPerExpansion;
  let sequenceNumber = 0;
  let truncated = false;

  for (
    let localDate = definition.startsOnLocalDate;
    localDate <= effectiveHorizon;
    localDate = addDays(localDate, 1)
  ) {
    if (!matchesPattern({ definition, localDate, weeklyBusinessDays })) {
      continue;
    }

    sequenceNumber += 1;

    if (definition.endMode === "AFTER_OCCURRENCES" && sequenceNumber > maximumCount) {
      break;
    }

    if (localDate < input.windowStartLocalDate) {
      continue;
    }

    const exception = normalizedExceptions.get(localDate);

    if (exception?.action === "SKIP") {
      skippedOccurrenceKeys.push(getOccurrenceKey(definition.seriesId, localDate));
      continue;
    }

    occurrences.push(
      buildOccurrence({
        definition,
        sequenceNumber,
        originalLocalDate: localDate,
        exception
      })
    );

    if (occurrences.length >= APPOINTMENT_RECURRENCE_LIMITS.maximumOccurrencesPerExpansion) {
      truncated = true;
      break;
    }
  }

  return {
    seriesId: definition.seriesId,
    timezone: definition.timezone,
    windowStartLocalDate: input.windowStartLocalDate,
    horizonEndLocalDate: effectiveHorizon,
    occurrences,
    skippedOccurrenceKeys,
    truncated
  };
}

export function previewRecurrenceEditImpact(input: {
  scope: AppointmentRecurrenceEditScope;
  targetOccurrenceKey: string;
  occurrences: AppointmentRecurrenceOccurrenceForEdit[];
}): RecurrenceEditImpactPreview {
  const target = input.occurrences.find(
    (occurrence) => occurrence.occurrenceKey === input.targetOccurrenceKey
  );

  if (!target) {
    throw new Error("Target recurrence occurrence was not found.");
  }

  if (!APPOINTMENT_RECURRENCE_EDIT_SCOPES.includes(input.scope)) {
    throw new Error(`Recurrence edit scope is invalid: "${input.scope}".`);
  }

  const candidates = input.occurrences.filter((occurrence) => {
    if (input.scope === "THIS_OCCURRENCE") {
      return occurrence.occurrenceKey === target.occurrenceKey;
    }

    if (input.scope === "THIS_AND_FUTURE") {
      return occurrence.localDate >= target.localDate;
    }

    return true;
  });
  const affectedOccurrenceKeys = candidates
    .filter((occurrence) => !protectedOccurrenceStatuses.has(occurrence.status))
    .map((occurrence) => occurrence.occurrenceKey);
  const preservedOccurrenceKeys = candidates
    .filter((occurrence) => protectedOccurrenceStatuses.has(occurrence.status))
    .map((occurrence) => occurrence.occurrenceKey);

  return {
    scope: input.scope,
    targetOccurrenceKey: target.occurrenceKey,
    affectedOccurrenceKeys,
    preservedOccurrenceKeys,
    requiresOccurrenceException: input.scope === "THIS_OCCURRENCE"
  };
}
