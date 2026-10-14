import { describe, expect, it } from "vitest";

import {
  salesConsoleM29CommunicatesWhatIsAndIsNotActive,
  salesConsoleM29DefinesGoNoGoCriteria,
  salesConsoleM29DeploymentPackageRolloutReadiness,
  salesConsoleM29ReadinessChecklistCoversDeploymentBasics,
  salesConsoleM29RequiresEnvironmentVerificationBeforeBroadRollout
} from "@/features/sales/sales-console-m29-deployment-package-rollout-readiness";

describe("Sales Console M29 deployment package rollout readiness", () => {
  it("covers the deployment readiness checklist basics", () => {
    expect(salesConsoleM29ReadinessChecklistCoversDeploymentBasics()).toBe(true);
    expect(salesConsoleM29DeploymentPackageRolloutReadiness.readinessChecklist).toHaveLength(7);
  });

  it("defines go and no-go rollout criteria", () => {
    expect(salesConsoleM29DefinesGoNoGoCriteria()).toBe(true);
    expect(salesConsoleM29DeploymentPackageRolloutReadiness.goNoGoCriteria.noGo).toContain("Any excluded write action becomes available.");
  });

  it("communicates what is active and what is not active", () => {
    expect(salesConsoleM29CommunicatesWhatIsAndIsNotActive()).toBe(true);
  });

  it("requires environment verification before broad staff rollout", () => {
    expect(salesConsoleM29RequiresEnvironmentVerificationBeforeBroadRollout()).toBe(true);
  });
});
