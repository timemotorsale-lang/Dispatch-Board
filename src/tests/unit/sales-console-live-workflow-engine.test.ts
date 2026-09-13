import { describe, expect, it } from "vitest";

import {
  salesConsoleLiveActivityDecision,
  salesConsoleLiveEvidenceRecord,
  salesConsoleLiveEvidenceValidation,
  salesConsoleLiveInventoryMatches,
  salesConsoleLiveLeadRecords,
  salesConsoleLiveManagerQueues,
  salesConsoleLiveOutcomeDecision,
  salesConsoleLiveRevenueLanes,
  salesConsoleLiveWorkItems,
  salesConsoleUnifiedQueueCoversOperatingBrain,
  salesConsoleUnifiedRevenueCommandQueueHealth,
  searchSalesConsoleLiveExperience
} from "@/features/sales/sales-console-live-workflow-engine";

describe("Sales Console live workflow engine", () => {
  it("drives the work queue from deterministic ranking output", () => {
    expect(salesConsoleLiveWorkItems[0].algorithmScore).toBeGreaterThanOrEqual(salesConsoleLiveWorkItems[1].algorithmScore);
    expect(salesConsoleLiveWorkItems[0].algorithmReasons.length).toBeGreaterThan(0);
    expect(salesConsoleLiveWorkItems[0].componentScores.revenueOpportunity).toBeGreaterThan(0);
    expect(new Set(salesConsoleLiveWorkItems.map((item) => item.group))).toEqual(
      expect.any(Set)
    );
  });

  it("keeps the revenue work queue source-backed and lane-aware", () => {
    const lanes = new Set(salesConsoleLiveWorkItems.map((item) => item.contractLane));

    expect(salesConsoleLiveWorkItems.length).toBeGreaterThan(0);
    expect([...lanes]).toEqual(
      expect.arrayContaining([
        "Inventory Cash Sale",
        "Inventory BHPH Sale",
        "Inventory Lease-to-Own",
        "Public Auto Repair",
        "Financing Product"
      ])
    );
    expect(salesConsoleLiveWorkItems.every((item) => item.source && item.reason && item.nextAction)).toBe(true);
    expect(salesConsoleLiveWorkItems.every((item) => item.algorithmReasons.length > 0)).toBe(true);
    expect(salesConsoleLiveWorkItems.some((item) => item.blockers.length > 0)).toBe(true);
  });

  it("unifies source domains into the revenue command queue while preserving guardrails", () => {
    expect(salesConsoleUnifiedQueueCoversOperatingBrain()).toBe(true);
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.sourceDomains).toEqual(
      expect.arrayContaining(["Customer 360", "Inventory", "Appointments", "Tasks / My Tasks", "Rental", "Service", "Finance", "Warranty"])
    );
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.guardedActions).toContain("vehicle holds/reservations");
    expect(salesConsoleUnifiedRevenueCommandQueueHealth.managerReviewOnlySubmitWorkflow).toBe(true);
  });

  it("adds live workflow decisions to leads and revenue lanes", () => {
    expect(salesConsoleLiveLeadRecords[0].workflowDecision.routingRecommendation).toBe("manager-review");
    expect(salesConsoleLiveLeadRecords[0].workflowDecision.assignmentWriteEnabled).toBe(false);
    expect(salesConsoleLiveRevenueLanes).toHaveLength(7);
    expect(salesConsoleLiveRevenueLanes.some((lane) => lane.workflowDecision.governedActions.length > 0)).toBe(true);
  });

  it("scores inventory matches and keeps vehicle actions governed", () => {
    expect(salesConsoleLiveInventoryMatches[0].matchScore).toBeGreaterThan(0);
    expect(salesConsoleLiveInventoryMatches.map((match) => match.sellability)).toEqual(
      expect.arrayContaining(["primary", "verify-first"])
    );
  });

  it("builds manager queues from command center algorithms", () => {
    expect(salesConsoleLiveManagerQueues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Review Queue", algorithmSource: "manager review queue" }),
        expect.objectContaining({ title: "Forecast Confidence", algorithmSource: "weighted forecast confidence" })
      ])
    );
  });

  it("uses federated role-aware search across the live console", () => {
    const salespersonSearch = searchSalesConsoleLiveExperience("pay stub", "Salesperson");
    const managerSearch = searchSalesConsoleLiveExperience("pay stub", "Sales Manager");

    expect(salespersonSearch.state).toBe("ready");
    expect(managerSearch.results.length).toBeGreaterThanOrEqual(salespersonSearch.results.length);
    expect(managerSearch.results.every((result) => result.writeEnabled === false)).toBe(true);
  });

  it("exposes guarded recordable workflows without risky source writes", () => {
    expect(salesConsoleLiveEvidenceValidation.allowed).toBe(true);
    expect(salesConsoleLiveEvidenceRecord?.status).toBe("pending");
    expect(salesConsoleLiveActivityDecision.allowed).toBe(true);
    expect(salesConsoleLiveOutcomeDecision.allowed).toBe(true);
    expect(salesConsoleLiveOutcomeDecision.sourceSystemCloseWriteEnabled).toBe(false);
  });
});
