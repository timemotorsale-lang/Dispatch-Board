import { shiftFlowDate, validFlowDate } from "@/features/advisor/workbook-flow-dates";

const units = ["day", "week", "month", "year"] as const;
export type TaskRepeat = { unit: typeof units[number]; every: number; until?: string; weekdays?: number[] };

export function parseTaskRepeat(value: unknown): TaskRepeat | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rule = value as Record<string, unknown>;
  const unit = units.find(item => item === rule.unit);
  if (!unit || typeof rule.every !== "number" || !Number.isInteger(rule.every) || rule.every < 1 || rule.every > 12) return null;
  if (rule.until !== undefined && (typeof rule.until !== "string" || !validFlowDate(rule.until))) return null;
  const weekdays = rule.weekdays;
  if (weekdays !== undefined && (unit !== "week" || !Array.isArray(weekdays) || weekdays.length < 1 || weekdays.length > 7 || weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6))) return null;
  return { unit, every: rule.every, ...(rule.until ? { until: rule.until } : {}), ...(weekdays ? { weekdays: [...new Set(weekdays as number[])] } : {}) };
}

export function isTaskOccurrence(anchor: string, day: string, rule: TaskRepeat) {
  if (day < anchor || (rule.until && day > rule.until)) return false;
  if (day === anchor) return true;
  const first = new Date(anchor);
  const date = new Date(day);
  const days = (date.getTime() - first.getTime()) / 86400000;
  if (rule.unit === "day") return days % rule.every === 0;
  if (rule.unit === "week") {
    return Math.floor((days + first.getUTCDay()) / 7) % rule.every === 0 &&
      (rule.weekdays ?? [first.getUTCDay()]).includes(date.getUTCDay());
  }
  if (date.getUTCDate() !== first.getUTCDate()) return false;
  const years = date.getUTCFullYear() - first.getUTCFullYear();
  const months = years * 12 + date.getUTCMonth() - first.getUTCMonth();
  return rule.unit === "month" ? months % rule.every === 0 : months % (12 * rule.every) === 0;
}

export function taskOccurrences(anchor: string, rule: TaskRepeat, start: string, end: string, firstOnly = false, skip?: Set<string>) {
  const dates: string[] = [];
  for (let date = start < anchor ? anchor : start; date < end && (!rule.until || date <= rule.until); date = shiftFlowDate(date, 1)) {
    if (skip?.has(date) || !isTaskOccurrence(anchor, date, rule)) continue;
    dates.push(date);
    if (firstOnly) break;
  }
  return dates;
}

export function validateDispatchTaskRepeat(anchor: string, value: unknown): { dates: string[]; error?: never } | { error: string; dates?: never } {
  const rule = parseTaskRepeat(value);
  if (!validFlowDate(anchor) || !rule?.until || rule.until <= anchor || Date.parse(rule.until) - Date.parse(anchor) > 12 * 366 * 86400000) {
    return { error: "Choose a repeat end date after the first date and within 12 years." };
  }
  const dates = taskOccurrences(anchor, rule, anchor, shiftFlowDate(rule.until, 1));
  if (dates.length < 2 || dates.length > 60) {
    return { error: `This schedule creates ${dates.length} tasks. Choose an end date or interval that creates between 2 and 60 tasks.` };
  }
  return { dates };
}
