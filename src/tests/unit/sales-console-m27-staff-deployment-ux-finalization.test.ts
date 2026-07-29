import { describe, expect, it } from "vitest";

import {
  salesConsoleM27CoversCoreRoleUx,
  salesConsoleM27EveryRoleHasFirstThirtySecondGuidance,
  salesConsoleM27KeepsRiskyWorkflowsBlocked,
  salesConsoleM27SourceStatesAreStaffReadable,
  salesConsoleM27StaffDeploymentUxFinalization
} from "@/features/sales/sales-console-m27-staff-deployment-ux-finalization";

describe("Sales Console M27 staff deployment UX finalization", () => {
  it("covers every core staff role landing experience", () => {
    expect(salesConsoleM27CoversCoreRoleUx()).toBe(true);
    expect(salesConsoleM27StaffDeploymentUxFinalization.roleUx).toHaveLength(4);
  });

  it("gives each role clear first-30-seconds operating guidance", () => {
    expect(salesConsoleM27EveryRoleHasFirstThirtySecondGuidance()).toBe(true);
  });

  it("keeps risky workflows outside the MVP console", () => {
    expect(salesConsoleM27KeepsRiskyWorkflowsBlocked()).toBe(true);
    expect(salesConsoleM27StaffDeploymentUxFinalization.stillBlockedWorkflows).toContain("customer messaging automation");
  });

  it("keeps source and fallback states readable for staff", () => {
    expect(salesConsoleM27SourceStatesAreStaffReadable()).toBe(true);
  });
});
