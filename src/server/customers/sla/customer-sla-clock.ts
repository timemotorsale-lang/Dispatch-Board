export type CustomerBusinessWindow = { day: string; openMinute: number; closeMinute: number };
export type CustomerSlaPauseInterval = { startedAt: Date; endedAt: Date | null };

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: get("weekday").toUpperCase(), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

function isBusinessMinute(date: Date, timezone: string, windows: CustomerBusinessWindow[]) {
  const local = localParts(date, timezone);
  return windows.some((window) => window.day === local.day && local.minute >= window.openMinute && local.minute < window.closeMinute);
}

function isPaused(date: Date, pauses: CustomerSlaPauseInterval[]) {
  return pauses.some((pause) => date >= pause.startedAt && (!pause.endedAt || date < pause.endedAt));
}

export function calculateBusinessMinutes(input: { start: Date; end: Date; timezone: string; windows: CustomerBusinessWindow[]; pauses?: CustomerSlaPauseInterval[] }) {
  if (input.end <= input.start) return 0;
  let minutes = 0; let cursor = new Date(input.start); let guard = 0;
  while (cursor < input.end) {
    if (isBusinessMinute(cursor, input.timezone, input.windows) && !isPaused(cursor, input.pauses ?? [])) minutes += 1;
    cursor = new Date(cursor.getTime() + 60_000);
    if (++guard > 1_100_000) throw new Error("SLA clock interval exceeds the supported two-year evaluation window.");
  }
  return minutes;
}

export function addBusinessMinutes(input: { start: Date; minutes: number; timezone: string; windows: CustomerBusinessWindow[] }) {
  if (!Number.isInteger(input.minutes) || input.minutes < 0) throw new Error("SLA business minutes must be a non-negative whole number.");
  let remaining = input.minutes; let cursor = new Date(input.start); let guard = 0;
  while (remaining > 0) {
    if (isBusinessMinute(cursor, input.timezone, input.windows)) remaining -= 1;
    cursor = new Date(cursor.getTime() + 60_000);
    if (++guard > 1_100_000) throw new Error("SLA target exceeds the supported two-year calculation window.");
  }
  return cursor;
}

export type CustomerSlaStage = "HEALTHY" | "WATCH" | "AT_RISK" | "BREACHED" | "REPEATED_BREACH";

export function evaluateCustomerSlaStage(input: { elapsedMinutes: number; targetMinutes: number; priorStage?: CustomerSlaStage | null; repeatedBreachAfterMinutes?: number }) {
  if (input.targetMinutes <= 0) throw new Error("SLA target minutes must be greater than zero.");
  const ratio = input.elapsedMinutes / input.targetMinutes;
  const repeatAfter = input.repeatedBreachAfterMinutes ?? Math.max(60, Math.round(input.targetMinutes * 0.25));
  const stage: CustomerSlaStage = input.elapsedMinutes >= input.targetMinutes + repeatAfter ? "REPEATED_BREACH" : ratio >= 1 ? "BREACHED" : ratio >= 0.9 ? "AT_RISK" : ratio >= 0.75 ? "WATCH" : "HEALTHY";
  return { stage, elapsedMinutes: input.elapsedMinutes, targetMinutes: input.targetMinutes, percentConsumed: Math.max(0, Math.round(ratio * 100)), changed: stage !== (input.priorStage ?? "HEALTHY") };
}
