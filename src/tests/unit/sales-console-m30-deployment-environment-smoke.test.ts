import { describe, expect, it } from "vitest";

import {
  salesConsoleM30CoversDeploymentSmokeBasics,
  salesConsoleM30DeploymentEnvironmentSmoke,
  salesConsoleM30HasRollbackBehaviorForFailedSmoke,
  salesConsoleM30KeepsRiskyWorkflowsBlocked
} from "@/features/sales/sales-console-m30-deployment-environment-smoke";

describe("Sales Console M30 deployment environment smoke", () => {
  it("covers deployed environment smoke basics", () => {
    expect(salesConsoleM30CoversDeploymentSmokeBasics()).toBe(true);
    expect(salesConsoleM30DeploymentEnvironmentSmoke.checks).toHaveLength(5);
  });

  it("keeps risky workflows blocked during smoke", () => {
    expect(salesConsoleM30KeepsRiskyWorkflowsBlocked()).toBe(true);
  });

  it("defines safe fallback behavior if smoke fails", () => {
    expect(salesConsoleM30HasRollbackBehaviorForFailedSmoke()).toBe(true);
  });
});
