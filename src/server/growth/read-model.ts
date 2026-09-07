export type GrowthReadiness = "Ready" | "Review needed" | "Blocked";

export type GrowthSourceSystem = "CRM" | "Inventory" | "Sales" | "Service" | "Appointments" | "Tasks";

export type GrowthOpportunityReadModel = {
  audience: string;
  estimatedValue: number;
  impact: string;
  nextAction: string;
  owner: string;
  priorityScore: number;
  readiness: GrowthReadiness;
  reason: string;
  sourceSystems: GrowthSourceSystem[];
  sourceSummary: string;
  title: string;
  type: string;
};

export type GrowthAudienceRow = {
  count: number;
  label: "Included" | "Excluded" | "Suppressed" | "Needs cleanup";
  reason: string;
};

export type GrowthSourceHealth = {
  label: GrowthSourceSystem;
  state: "Readable" | "Review needed" | "Unavailable";
  summary: string;
};

export type GrowthMetric = {
  label: string;
  value: string;
};

export type GrowthCrmWritebackEvent = {
  event: string;
  state: "Planned" | "Blocked until policy" | "Unavailable until provider pilot";
};

export type GrowthConsoleReadModel = {
  audienceRows: GrowthAudienceRow[];
  crmWritebackEvents: GrowthCrmWritebackEvent[];
  generatedAt: string;
  metrics: GrowthMetric[];
  opportunities: GrowthOpportunityReadModel[];
  sourceHealth: GrowthSourceHealth[];
  sourceMode: "Read-only source snapshot";
};

const sourceHealth: GrowthSourceHealth[] = [
  {
    label: "CRM",
    state: "Readable",
    summary: "Customer relationship, consent posture, lead stage, and follow-up ownership are available for review."
  },
  {
    label: "Inventory",
    state: "Review needed",
    summary: "Vehicle promotion candidates require current availability and merchandising confirmation before launch."
  },
  {
    label: "Sales",
    state: "Readable",
    summary: "Quote recovery and lead reactivation signals can be shown without changing deal records."
  },
  {
    label: "Service",
    state: "Review needed",
    summary: "Service reminders need manager-approved claim language and source freshness before customer outreach."
  },
  {
    label: "Appointments",
    state: "Readable",
    summary: "No-show and appointment recovery can be prepared as CRM follow-up work."
  },
  {
    label: "Tasks",
    state: "Readable",
    summary: "Task follow-up is available as the safest first execution path."
  }
];

const opportunities: GrowthOpportunityReadModel[] = [
  {
    audience: "48 CRM contacts",
    estimatedValue: 42000,
    impact: "$42K expected pipeline",
    nextAction: "Review audience",
    owner: "Marketing Manager",
    priorityScore: 88,
    readiness: "Ready",
    reason: "Saved estimates and quotes are aging, customer ownership is known, and follow-up can start as review-only CRM work.",
    sourceSystems: ["CRM", "Sales", "Tasks"],
    sourceSummary: "CRM + Sales quotes + follow-up tasks",
    title: "Recover unsold estimates and quotes",
    type: "Customer recovery"
  },
  {
    audience: "12 vehicles",
    estimatedValue: 68000,
    impact: "$68K aged inventory exposure",
    nextAction: "Approve vehicle list",
    owner: "Inventory Manager",
    priorityScore: 81,
    readiness: "Review needed",
    reason: "Aged retail-ready vehicles can be promoted after inventory confirms availability, price posture, and exclusions.",
    sourceSystems: ["Inventory", "Sales"],
    sourceSummary: "Inventory lifecycle + sales policy",
    title: "Promote aging retail-ready inventory",
    type: "Advertising"
  },
  {
    audience: "31 customers",
    estimatedValue: 18000,
    impact: "$18K service opportunity",
    nextAction: "Check consent",
    owner: "Service Manager",
    priorityScore: 59,
    readiness: "Blocked",
    reason: "The opportunity is useful, but consent and service-claim source checks must clear before customer outreach.",
    sourceSystems: ["Service", "CRM"],
    sourceSummary: "Service reminders + CRM consent",
    title: "Seasonal service reminder",
    type: "Retention"
  },
  {
    audience: "22 leads",
    estimatedValue: 29000,
    impact: "$29K possible reactivation",
    nextAction: "Edit message",
    owner: "Sales Manager",
    priorityScore: 76,
    readiness: "Ready",
    reason: "Cold leads have known lifecycle history and can be prepared for manager-approved reactivation.",
    sourceSystems: ["CRM", "Sales"],
    sourceSummary: "CRM lifecycle + sales pipeline",
    title: "Reactivate cold leads with trade-in interest",
    type: "Lead nurture"
  }
];

const audienceRows: GrowthAudienceRow[] = [
  {
    count: 64,
    label: "Included",
    reason: "Valid CRM contact, relevant vehicle/service signal, and owner available."
  },
  {
    count: 17,
    label: "Excluded",
    reason: "Sold vehicle, stale quote, wrong lifecycle, duplicate campaign, or source mismatch."
  },
  {
    count: 9,
    label: "Suppressed",
    reason: "Opt-out, missing consent, quiet window, complaint flag, or channel not permitted."
  },
  {
    count: 6,
    label: "Needs cleanup",
    reason: "Missing phone, email, owner, source freshness, or contact preference."
  }
];

const crmWritebackEvents: GrowthCrmWritebackEvent[] = [
  { event: "Campaign prepared", state: "Planned" },
  { event: "Audience approved", state: "Planned" },
  { event: "Message approved", state: "Planned" },
  { event: "Launch scheduled", state: "Blocked until policy" },
  { event: "Reply received", state: "Unavailable until provider pilot" },
  { event: "Appointment created", state: "Blocked until policy" },
  { event: "Opportunity updated", state: "Blocked until policy" },
  { event: "Opt-out recorded", state: "Unavailable until provider pilot" }
];

function formatCurrency(value: number) {
  return `$${Math.round(value / 1000)}K`;
}

export function buildGrowthConsoleReadModel(now = new Date("2026-09-07T12:00:00-05:00")): GrowthConsoleReadModel {
  const reachableAudience = audienceRows.find((row) => row.label === "Included")?.count ?? 0;
  const suppressed = audienceRows.find((row) => row.label === "Suppressed")?.count ?? 0;
  const approvalNeeded = opportunities.filter((opportunity) => opportunity.readiness !== "Ready").length;
  const expectedValue = opportunities.reduce((total, opportunity) => total + opportunity.estimatedValue, 0);

  return {
    audienceRows,
    crmWritebackEvents,
    generatedAt: now.toISOString(),
    metrics: [
      { label: "Opportunities", value: String(opportunities.length) },
      { label: "Reachable audience", value: String(reachableAudience) },
      { label: "Approval needed", value: String(approvalNeeded) },
      { label: "Expected value", value: formatCurrency(expectedValue) },
      { label: "Suppressed records", value: String(suppressed) }
    ],
    opportunities: [...opportunities].sort((left, right) => right.priorityScore - left.priorityScore),
    sourceHealth,
    sourceMode: "Read-only source snapshot"
  };
}
