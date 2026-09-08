import type { GrowthAttributionTier, GrowthNormalizedResultEvent } from "./results-attribution";

export type GrowthCrmWritebackType =
  | "Campaign prepared"
  | "Audience reviewed"
  | "Message approved"
  | "Follow-up task prepared"
  | "Result attributed"
  | "Opt-out requires source update";

export type GrowthCrmWritebackPreview = {
  customerId: string | null;
  eventType: GrowthCrmWritebackType;
  locked: true;
  reason: string;
  targetSystem: "CRM" | "Tasks";
  valueCents: number;
};

export type GrowthCrmWritebackPreviewResult = {
  canMutateCrm: false;
  events: GrowthCrmWritebackPreview[];
  nextAction: string;
  preservation: string;
};

export function buildGrowthCrmWritebackPreview(input: {
  approvalRequested: boolean;
  attribution: Array<{ event: GrowthNormalizedResultEvent; tier: GrowthAttributionTier }>;
  campaignId: string;
  includedAudienceCount: number;
  messageApproved: boolean;
}): GrowthCrmWritebackPreviewResult {
  const events: GrowthCrmWritebackPreview[] = [
    {
      customerId: null,
      eventType: "Campaign prepared",
      locked: true,
      reason: `Campaign ${input.campaignId} can be shown as prepared after review.`,
      targetSystem: "CRM",
      valueCents: 0
    },
    {
      customerId: null,
      eventType: "Audience reviewed",
      locked: true,
      reason: `${input.includedAudienceCount} audience records are eligible for review. Suppressed records are never written as outreach.`,
      targetSystem: "CRM",
      valueCents: 0
    }
  ];

  if (input.messageApproved) {
    events.push({
      customerId: null,
      eventType: "Message approved",
      locked: true,
      reason: "Approved language can be referenced by CRM follow-up after mutation controls are approved.",
      targetSystem: "CRM",
      valueCents: 0
    });
  }

  if (input.approvalRequested) {
    events.push({
      customerId: null,
      eventType: "Follow-up task prepared",
      locked: true,
      reason: "Task writeback is prepared, but task creation remains blocked until backend mutation approval.",
      targetSystem: "Tasks",
      valueCents: 0
    });
  }

  input.attribution.forEach(({ event, tier }) => {
    if (tier === "Unattributed") return;
    events.push({
      customerId: event.customerId ?? null,
      eventType: "Result attributed",
      locked: true,
      reason: `${tier} result from ${event.source} can be reviewed before CRM history writeback.`,
      targetSystem: "CRM",
      valueCents: event.valueCents ?? 0
    });
  });

  return {
    canMutateCrm: false,
    events,
    nextAction: "Review prepared CRM and task writebacks before enabling mutation commands",
    preservation: "Existing CRM records, estimates, quotes, invoices, inventory records, appointments, tasks, and repair records are preserved."
  };
}
