import { describe, expect, it } from "vitest";

import {
  salesConsoleM13ObservabilityConfirmsDisabledActionCoverage,
  salesConsoleM13ObservabilityCountsFallbacksAndUnavailableSources,
  salesConsoleM13ObservabilityHasCoreHealthSignals,
  salesConsoleM13ReleaseObservability
} from "@/features/sales/sales-console-m13-release-observability";

describe("Sales Console M13 release observability", () => {
  it("has core health signals", () => {
    expect(salesConsoleM13ObservabilityHasCoreHealthSignals()).toBe(true);
    expect(salesConsoleM13ReleaseObservability.healthSignals).toHaveLength(7);
  });

  it("counts fallback and unavailable sources", () => {
    expect(salesConsoleM13ObservabilityCountsFallbacksAndUnavailableSources()).toBe(true);
  });

  it("confirms disabled action coverage", () => {
    expect(salesConsoleM13ObservabilityConfirmsDisabledActionCoverage()).toBe(true);
  });
});
