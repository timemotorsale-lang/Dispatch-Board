import { buildGrowthAudience, type GrowthAudienceBuilderContact } from "./audience-builder";
import { evaluateGrowthApprovalGates, type GrowthApprovalGateDecision, type GrowthCampaignType, type GrowthRole } from "./approval-gates";
import { createGrowthCampaignLedger, type GrowthLedgerRecord } from "./campaign-ledger";
import { createGrowthCampaignPlanningService, type GrowthCampaignPlan } from "./campaign-planning";
import { decideGrowthWorkflow, type GrowthChannel, type GrowthWorkflowDecision } from "./domain-engine";
import { evaluateGrowthLaunchReadiness, type GrowthLaunchReadiness, type GrowthPolicyContext } from "./policy";
import { createGrowthProviderPilotAdapter, type GrowthProviderPilotResult } from "./provider-pilot";
import type { GrowthOpportunityReadModel } from "./read-model";

export type GrowthLifecycleInput = {
  actorId: string;
  actorRole: GrowthRole;
  audience: GrowthAudienceBuilderContact[];
  budgetCents: number;
  campaignType: GrowthCampaignType;
  channel: GrowthChannel;
  idempotencySeed: string;
  message: {
    body: string;
    callToAction: string;
    subject: string;
  };
  offerSourceVerified: boolean;
  opportunity: GrowthOpportunityReadModel;
  policyContext: GrowthPolicyContext;
  reason: string;
  requestedApprovals: GrowthRole[];
};

export type GrowthLifecycleResult = {
  approval: GrowthApprovalGateDecision;
  campaign: GrowthCampaignPlan;
  ledger: GrowthLedgerRecord;
  launch: GrowthLaunchReadiness;
  provider: GrowthProviderPilotResult;
  readOnlyExecution: true;
  workflow: GrowthWorkflowDecision;
};

export function runGrowthLifecycleReview(input: GrowthLifecycleInput, now = () => new Date("2026-09-07T12:00:00-05:00")): GrowthLifecycleResult {
  const planning = createGrowthCampaignPlanningService(now);
  const ledger = createGrowthCampaignLedger(now);
  const provider = createGrowthProviderPilotAdapter();
  const commandBase = {
    actor: input.actorId,
    reason: input.reason
  };
  const campaign = planning.createCampaignPlan({
    budgetCents: input.budgetCents,
    channel: toPlanChannel(input.channel),
    idempotencyKey: `${input.idempotencySeed}:plan`,
    objective: input.reason,
    opportunity: input.opportunity,
    reason: input.reason
  });
  const ledgerRecord = ledger.createCampaign({
    ...commandBase,
    idempotencyKey: `${input.idempotencySeed}:ledger`,
    title: campaign.opportunityTitle
  });
  const audienceSummary = buildGrowthAudience(input.audience, input.channel);
  const audienceRows = Object.entries(audienceSummary.counts).map(([label, count]) => ({
    count,
    label: label as "Included" | "Excluded" | "Suppressed" | "Needs cleanup",
    reason: `${count} records marked ${label.toLowerCase()} by governed audience checks.`
  }));
  const withAudience = planning.saveAudienceSnapshot({
    expectedVersion: campaign.version,
    idempotencyKey: `${input.idempotencySeed}:audience`,
    planId: campaign.id,
    reason: input.reason,
    rows: audienceRows
  });
  ledger.appendAudienceSnapshot({
    ...commandBase,
    campaignId: ledgerRecord.campaignId,
    counts: audienceSummary.counts,
    idempotencyKey: `${input.idempotencySeed}:ledger-audience`
  });
  const withMessage = planning.editMessageDraft({
    body: input.message.body,
    callToAction: input.message.callToAction,
    expectedVersion: withAudience.version,
    idempotencyKey: `${input.idempotencySeed}:message`,
    planId: campaign.id,
    reason: input.reason,
    subject: input.message.subject
  });
  ledger.appendMessageDraft({
    ...commandBase,
    campaignId: ledgerRecord.campaignId,
    idempotencyKey: `${input.idempotencySeed}:ledger-message`,
    subject: input.message.subject
  });
  const approvalRequested = planning.requestApproval({
    expectedVersion: withMessage.version,
    idempotencyKey: `${input.idempotencySeed}:approval`,
    planId: campaign.id,
    reason: input.reason
  });
  const finalLedger = ledger.requestApproval({
    ...commandBase,
    campaignId: ledgerRecord.campaignId,
    idempotencyKey: `${input.idempotencySeed}:ledger-approval`
  });
  const approval = evaluateGrowthApprovalGates({
    actorRole: input.actorRole,
    budgetCents: input.budgetCents,
    campaignType: input.campaignType,
    channel: input.channel,
    offerSourceVerified: input.offerSourceVerified,
    planStatus: approvalRequested.status,
    providerReady: input.policyContext.providerReady,
    requestedApprovals: input.requestedApprovals
  });
  const launch = evaluateGrowthLaunchReadiness(approvalRequested, input.policyContext);
  const workflow = decideGrowthWorkflow({
    audienceApproved: audienceSummary.counts.Included > 0 && audienceSummary.counts.Suppressed === 0,
    backendControlsReady: false,
    launchWindowApproved: false,
    messageApproved: input.message.subject.trim().length >= 4 && input.message.body.trim().length >= 20,
    plan: approvalRequested,
    policyCleared: launch.allowed,
    providerReady: false
  });
  const launchLockedLedger = ledger.appendLaunchLock({
    ...commandBase,
    campaignId: ledgerRecord.campaignId,
    idempotencyKey: `${input.idempotencySeed}:ledger-lock`,
    lockedReason: approval.lockedReason
  });
  const dryRun = provider.launch({
    idempotencyKey: `${input.idempotencySeed}:provider-dry-run`,
    plan: approvalRequested,
    policyContext: input.policyContext,
    reason: input.reason
  });

  return {
    approval,
    campaign: approvalRequested,
    ledger: launchLockedLedger ?? finalLedger,
    launch,
    provider: dryRun,
    readOnlyExecution: true,
    workflow
  };
}

function toPlanChannel(channel: GrowthChannel): GrowthCampaignPlan["channel"] {
  if (channel === "SMS") return "SMS draft";
  return channel;
}
