import { describe, expect, it } from "vitest";

import {
  dealWorkflowIsReadOnly,
  dealWorkflowRequiresAuditAndPermission,
  salesConsoleDealWorkflowReadModel,
  salespersonCannotApproveOrFinance
} from "@/features/sales/sales-console-m9-deal-workflow";

describe("Sales Console enterprise deal workflow foundation", () => {
  it("defines stage contracts without enabling source-system writes", () => {
    expect(salesConsoleDealWorkflowReadModel.readOnly).toBe(true);
    expect(dealWorkflowIsReadOnly()).toBe(true);
    expect(salesConsoleDealWorkflowReadModel.transitions.every((transition) => transition.enabled === false)).toBe(true);
    expect(salesConsoleDealWorkflowReadModel.transitions.every((transition) => transition.sourceWrite === false)).toBe(true);
  });

  it("requires audit and permission gates for deal workflow transitions", () => {
    expect(dealWorkflowRequiresAuditAndPermission()).toBe(true);
    expect(salesConsoleDealWorkflowReadModel.transitions.every((transition) => transition.auditRequired)).toBe(true);
  });

  it("keeps salesperson authority away from approvals, finance, and source close", () => {
    expect(salespersonCannotApproveOrFinance()).toBe(true);
    expect(
      salesConsoleDealWorkflowReadModel.transitions.filter((transition) => transition.requiredRole === "salesperson").map((transition) => transition.to)
    ).not.toContain("finance-handoff-pending");
    expect(
      salesConsoleDealWorkflowReadModel.transitions.filter((transition) => transition.requiredRole === "salesperson").map((transition) => transition.to)
    ).not.toContain("source-system-close");
  });

  it("adds manager review placeholders without enabling approval execution", () => {
    expect(salesConsoleDealWorkflowReadModel.managerReviewPlaceholders).toHaveLength(1);
    expect(salesConsoleDealWorkflowReadModel.managerReviewPlaceholders.every((review) => review.enabled === false)).toBe(true);
    expect(salesConsoleDealWorkflowReadModel.managerReviewPlaceholders.every((review) => review.managerAction === "review-only")).toBe(true);
  });
});
