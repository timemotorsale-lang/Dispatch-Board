import { describe, expect, it } from "vitest";

import {
  salesConsoleM16ActivationDecisionGate,
  salesConsoleM16ActivationGateCoversCoreConcerns,
  salesConsoleM16ActivationGateKeepsWorkflowDisabled,
  salesConsoleM16ActivationGateReadyForM17Planning
} from "@/features/sales/sales-console-m16-activation-decision-gate";

describe("Sales Console M16 activation decision gate", () => {
  it("covers the core activation concerns", () => {
    expect(salesConsoleM16ActivationGateCoversCoreConcerns()).toBe(true);
    expect(salesConsoleM16ActivationDecisionGate.gates.map((gate) => gate.gate)).toEqual([
      "Workflow selection",
      "Contract completeness",
      "Disabled preview",
      "Excluded workflows"
    ]);
  });

  it("is ready for M17 planning but not activation inside M16", () => {
    expect(salesConsoleM16ActivationGateReadyForM17Planning()).toBe(true);
    expect(salesConsoleM16ActivationDecisionGate.m17Recommendation).toContain("M17 may plan controlled activation");
  });

  it("keeps the workflow disabled", () => {
    expect(salesConsoleM16ActivationGateKeepsWorkflowDisabled()).toBe(true);
    expect(salesConsoleM16ActivationDecisionGate.workflowLive).toBe(false);
  });
});
