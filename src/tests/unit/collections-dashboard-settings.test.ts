import { describe, expect, it } from "vitest";

import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { dashboardCsv, keepRate, weeklyTrend } from "@/features/collections/server/dashboard-service";
import { validateSettingsInput, validateTemplate } from "@/features/collections/server/settings-service";

const clone = () => structuredClone(DEFAULT_COLLECTIONS_SETTINGS);

describe("dashboard math", () => {
  it("computes the keep rate from resolved promises only", () => {
    expect(keepRate(3, 1, 0)).toBe(75);
    expect(keepRate(0, 0, 0)).toBeNull();
  });
  it("keeps the last metric of each week", () => {
    const m = (date: string, total: number, pastDue: number) => ({ metricDate: new Date(`${date}T00:00:00Z`), totalAccounts: total, pastDueAccounts: pastDue, pastDueAmountCents: pastDue * 100, bucketCounts: { D31_60: 2, D61_PLUS: 1 } });
    const weeks = weeklyTrend([m("2026-11-16", 100, 10), m("2026-11-18", 100, 20), m("2026-11-24", 100, 5)]);
    expect(weeks).toEqual([
      { week: "2026-11-16", pastDuePercent: 20, pastDueAmountCents: 2000, count31to60: 2, count61plus: 1 },
      { week: "2026-11-23", pastDuePercent: 5, pastDueAmountCents: 500, count31to60: 2, count61plus: 1 }
    ]);
  });
  it("exports CSV safely", () => {
    const csv = dashboardCsv({ tiles: {} as never, buckets: [], promises: [], trends: [], generatedAt: "", activity: [{ date: "2026-11-16", collector: "=HYPERLINK(\"x\")", contacts: 2, messages: 1 }] }, "activity");
    expect(csv).toContain("'=HYPERLINK");
  });
});

describe("settings validation", () => {
  it("accepts the defaults", () => expect(validateSettingsInput(clone())).toEqual([]));
  it("requires thresholds to go up", () => {
    const s = clone(); s.thresholds.followUp = 5;
    expect(validateSettingsInput(s).join(" ")).toMatch(/must go up/);
  });
  it("checks hours, links and numbers", () => {
    const s = clone();
    s.businessHours.mon = { open: "18:00", close: "09:00" };
    s.dealership.payOnlineUrl = "pay.example.com";
    (s as unknown as { graceDays: number }).graceDays = -1;
    const errors = validateSettingsInput(s).join(" ");
    expect(errors).toMatch(/mon/); expect(errors).toMatch(/Pay-online/); expect(errors).toMatch(/Grace days/);
  });
});

describe("template validation", () => {
  it("requires an opt-out line and a length that fits with real details", () => {
    expect(validateTemplate({ channel: "SMS", language: "EN", body: "Hi {firstName}, call us." }).join(" ")).toMatch(/STOP/);
    expect(validateTemplate({ channel: "SMS", language: "EN", body: `${"x".repeat(300)} {payOnlineUrl} Reply STOP to opt out.` }).join(" ")).toMatch(/Too long/);
    expect(validateTemplate({ channel: "SMS", language: "EN", body: "Hi {firstName}. Reply STOP to opt out." })).toEqual([]);
  });
  it("rejects unknown merge fields and emails without a subject", () => {
    expect(validateTemplate({ channel: "SMS", language: "EN", body: "Hi {balance}. Reply STOP" }).join(" ")).toMatch(/\{balance\}/);
    expect(validateTemplate({ channel: "EMAIL", language: "EN", body: "Hello", subject: "" }).join(" ")).toMatch(/subject/);
  });
});
