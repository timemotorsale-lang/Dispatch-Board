import { describe, expect, it } from "vitest";

import {
  salesConsoleM13DogfoodGates,
  salesConsoleM13DogfoodGatesCoverReleasePath,
  salesConsoleM13DogfoodGatesRequireEvidence,
  salesConsoleM13ProductionPilotStillWaits
} from "@/features/sales/sales-console-m13-dogfood-gates";

describe("Sales Console M13 dogfood go/no-go gates", () => {
  it("covers the dogfood release path", () => {
    expect(salesConsoleM13DogfoodGatesCoverReleasePath()).toBe(true);
    expect(salesConsoleM13DogfoodGates).toHaveLength(5);
  });

  it("requires evidence for every gate", () => {
    expect(salesConsoleM13DogfoodGatesRequireEvidence()).toBe(true);
  });

  it("keeps production pilot as a later review decision", () => {
    expect(salesConsoleM13ProductionPilotStillWaits()).toBe(true);
  });
});
