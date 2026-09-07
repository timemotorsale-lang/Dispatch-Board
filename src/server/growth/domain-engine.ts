import type { GrowthCampaignPlan } from "./campaign-planning";

export type GrowthChannel = "Email" | "SMS" | "Phone task" | "Paid ads" | "Social" | "Website" | "Internal task";

export type GrowthLifecycleStage =
  | "Opportunity"
  | "Audience review"
  | "Message review"
  | "Approval"
  | "Scheduled"
  | "Active"
  | "Paused"
  | "Measured"
  | "Closed";

export type GrowthAudienceContact = {
  consent: Partial<Record<GrowthChannel, boolean>>;
  customerId: string;
  hasEscalation: boolean;
  lastContactedAt: string | null;
  lifecycleFit: boolean;
  name: string;
  optOut: boolean;
  preferredChannel?: GrowthChannel;
};

export type GrowthOpportunitySignal = {
  audienceReadiness: number;
  fatiguePenalty: number;
  ownerCapacity: number;
  riskPenalty: number;
  sourceConfidence: number;
  title: string;
  urgency: number;
  valuePotential: number;
};

export type GrowthRankedOpportunity = GrowthOpportunitySignal & {
  explanation: string;
  priorityScore: number;
};

export type GrowthAudienceDecision = {
  contact: GrowthAudienceContact;
  included: boolean;
  reasons: string[];
  status: "Included" | "Excluded" | "Suppressed" | "Needs cleanup";
};

export type GrowthMessageReadinessInput = {
  callToAction: string;
  fallbackOwner: string;
  hasDisclosure: boolean;
  offerSource: string;
  usesCustomerSensitiveData: boolean;
  verifiedClaims: boolean;
};

export type GrowthWorkflowInput = {
  audienceApproved: boolean;
  backendControlsReady: boolean;
  launchWindowApproved: boolean;
  messageApproved: boolean;
  plan: Pick<GrowthCampaignPlan, "approvalRequestedAt" | "audienceSnapshots" | "messageDrafts" | "status">;
  policyCleared: boolean;
  providerReady: boolean;
};

export type GrowthWorkflowDecision = {
  blockedReason: string | null;
  nextAction: string;
  stage: GrowthLifecycleStage;
};

export type GrowthAttributionEvent = {
  campaignId: string;
  clicked: boolean;
  convertedAt: string | null;
  exposed: boolean;
  formSubmitted: boolean;
  hasTrackedIdentity: boolean;
  outcome: "Appointment" | "Lead" | "Sale" | "Service" | "None";
  replied: boolean;
};

export type GrowthAutomationRule = {
  audienceApproved: boolean;
  frequencyCapActive: boolean;
  launchEvidenceRecorded: boolean;
  messageTemplateApproved: boolean;
  ownerQueueAvailable: boolean;
  rollbackAvailable: boolean;
  serverSideSuppression: boolean;
  triggerAuthoritative: boolean;
};

export type GrowthAutomationDecision = {
  canRun: boolean;
  missing: string[];
  nextAction: string;
  state: "Ready inactive" | "Blocked";
};

export type GrowthDomainEngineReviewModel = {
  attribution: string;
  audienceSummary: string;
  automation: GrowthAutomationDecision;
  messageReady: boolean;
  opportunity: GrowthRankedOpportunity;
  workflow: GrowthWorkflowDecision;
};

