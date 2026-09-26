import { describe, expect, it } from "vitest";

import { getTimeAwareGreeting } from "@/lib/time-aware-greeting";

describe("time-aware greeting", () => {
  it("uses morning before noon", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-26T09:00:00") })).toBe("Good morning, Eli.");
  });

  it("uses afternoon from noon through the workday", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-26T15:00:00") })).toBe("Good afternoon, Eli.");
  });

  it("uses evening after 6 PM", () => {
    expect(getTimeAwareGreeting("Eli Manager", { now: new Date("2026-09-26T19:00:00") })).toBe("Good evening, Eli.");
  });
});
