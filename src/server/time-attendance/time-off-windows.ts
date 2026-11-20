import { getLocationLocalDate, getLocationMinuteOfDay, locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";

export const pendingTimeOffStatuses = ["SUBMITTED", "MANAGER_APPROVED", "LEAVE_ADMIN_REVIEW"] as const;

export type TimeOffWindow = { startsAt: Date; endsAt: Date };

export function timeOffEvidence(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function dayWindows(value: unknown, timezone: string): TimeOffWindow[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 31) throw new Error("Enter between 1 and 31 days of time off.");
  const minute = (clock: unknown) => {
    const match = typeof clock === "string" && /^(\d{2}):(\d{2})$/.exec(clock);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Enter a valid start and end time for each day.");
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const seen = new Set<string>();
  return value.map((entry) => {
    const { date, start, end } = timeOffEvidence(entry);
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a date for each day of time off.");
    if (seen.has(date)) throw new Error("Enter each day of time off once.");
    seen.add(date);
    const resolve = (clock: unknown) => {
      const minuteOfDay = minute(clock);
      const instant = locationLocalDateMinuteToInstant({ localDate: date, minuteOfDay, timezone });
      if (getLocationLocalDate(instant, timezone) !== date || getLocationMinuteOfDay(instant, timezone) !== minuteOfDay) {
        throw new Error("Choose a valid local time at the work location.");
      }
      return instant;
    };
    const startsAt = resolve(start);
    const endsAt = resolve(end);
    if (endsAt <= startsAt) throw new Error("The end time must follow the start on each day.");
    return { startsAt, endsAt };
  }).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function storedTimeOffWindows(record: TimeOffWindow & { evidence?: unknown }): TimeOffWindow[] {
  const values = timeOffEvidence(record.evidence).timeOffWindows;
  if (!Array.isArray(values) || values.length === 0) return [{ startsAt: record.startsAt, endsAt: record.endsAt }];
  const windows = values.map(value => {
    const entry = timeOffEvidence(value);
    return { startsAt: new Date(String(entry.startsAt)), endsAt: new Date(String(entry.endsAt)) };
  });
  return windows.every(window => window.startsAt < window.endsAt) ? windows : [{ startsAt: record.startsAt, endsAt: record.endsAt }];
}

export function timeOffMinutes({ startsAt, endsAt }: TimeOffWindow) {
  return Math.max(0, Math.ceil((endsAt.getTime() - startsAt.getTime()) / 60_000));
}
