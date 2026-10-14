import { describe, expect, it } from "vitest";

import { createGrowthCampaignPlanningService } from "@/server/growth/campaign-planning";
import { createGrowthProviderPilotAdapter } from "@/server/growth/provider-pilot";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

function approvedPlan() {
  const service = createGrowthCampaignPlanningService(() => new Date("2026-09-07T18:00:00.000Z"));
  const model = buildGrowthConsoleReadModel();
  const plan = service.createCampaignPlan({
    budgetCents: 0,
    channel: "Phone task",
    idempotencyKey: "pilot-plan",
    objective: "Prepare internal CRM follow-up pilot.",
    opportunity: model.opportunities[0],
    reason: "Create provider pilot plan for dry-run testing."
  });
  const withAudience = service.saveAudienceSnapshot({
    expectedVersion: plan.version,
    idempotencyKey: "pilot-audience",
    planId: plan.id,
    reason: "Save pilot audience snapshot.",
    rows: model.audienceRows
  });
  const withDraft = service.editMessageDraft({
    body: "We prepared a quick review of your saved estimate and can help confirm the next best step.",
    callToAction: "Create internal follow-up task",
    expectedVersion: withAudience.version,
    idempotencyKey: "pilot-message",
    planId: plan.id,
    reason: "Save pilot task message.",
    subject: "Estimate follow-up"
  });
  return service.requestApproval({
    expectedVersion: withDraft.version,
    idempotencyKey: "pilot-approval",
    planId: plan.id,
    reason: "Request pilot approval."
  });
}

describe("Growth provider pilot adapter", () => {
  it("records a dry-run pilot only after policy passes", () => {
    const adapter = createGrowthProviderPilotAdapter();
    const result = adapter.launch({
      idempotencyKey: "pilot-launch",
      plan: approvedPlan(),
      policyContext: {
        actorRole: "Owner / General Manager",
        approvedBudgetCents: 0,
        consentReady: true,
        frequencyCapClear: true,
        inventoryAvailable: true,
        offerVerified: true,
        providerReady: true,
        quietWindowClear: true,
        sourceFresh: true
      },
      reason: "Record dry-run launch for approved pilot."
    });

    expect(result.deliveryState).toBe("Dry run recorded");
    expect(result.reconciliation).toContain("No broad customer send");
  });

  it("does not create provider requests when policy fails", () => {
    const adapter = createGrowthProviderPilotAdapter();
    const result = adapter.launch({
      idempotencyKey: "pilot-blocked",
      plan: approvedPlan(),
      policyContext: {
        actorRole: "Owner / General Manager",
        approvedBudgetCents: 0,
        consentReady: false,
        frequencyCapClear: true,
        inventoryAvailable: true,
        offerVerified: true,
        providerReady: true,
        quietWindowClear: true,
        sourceFresh: true
      },
      reason: "Prove blocked policy does not create provider work."
    });

    expect(result.deliveryState).toBe("Blocked by policy");
    expect(result.providerRequestId).toBeNull();
    expect(result.nextAction).toBe("Open CRM consent review");
  });

  it("keeps pilot launch retries idempotent and conflict-safe", () => {
    const adapter = createGrowthProviderPilotAdapter();
    const input = {
      idempotencyKey: "pilot-idem",
      plan: approvedPlan(),
      policyContext: {
        actorRole: "Owner / General Manager" as const,
        approvedBudgetCents: 0,
        consentReady: true,
        frequencyCapClear: true,
        inventoryAvailable: true,
        offerVerified: true,
        providerReady: true,
        quietWindowClear: true,
        sourceFresh: true
      },
      reason: "Record retry-safe pilot launch."
    };

    const first = adapter.launch(input);
    const retry = adapter.launch(input);

    expect(retry.providerRequestId).toBe(first.providerRequestId);
    expect(() => adapter.launch({ ...input, reason: "Conflicting retry details." })).toThrow("idempotency key was reused");
  });
});
