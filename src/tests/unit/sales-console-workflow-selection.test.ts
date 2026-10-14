import { describe, expect, it } from "vitest";

import {
  salesConsoleM16RiskyWorkflowsRemainNotSelected,
  salesConsoleM16SelectsManagerReviewFirst,
  salesConsoleM16WorkflowSelection,
  salesConsoleM16WorkflowSelectionRemainsPlanningOnly
} from "@/features/sales/sales-console-m16-workflow-selection";

describe("Sales Console M16 workflow selection", () => {
  it("selects Manager Review Request as the first controlled workflow candidate", () => {
    expect(salesConsoleM16SelectsManagerReviewFirst()).toBe(true);
    expect(salesConsoleM16WorkflowSelection.selectedWorkflow).toBe("Manager Review Request");
  });

  it("keeps higher-risk workflows out of the activation path", () => {
    expect(salesConsoleM16RiskyWorkflowsRemainNotSelected()).toBe(true);
    expect(salesConsoleM16WorkflowSelection.candidates.filter((candidate) => candidate.risk === "high")).toHaveLength(4);
  });

  it("remains disabled and planning-only", () => {
    expect(salesConsoleM16WorkflowSelectionRemainsPlanningOnly()).toBe(true);
    expect(salesConsoleM16WorkflowSelection.readOnlyPlanningOnly).toBe(true);
  });
});
