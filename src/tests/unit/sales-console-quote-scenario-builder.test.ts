import { describe, expect, it } from "vitest";

import {
  quoteScenarioBuilderIsEstimateOnly,
  quoteScenarioHasAuditAndPermissionCoverage,
  quoteScenarioRequiresReviewAndFinanceVerification,
  salesConsoleQuoteScenarioReadModel
} from "@/features/sales/sales-console-m9-quote-scenario-builder";

describe("Sales Console quote scenario builder foundation", () => {
  it("keeps scenarios estimate-only and final submission disabled", () => {
    expect(salesConsoleQuoteScenarioReadModel.readOnly).toBe(true);
    expect(salesConsoleQuoteScenarioReadModel.submissionEnabled).toBe(false);
    expect(quoteScenarioBuilderIsEstimateOnly()).toBe(true);
  });

  it("requires disclaimer, manager review, and finance verification", () => {
    expect(quoteScenarioRequiresReviewAndFinanceVerification()).toBe(true);
    expect(salesConsoleQuoteScenarioReadModel.scenarios.every((scenario) => scenario.disclaimerRequired)).toBe(true);
  });

  it("requires the major payment calculation inputs before future activation", () => {
    const scenario = salesConsoleQuoteScenarioReadModel.scenarios[0];

    expect(scenario?.requiredInputs).toEqual(
      expect.arrayContaining(["vehiclePrice", "taxes", "fees", "downPayment", "tradeEstimate", "payoff", "termMonths", "aprEstimate"])
    );
  });

  it("has audit and permission coverage while still disabled", () => {
    expect(quoteScenarioHasAuditAndPermissionCoverage()).toBe(true);
    expect(salesConsoleQuoteScenarioReadModel.scenarios.every((scenario) => scenario.enabled === false)).toBe(true);
  });
});
