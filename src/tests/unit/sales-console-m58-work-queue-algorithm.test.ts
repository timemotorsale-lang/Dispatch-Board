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
      sourceFreshness: "current"
    });

    expect(item.group).toBe("Must Do Now");
    expect(item.rankingReasons).toEqual(
      expect.arrayContaining(["new lead needs fast response", "first response SLA at risk", "manager priority"])
    );
    expect(item.nextBestAction).toBe("Respond now and log outcome");
  });

  it("places blocked work in Waiting even when important", () => {
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

    expect(item.group).toBe("Waiting");
    expect(item.nextBestAction).toBe("Find blocker owner and request missing evidence");
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
