import { describe, expect, it } from "vitest";

import { createGrowthCampaignPlanningService } from "@/server/growth/campaign-planning";
import { evaluateGrowthLaunchReadiness } from "@/server/growth/policy";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

function approvedPlan() {
  const service = createGrowthCampaignPlanningService(() => new Date("2026-09-07T18:00:00.000Z"));
  const model = buildGrowthConsoleReadModel();
  const opportunity = model.opportunities[0];
  const plan = service.createCampaignPlan({
    budgetCents: 0,
    channel: "Email",
    idempotencyKey: "policy-plan",
    objective: "Recover unsold estimates and quotes without live send.",
    opportunity,
    reason: "Prepare campaign for launch policy validation."
  });
  const withAudience = service.saveAudienceSnapshot({
    expectedVersion: plan.version,
    idempotencyKey: "policy-audience",
    planId: plan.id,
    reason: "Save audience for policy validation.",
    rows: model.audienceRows
  });
  const withMessage = service.editMessageDraft({
    body: "We prepared a quick review of your saved estimate and can help confirm the next best step.",
    callToAction: "Reply to review the estimate",
    expectedVersion: withAudience.version,
    idempotencyKey: "policy-message",
    planId: plan.id,
    reason: "Save message for policy validation.",
    subject: "Estimate review ready"
  });
  return service.requestApproval({
    expectedVersion: withMessage.version,
    idempotencyKey: "policy-approval",
    planId: plan.id,
    reason: "Request manager approval for policy validation."
  });
}

describe("Growth policy engine", () => {
  it("fails closed when consent is not ready", () => {
    const readiness = evaluateGrowthLaunchReadiness(approvedPlan(), {
      actorRole: "Marketing Manager",
      approvedBudgetCents: 0,
      consentReady: false,
      frequencyCapClear: true,
      inventoryAvailable: true,
      offerVerified: true,
      providerReady: true,
      quietWindowClear: true,
      sourceFresh: true
    });

    expect(readiness.allowed).toBe(false);
    expect(readiness.nextAction).toBe("Open CRM consent review");
  });

  it("blocks spend above approved budget and unauthorized launch roles", () => {
    const plan = { ...approvedPlan(), budgetCents: 50000 };
    const readiness = evaluateGrowthLaunchReadiness(plan, {
      actorRole: "Staff",
      approvedBudgetCents: 0,
      consentReady: true,
      frequencyCapClear: true,
      inventoryAvailable: true,
      offerVerified: true,
      providerReady: true,
      quietWindowClear: true,
      sourceFresh: true
    });

    expect(readiness.allowed).toBe(false);
    expect(readiness.blockedReason).toBe("Budget approved");
    expect(readiness.checks.find((check) => check.label === "Role can launch")?.passed).toBe(false);
  });

  it("allows scheduling only when all policy checks pass", () => {
    const readiness = evaluateGrowthLaunchReadiness(approvedPlan(), {
      actorRole: "Owner / General Manager",
      approvedBudgetCents: 0,
      consentReady: true,
      frequencyCapClear: true,
      inventoryAvailable: true,
      offerVerified: true,
      providerReady: true,
      quietWindowClear: true,
      sourceFresh: true
    });

    expect(readiness.allowed).toBe(true);
    expect(readiness.nextAction).toBe("Schedule launch");
  });
});
