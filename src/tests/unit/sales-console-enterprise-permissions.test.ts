import { describe, expect, it } from "vitest";

import {
  enterprisePermissionGatesDenyByDefault,
  roleCanSeeEnterpriseCapability,
  salesConsoleEnterprisePermissionReadModel,
  sensitiveWorkflowsHavePermissionAndAuditCoverage
} from "@/features/sales/sales-console-m9-enterprise-permissions";
import { salesConsoleMvpExecution } from "@/features/sales/sales-console-mvp-execution";

describe("Sales Console enterprise permissions", () => {
  it("keeps enterprise permission gates read-only and deny-by-default", () => {
    expect(salesConsoleEnterprisePermissionReadModel.readOnly).toBe(true);
    expect(enterprisePermissionGatesDenyByDefault()).toBe(true);
    expect(salesConsoleEnterprisePermissionReadModel.gates.every((gate) => gate.enabled === false)).toBe(true);
  });

  it("defines role, store, team, and ownership placeholders for every enterprise role", () => {
    expect(salesConsoleEnterprisePermissionReadModel.roleScopes.map((scope) => scope.role)).toEqual([
      "salesperson",
      "sales-manager",
      "bdc-lead-coordinator",
      "admin-owner",
      "finance"
    ]);

    for (const scope of salesConsoleEnterprisePermissionReadModel.roleScopes) {
      expect(scope.storePlaceholder).toContain("mapping");
      expect(scope.teamPlaceholder).toContain("mapping");
      expect(scope.ownershipPlaceholder.length).toBeGreaterThan(0);
    }
  });

  it("keeps salesperson capabilities limited and manager-only capabilities restricted", () => {
    expect(roleCanSeeEnterpriseCapability("salesperson", "quote-scenario-draft")).toBe(true);
    expect(roleCanSeeEnterpriseCapability("salesperson", "customer-message-draft")).toBe(true);
    expect(roleCanSeeEnterpriseCapability("salesperson", "manager-approval-review")).toBe(false);
    expect(roleCanSeeEnterpriseCapability("salesperson", "vehicle-hold-request")).toBe(false);
  });

  it("allows managers and admins to review enterprise controls without enabling execution", () => {
    expect(roleCanSeeEnterpriseCapability("sales-manager", "manager-approval-review")).toBe(true);
    expect(roleCanSeeEnterpriseCapability("admin-owner", "store-reporting-review")).toBe(true);
    expect(roleCanSeeEnterpriseCapability("admin-owner", "vehicle-hold-request")).toBe(true);
    expect(salesConsoleEnterprisePermissionReadModel.gates.every((gate) => gate.enabled === false)).toBe(true);
  });

  it("models finance as a future restricted role without finance decisions in Sales Console", () => {
    expect(roleCanSeeEnterpriseCapability("finance", "finance-handoff-review")).toBe(true);
    expect(roleCanSeeEnterpriseCapability("finance", "discount-approval-request")).toBe(false);
    expect(salesConsoleEnterprisePermissionReadModel.guardrails.join(" ")).toContain("no finance decisions");
  });

  it("pairs every excluded sensitive workflow with both permission and audit coverage", () => {
    expect(sensitiveWorkflowsHavePermissionAndAuditCoverage()).toBe(true);
    expect(salesConsoleMvpExecution.readOnlyGuardrails).toHaveLength(5);
  });
});
