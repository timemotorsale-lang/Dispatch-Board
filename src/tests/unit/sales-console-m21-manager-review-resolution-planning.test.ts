import { describe, expect, it } from "vitest";

import {
  salesConsoleM21DefinesResolutionStates,
  salesConsoleM21KeepsRiskyApprovalsBlocked,
  salesConsoleM21ManagerReviewResolutionPlanning,
  salesConsoleM21ResolutionControlsRemainDisabled
} from "@/features/sales/sales-console-m21-manager-review-resolution-planning";

describe("Sales Console M21 manager review resolution planning", () => {
  it("defines the planned resolution states", () => {
    expect(salesConsoleM21DefinesResolutionStates()).toBe(true);
    expect(salesConsoleM21ManagerReviewResolutionPlanning.resolutionStates).toContain("returned to salesperson");
  });

  it("keeps resolution controls disabled", () => {
    expect(salesConsoleM21ResolutionControlsRemainDisabled()).toBe(true);
  });

  it("keeps risky approvals blocked", () => {
    expect(salesConsoleM21KeepsRiskyApprovalsBlocked()).toBe(true);
    expect(salesConsoleM21ManagerReviewResolutionPlanning.blockedApprovals).toContain("Finance approval remains blocked");
  });
});
