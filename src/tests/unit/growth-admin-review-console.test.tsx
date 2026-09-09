import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GrowthAdminReviewConsole, GrowthCampaignAdminDetailConsole } from "@/features/growth/growth-admin-review-console";
import type { GrowthAdminReviewModel, GrowthCampaignAdminDetail } from "@/server/growth/operational-service";

const adminModel: GrowthAdminReviewModel = {
  approvalQueue: [
    {
      approvalId: "approval-1",
      approvalType: "CAMPAIGN_REVIEW",
      campaignId: "campaign-1",
      campaignStatus: "APPROVAL_REQUESTED",
      campaignTitle: "Recover unsold estimates and quotes",
      requestedAt: "2026-09-08T18:00:00.000Z",
      requestedByUserId: "marketing-1",
      requestedRole: "Sales Manager"
    }
  ],
  campaigns: [
    {
      approvalCount: 1,
      audienceSnapshotCount: 1,
      budgetCents: 0,
      campaignType: "Quote recovery",
      channel: "Internal task",
      id: "campaign-1",
      launchLockCount: 1,
      messageDraftCount: 1,
      nextAction: "Decide approval",
      ownerRole: "Sales Manager",
      resultCount: 0,
      status: "APPROVAL_REQUESTED",
      title: "Recover unsold estimates and quotes",
      updatedAt: "2026-09-08T18:01:00.000Z",
      version: 3,
      writebackPreviewCount: 0
    }
  ],
  controls: {
    apiRoutesGuarded: true,
    durableRecordsEnabled: true,
    liveSendLocked: true,
    paidSpendLocked: true,
    sourceMutationLocked: true
  },
  generatedAt: "2026-09-08T18:02:00.000Z",
  role: "GM/Admin"
};

const campaignDetail: GrowthCampaignAdminDetail = {
  ...adminModel.campaigns[0],
  approvals: [
    {
      approvalId: "approval-1",
      approvalType: "CAMPAIGN_REVIEW",
      decidedAt: null,
      decidedByUserId: null,
      decisionReason: null,
      requestedAt: "2026-09-08T18:00:00.000Z",
      requestedByUserId: "marketing-1",
      requestedRole: "Sales Manager",
      status: "REQUESTED"
    }
  ],
  audienceSnapshots: [
    {
      createdAt: "2026-09-08T17:30:00.000Z",
      createdByUserId: "marketing-1",
      reason: "Review eligible quote recovery audience.",
      rows: [{ count: 12, label: "Included", reason: "Valid customer follow-up." }],
      version: 1
    }
  ],
  ledgerEvents: [
    {
      actorRole: "Marketing Manager",
      actorUserId: "marketing-1",
      eventType: "CAMPAIGN_CREATED",
      occurredAt: "2026-09-08T17:00:00.000Z",
      reason: "Create reviewable campaign plan.",
      version: 1
    }
  ],
  launchLocks: [
    {
      actorRole: "Marketing Manager",
      createdAt: "2026-09-08T18:10:00.000Z",
      lockedReason: "Provider execution must stay locked until the approved adapter is ready.",
      lockState: "LOCKED",
      nextAction: "Request Policy review approval"
    }
  ],
  messageDrafts: [
    {
      body: "We wanted to help with the estimate you reviewed and answer any open questions.",
      callToAction: "Call us back today",
      createdAt: "2026-09-08T17:40:00.000Z",
      createdByUserId: "marketing-1",
      reason: "Prepare message draft for review.",
      subject: "Following up on your estimate",
      version: 1
    }
  ],
  objective: "Recover quoted customers through manager-approved follow-up.",
  resultEvents: [],
  sourceRecordCount: 12,
  writebackPreviews: []
};

describe("Growth admin review console", () => {
  it("renders a manager approval queue with locked controls", () => {
    const markup = renderToStaticMarkup(<GrowthAdminReviewConsole model={adminModel} />);

    expect(markup).toContain("Review Growth Work");
    expect(markup).toContain("Approval Queue");
    expect(markup).toContain("Recover unsold estimates and quotes");
    expect(markup).toContain("Decision reason");
    expect(markup).toContain("Live sends locked");
    expect(markup).toContain("Paid spend locked");
    expect(markup).toContain("CRM mutation locked");
  });

  it("renders campaign detail with evidence, approvals, locks, and audit trail", () => {
    const markup = renderToStaticMarkup(<GrowthCampaignAdminDetailConsole detail={campaignDetail} />);

    expect(markup).toContain("Campaign detail");
    expect(markup).toContain("Approve or reject");
    expect(markup).toContain("Audience");
    expect(markup).toContain("Drafts");
    expect(markup).toContain("Execution remains locked");
    expect(markup).toContain("Audit Trail");
    expect(markup).toContain("CRM Writeback");
  });
});
