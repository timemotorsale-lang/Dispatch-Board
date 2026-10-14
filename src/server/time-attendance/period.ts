const weekdays = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
] as const;

export type TimeAttendanceWeekday = (typeof weekdays)[number];

function localDateParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    weekday: "long",
    year: "numeric"
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday").toUpperCase() as TimeAttendanceWeekday
  };
}

function addDateKeyDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function localDateKey(instant: Date, timeZone: string) {
  return localDateParts(instant, timeZone).dateKey;
}

export function weeklyPeriodForInstant(input: {
  instant: Date;
  timeZone: string;
  workweekStartDay: string;
}) {
  const local = localDateParts(input.instant, input.timeZone);
  const currentIndex = weekdays.indexOf(local.weekday);
  const startDay = input.workweekStartDay.toUpperCase() as TimeAttendanceWeekday;
  const startIndex = weekdays.indexOf(startDay);
  if (startIndex < 0) {
    throw new Error("Workweek start day is invalid.");
  }
  const offset = currentIndex >= startIndex
    ? currentIndex - startIndex
    : currentIndex + 7 - startIndex;
  const periodStartKey = addDateKeyDays(local.dateKey, -offset);
  const periodEndKey = addDateKeyDays(periodStartKey, 6);

  return {
    periodStart: new Date(`${periodStartKey}T00:00:00.000Z`),
    periodEnd: new Date(`${periodEndKey}T00:00:00.000Z`),
    periodStartKey,
    periodEndKey
  };
}

export function dateKeyWithinPeriod(dateKey: string, periodStartKey: string, periodEndKey: string) {
  return dateKey >= periodStartKey && dateKey <= periodEndKey;
}

export function anchoredPeriodForInstant(input: {
  anchorDate: Date;
  instant: Date;
  periodLengthDays: number;
  timeZone: string;
}) {
  if (!Number.isInteger(input.periodLengthDays) || input.periodLengthDays < 1 || input.periodLengthDays > 31) {
    throw new Error("Pay-period length must be from 1 through 31 days.");
  }
  const anchorKey = input.anchorDate.toISOString().slice(0, 10);
  const instantKey = localDateKey(input.instant, input.timeZone);
  const anchorMs = new Date(`${anchorKey}T00:00:00.000Z`).getTime();
  const instantMs = new Date(`${instantKey}T00:00:00.000Z`).getTime();
  const dayOffset = Math.floor((instantMs - anchorMs) / 86_400_000);
  const periodIndex = Math.floor(dayOffset / input.periodLengthDays);
  const periodStartKey = addDateKeyDays(anchorKey, periodIndex * input.periodLengthDays);
  const periodEndKey = addDateKeyDays(periodStartKey, input.periodLengthDays - 1);
  return {
    periodStart: new Date(`${periodStartKey}T00:00:00.000Z`),
    periodEnd: new Date(`${periodEndKey}T00:00:00.000Z`),
    periodStartKey,
    periodEndKey
  };
}
