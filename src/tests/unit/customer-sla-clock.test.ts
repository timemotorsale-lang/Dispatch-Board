import { describe, expect, it } from "vitest";
import { addBusinessMinutes, calculateBusinessMinutes, evaluateCustomerSlaStage } from "@/server/customers/sla/customer-sla-clock";

const windows = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => ({ day, openMinute: 9 * 60, closeMinute: 18 * 60 }));

describe("customer SLA business clock", () => {
  it("counts only configured business minutes across a weekend", () => {
    const minutes = calculateBusinessMinutes({ start: new Date("2026-07-10T23:00:00.000Z"), end: new Date("2026-07-13T16:00:00.000Z"), timezone: "America/Chicago", windows });
    expect(minutes).toBe(120);
  });

  it("subtracts approved pause intervals without pausing customer promises", () => {
    const start = new Date("2026-07-13T14:00:00.000Z"); const end = new Date("2026-07-13T18:00:00.000Z");
    expect(calculateBusinessMinutes({ start, end, timezone: "America/Chicago", windows, pauses: [{ startedAt: new Date("2026-07-13T15:00:00.000Z"), endedAt: new Date("2026-07-13T17:00:00.000Z") }] })).toBe(120);
  });

  it("adds business minutes and evaluates every escalation band", () => {
    expect(addBusinessMinutes({ start: new Date("2026-07-10T23:00:00.000Z"), minutes: 120, timezone: "America/Chicago", windows }).toISOString()).toBe("2026-07-13T16:00:00.000Z");
    expect(evaluateCustomerSlaStage({ elapsedMinutes: 74, targetMinutes: 100 }).stage).toBe("HEALTHY");
    expect(evaluateCustomerSlaStage({ elapsedMinutes: 75, targetMinutes: 100 }).stage).toBe("WATCH");
    expect(evaluateCustomerSlaStage({ elapsedMinutes: 90, targetMinutes: 100 }).stage).toBe("AT_RISK");
    expect(evaluateCustomerSlaStage({ elapsedMinutes: 100, targetMinutes: 100 }).stage).toBe("BREACHED");
    expect(evaluateCustomerSlaStage({ elapsedMinutes: 160, targetMinutes: 100, repeatedBreachAfterMinutes: 60 }).stage).toBe("REPEATED_BREACH");
  });
});
