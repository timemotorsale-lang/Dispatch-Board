import { createHash, randomUUID } from "crypto";

import type { GrowthCampaignPlan } from "./campaign-planning";
import { evaluateGrowthLaunchReadiness, type GrowthPolicyContext } from "./policy";

export type GrowthProviderPilotMode = "Internal task pilot" | "Email dry run";

export type GrowthProviderHealth = {
  mode: GrowthProviderPilotMode;
  state: "Ready" | "Paused" | "Unavailable";
  summary: string;
};

export type GrowthProviderPilotResult = {
  campaignPlanId: string;
  correlationId: string;
  deliveryState: "Dry run recorded" | "Blocked by policy" | "Paused";
  mode: GrowthProviderPilotMode;
  nextAction: string;
  providerRequestId: string | null;
  reconciliation: string;
};

type PilotInput = {
  idempotencyKey: string;
  plan: GrowthCampaignPlan;
  policyContext: GrowthPolicyContext;
  reason: string;
};

function hashInput(input: PilotInput) {
  return createHash("sha256").update(JSON.stringify({
    idempotencyKey: input.idempotencyKey,
    planId: input.plan.id,
    planVersion: input.plan.version,
    policyContext: input.policyContext,
    reason: input.reason
  })).digest("hex");
}

export function createGrowthProviderPilotAdapter(health: GrowthProviderHealth = {
  mode: "Internal task pilot",
  state: "Ready",
  summary: "Internal task pilot can record launch intent and follow-up work without sending customer messages."
}) {
  const idempotency = new Map<string, { hash: string; result: GrowthProviderPilotResult }>();

  return {
    health,

    launch(input: PilotInput): GrowthProviderPilotResult {
      if (!input.idempotencyKey.trim()) throw new Error("Idempotency key is required.");
      if (input.reason.trim().length < 10) throw new Error("Reason must explain the pilot purpose.");

      const hash = hashInput(input);
      const prior = idempotency.get(input.idempotencyKey);
      if (prior) {
        if (prior.hash !== hash) throw new Error("Provider pilot idempotency key was reused with different launch details.");
        return { ...prior.result };
      }

      if (health.state === "Paused") {
        const result = {
          campaignPlanId: input.plan.id,
          correlationId: randomUUID(),
          deliveryState: "Paused",
          mode: health.mode,
          nextAction: "Resume pilot after manager review",
          providerRequestId: null,
          reconciliation: "No provider request was created because the pilot is paused."
        } satisfies GrowthProviderPilotResult;
        idempotency.set(input.idempotencyKey, { hash, result });
        return { ...result };
      }

      if (health.state === "Unavailable") {
        const result = {
          campaignPlanId: input.plan.id,
          correlationId: randomUUID(),
          deliveryState: "Blocked by policy",
          mode: health.mode,
          nextAction: "Use internal task pilot or reconnect provider",
          providerRequestId: null,
          reconciliation: "No provider request was created because provider health is unavailable."
        } satisfies GrowthProviderPilotResult;
        idempotency.set(input.idempotencyKey, { hash, result });
        return { ...result };
      }

      const readiness = evaluateGrowthLaunchReadiness(input.plan, input.policyContext);
      if (!readiness.allowed) {
        const result = {
          campaignPlanId: input.plan.id,
          correlationId: randomUUID(),
          deliveryState: "Blocked by policy",
          mode: health.mode,
          nextAction: readiness.nextAction,
          providerRequestId: null,
          reconciliation: `No send happened. Blocked by ${readiness.blockedReason}.`
        } satisfies GrowthProviderPilotResult;
        idempotency.set(input.idempotencyKey, { hash, result });
        return { ...result };
      }

      const result = {
        campaignPlanId: input.plan.id,
        correlationId: randomUUID(),
        deliveryState: "Dry run recorded",
        mode: health.mode,
        nextAction: "Review CRM follow-up tasks and pilot results",
        providerRequestId: `pilot_${randomUUID()}`,
        reconciliation: "Launch intent was recorded for the pilot. No broad customer send or paid advertising spend occurred."
      } satisfies GrowthProviderPilotResult;
      idempotency.set(input.idempotencyKey, { hash, result });
      return { ...result };
    }
  };
}

export function buildGrowthProviderPilotReviewModel() {
  return {
    health: {
      mode: "Internal task pilot",
      state: "Ready",
      summary: "Safest pilot path: create internal CRM/task follow-up first, then measure results before any external provider."
    } satisfies GrowthProviderHealth,
    lastResult: {
      campaignPlanId: "review-plan",
      correlationId: "review-only",
      deliveryState: "Dry run recorded",
      mode: "Internal task pilot",
      nextAction: "Review CRM follow-up tasks and pilot results",
      providerRequestId: "review-only",
      reconciliation: "Pilot records launch intent and follow-up work. It does not send customer messages or spend advertising budget."
    } satisfies GrowthProviderPilotResult
  };
}
