import { describe, expect, it } from "vitest";

import {
  salesConsoleM13FeedbackCaptureRemainsReadOnly,
  salesConsoleM13FeedbackCategories,
  salesConsoleM13FeedbackCategoriesCoverDogfoodRisks
} from "@/features/sales/sales-console-m13-feedback-categories";

describe("Sales Console M13 feedback categories", () => {
  it("covers dogfood feedback risks", () => {
    expect(salesConsoleM13FeedbackCategoriesCoverDogfoodRisks()).toBe(true);
    expect(salesConsoleM13FeedbackCategories).toHaveLength(8);
  });

  it("does not enable feedback writes", () => {
    expect(salesConsoleM13FeedbackCaptureRemainsReadOnly()).toBe(true);
  });
});
