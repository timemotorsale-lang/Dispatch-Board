import { describe, expect, it } from "vitest";

import {
  salesConsoleM23ChecklistReady,
  salesConsoleM23CommunicatesExcludedActions,
  salesConsoleM23CoversCoreStaffRoles,
  salesConsoleM23StaffDeploymentReadiness
} from "@/features/sales/sales-console-m23-staff-deployment-readiness";

describe("Sales Console M23 staff deployment readiness", () => {
  it("marks the staff readiness checklist ready", () => {
    expect(salesConsoleM23ChecklistReady()).toBe(true);
  });

  it("covers core staff roles", () => {
    expect(salesConsoleM23CoversCoreStaffRoles()).toBe(true);
    expect(salesConsoleM23StaffDeploymentReadiness.roleReadiness.map((role) => role.role)).toContain("Sales Manager");
  });

  it("communicates excluded actions", () => {
    expect(salesConsoleM23CommunicatesExcludedActions()).toBe(true);
  });
});
