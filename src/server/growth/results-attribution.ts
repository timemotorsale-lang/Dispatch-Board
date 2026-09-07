export type GrowthResultEventType = "click" | "reply" | "appointment" | "lead" | "sale" | "service" | "form" | "follow_up_task" | "open";

export type GrowthAttributionTier = "Direct" | "Assisted" | "Influenced" | "Unattributed";

export type GrowthRawResultEvent = {
  campaignId: string;
  customerId?: string;
  eventType: GrowthResultEventType;
  occurredAt: string;
  source: "CRM" | "Provider" | "Sales" | "Service" | "Appointments" | "Tasks";
  valueCents?: number;
};

export type GrowthNormalizedResultEvent = GrowthRawResultEvent & {
  attributionWeight: number;
  proofEvent: boolean;
};

export type GrowthAttributionSummary = {
  assisted: number;
  contextOnly: number;
  direct: number;
  influenced: number;
  readOnly: true;
  totalValueCents: number;
  unattributed: number;
};

const proofEvents: GrowthResultEventType[] = ["appointment", "click", "form", "lead", "reply", "sale", "service"];

export function normalizeGrowthResultEvents(events: GrowthRawResultEvent[]): GrowthNormalizedResultEvent[] {
  return events.map((event) => ({
    ...event,
    attributionWeight: event.eventType === "open" ? 0.1 : proofEvents.includes(event.eventType) ? 1 : 0.5,
    proofEvent: proofEvents.includes(event.eventType)
  }));
}

export function classifyGrowthAttribution(event: GrowthNormalizedResultEvent, campaignStartAt: string, attributionWindowDays = 30): GrowthAttributionTier {
  const eventTime = new Date(event.occurredAt);
  const campaignStart = new Date(campaignStartAt);
  const daysAfterStart = (eventTime.getTime() - campaignStart.getTime()) / 86400000;

  if (daysAfterStart < 0 || daysAfterStart > attributionWindowDays) return "Unattributed";
  if (!event.customerId) return event.proofEvent ? "Influenced" : "Unattributed";
  if (["appointment", "click", "form", "lead", "reply", "sale", "service"].includes(event.eventType)) return "Direct";
  if (event.eventType === "follow_up_task") return "Assisted";
  if (event.eventType === "open") return "Influenced";
  return "Unattributed";
}

export function summarizeGrowthAttribution(events: GrowthRawResultEvent[], campaignStartAt: string, attributionWindowDays = 30): GrowthAttributionSummary {
  const normalized = normalizeGrowthResultEvents(events);
  const summary: GrowthAttributionSummary = {
    assisted: 0,
    contextOnly: 0,
    direct: 0,
    influenced: 0,
    readOnly: true,
    totalValueCents: 0,
    unattributed: 0
  };

  normalized.forEach((event) => {
    const tier = classifyGrowthAttribution(event, campaignStartAt, attributionWindowDays);
    if (tier === "Direct") summary.direct += 1;
    if (tier === "Assisted") summary.assisted += 1;
    if (tier === "Influenced") summary.influenced += 1;
    if (tier === "Unattributed") summary.unattributed += 1;
    if (event.eventType === "open") summary.contextOnly += 1;
    if (tier !== "Unattributed" && event.eventType !== "open") summary.totalValueCents += event.valueCents ?? 0;
  });

  return summary;
}

export function buildGrowthResultsAttributionReviewModel() {
  return summarizeGrowthAttribution(
    [
      { campaignId: "G-1", customerId: "C-1", eventType: "reply", occurredAt: "2026-09-08T09:00:00-05:00", source: "Provider", valueCents: 0 },
      { campaignId: "G-1", customerId: "C-1", eventType: "appointment", occurredAt: "2026-09-09T10:00:00-05:00", source: "Appointments", valueCents: 35000 },
      { campaignId: "G-1", customerId: "C-2", eventType: "open", occurredAt: "2026-09-08T10:00:00-05:00", source: "Provider", valueCents: 0 },
      { campaignId: "G-1", eventType: "sale", occurredAt: "2026-09-10T13:00:00-05:00", source: "Sales", valueCents: 2200000 },
      { campaignId: "G-1", customerId: "C-3", eventType: "service", occurredAt: "2026-11-01T13:00:00-05:00", source: "Service", valueCents: 45000 }
    ],
    "2026-09-07T12:00:00-05:00"
  );
}