export function rankGrowthOpportunities(signals: GrowthOpportunitySignal[]): GrowthRankedOpportunity[] {
  return signals
    .map((signal) => {
      const priorityScore =
        signal.valuePotential +
        signal.urgency +
        signal.audienceReadiness +
        signal.sourceConfidence +
        signal.ownerCapacity -
        signal.riskPenalty -
        signal.fatiguePenalty;

      return {
        ...signal,
        explanation: explainOpportunityScore(signal, priorityScore),
        priorityScore
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
}

export function decideGrowthAudience(
  contacts: GrowthAudienceContact[],
  channel: GrowthChannel,
  now = new Date("2026-09-07T12:00:00-05:00"),
  quietWindowDays = 7
): GrowthAudienceDecision[] {
  return contacts.map((contact) => decideContact(contact, channel, now, quietWindowDays));
}

export function evaluateGrowthMessageReadiness(input: GrowthMessageReadinessInput) {
  const checks = [
    { label: "Offer source named", passed: input.offerSource.trim().length > 0 },
    { label: "Claims verified", passed: input.verifiedClaims },
    { label: "Disclosure present", passed: input.hasDisclosure || !input.usesCustomerSensitiveData },
    { label: "Call to action clear", passed: input.callToAction.trim().length >= 4 },
    { label: "Fallback owner assigned", passed: input.fallbackOwner.trim().length >= 2 }
  ];

  const failed = checks.filter((check) => !check.passed);

  return {
    checks,
    nextAction: failed[0]?.label ?? "Submit for approval",
    ready: failed.length === 0
  };
}

export function decideGrowthWorkflow(input: GrowthWorkflowInput): GrowthWorkflowDecision {
  if (input.plan.audienceSnapshots.length === 0) {
    return { blockedReason: "Audience snapshot is required.", nextAction: "Review audience", stage: "Audience review" };
  }

  if (input.plan.messageDrafts.length === 0) {
    return { blockedReason: "Message or ad draft is required.", nextAction: "Review message or ad", stage: "Message review" };
  }

  if (!input.audienceApproved || !input.messageApproved || input.plan.status !== "Approval requested") {
    return { blockedReason: "Manager approval is required.", nextAction: "Request approval", stage: "Approval" };
  }

  if (!input.policyCleared) {
    return { blockedReason: "Policy checks must clear before scheduling.", nextAction: "Fix launch readiness", stage: "Approval" };
  }

  if (!input.backendControlsReady || !input.providerReady || !input.launchWindowApproved) {
    return { blockedReason: "Execution controls are not ready.", nextAction: "Keep launch locked", stage: "Scheduled" };
  }

  return { blockedReason: null, nextAction: "Measure results", stage: "Active" };
}

export function attributeGrowthOutcome(event: GrowthAttributionEvent) {
  if (!event.exposed || event.outcome === "None") return "Unattributed" as const;
  if ((event.clicked || event.replied || event.formSubmitted) && event.hasTrackedIdentity && event.convertedAt) return "Direct" as const;
  if (event.hasTrackedIdentity && event.convertedAt) return "Assisted" as const;
  return "Influenced" as const;
}

export function decideGrowthAutomation(rule: GrowthAutomationRule): GrowthAutomationDecision {
  const requirements: Array<[keyof GrowthAutomationRule, string]> = [
    ["triggerAuthoritative", "Review the trigger source"],
    ["audienceApproved", "Approve the audience rules"],
    ["serverSideSuppression", "Enforce consent and suppression server-side"],
    ["frequencyCapActive", "Turn on the frequency cap"],
    ["messageTemplateApproved", "Approve the message or ad template"],
    ["ownerQueueAvailable", "Assign an owner queue"],
    ["rollbackAvailable", "Confirm pause and rollback controls"],
    ["launchEvidenceRecorded", "Record launch evidence"]
  ];
  const missing = requirements.filter(([field]) => !rule[field]).map(([, action]) => action);

  return {
    canRun: missing.length === 0,
    missing,
    nextAction: missing[0] ?? "Keep ready inactive until user approves adoption",
    state: missing.length === 0 ? "Ready inactive" : "Blocked"
  };
}

export function buildGrowthDomainEngineReviewModel(): GrowthDomainEngineReviewModel {
  const [opportunity] = rankGrowthOpportunities([
    {
      audienceReadiness: 20,
      fatiguePenalty: 2,
      ownerCapacity: 15,
      riskPenalty: 4,
      sourceConfidence: 18,
      title: "Unsold quote recovery",
      urgency: 16,
      valuePotential: 42
    },
    {
      audienceReadiness: 13,
      fatiguePenalty: 7,
      ownerCapacity: 9,
      riskPenalty: 11,
      sourceConfidence: 14,
      title: "Aged inventory boost",
      urgency: 20,
      valuePotential: 68
    }
  ]);
  const audience = decideGrowthAudience([
    {
      consent: { Email: true },
      customerId: "C-1",
      hasEscalation: false,
      lastContactedAt: null,
      lifecycleFit: true,
      name: "Ready Customer",
      optOut: false
    },
    {
      consent: { Email: true },
      customerId: "C-2",
      hasEscalation: false,
      lastContactedAt: null,
      lifecycleFit: true,
      name: "Suppressed Customer",
      optOut: true
    }
  ], "Email");
  const message = evaluateGrowthMessageReadiness({
    callToAction: "Call us",
    fallbackOwner: "Marketing Manager",
    hasDisclosure: true,
    offerSource: "Saved quote record",
    usesCustomerSensitiveData: true,
    verifiedClaims: true
  });
  const workflow = decideGrowthWorkflow({
    audienceApproved: true,
    backendControlsReady: false,
    launchWindowApproved: false,
    messageApproved: true,
    plan: {
      approvalRequestedAt: "2026-09-07T12:00:00.000Z",
      audienceSnapshots: [{ createdAt: "2026-09-07T12:00:00.000Z", id: "A-1", rows: [], version: 1 }],
      messageDrafts: [{ body: "A helpful approved customer message.", callToAction: "Call us", createdAt: "2026-09-07T12:00:00.000Z", id: "M-1", subject: "Quote", version: 1 }],
      status: "Approval requested"
    },
    policyCleared: true,
    providerReady: false
  });

  return {
    attribution: attributeGrowthOutcome({
      campaignId: "G-1",
      clicked: false,
      convertedAt: "2026-09-07T13:00:00.000Z",
      exposed: true,
      formSubmitted: false,
      hasTrackedIdentity: true,
      outcome: "Appointment",
      replied: false
    }),
    audienceSummary: `${audience.filter((decision) => decision.included).length} included, ${audience.filter((decision) => decision.status === "Suppressed").length} suppressed`,
    automation: decideGrowthAutomation({
      audienceApproved: true,
      frequencyCapActive: true,
      launchEvidenceRecorded: false,
      messageTemplateApproved: true,
      ownerQueueAvailable: true,
      rollbackAvailable: true,
      serverSideSuppression: true,
      triggerAuthoritative: true
    }),
    messageReady: message.ready,
    opportunity,
    workflow
  };
}

function decideContact(contact: GrowthAudienceContact, channel: GrowthChannel, now: Date, quietWindowDays: number): GrowthAudienceDecision {
  const reasons: string[] = [];

  if (contact.optOut) reasons.push("Customer is opted out.");
  if (!contact.consent[channel]) reasons.push(`No approved ${channel} contact permission.`);
  if (!contact.lifecycleFit) reasons.push("No relevant lifecycle trigger.");
  if (contact.hasEscalation) reasons.push("Unresolved escalation requires manager review.");
  if (contact.lastContactedAt && daysBetween(new Date(contact.lastContactedAt), now) < quietWindowDays) reasons.push("Inside quiet contact window.");

  if (contact.optOut || !contact.consent[channel] || (contact.lastContactedAt && daysBetween(new Date(contact.lastContactedAt), now) < quietWindowDays)) {
    return { contact, included: false, reasons, status: "Suppressed" };
  }

  if (!contact.lifecycleFit) return { contact, included: false, reasons, status: "Excluded" };
  if (contact.hasEscalation) return { contact, included: false, reasons, status: "Needs cleanup" };

  return { contact, included: true, reasons: ["Eligible for reviewed audience."], status: "Included" };
}

function daysBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 86400000;
}

function explainOpportunityScore(signal: GrowthOpportunitySignal, priorityScore: number) {
  return `${signal.title} scored ${priorityScore}: value ${signal.valuePotential}, urgency ${signal.urgency}, readiness ${signal.audienceReadiness}, source ${signal.sourceConfidence}, capacity ${signal.ownerCapacity}, less risk ${signal.riskPenalty} and fatigue ${signal.fatiguePenalty}.`;
}
