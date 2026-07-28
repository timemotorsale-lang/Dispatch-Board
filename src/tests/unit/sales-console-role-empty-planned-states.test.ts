import { describe, expect, it } from "vitest";

import {
  salesConsoleM12EveryRoleHasEmptyAndPlannedState,
  salesConsoleM12PlannedStatesKeepRiskyActionsDisabled,
  salesConsoleM12RoleEmptyPlannedStates
} from "@/features/sales/sales-console-m12-role-empty-planned-states";

describe("Sales Console M12 role empty and planned states", () => {
  it("defines empty and planned guidance for each role", () => {
    expect(salesConsoleM12EveryRoleHasEmptyAndPlannedState()).toBe(true);
    expect(salesConsoleM12RoleEmptyPlannedStates).toHaveLength(7);
  });

  it("keeps risky actions disabled in planned-state copy", () => {
    expect(salesConsoleM12PlannedStatesKeepRiskyActionsDisabled()).toBe(true);
  });
});
