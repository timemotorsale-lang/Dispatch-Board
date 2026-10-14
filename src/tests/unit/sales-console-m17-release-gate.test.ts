import { describe, expect, it } from "vitest";

import {
  salesConsoleM17ReleaseGate,
  salesConsoleM17ReleaseGateBlocksLiveSubmit,
  salesConsoleM17ReleaseGateNamesNextBackendStep,
  salesConsoleM17ReleaseGateShellReady
} from "@/features/sales/sales-console-m17-release-gate";

describe("Sales Console M17 release gate", () => {
  it("marks the activation shell ready", () => {
    expect(salesConsoleM17ReleaseGateShellReady()).toBe(true);
  });

  it("blocks live submit until backend exists", () => {
    expect(salesConsoleM17ReleaseGateBlocksLiveSubmit()).toBe(true);
    expect(salesConsoleM17ReleaseGate.workflowLive).toBe(false);
  });

  it("names the next backend step", () => {
    expect(salesConsoleM17ReleaseGateNamesNextBackendStep()).toBe(true);
    expect(salesConsoleM17ReleaseGate.releaseRecommendation).toContain("dedicated audited manager-review backend endpoint");
  });
});
