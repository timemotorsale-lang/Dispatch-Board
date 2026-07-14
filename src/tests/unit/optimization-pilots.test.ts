import { describe, expect, it } from "vitest";
import { evaluateCapacityPilot, evaluateForecast, evaluateInventoryPilot, evaluateResponsibleSummary } from "@/server/inventory/optimization-pilots";

describe("M10 optimization pilots", () => {
  it("blocks an unapproved forecast with missing data", () => {
    const result = evaluateForecast({ trainingCutoff: "2026-01-01", actuals: [10, 12], forecasts: [10, 13], missingDataCount: 1 });
    expect(result.disposition).toBe("BLOCKED");
    expect(result.mae).toBe(0.5);
    expect(result.blockers).toContain("NOMISSINGDATA");
  });
  it("allows a validated forecast that beats baseline", () => {
    const result = evaluateForecast({ trainingCutoff: "2026-01-01", actuals: [10, 12], forecasts: [10, 12], baselineForecasts: [12, 14], approved: true });
    expect(result.disposition).toBe("READY");
  });
  it("requires hard rules and baseline improvement for capacity", () => {
    expect(evaluateCapacityPilot({ shadowMode: true, hardRulesPassed: true, baselineScore: 80, recommendationScore: 81 }).disposition).toBe("READY");
    expect(evaluateCapacityPilot({ shadowMode: false, hardRulesPassed: true, baselineScore: 80, recommendationScore: 81 }).disposition).toBe("BLOCKED");
  });
  it("keeps inventory advice advisory", () => {
    expect(evaluateInventoryPilot({ explainable: true, outcomeTracked: true, selfExecuting: false, dataFresh: true }).disposition).toBe("READY");
    expect(evaluateInventoryPilot({ explainable: true, outcomeTracked: true, selfExecuting: true, dataFresh: true }).disposition).toBe("BLOCKED");
  });
  it("requires evidence and rollback controls for summaries", () => {
    const result = evaluateResponsibleSummary({ evidenceIds: ["metric-1"], uncertaintyIncluded: true, sensitiveDataRedacted: true, evaluated: true, fallbackAvailable: true, killSwitchEnabled: true, enabled: true });
    expect(result.disposition).toBe("READY");
  });
});
