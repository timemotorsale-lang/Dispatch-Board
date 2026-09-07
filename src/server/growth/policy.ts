import type { GrowthCampaignPlan } from "./campaign-planning";

export type GrowthRole = "Owner / General Manager" | "Marketing Manager" | "Sales Manager" | "Inventory Manager" | "Service Manager" | "Staff";

export type GrowthPolicyContext = {
  actorRole: GrowthRole;
  approvedBudgetCents: number;
  consentReady: boolean;
  frequencyCapClear: boolean;
  inventoryAvailable: boolean;
  offerVerified: boolean;
  providerReady: boolean;
  quietWindowClear: boolean;
  sourceFresh: boolean;
};

export type GrowthPolicyCheck = {
  action: string;
  label: string;
  passed: boolean;
};

export type GrowthLaunchReadiness = {
  allowed: boolean;
  blockedReason: string;
  checks: GrowthPolicyCheck[];
  nextAction: string;
};

const launchApprovers: GrowthRole[] = ["Owner / General Manager", "Marketing Manager"];

export function evaluateGrowthLaunchReadiness(plan: GrowthCampaignPlan, context: GrowthPolicyContext): GrowthLaunchReadiness {
  const checks: GrowthPolicyCheck[] = [
    { action: "Open CRM consent review", label: "Consent and opt-out clear", passed: context.consentReady },
    { action: "Wait for approved contact window", label: "Quiet window clear", passed: context.quietWindowClear },
    { action: "Lower audience frequency or wait", label: "Frequency cap clear", passed: context.frequencyCapClear },
    { action: "Refresh source records", label: "Source records fresh", passed: context.sourceFresh },
    { action: "Confirm inventory record", label: "Inventory available", passed: context.inventoryAvailable },
    { action: "Send offer to source-owner review", label: "Offer and claims verified", passed: context.offerVerified },
    { action: "Request manager budget approval", label: "Budget approved", passed: plan.budgetCents <= context.approvedBudgetCents },
    { action: "Ask authorized approver to review", label: "Role can launch", passed: launchApprovers.includes(context.actorRole) },
    { action: "Connect approved provider or use internal task pilot", label: "Provider ready", passed: context.providerReady }
  ];
  const failed = checks.find((check) => !check.passed);

  if (plan.status !== "Approval requested") {
    return {
      allowed: false,
      blockedReason: "Campaign must be submitted for approval before launch.",
      checks,
      nextAction: "Request approval"
    };
  }

  if (failed) {
    return {
      allowed: false,
      blockedReason: failed.label,
      checks,
      nextAction: failed.action
    };
  }

  return {
    allowed: true,
    blockedReason: "",
    checks,
    nextAction: "Schedule launch"
  };
}

export function buildGrowthPolicyReviewModel() {
  return {
    allowed: false,
    blockedReason: "Provider ready",
    checks: [
      { action: "Consent is readable from CRM", label: "Consent and opt-out clear", passed: true },
      { action: "Approved contact timing is clear", label: "Quiet window clear", passed: true },
      { action: "Audience has not been over-contacted", label: "Frequency cap clear", passed: true },
      { action: "CRM and Sales source records are current", label: "Source records fresh", passed: true },
      { action: "No vehicle availability needed for this quote-recovery plan", label: "Inventory available", passed: true },
      { action: "Manager must approve customer-facing language", label: "Offer and claims verified", passed: false },
      { action: "No paid spend requested", label: "Budget approved", passed: true },
      { action: "Marketing Manager can prepare, manager must approve launch", label: "Role can launch", passed: true },
      { action: "Provider pilot is not approved yet", label: "Provider ready", passed: false }
    ],
    nextAction: "Send offer language to manager review"
  } satisfies GrowthLaunchReadiness;
}
