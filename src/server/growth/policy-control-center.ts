import { buildGrowthAdvertisingReviewModel } from "./advertising-activation";
import { buildGrowthAutomationActivationReviewModel } from "./automation-activation";
import { buildGrowthPolicyReviewModel } from "./policy";
import { buildGrowthProviderPilotReviewModel } from "./provider-pilot";

export type GrowthPolicyControlState = "Locked" | "Review needed" | "Ready";

export type GrowthPolicyControl = {
  area: string;
  evidence: string;
  nextAction: string;
  owner: string;
  state: GrowthPolicyControlState;
};

export type GrowthBudgetPolicy = {
  approvalRequired: string;
  channel: string;
  currentLimit: string;
  state: GrowthPolicyControlState;
};

export type GrowthPolicyControlCenterModel = {
  budgetPolicies: GrowthBudgetPolicy[];
  controls: GrowthPolicyControl[];
  generatedAt: string;
  launchPosture: "Locked by default";
  summary: {
    locked: number;
    ready: number;
    reviewNeeded: number;
    total: number;
  };
};

export function buildGrowthPolicyControlCenterModel(now = new Date()): GrowthPolicyControlCenterModel {
  const launchPolicy = buildGrowthPolicyReviewModel();
  const advertising = buildGrowthAdvertisingReviewModel();
  const automation = buildGrowthAutomationActivationReviewModel();
  const provider = buildGrowthProviderPilotReviewModel();
  const controls: GrowthPolicyControl[] = [
    {
      area: "Live customer sends",
      evidence: "Customer messaging remains unavailable until consent, quiet-window, message approval, and provider gates pass.",
      nextAction: "Keep live send locked",
      owner: "GM/Admin",
      state: "Locked"
    },
    {
      area: "Paid advertising spend",
      evidence: advertising.summary,
      nextAction: advertising.nextAction,
      owner: "GM/Admin",
      state: advertising.canActivatePaidSpend ? "Ready" : "Locked"
    },
    {
      area: "CRM and source record mutation",
      evidence: "Growth may prepare campaign work and writeback previews, but CRM, inventory, sales, service, appointment, and task source records stay protected.",
      nextAction: "Review writeback previews only",
      owner: "GM/Admin",
      state: "Locked"
    },
    {
      area: "Provider activation",
      evidence: provider.health.summary,
      nextAction: "Use internal task pilot before external provider activation",
      owner: "Marketing Manager",
      state: provider.health.state === "Ready" ? "Review needed" : "Locked"
    },
    {
      area: "Offer and claim verification",
      evidence: launchPolicy.checks.find((check) => check.label === "Offer and claims verified")?.action ?? "Manager source review is required.",
      nextAction: "Send offer language to source-owner review",
      owner: "Business owner",
      state: "Review needed"
    },
    {
      area: "Consent and opt-out",
      evidence: launchPolicy.checks.find((check) => check.label === "Consent and opt-out clear")?.action ?? "Consent must be readable from CRM.",
      nextAction: "Open CRM consent review",
      owner: "Sales Manager",
      state: "Ready"
    },
    {
      area: "Quiet hours and frequency caps",
      evidence: "Growth must respect approved contact windows and prevent over-contacting the same customer.",
      nextAction: "Keep caps visible before any launch",
      owner: "Marketing Manager",
      state: "Review needed"
    },
    {
      area: "Automation",
      evidence: automation.summary,
      nextAction: automation.nextAction,
      owner: "Marketing Manager",
      state: automation.canActivateAutomation ? "Review needed" : "Locked"
    }
  ];
  const summary = {
    locked: controls.filter((control) => control.state === "Locked").length,
    ready: controls.filter((control) => control.state === "Ready").length,
    reviewNeeded: controls.filter((control) => control.state === "Review needed").length,
    total: controls.length
  };

  return {
    budgetPolicies: [
      { approvalRequired: "GM/Admin approval", channel: "Paid ads", currentLimit: "$0 live spend", state: "Locked" },
      { approvalRequired: "Manager review", channel: "Social", currentLimit: "$0 live spend", state: "Locked" },
      { approvalRequired: "Message approval", channel: "Email", currentLimit: "Internal review only", state: "Review needed" },
      { approvalRequired: "Message approval", channel: "SMS", currentLimit: "Internal review only", state: "Review needed" },
      { approvalRequired: "Business owner review", channel: "Internal task", currentLimit: "$0 spend", state: "Ready" }
    ],
    controls,
    generatedAt: now.toISOString(),
    launchPosture: "Locked by default",
    summary
  };
}
