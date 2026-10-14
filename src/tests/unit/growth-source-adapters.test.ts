import { describe, expect, it } from "vitest";

import {
  createGrowthSourceAdapter,
  normalizeGrowthSourceSignals,
  summarizeGrowthSourceSignals
} from "@/server/growth/source-adapters";

describe("growth source adapters", () => {
  it("normalizes source signals as read-only records", () => {
    const adapter = createGrowthSourceAdapter("CRM");
    const signal = adapter.normalize({
      confidence: 94,
      entityId: "customer-1",
      generatedAt: "2026-09-07T08:00:00-05:00",
      source: "CRM",
      summary: "Unsold quote with known owner and consent",
      valueCents: 4200000
    });

    expect(adapter.mutatesRecords).toBe(false);
    expect(signal.readOnly).toBe(true);
    expect(signal.authority).toContain("Customer identity");
    expect(signal.freshness).toBe("Fresh");
    expect(signal.reviewNeeded).toBe(false);
  });

  it("marks stale or low-confidence signals for review", () => {
    const signals = normalizeGrowthSourceSignals(
      [
        {
          confidence: 66,
          entityId: "vehicle-1",
          generatedAt: "2026-09-06T08:00:00-05:00",
          source: "Inventory",
          summary: "Aged vehicle promotion candidate",
          valueCents: 6800000
        },
        {
          confidence: 97,
          entityId: "service-1",
          generatedAt: "2026-09-01T08:00:00-05:00",
          source: "Service",
          summary: "Seasonal service reminder",
          valueCents: 1800000
        }
      ],
      new Date("2026-09-07T12:00:00-05:00")
    );

    expect(signals[0].freshness).toBe("Aging");
    expect(signals[0].reviewNeeded).toBe(true);
    expect(signals[1].freshness).toBe("Stale");
    expect(signals[1].reviewNeeded).toBe(true);
  });

  it("summarizes source authority without mutation capability", () => {
    const normalized = normalizeGrowthSourceSignals([
      {
        confidence: 90,
        entityId: "quote-1",
        generatedAt: "2026-09-07T08:00:00-05:00",
        source: "Sales",
        summary: "Quote recovery signal",
        valueCents: 2500000
      }
    ]);

    expect(summarizeGrowthSourceSignals(normalized)).toEqual({
      readOnly: true,
      reviewNeeded: 0,
      sources: ["Sales"],
      totalSignals: 1,
      totalValueCents: 2500000
    });
  });
});
