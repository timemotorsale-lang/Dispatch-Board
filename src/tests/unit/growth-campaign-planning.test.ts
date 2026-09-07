import { describe, expect, it } from "vitest";

import { createGrowthCampaignPlanningService } from "@/server/growth/campaign-planning";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

describe("Growth campaign planning commands", () => {
  it("creates a plan, preserves audience and message versions, and requests approval without sending", () => {
    const service = createGrowthCampaignPlanningService(() => new Date("2026-09-07T18:00:00.000Z"));
    const model = buildGrowthConsoleReadModel();
    const opportunity = model.opportunities.find((item) => item.readiness === "Ready");
    expect(opportunity).toBeDefined();

    const plan = service.createCampaignPlan({
      budgetCents: 0,
      channel: "Email",
      idempotencyKey: "create-quote-recovery",
      objective: "Recover unsold estimates and quotes without live send.",
      opportunity: opportunity!,
      reason: "Prepare quote recovery campaign for manager review."
    });

    const withAudience = service.saveAudienceSnapshot({
      expectedVersion: plan.version,
      idempotencyKey: "audience-v1",
      planId: plan.id,
      reason: "Save reviewed audience snapshot for approval.",
      rows: model.audienceRows
    });

    const withDraft = service.editMessageDraft({
      body: "We prepared a quick review of your saved estimate and can help confirm the next best step.",
      callToAction: "Reply to review the estimate",
      expectedVersion: withAudience.version,
      idempotencyKey: "message-v1",
      planId: plan.id,
      reason: "Prepare customer-facing message for manager approval.",
      subject: "Estimate review ready"
    });

    const approval = service.requestApproval({
      expectedVersion: withDraft.version,
      idempotencyKey: "approval-v1",
      planId: plan.id,
      reason: "Ask manager to approve audience and message."
    });

    expect(approval.status).toBe("Approval requested");
    expect(approval.audienceSnapshots).toHaveLength(1);
    expect(approval.messageDrafts).toHaveLength(1);
    expect(approval.versions.map((version) => version.change)).toEqual([
      "Campaign plan created",
      "Audience snapshot saved",
      "Message draft edited",
      "Approval requested"
    ]);
  });

  it("rejects blocked opportunities and stale edits", () => {
    const service = createGrowthCampaignPlanningService();
    const model = buildGrowthConsoleReadModel();
    const blocked = model.opportunities.find((item) => item.readiness === "Blocked");
    const ready = model.opportunities.find((item) => item.readiness === "Ready");

    expect(() => service.createCampaignPlan({
      budgetCents: 0,
      channel: "Email",
      idempotencyKey: "blocked-plan",
      objective: "Try blocked campaign.",
      opportunity: blocked!,
      reason: "Try to create blocked campaign plan."
    })).toThrow("Blocked opportunities cannot become campaign plans.");

    const plan = service.createCampaignPlan({
      budgetCents: 0,
      channel: "Phone task",
      idempotencyKey: "safe-plan",
      objective: "Prepare follow-up task.",
      opportunity: ready!,
      reason: "Create safe campaign plan for review."
    });

    expect(() => service.editMessageDraft({
      body: "This message is long enough for customer value.",
      callToAction: "Call",
      expectedVersion: plan.version + 1,
      idempotencyKey: "stale-message",
      planId: plan.id,
      reason: "Attempt stale edit for validation.",
      subject: "Follow up"
    })).toThrow(`Campaign plan version must be ${plan.version}.`);
  });

  it("keeps idempotent retries stable and rejects conflicting reuse", () => {
    const service = createGrowthCampaignPlanningService();
    const opportunity = buildGrowthConsoleReadModel().opportunities[0];
    const input = {
      budgetCents: 0,
      channel: "Email" as const,
      idempotencyKey: "idem-plan",
      objective: "Prepare a safe plan.",
      opportunity,
      reason: "Create campaign plan for idempotency proof."
    };

    const first = service.createCampaignPlan(input);
    const retry = service.createCampaignPlan(input);

    expect(retry.id).toBe(first.id);
    expect(() => service.createCampaignPlan({ ...input, objective: "Conflicting objective." })).toThrow("Idempotency key was reused");
  });
});
