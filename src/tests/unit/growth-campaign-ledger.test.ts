import { describe, expect, it } from "vitest";

import { createGrowthCampaignLedger } from "@/server/growth/campaign-ledger";

describe("growth campaign ledger", () => {
  it("preserves campaign versions and audit events", () => {
    const ledger = createGrowthCampaignLedger(() => new Date("2026-09-07T12:00:00.000Z"));
    const campaign = ledger.createCampaign({
      actor: "Marketing Manager",
      idempotencyKey: "create-1",
      reason: "Create reviewable recovery campaign",
      title: "Unsold quote recovery"
    });

    const withAudience = ledger.appendAudienceSnapshot({
      actor: "Marketing Manager",
      campaignId: campaign.campaignId,
      counts: { Included: 48, Suppressed: 9 },
      idempotencyKey: "audience-1",
      reason: "Save governed audience snapshot"
    });
    const withMessage = ledger.appendMessageDraft({
      actor: "Sales Manager",
      campaignId: campaign.campaignId,
      idempotencyKey: "message-1",
      reason: "Save manager reviewed message",
      subject: "Your saved estimate"
    });

    expect(withAudience.latestVersion).toBe(2);
    expect(withMessage.latestVersion).toBe(3);
    expect(withMessage.versions.map((version) => version.label)).toEqual([
      "Campaign created",
      "Audience snapshot saved",
      "Message draft edited"
    ]);
    expect(withMessage.events.map((event) => event.type)).toEqual([
      "campaign_created",
      "audience_saved",
      "message_edited"
    ]);
  });

  it("returns the same response for identical idempotent commands", () => {
    const ledger = createGrowthCampaignLedger(() => new Date("2026-09-07T12:00:00.000Z"));
    const command = {
      actor: "Marketing Manager",
      idempotencyKey: "create-repeat",
      reason: "Create repeat-safe campaign",
      title: "Quote recovery"
    };

    const first = ledger.createCampaign(command);
    const second = ledger.createCampaign(command);

    expect(second).toEqual(first);
  });

  it("rejects idempotency key reuse with different details", () => {
    const ledger = createGrowthCampaignLedger();

    ledger.createCampaign({
      actor: "Marketing Manager",
      idempotencyKey: "create-conflict",
      reason: "Create first campaign safely",
      title: "Quote recovery"
    });

    expect(() =>
      ledger.createCampaign({
        actor: "Marketing Manager",
        idempotencyKey: "create-conflict",
        reason: "Create different campaign safely",
        title: "Inventory boost"
      })
    ).toThrow("Idempotency key was reused");
  });

  it("records launch locks instead of opening execution", () => {
    const ledger = createGrowthCampaignLedger(() => new Date("2026-09-07T12:00:00.000Z"));
    const campaign = ledger.createCampaign({
      actor: "Marketing Manager",
      idempotencyKey: "create-lock",
      reason: "Create launch lock test",
      title: "Aged inventory boost"
    });
    const locked = ledger.appendLaunchLock({
      actor: "GM",
      campaignId: campaign.campaignId,
      idempotencyKey: "lock-1",
      lockedReason: "Provider and budget approvals are missing.",
      reason: "Keep paid launch safely locked"
    });

    expect(locked.events.at(-1)?.type).toBe("launch_locked");
    expect(locked.versions.at(-1)?.data).toEqual({ lockedReason: "Provider and budget approvals are missing." });
  });
});
