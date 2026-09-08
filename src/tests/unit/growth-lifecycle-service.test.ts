import { describe, expect, it } from "vitest";

import { runGrowthLifecycleReview } from "@/server/growth/lifecycle-service";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

describe("growth lifecycle service", () => {
  it("prepares a full campaign lifecycle and records a launch lock without live execution", () => {
    const opportunity = buildGrowthConsoleReadModel().opportunities[0];
    const result = runGrowthLifecycleReview({
      actorId: "marketing-1",
      actorRole: "Marketing Manager",
      audience: [
        {
          consent: { Email: true },
          customerId: "customer-1",
          hasContactMethod: true,
          hasEscalation: false,
          lastContactedAt: null,
          lifecycleFit: true,
          name: "Ready Customer",
          optOut: false,
          sourceFresh: true
        }
      ],
      budgetCents: 0,
      campaignType: "Quote recovery",
      channel: "Email",
      idempotencySeed: "life-1",
      message: {
        body: "We prepared a quick review of your saved estimate and can help confirm the next best step.",
        callToAction: "Reply to review the estimate",
        subject: "Estimate review ready"
      },
      offerSourceVerified: true,
      opportunity,
      policyContext: {
        actorRole: "Marketing Manager",
        approvedBudgetCents: 0,
        consentReady: true,
        frequencyCapClear: true,
        inventoryAvailable: true,
        offerVerified: true,
        providerReady: false,
        quietWindowClear: true,
        sourceFresh: true
      },
      reason: "Prepare quote recovery campaign for backend lifecycle review.",
      requestedApprovals: ["Sales Manager"]
    });

    expect(result.readOnlyExecution).toBe(true);
    expect(result.campaign.status).toBe("Approval requested");
    expect(result.ledger.events.map((event) => event.type)).toContain("launch_locked");
    expect(result.provider.deliveryState).toBe("Blocked by policy");
    expect(result.launch.allowed).toBe(false);
    expect(result.workflow.nextAction).toBe("Fix launch readiness");
  });

  it("keeps suppressed audiences out of ready workflow", () => {
    const opportunity = buildGrowthConsoleReadModel().opportunities[0];
    const result = runGrowthLifecycleReview({
      actorId: "marketing-1",
      actorRole: "Marketing Manager",
      audience: [
        {
          consent: { Email: true },
          customerId: "customer-1",
          hasContactMethod: true,
          hasEscalation: false,
          lastContactedAt: null,
          lifecycleFit: true,
          name: "Suppressed Customer",
          optOut: true,
          sourceFresh: true
        }
      ],
      budgetCents: 0,
      campaignType: "Quote recovery",
      channel: "Email",
      idempotencySeed: "life-2",
      message: {
        body: "We prepared a quick review of your saved estimate and can help confirm the next best step.",
        callToAction: "Reply to review the estimate",
        subject: "Estimate review ready"
      },
      offerSourceVerified: true,
      opportunity,
      policyContext: {
        actorRole: "Marketing Manager",
        approvedBudgetCents: 0,
        consentReady: false,
        frequencyCapClear: true,
        inventoryAvailable: true,
        offerVerified: true,
        providerReady: false,
        quietWindowClear: true,
        sourceFresh: true
      },
      reason: "Prepare quote recovery campaign and prove suppression wins.",
      requestedApprovals: ["Sales Manager"]
    });

    expect(result.campaign.audienceSnapshots[0].rows).toContainEqual(expect.objectContaining({ count: 1, label: "Suppressed" }));
    expect(result.workflow.stage).toBe("Approval");
    expect(result.launch.blockedReason).toBe("Consent and opt-out clear");
  });
});
