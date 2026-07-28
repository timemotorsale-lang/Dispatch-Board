import { describe, expect, it } from "vitest";

import {
  adaptDealDesk,
  adaptInventoryMatches,
  adaptLeadOperations,
  adaptSalesConsoleReadModel,
  adaptSellerQueue,
  salesConsoleMockSourceBundle,
  salesConsoleReadAdapterPreview
} from "@/features/sales/sales-console-mvp-read-adapters";

describe("Sales Console MVP read adapters", () => {
  it("normalizes seller work into a read-only priority queue with stale and placeholder labels", () => {
    const queue = adaptSellerQueue(salesConsoleMockSourceBundle.tasks);

    expect(queue).toHaveLength(3);
    expect(queue.map((item) => item.priorityRank)).toEqual([1, 2, 3]);
    expect(queue.some((item) => item.freshnessState === "stale")).toBe(true);
    expect(queue.some((item) => item.freshnessState === "placeholder")).toBe(true);
    expect(queue.some((item) => item.nextAction === "Next action pending")).toBe(true);
    expect(queue.some((item) => item.blocker.startsWith("Blocked:"))).toBe(true);
    expect(queue.every((item) => item.sourceLinks.length === 3)).toBe(true);
    expect(queue.flatMap((item) => item.sourceLinks).some((link) => link.unavailableLabel.includes("unavailable"))).toBe(true);
  });

  it("keeps lead leakage visible without mutating lead records", () => {
    const leads = adaptLeadOperations(salesConsoleMockSourceBundle.leads);

    expect(leads).toHaveLength(2);
    expect(leads.some((lead) => lead.assignmentState === "unassigned")).toBe(true);
    expect(leads.some((lead) => lead.label === "Duplicate review")).toBe(true);
    expect(leads.some((lead) => lead.tone === "danger")).toBe(true);
  });

  it("marks uncertain inventory as verify-first before presentation", () => {
    const matches = adaptInventoryMatches(salesConsoleMockSourceBundle.vehicles, salesConsoleMockSourceBundle.tasks);

    expect(matches).toHaveLength(2);
    expect(matches.some((match) => match.freshnessState === "verify-first")).toBe(true);
    expect(matches.some((match) => match.status === "Verify First")).toBe(true);
    expect(matches.some((match) => match.blockerDetail === "Recon status unknown")).toBe(true);
  });

  it("keeps placeholder deal data visibility-only and never quote-enabled", () => {
    const deals = adaptDealDesk(salesConsoleMockSourceBundle.deals);

    expect(deals).toHaveLength(2);
    expect(deals.some((deal) => deal.freshnessState === "placeholder")).toBe(true);
    expect(deals.some((deal) => deal.scenario === "Scenario visibility only")).toBe(true);
    expect(deals.some((deal) => deal.payment === "Payment visibility only")).toBe(true);
    expect(deals.some((deal) => deal.blockerState.startsWith("Blocked:"))).toBe(true);
  });

  it("builds a read-only aggregate view model for the Sales Console", () => {
    const readModel = adaptSalesConsoleReadModel(salesConsoleMockSourceBundle);

    expect(readModel.readOnly).toBe(true);
    expect(readModel.sellerQueue.length).toBeGreaterThan(0);
    expect(readModel.leadOperations.length).toBeGreaterThan(0);
    expect(readModel.inventoryMatches.length).toBeGreaterThan(0);
    expect(readModel.deals.length).toBeGreaterThan(0);
    expect(readModel.managerRisks.length).toBe(4);
  });

  it("exports a stable preview model for the prototype", () => {
    expect(salesConsoleReadAdapterPreview.readOnly).toBe(true);
    expect(salesConsoleReadAdapterPreview.managerRisks.map((risk) => risk.label)).toContain("Deal visibility gaps");
  });
});
