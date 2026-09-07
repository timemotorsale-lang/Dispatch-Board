import { describe, expect, it } from "vitest";

import { evaluateGrowthAdvertisingActivation, ingestGrowthAdvertisingPerformance } from "@/server/growth/advertising-activation";
import { createGrowthCampaignPlanningService } from "@/server/growth/campaign-planning";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

function adPlan() {
  const service = createGrowthCampaignPlanningService();
  return service.createCampaignPlan({
    budgetCents: 75000,
    channel: "Paid ads",
    idempotencyKey: "ad-plan",
    objective: "Promote approved aging inventory.",
    opportunity: buildGrowthConsoleReadModel().opportunities.find((opportunity) => opportunity.type === "Advertising")!,
    reason: "Prepare paid advertising plan for readiness review."
  });
}

describe("Growth advertising activation", () => {
  it("blocks paid spend until live spend is explicitly approved", () => {
    const readiness = evaluateGrowthAdvertisingActivation({
      budgetApprovedCents: 75000,
      creativeApproved: true,
      inventoryAvailable: true,
      liveSpendAuthorized: false,
      plan: adPlan(),
      providerAccountConnected: true
    });

    expect(readiness.canActivatePaidSpend).toBe(false);
    expect(readiness.state).toBe("Live spend not approved");
    expect(readiness.nextAction).toBe("Keep in review mode until owner approves live spend");
  });

  it("requires budget, inventory, creative, provider, and live-spend approvals", () => {
    const readiness = evaluateGrowthAdvertisingActivation({
      budgetApprovedCents: 0,
      creativeApproved: false,
      inventoryAvailable: false,
      liveSpendAuthorized: false,
      plan: adPlan(),
      providerAccountConnected: false
    });

    expect(readiness.canActivatePaidSpend).toBe(false);
    expect(readiness.checks.filter((check) => !check.passed)).toHaveLength(5);
  });

  it("ingests performance as a read summary without activating spend", () => {
    const summary = ingestGrowthAdvertisingPerformance([
      { clicks: 4, costCents: 1234, eventId: "evt-1", impressions: 100, source: "Paid ads dry run" },
      { clicks: 6, costCents: 2000, eventId: "evt-2", impressions: 240, source: "Paid ads dry run" }
    ]);

    expect(summary).toEqual({ clicks: 10, costCents: 3234, impressions: 340 });
  });
});
