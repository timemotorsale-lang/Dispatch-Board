import type { GrowthCampaignPlan } from "./campaign-planning";

export type GrowthAdvertisingActivationInput = {
  budgetApprovedCents: number;
  creativeApproved: boolean;
  inventoryAvailable: boolean;
  liveSpendAuthorized: boolean;
  plan: GrowthCampaignPlan;
  providerAccountConnected: boolean;
};

export type GrowthAdvertisingActivationReadiness = {
  canActivatePaidSpend: boolean;
  checks: Array<{ label: string; nextAction: string; passed: boolean }>;
  nextAction: string;
  state: "Ready for paid launch" | "Budget review needed" | "Inventory review needed" | "Creative review needed" | "Provider review needed" | "Live spend not approved";
};

export type GrowthAdvertisingPerformanceEvent = {
  clicks: number;
  costCents: number;
  eventId: string;
  impressions: number;
  source: "Paid ads dry run" | "Approved ad provider";
};

export function evaluateGrowthAdvertisingActivation(input: GrowthAdvertisingActivationInput): GrowthAdvertisingActivationReadiness {
  const checks = [
    { label: "Budget approved", nextAction: "Request GM budget approval", passed: input.plan.budgetCents <= input.budgetApprovedCents && input.plan.budgetCents > 0 },
    { label: "Inventory available", nextAction: "Confirm vehicle availability", passed: input.inventoryAvailable },
    { label: "Creative approved", nextAction: "Send creative to manager review", passed: input.creativeApproved },
    { label: "Provider account connected", nextAction: "Connect approved ad provider", passed: input.providerAccountConnected },
    { label: "Live spend approved", nextAction: "Keep in review mode until owner approves live spend", passed: input.liveSpendAuthorized }
  ];
  const failed = checks.find((check) => !check.passed);

  if (!failed) {
    return { canActivatePaidSpend: true, checks, nextAction: "Schedule paid launch", state: "Ready for paid launch" };
  }

  const stateByLabel: Record<string, GrowthAdvertisingActivationReadiness["state"]> = {
    "Budget approved": "Budget review needed",
    "Creative approved": "Creative review needed",
    "Inventory available": "Inventory review needed",
    "Live spend approved": "Live spend not approved",
    "Provider account connected": "Provider review needed"
  };

  return {
    canActivatePaidSpend: false,
    checks,
    nextAction: failed.nextAction,
    state: stateByLabel[failed.label] ?? "Live spend not approved"
  };
}

export function ingestGrowthAdvertisingPerformance(events: GrowthAdvertisingPerformanceEvent[]) {
  return events.reduce(
    (summary, event) => ({
      clicks: summary.clicks + event.clicks,
      costCents: summary.costCents + event.costCents,
      impressions: summary.impressions + event.impressions
    }),
    { clicks: 0, costCents: 0, impressions: 0 }
  );
}

export function buildGrowthAdvertisingReviewModel() {
  return {
    budget: "$750 requested",
    checks: [
      { label: "Budget approved", nextAction: "Request GM budget approval", passed: false },
      { label: "Inventory available", nextAction: "Confirm vehicle list", passed: true },
      { label: "Creative approved", nextAction: "Review ad creative", passed: false },
      { label: "Provider account connected", nextAction: "Connect approved ad provider", passed: false },
      { label: "Live spend approved", nextAction: "Keep in review mode", passed: false }
    ],
    performance: { clicks: 0, costCents: 0, impressions: 0 },
    state: "Live spend not approved",
    summary: "Paid advertising setup can be reviewed, but no budget can be spent until provider, inventory, creative, and owner approvals are complete."
  } satisfies GrowthAdvertisingActivationReadiness & { budget: string; performance: { clicks: number; costCents: number; impressions: number }; summary: string };
}
