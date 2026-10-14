import type { GrowthCampaignPlan } from "./campaign-planning";
import type { GrowthChannel } from "./domain-engine";

export type GrowthRole = "Staff" | "Marketing Manager" | "Sales Manager" | "Inventory Manager" | "Service Manager" | "GM/Admin";

export type GrowthCampaignType = "Quote recovery" | "Aged inventory" | "Service reminder" | "Lead nurture" | "Review request";

export type GrowthApprovalGateInput = {
  actorRole: GrowthRole;
  budgetCents: number;
  campaignType: GrowthCampaignType;
  channel: GrowthChannel;
  offerSourceVerified: boolean;
  planStatus: GrowthCampaignPlan["status"];
  providerReady: boolean;
  requestedApprovals: GrowthRole[];
};

export type GrowthApprovalGateDecision = {
  canExecute: false;
  checks: Array<{ label: string; passed: boolean; requiredRole?: GrowthRole; summary: string }>;
  lockedReason: string;
  nextApproval: GrowthRole | "Policy review";
};

const budgetThresholds: Record<GrowthChannel, number> = {
  Email: 0,
  "Internal task": 0,
  "Paid ads": 1,
  "Phone task": 0,
  SMS: 0,
  Social: 25000,
  Website: 0
};

const roleByCampaignType: Record<GrowthCampaignType, GrowthRole> = {
  "Aged inventory": "Inventory Manager",
  "Lead nurture": "Sales Manager",
  "Quote recovery": "Sales Manager",
  "Review request": "Marketing Manager",
  "Service reminder": "Service Manager"
};

export function evaluateGrowthApprovalGates(input: GrowthApprovalGateInput): GrowthApprovalGateDecision {
  const businessOwner = roleByCampaignType[input.campaignType];
  const needsBudgetApproval = input.budgetCents >= budgetThresholds[input.channel] && input.budgetCents > 0;
  const checks: GrowthApprovalGateDecision["checks"] = [
    {
      label: "Campaign approval requested",
      passed: input.planStatus === "Approval requested",
      summary: "Campaign must be submitted for review before launch."
    },
    {
      label: "Business owner approval",
      passed: input.requestedApprovals.includes(businessOwner) || input.actorRole === businessOwner || input.actorRole === "GM/Admin",
      requiredRole: businessOwner,
      summary: `${businessOwner} approval is required for ${input.campaignType}.`
    },
    {
      label: "Budget approval",
      passed: !needsBudgetApproval || input.requestedApprovals.includes("GM/Admin") || input.actorRole === "GM/Admin",
      requiredRole: needsBudgetApproval ? "GM/Admin" : undefined,
      summary: needsBudgetApproval ? "GM/Admin approval is required before spending money." : "No paid budget approval is required."
    },
    {
      label: "Offer source verified",
      passed: input.offerSourceVerified,
      summary: "Pricing, finance, inventory, service, and claim language must have an approved source."
    },
    {
      label: "Provider execution ready",
      passed: input.providerReady,
      summary: "Provider execution must stay locked until the approved adapter is ready."
    }
  ];
  const failed = checks.find((check) => !check.passed);

  return {
    canExecute: false,
    checks,
    lockedReason: failed?.summary ?? "Execution remains locked until the user approves live activation.",
    nextApproval: failed?.requiredRole ?? "Policy review"
  };
}

export function buildGrowthApprovalGateReviewModel() {
  return evaluateGrowthApprovalGates({
    actorRole: "Marketing Manager",
    budgetCents: 75000,
    campaignType: "Aged inventory",
    channel: "Paid ads",
    offerSourceVerified: false,
    planStatus: "Approval requested",
    providerReady: false,
    requestedApprovals: ["Inventory Manager"]
  });
}
