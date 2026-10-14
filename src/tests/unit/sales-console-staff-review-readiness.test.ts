import { describe, expect, it } from "vitest";

import {
  salesConsoleM15StaffReviewCoversReleaseConcerns,
  salesConsoleM15StaffReviewGatesAreReady,
  salesConsoleM15StaffReviewKeepsReadOnlyBoundary,
  salesConsoleM15StaffReviewReadiness
} from "@/features/sales/sales-console-m15-staff-review-readiness";

describe("Sales Console M15 staff review readiness", () => {
  it("covers the release concerns introduced by M15", () => {
    expect(salesConsoleM15StaffReviewCoversReleaseConcerns()).toBe(true);
    expect(salesConsoleM15StaffReviewReadiness.gates.map((gate) => gate.gate)).toEqual([
      "Role-first navigation",
      "Operating section clarity",
      "Fallback clarity",
      "Manager daily command",
      "Read-only guardrails"
    ]);
  });

  it("marks all staff review gates ready", () => {
    expect(salesConsoleM15StaffReviewGatesAreReady()).toBe(true);
  });

  it("keeps the staff review as read-only, not a write-enabled release", () => {
    expect(salesConsoleM15StaffReviewKeepsReadOnlyBoundary()).toBe(true);
    expect(salesConsoleM15StaffReviewReadiness.reviewRecommendation).toContain("not a write-enabled release");
  });
});
