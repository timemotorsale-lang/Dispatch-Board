import { describe, expect, it } from "vitest";

import {
  forecastRowsHaveConfidenceAndFreshness,
  restrictedForecastMetricsAreRoleLimited,
  salesConsoleForecastReadModel,
  staleForecastInputsLowerConfidence
} from "@/features/sales/sales-console-m9-forecasting";

describe("Sales Console enterprise forecasting foundation", () => {
  it("keeps forecasting read-only with confidence and freshness labels", () => {
    expect(salesConsoleForecastReadModel.readOnly).toBe(true);
    expect(forecastRowsHaveConfidenceAndFreshness()).toBe(true);
  });

  it("restricts gross and finance metrics from unauthorized roles", () => {
    expect(restrictedForecastMetricsAreRoleLimited()).toBe(true);
    expect(
      salesConsoleForecastReadModel.forecastRows.filter((row) => row.restricted).flatMap((row) => row.visibleTo)
    ).not.toContain("salesperson");
  });

  it("lowers confidence when source inputs are stale", () => {
    expect(staleForecastInputsLowerConfidence()).toBe(true);
  });

  it("explains source inputs for every forecast row", () => {
    expect(salesConsoleForecastReadModel.forecastRows.every((row) => row.inputSummary.length > 20)).toBe(true);
  });
});
