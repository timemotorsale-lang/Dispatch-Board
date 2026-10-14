import { getLocationLocalDate, locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";

export const reportCadences = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type ReportCadence = typeof reportCadences[number];
export type ReportCalendar = { version: string; timezone: string; workingDays: number[]; holidays: string[]; dailyDueMinute: number; graceMinutes: number };
export const draftReportCalendar: ReportCalendar = { version: "report-calendar/v1-draft", timezone: "America/Chicago", workingDays: [1, 2, 3, 4, 5], holidays: [], dailyDueMinute: 1080, graceMinutes: 30 };

export function validReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Report date must use YYYY-MM-DD.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Report date is invalid.");
  return value;
}
export function addReportDays(value: string, days: number) {
  validReportDate(value);
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function isReportWorkingDay(value: string, calendar: ReportCalendar) {
  validReportDate(value);
  return calendar.workingDays.includes(new Date(`${value}T00:00:00Z`).getUTCDay()) && !calendar.holidays.includes(value);
}
function businessDayAfter(value: string, count: number, calendar: ReportCalendar) {
  let date = value;
  for (let attempts = 0, found = 0; attempts < 370; attempts++) {
    date = addReportDays(date, 1);
    if (isReportWorkingDay(date, calendar) && ++found === count) return date;
  }
  throw new Error("Reporting calendar has no eligible working day.");
}
export function resolveReportPeriod(date: string, cadence: ReportCadence, calendar = draftReportCalendar) {
  validReportDate(date);
  if (!reportCadences.includes(cadence)) throw new Error("Report frequency is invalid.");
  if (!calendar.workingDays.length || calendar.workingDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Reporting working days are invalid.");
  if (!Number.isInteger(calendar.dailyDueMinute) || calendar.dailyDueMinute < 0 || calendar.dailyDueMinute > 1440 || !Number.isInteger(calendar.graceMinutes) || calendar.graceMinutes < 0) throw new Error("Reporting deadline is invalid.");
  let startDate = date, endDate = addReportDays(date, 1);
  if (cadence === "WEEKLY") {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    startDate = addReportDays(date, -((weekday + 6) % 7));
    endDate = addReportDays(startDate, 7);
  } else if (cadence === "MONTHLY") {
    startDate = `${date.slice(0, 7)}-01`;
    const next = new Date(`${startDate}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    endDate = next.toISOString().slice(0, 10);
  }
  const instant = (localDate: string, minuteOfDay = 0) => locationLocalDateMinuteToInstant({ localDate, minuteOfDay, timezone: calendar.timezone });
  const lastDate = addReportDays(endDate, -1);
  const dueDate = cadence === "DAILY" ? date : businessDayAfter(lastDate, cadence === "MONTHLY" ? 2 : 1, calendar);
  const dueAt = instant(dueDate, cadence === "DAILY" ? calendar.dailyDueMinute : cadence === "WEEKLY" ? 600 : 720);
  return { cadence, startDate, endDate, lastDate, startsAt: instant(startDate), endsAt: instant(endDate), dueAt, overdueAt: new Date(dueAt.getTime() + calendar.graceMinutes * 60_000), reviewBy: instant(businessDayAfter(dueDate, 1, calendar), cadence === "DAILY" ? 720 : 1080), timezone: calendar.timezone, calendarVersion: calendar.version };
}
export function reportBusinessDate(now: Date, timezone = draftReportCalendar.timezone, shiftStart?: Date) {
  return getLocationLocalDate(shiftStart ?? now, timezone);
}
