import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";

const weekdayByUtcIndex = [
  BusinessDay.SUNDAY,
  BusinessDay.MONDAY,
  BusinessDay.TUESDAY,
  BusinessDay.WEDNESDAY,
  BusinessDay.THURSDAY,
  BusinessDay.FRIDAY,
  BusinessDay.SATURDAY
] as const;

const datePartFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timePartFormatterCache = new Map<string, Intl.DateTimeFormat>();

export type LocationTimeLocation = {
  id: string;
  timezone: string;
  schedulingStatus?: LocationSchedulingStatus | string;
};

export type LocationTimeOperatingWindow = {
  businessDay: BusinessDay | string;
  opensAtMinute: number;
  closesAtMinute: number;
  validFrom: Date;
  validTo?: Date | null;
};

export type LocationTimeClosure = {
  id?: string;
  type: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
};

export type LocationOperatingInterval = {
  businessDay: BusinessDay;
  opensAtMinute: number;
  closesAtMinute: number;
  startsAt: Date;
  endsAt: Date;
};

export type LocationDaySchedule = {
  locationId: string;
  timezone: string;
  localDate: string;
  businessDay: BusinessDay;
  dayStartsAt: Date;
  dayEndsAt: Date;
  operatingIntervals: LocationOperatingInterval[];
  closures: LocationTimeClosure[];
  isOpen: boolean;
};

export type LocationScheduleCandidateInput = {
  location: LocationTimeLocation;
  operatingWindows: LocationTimeOperatingWindow[];
  closures: LocationTimeClosure[];
  startsAt: Date;
  endsAt: Date;
};

export type LocationScheduleCandidateResult = {
  isSchedulable: boolean;
  isWithinOperatingHours: boolean;
  overlapsClosure: boolean;
  reasons: string[];
  localStartDate: string;
  localEndDate: string;
  startMinute: number;
  endMinute: number;
  matchingOperatingInterval: LocationOperatingInterval | null;
  overlappingClosures: LocationTimeClosure[];
};

function assertValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function assertValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Location timezone must be valid. Received "${timezone}".`);
  }
}

function getDatePartFormatter(timezone: string) {
  const existingFormatter = datePartFormatterCache.get(timezone);

  if (existingFormatter) {
    return existingFormatter;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    calendar: "iso8601",
    day: "2-digit",
    month: "2-digit",
    numberingSystem: "latn",
    timeZone: timezone,
    year: "numeric"
  });

  datePartFormatterCache.set(timezone, formatter);
  return formatter;
}

function getTimePartFormatter(timezone: string) {
  const existingFormatter = timePartFormatterCache.get(timezone);

  if (existingFormatter) {
    return existingFormatter;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    calendar: "iso8601",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    numberingSystem: "latn",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric"
  });

  timePartFormatterCache.set(timezone, formatter);
  return formatter;
}

function getPart(parts: Intl.DateTimeFormatPart[], type: string) {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Unable to resolve ${type} for location time.`);
  }

  return value;
}

function getLocationDateTimeParts(instant: Date, timezone: string) {
  assertValidDate(instant, "Location instant");
  assertValidTimezone(timezone);

  const parts = getTimePartFormatter(timezone).formatToParts(instant);
  const hourPart = getPart(parts, "hour");
  const hour = hourPart === "24" ? 0 : Number.parseInt(hourPart, 10);

  return {
    year: Number.parseInt(getPart(parts, "year"), 10),
    month: Number.parseInt(getPart(parts, "month"), 10),
    day: Number.parseInt(getPart(parts, "day"), 10),
    hour,
    minute: Number.parseInt(getPart(parts, "minute"), 10),
    second: Number.parseInt(getPart(parts, "second"), 10)
  };
}

function formatIsoDateFromParts(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getLocalDateValue(localDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new Error(`Location local date must use YYYY-MM-DD. Received "${localDate}".`);
  }

  return new Date(`${localDate}T00:00:00.000Z`);
}

function addDaysToLocalDate(localDate: string, days: number) {
  const date = getLocalDateValue(localDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateOnly(value: Date) {
  assertValidDate(value, "Effective date");
  return value.toISOString().slice(0, 10);
}

function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function getMinuteOfDay(parts: { hour: number; minute: number }) {
  return parts.hour * 60 + parts.minute;
}

export function getLocationLocalDate(instant: Date, timezone: string) {
  return formatIsoDateFromParts(getLocationDateTimeParts(instant, timezone));
}

export function getLocationMinuteOfDay(instant: Date, timezone: string) {
  return getMinuteOfDay(getLocationDateTimeParts(instant, timezone));
}

export function getBusinessDayForLocalDate(localDate: string) {
  const utcDay = getLocalDateValue(localDate).getUTCDay();
  return weekdayByUtcIndex[utcDay];
}

export function getLocationLocalDateLabel(instant: Date, timezone: string) {
  assertValidDate(instant, "Location instant");
  assertValidTimezone(timezone);
  return getDatePartFormatter(timezone).format(instant);
}

export function locationLocalDateMinuteToInstant(input: {
  localDate: string;
  minuteOfDay: number;
  timezone: string;
}) {
  const { localDate, minuteOfDay, timezone } = input;

  assertValidTimezone(timezone);

  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1440) {
    throw new Error("Location minute of day must be a whole minute between 0 and 1440.");
  }

  if (minuteOfDay === 1440) {
    return locationLocalDateMinuteToInstant({
      localDate: addDaysToLocalDate(localDate, 1),
      minuteOfDay: 0,
      timezone
    });
  }

  const [yearText, monthText, dayText] = localDate.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const day = Number.parseInt(dayText ?? "", 10);
  const desiredHour = Math.floor(minuteOfDay / 60);
  const desiredMinute = minuteOfDay % 60;

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`Location local date must use YYYY-MM-DD. Received "${localDate}".`);
  }

  let candidate = new Date(
    Date.UTC(year, month - 1, day, desiredHour, desiredMinute, 0, 0)
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getLocationDateTimeParts(candidate, timezone);
    const actualUtcAsLocal = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      0,
      0
    );
    const desiredUtcAsLocal = Date.UTC(
      year,
      month - 1,
      day,
      desiredHour,
      desiredMinute,
      0,
      0
    );
    const differenceMs = desiredUtcAsLocal - actualUtcAsLocal;

    if (differenceMs === 0) {
      return candidate;
    }

    candidate = new Date(candidate.getTime() + differenceMs);
  }

  const resolved = getLocationDateTimeParts(candidate, timezone);

  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== desiredHour ||
    resolved.minute !== desiredMinute
  ) {
    throw new Error(
      `Unable to resolve ${localDate} ${String(desiredHour).padStart(2, "0")}:${String(desiredMinute).padStart(2, "0")} in ${timezone}.`
    );
  }

  return candidate;
}

