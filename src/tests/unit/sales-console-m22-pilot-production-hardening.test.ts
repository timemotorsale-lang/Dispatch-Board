import { describe, expect, it } from "vitest";

import {
  salesConsoleM22CoversPilotStates,
  salesConsoleM22HealthIndicatorsReady,
  salesConsoleM22PilotProductionHardening,
  salesConsoleM22UsesInternalPilotLanguage
} from "@/features/sales/sales-console-m22-pilot-production-hardening";

describe("Sales Console M22 pilot production hardening", () => {
  it("covers pilot UI states", () => {
    expect(salesConsoleM22CoversPilotStates()).toBe(true);
    expect(salesConsoleM22PilotProductionHardening.stateCoverage).toContain("duplicate");
  });

  it("marks all pilot health indicators ready", () => {
    expect(salesConsoleM22HealthIndicatorsReady()).toBe(true);
  });

  it("uses internal pilot language", () => {
    expect(salesConsoleM22UsesInternalPilotLanguage()).toBe(true);
  });
});
