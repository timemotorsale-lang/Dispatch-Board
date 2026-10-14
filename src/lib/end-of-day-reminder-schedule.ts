export const END_OF_DAY_REMINDER_TIME_ZONE = "America/Chicago";
export const END_OF_DAY_REMINDER_SLOTS = ["15:00", "15:30", "16:30"] as const;

/** Only the latest due slot is eligible; missed reminders never queue up. */
export function getEndOfDayReminderSlot(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: END_OF_DAY_REMINDER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  const boardDate = `${value("year")}-${value("month")}-${value("day")}`;
  const time = `${value("hour")}:${value("minute")}`;
  const slot = [...END_OF_DAY_REMINDER_SLOTS].reverse().find(slot => slot <= time) ?? null;
  return { boardDate, slot };
}

export function endOfDayReminderKey(boardDate: string, workbookId: string, slot: string) {
  return `operating-rhythm:end-scheduled:v1:${boardDate}:${workbookId}:${slot}`;
}

export function claimEndOfDayReminder(storage: Pick<Storage, "getItem" | "setItem">, key: string) {
  if (storage.getItem(key)) return false;
  storage.setItem(key, "shown");
  return true;
}