export function resolveLocationDaySchedule(input: {
  location: LocationTimeLocation;
  localDate: string;
  operatingWindows: LocationTimeOperatingWindow[];
  closures: LocationTimeClosure[];
}): LocationDaySchedule {
  const { location, localDate, operatingWindows, closures } = input;
  const timezone = location.timezone.trim();

  assertValidTimezone(timezone);

  const businessDay = getBusinessDayForLocalDate(localDate);
  const dayStartsAt = locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: 0,
    timezone
  });
  const dayEndsAt = locationLocalDateMinuteToInstant({
    localDate: addDaysToLocalDate(localDate, 1),
    minuteOfDay: 0,
    timezone
  });
  const activeWindows = operatingWindows
    .filter((window) => {
      const validFrom = getDateOnly(window.validFrom);
      const validTo = window.validTo ? getDateOnly(window.validTo) : null;

      return (
        window.businessDay === businessDay &&
        validFrom <= localDate &&
        (!validTo || validTo >= localDate)
      );
    })
    .sort((left, right) => left.opensAtMinute - right.opensAtMinute);
  const dayClosures = closures.filter((closure) => {
    assertValidDate(closure.startsAt, "Location closure start");
    assertValidDate(closure.endsAt, "Location closure end");
    return overlaps(dayStartsAt, dayEndsAt, closure.startsAt, closure.endsAt);
  });
  const operatingIntervals = activeWindows.map((window) => ({
    businessDay,
    opensAtMinute: window.opensAtMinute,
    closesAtMinute: window.closesAtMinute,
    startsAt: locationLocalDateMinuteToInstant({
      localDate,
      minuteOfDay: window.opensAtMinute,
      timezone
    }),
    endsAt: locationLocalDateMinuteToInstant({
      localDate,
      minuteOfDay: window.closesAtMinute,
      timezone
    })
  }));

  return {
    locationId: location.id,
    timezone,
    localDate,
    businessDay,
    dayStartsAt,
    dayEndsAt,
    operatingIntervals,
    closures: dayClosures,
    isOpen: operatingIntervals.length > 0
  };
}

export function evaluateLocationScheduleCandidate(
  input: LocationScheduleCandidateInput
): LocationScheduleCandidateResult {
  const { location, operatingWindows, closures, startsAt, endsAt } = input;

  assertValidDate(startsAt, "Candidate start");
  assertValidDate(endsAt, "Candidate end");

  if (endsAt <= startsAt) {
    throw new Error("Candidate end must be after candidate start.");
  }

  const timezone = location.timezone.trim();
  const localStartDate = getLocationLocalDate(startsAt, timezone);
  const localEndDate = getLocationLocalDate(new Date(endsAt.getTime() - 1), timezone);
  const startMinute = getLocationMinuteOfDay(startsAt, timezone);
  const endMinute =
    localEndDate === localStartDate
      ? getLocationMinuteOfDay(endsAt, timezone)
      : 1440;
  const daySchedule = resolveLocationDaySchedule({
    location,
    localDate: localStartDate,
    operatingWindows,
    closures
  });
  const matchingOperatingInterval =
    daySchedule.operatingIntervals.find(
      (interval) => startsAt >= interval.startsAt && endsAt <= interval.endsAt
    ) ?? null;
  const overlappingClosures = closures.filter((closure) =>
    overlaps(startsAt, endsAt, closure.startsAt, closure.endsAt)
  );
  const reasons: string[] = [];

  if (location.schedulingStatus && location.schedulingStatus !== LocationSchedulingStatus.ACTIVE) {
    reasons.push(`Location scheduling is ${location.schedulingStatus}.`);
  }

  if (localStartDate !== localEndDate) {
    reasons.push("Candidate must fit within one location-local day.");
  }

  if (!matchingOperatingInterval) {
    reasons.push("Candidate is outside location operating hours.");
  }

  if (overlappingClosures.length) {
    reasons.push("Candidate overlaps a location closure.");
  }

  return {
    isSchedulable: reasons.length === 0,
    isWithinOperatingHours: Boolean(matchingOperatingInterval),
    overlapsClosure: overlappingClosures.length > 0,
    reasons,
    localStartDate,
    localEndDate,
    startMinute,
    endMinute,
    matchingOperatingInterval,
    overlappingClosures
  };
}
