import { describe, expect, it } from "vitest";

import {
  salesConsoleM20KeepsNonManagerActionsPlanned,
  salesConsoleM20ManagerReviewWorkbenchUi,
  salesConsoleM20SubmitIsActiveOnlyForManagerReview,
  salesConsoleM20WorkbenchShowsAuditIdentifiers
} from "@/features/sales/sales-console-m20-manager-review-workbench-ui";

describe("Sales Console M20 manager review workbench UI", () => {
  it("activates submit only for Manager Review Request", () => {
    expect(salesConsoleM20SubmitIsActiveOnlyForManagerReview()).toBe(true);
    expect(salesConsoleM20ManagerReviewWorkbenchUi.submitEndpoint).toBe("/api/sales/manager-review-requests");
  });

  it("shows audit identifiers in the manager workbench", () => {
    expect(salesConsoleM20WorkbenchShowsAuditIdentifiers()).toBe(true);
  });

  it("keeps non-manager-review workflows planned", () => {
    expect(salesConsoleM20KeepsNonManagerActionsPlanned()).toBe(true);
    expect(salesConsoleM20ManagerReviewWorkbenchUi.nonManagerReviewActions).toContain("Discount approval planned");
  });
});
