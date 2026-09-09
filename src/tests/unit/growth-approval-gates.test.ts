import { describe, expect, it } from "vitest";

import { buildGrowthApprovalGateReviewModel, evaluateGrowthApprovalGates } from "@/server/growth/approval-gates";
import { canDecideGrowthApproval } from "@/server/growth/operational-service";

describe("growth approval gates", () => {
  it("requires the right business owner approval by campaign type", () => {
    const decision = evaluateGrowthApprovalGates({
      actorRole: "Marketing Manager",
      budgetCents: 0,
      campaignType: "Service reminder",
      channel: "Email",
      offerSourceVerified: true,
      planStatus: "Approval requested",
      providerReady: true,
      requestedApprovals: []
    });

    expect(decision.nextApproval).toBe("Service Manager");
    expect(decision.lockedReason).toContain("Service Manager approval");
    expect(decision.canExecute).toBe(false);
  });

  it("requires GM approval before any paid ad spend", () => {
    const decision = evaluateGrowthApprovalGates({
      actorRole: "Inventory Manager",
      budgetCents: 75000,
      campaignType: "Aged inventory",
      channel: "Paid ads",
      offerSourceVerified: true,
      planStatus: "Approval requested",
      providerReady: true,
      requestedApprovals: ["Inventory Manager"]
    });

    expect(decision.nextApproval).toBe("GM/Admin");
    expect(decision.lockedReason).toBe("GM/Admin approval is required before spending money.");
  });

  it("fails closed even when approval checks pass", () => {
    const decision = evaluateGrowthApprovalGates({
      actorRole: "GM/Admin",
      budgetCents: 75000,
      campaignType: "Aged inventory",
      channel: "Paid ads",
      offerSourceVerified: true,
      planStatus: "Approval requested",
      providerReady: true,
      requestedApprovals: ["Inventory Manager", "GM/Admin"]
    });

    expect(decision.canExecute).toBe(false);
    expect(decision.lockedReason).toBe("Execution remains locked until the user approves live activation.");
  });

  it("builds a review model with exact next approval direction", () => {
    const model = buildGrowthApprovalGateReviewModel();

    expect(model.canExecute).toBe(false);
    expect(model.nextApproval).toBe("GM/Admin");
    expect(model.checks.some((check) => check.label === "Provider execution ready" && !check.passed)).toBe(true);
  });

  it("limits approval decisions to the requested role or GM/Admin", () => {
    expect(canDecideGrowthApproval("Inventory Manager", "Inventory Manager")).toBe(true);
    expect(canDecideGrowthApproval("GM/Admin", "Service Manager")).toBe(true);
    expect(canDecideGrowthApproval("Sales Manager", "Inventory Manager")).toBe(false);
    expect(canDecideGrowthApproval("Staff", "Sales Manager")).toBe(false);
  });
});
