import { describe, expect, it } from "vitest";

import {
  managerApprovalFoundationIsDisabled,
  managerApprovalsRequireAuditThresholdAndReason,
  onlyManagersAndAdminsCanDecideApprovals,
  salesConsoleManagerApprovalReadModel
} from "@/features/sales/sales-console-m9-manager-approvals";

describe("Sales Console manager approval foundation", () => {
  it("keeps approval requests and decisions disabled", () => {
    expect(salesConsoleManagerApprovalReadModel.readOnly).toBe(true);
    expect(managerApprovalFoundationIsDisabled()).toBe(true);
  });

  it("requires audit, threshold, reason, and required source fields", () => {
    expect(managerApprovalsRequireAuditThresholdAndReason()).toBe(true);
    for (const contract of salesConsoleManagerApprovalReadModel.requestContracts) {
      expect(contract.auditRequired).toBe(true);
      expect(contract.thresholdRequired).toBe(true);
      expect(contract.reasonRequired).toBe(true);
      expect(contract.requiredFields.length).toBeGreaterThan(3);
    }
  });

  it("restricts future approval decisions to managers and admins", () => {
    expect(onlyManagersAndAdminsCanDecideApprovals()).toBe(true);
    expect(
      salesConsoleManagerApprovalReadModel.decisionGates.flatMap((gate) => gate.allowedDecisionRoles)
    ).not.toContain("salesperson");
  });

  it("keeps finance decisions outside approval outcomes", () => {
    expect(salesConsoleManagerApprovalReadModel.guardrails.join(" ")).toContain("Finance decisions are not approval outcomes");
  });
});
