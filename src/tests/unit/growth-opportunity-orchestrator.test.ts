import { describe, expect, it } from "vitest";

import { orchestrateGrowthOpportunities } from "@/server/growth/opportunity-orchestrator";

describe("growth opportunity orchestrator", () => {
  it("turns read-only source signals into ranked opportunities", () => {
    const result = orchestrateGrowthOpportunities([
      {
        confidence: 92,
        entityId: "quote-1",
        generatedAt: "2026-09-07T09:00:00-05:00",
        source: "Sales",
        summary: "Unsold estimate and quote recovery",
        valueCents: 4200000
      },
      {
        confidence: 88,
        entityId: "vehicle-1",
        generatedAt: "2026-09-07T09:05:00-05:00",
        source: "Inventory",
        summary: "Aged retail-ready vehicle promotion",
        valueCents: 6800000
      },
      {
        confidence: 81,
        entityId: "crm-1",
        generatedAt: "2026-09-07T09:10:00-05:00",
        source: "CRM",
        summary: "Quote follow-up owner exists",
        valueCents: 1200000
      }
    ]);

    expect(result.readOnly).toBe(true);
    expect(result.opportunities.map((opportunity) => opportunity.title)).toContain("Recover unsold estimates and quotes");
    expect(result.opportunities.map((opportunity) => opportunity.title)).toContain("Promote aging retail-ready inventory");
    expect(result.opportunities[0].priorityScore).toBeGreaterThanOrEqual(result.opportunities[1].priorityScore);
  });

  it("routes stale or low-confidence signals to source review", () => {
    const result = orchestrateGrowthOpportunities([
      {
        confidence: 65,
        entityId: "service-1",
        generatedAt: "2026-09-01T09:00:00-05:00",
        source: "Service",
        summary: "Seasonal service reminder",
        valueCents: 1800000
      }
    ]);

    expect(result.sourceReviewNeeded).toBe(1);
    expect(result.opportunities[0]).toMatchObject({
      nextAction: "Review source records",
      readOnly: true,
      title: "Prepare service reminder outreach"
    });
  });
});
