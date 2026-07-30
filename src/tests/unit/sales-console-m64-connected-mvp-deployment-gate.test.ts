import { describe, expect, it } from "vitest";

import {
  salesConsoleM64ConnectedMvpGate,
  salesConsoleM64GateCoversEveryArea,
  salesConsoleM64ReadinessAreas,
  salesConsoleM64ReadyCount,
  salesConsoleM64RiskyWorkflowsRemainBlocked
} from "@/features/sales/sales-console-m64-connected-mvp-deployment-gate";

describe("Sales Console M64 connected MVP deployment gate", () => {
  it("covers every connected MVP readiness area", () => {
    expect(salesConsoleM64GateCoversEveryArea()).toBe(true);
    expect(salesConsoleM64ConnectedMvpGate).toHaveLength(salesConsoleM64ReadinessAreas.length);
  });

  it("keeps risky workflows blocked for deployment review", () => {
    expect(salesConsoleM64RiskyWorkflowsRemainBlocked()).toBe(true);
  });

  it("shows most connected MVP areas as deployable while leaving final review visible", () => {
    expect(salesConsoleM64ReadyCount()).toBeGreaterThanOrEqual(10);
    expect(salesConsoleM64ConnectedMvpGate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: "performance acceptable", status: "needs-review" }),
        expect.objectContaining({ area: "staff usability", status: "needs-review" })
      ])
    );
  });
});
