import { describe, expect, it } from "vitest";

import {
  salesConsoleM33CoversAllRolloutAudiences,
  salesConsoleM33DefinesIssueReportingFields,
  salesConsoleM33ExplainsReturnToSourceSystems,
  salesConsoleM33RolloutCadenceStartsSmall,
  salesConsoleM33StaffRolloutPackage
} from "@/features/sales/sales-console-m33-staff-rollout-package";

describe("Sales Console M33 staff rollout package", () => {
  it("covers all rollout audiences", () => {
    expect(salesConsoleM33CoversAllRolloutAudiences()).toBe(true);
    expect(salesConsoleM33StaffRolloutPackage.rolloutAudiences).toHaveLength(4);
  });

  it("defines issue reporting fields", () => {
    expect(salesConsoleM33DefinesIssueReportingFields()).toBe(true);
  });

  it("explains when staff should return to source systems", () => {
    expect(salesConsoleM33ExplainsReturnToSourceSystems()).toBe(true);
  });

  it("starts rollout with a small controlled group", () => {
    expect(salesConsoleM33RolloutCadenceStartsSmall()).toBe(true);
  });
});
