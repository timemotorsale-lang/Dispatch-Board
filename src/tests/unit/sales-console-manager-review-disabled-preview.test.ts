import { describe, expect, it } from "vitest";

import {
  salesConsoleM16ManagerReviewDisabledPreview,
  salesConsoleM16ManagerReviewPreviewIsDisabled,
  salesConsoleM16ManagerReviewPreviewLivesInDealDesk,
  salesConsoleM16ManagerReviewPreviewShowsUnavailableStates
} from "@/features/sales/sales-console-m16-manager-review-disabled-preview";

describe("Sales Console M16 manager review disabled preview", () => {
  it("keeps the Manager Review Request preview disabled", () => {
    expect(salesConsoleM16ManagerReviewPreviewIsDisabled()).toBe(true);
    expect(salesConsoleM16ManagerReviewDisabledPreview.readOnly).toBe(true);
  });

  it("shows unavailable states before activation", () => {
    expect(salesConsoleM16ManagerReviewPreviewShowsUnavailableStates()).toBe(true);
    expect(salesConsoleM16ManagerReviewDisabledPreview.unavailableStates).toContain("Audit sink not ready");
  });

  it("places the preview in Deal Desk", () => {
    expect(salesConsoleM16ManagerReviewPreviewLivesInDealDesk()).toBe(true);
    expect(salesConsoleM16ManagerReviewDisabledPreview.ctaLabel).toBe("Request Manager Review");
  });
});
