import { describe, expect, it } from "vitest";

import {
  rankSalesWorkQueue,
  rankSalesWorkQueueItem
} from "@/features/sales/sales-console-m58-work-queue-algorithm";

describe("Sales Console M58 work queue algorithm", () => {
  it("prioritizes urgent high-intent work with explainable reasons", () => {
    const item = rankSalesWorkQueueItem({
      id: "REV-1",
      leadAgeMinutes: 10,
      firstResponseMinutes: 35,
      appointmentStartsInMinutes: 90,
      customerIntent: "high",
      revenueLane: "Inventory Cash Sale",
      vehicleAvailability: "available",
      blockerSeverity: "risk",
      nextActionStaleMinutes: 90,
      managerPriority: true,
      sourceFreshness: "current",
      taskSlaRisk: "watch",
      revenueAmount: 26500
    });

    expect(item.group).toBe("Must Do Now");
    expect(item.componentScores.revenueOpportunity).toBeGreaterThan(18);
    expect(item.componentScores.taskSlaRisk).toBeGreaterThan(0);
    expect(item.rankingReasons).toEqual(
      expect.arrayContaining(["new lead needs fast response", "first response SLA at risk", "manager priority"])
    );
    expect(item.nextBestAction).toBe("Respond now and log outcome");
  });

  it("places blocked work in Blocked even when important", () => {
    const item = rankSalesWorkQueueItem({
      id: "REV-2",
      leadAgeMinutes: 60,
      customerIntent: "high",
      revenueLane: "Inventory BHPH Sale",
      vehicleAvailability: "blocked",
      blockerSeverity: "blocked",
      nextActionStaleMinutes: 120,
      managerPriority: false,
      sourceFreshness: "current"
    });

    expect(item.group).toBe("Blocked");
    expect(item.nextBestAction).toBe("Find blocker owner and request missing evidence");
  });

  it("separates source-stale work into Waiting and manager-led work into Manager Review", () => {
    const waiting = rankSalesWorkQueueItem({
      id: "REV-WAIT",
      leadAgeMinutes: 80,
      customerIntent: "medium",
      revenueLane: "Daily Rental",
      vehicleAvailability: "verify-first",
      blockerSeverity: "watch",
      nextActionStaleMinutes: 20,
      managerPriority: false,
      sourceFreshness: "stale"
    });
    const managerReview = rankSalesWorkQueueItem({
      id: "REV-MGR",
      leadAgeMinutes: 80,
      customerIntent: "medium",
      revenueLane: "Warranty Product",
      vehicleAvailability: "available",
      blockerSeverity: "watch",
      nextActionStaleMinutes: 20,
      managerPriority: true,
      sourceFreshness: "current"
    });

    expect(waiting.group).toBe("Waiting");
    expect(managerReview.group).toBe("Manager Review");
    expect(managerReview.nextBestAction).toContain("Manager Command");
  });

  it("sorts queue records by deterministic score", () => {
    const ranked = rankSalesWorkQueue([
      {
        id: "LOW",
        leadAgeMinutes: 300,
        customerIntent: "low",
        revenueLane: "Warranty Product",
        vehicleAvailability: "verify-first",
        blockerSeverity: "none",
        nextActionStaleMinutes: 0,
        managerPriority: false,
        sourceFreshness: "current"
      },
      {
        id: "HIGH",
        leadAgeMinutes: 5,
        firstResponseMinutes: 45,
        customerIntent: "high",
        revenueLane: "Inventory BHPH Sale",
        vehicleAvailability: "available",
        blockerSeverity: "risk",
        nextActionStaleMinutes: 120,
        managerPriority: true,
        sourceFreshness: "current"
      }
    ]);

    expect(ranked[0].id).toBe("HIGH");
  });
});
