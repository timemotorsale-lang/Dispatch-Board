import { describe, expect, it } from "vitest";

import { getTimeAwareGreeting } from "@/lib/time-aware-greeting";

describe("time-aware greeting", () => {
  it("uses morning before noon", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-26T14:00:00.000Z") })).toBe("Good morning, Eli.");
  });

  it("uses afternoon from noon through the workday", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-26T20:00:00.000Z") })).toBe("Good afternoon, Eli.");
  });

  it("uses evening after 6 PM", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-27T00:03:00.000Z") })).toBe("Good evening, Eli.");
  });

  it("uses the configured business timezone instead of the server timezone", () => {
    expect(getTimeAwareGreeting("Eli Manager", {
      now: new Date("2026-09-27T00:03:00.000Z"),
      timeZone: "UTC"
    })).toBe("Good morning, Eli.");
  });
});
