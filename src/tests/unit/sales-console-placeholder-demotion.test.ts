import { describe, expect, it } from "vitest";

import {
  salesConsoleM14PlaceholderDemotion,
  salesConsoleM14PlaceholderDemotionKeepsAdminReview,
  salesConsoleM14PlaceholderDemotionKeepsWritesDisabled,
  salesConsoleM14PlaceholderDemotionReducesStaffNoise
} from "@/features/sales/sales-console-m14-placeholder-demotion";

describe("Sales Console M14 placeholder demotion", () => {
  it("moves daily staff use toward operating views first", () => {
    expect(salesConsoleM14PlaceholderDemotionReducesStaffNoise()).toBe(true);
    expect(salesConsoleM14PlaceholderDemotion.staffStartMessage).toContain("operating work");
  });

  it("preserves planning evidence for Admin and Owner review", () => {
    expect(salesConsoleM14PlaceholderDemotionKeepsAdminReview()).toBe(true);
    expect(salesConsoleM14PlaceholderDemotion.items.some((item) => item.handling === "admin-review-only")).toBe(true);
  });

  it("keeps placeholder-heavy write workflows disabled", () => {
    expect(salesConsoleM14PlaceholderDemotionKeepsWritesDisabled()).toBe(true);
    expect(salesConsoleM14PlaceholderDemotion.readOnly).toBe(true);
  });
});
