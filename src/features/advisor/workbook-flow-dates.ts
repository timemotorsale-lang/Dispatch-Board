export type FlowPeriod = "daily" | "weekly" | "monthly";
export const FLOW_TIME_ZONE = "America/Chicago";
export function validFlowDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function shiftFlowDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function flowRange(value: string, period: FlowPeriod) {
  if (!validFlowDate(value)) throw new Error("Invalid flow date");
  const date = new Date(`${value}T12:00:00Z`);
  const start = period === "monthly" ? `${value.slice(0, 7)}-01` : period === "weekly" ? shiftFlowDate(value, -((date.getUTCDay() + 6) % 7)) : value;
  if (period === "monthly") {
    date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1);
    return { start, end: date.toISOString().slice(0, 10) };
  }
  return { start, end: shiftFlowDate(start, period === "weekly" ? 7 : 1) };
}
// Resolve local midnight independently at each boundary to respect DST.
export function flowMidnight(date: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  let instant = target;
  for (let index = 0; index < 4; index++) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: FLOW_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (key: string) => Number(parts.find(item => item.type === key)!.value);
    instant += target - Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  }
  return new Date(instant).toISOString();
}
export function flowDay(instant: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: FLOW_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  return ["year", "month", "day"].map(key => parts.find(part => part.type === key)!.value).join("-");
}
export function dailyFlowHref(date: string) { return `/appointments?section=today&localDate=${encodeURIComponent(date)}`; }
