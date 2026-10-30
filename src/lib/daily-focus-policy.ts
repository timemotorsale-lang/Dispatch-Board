export const REQUIRED_DAILY_FOCUSES = 3;
export function distinctDailyFocuses<T extends { outcome: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.outcome.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function assertDailyFocusMinimum(items: Array<{ outcome: string }>) {
  const count = distinctDailyFocuses(items).length;
  if (count < REQUIRED_DAILY_FOCUSES) throw new Error(`Add at least ${REQUIRED_DAILY_FOCUSES} distinct daily focuses before submitting your morning plan. ${count} recorded so far.`);
}
