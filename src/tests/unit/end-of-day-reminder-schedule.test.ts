import { describe, expect, it } from "vitest";
import { claimEndOfDayReminder, endOfDayReminderKey, getEndOfDayReminderSlot } from "@/lib/end-of-day-reminder-schedule";

describe("end-of-day reminder schedule", () => {
  it("shows each slot once despite five-minute checks, remounts, or reloads", () => {
    const saved = new Map<string, string>();
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
    const shown: string[] = [];
    for (let minute = 0; minute <= 180; minute += 5) {
      const { boardDate, slot } = getEndOfDayReminderSlot(new Date(Date.parse("2026-09-03T20:00:00Z") + minute * 60_000));
      if (slot && claimEndOfDayReminder(storage, endOfDayReminderKey(boardDate, "workbook-1", slot))) shown.push(slot);
    }
    expect(shown).toEqual(["15:00", "15:30", "16:30"]);
  });
  it.each([
    ["19:59", null], ["20:00", "15:00"], ["20:05", "15:00"],
    ["20:29", "15:00"], ["20:30", "15:30"], ["21:00", "15:30"],
    ["21:29", "15:30"], ["21:30", "16:30"], ["21:35", "16:30"], ["23:00", "16:30"]
  ])("maps %s UTC to one Chicago reminder slot", (time, slot) => {
    expect(getEndOfDayReminderSlot(new Date(`2026-09-03T${time}:00Z`))).toEqual({ boardDate: "2026-09-03", slot });
  });
  it("uses Chicago time in winter and resets at the next local day", () => {
    expect(getEndOfDayReminderSlot(new Date("2026-12-03T21:30:00Z")).slot).toBe("15:30");
    expect(getEndOfDayReminderSlot(new Date("2026-09-04T05:00:00Z"))).toEqual({ boardDate: "2026-09-04", slot: null });
  });
  it("deduplicates each slot across routes but separates workbooks and days", () => {
    const key = endOfDayReminderKey("2026-09-03", "workbook-1", "15:00");
    expect(key).toBe(endOfDayReminderKey("2026-09-03", "workbook-1", "15:00"));
    expect(key).not.toBe(endOfDayReminderKey("2026-09-03", "workbook-1", "15:30"));
    expect(key).not.toBe(endOfDayReminderKey("2026-09-04", "workbook-1", "15:00"));
    expect(key).not.toBe(endOfDayReminderKey("2026-09-03", "workbook-2", "15:00"));
  });
});
