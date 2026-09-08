import { rankGrowthOpportunities, type GrowthOpportunitySignal } from "./domain-engine";
import { normalizeGrowthSourceSignals, type GrowthNormalizedSignal, type GrowthSourceReadSignal } from "./source-adapters";

export type GrowthOpportunityType = "Customer recovery" | "Advertising" | "Retention" | "Lead nurture" | "Operations";

export type GrowthOrchestratedOpportunity = {
  estimatedValueCents: number;
  explanation: string;
  nextAction: string;
  priorityScore: number;
  readOnly: true;
  sourceIds: string[];
  sourceSystems: GrowthNormalizedSignal["source"][];
  title: string;
  type: GrowthOpportunityType;
};

export type GrowthOpportunityOrchestrationResult = {
  generatedAt: string;
  opportunities: GrowthOrchestratedOpportunity[];
  readOnly: true;
  sourceReviewNeeded: number;
};

export function orchestrateGrowthOpportunities(
  signals: GrowthSourceReadSignal[],
  now = new Date("2026-09-07T12:00:00-05:00")
): GrowthOpportunityOrchestrationResult {
  const normalized = normalizeGrowthSourceSignals(signals, now);
  const grouped = groupByOpportunity(normalized);
  const scored = rankGrowthOpportunities(grouped.map(toOpportunitySignal));

  return {
    generatedAt: now.toISOString(),
    opportunities: scored.map((score) => {
      const group = grouped.find((candidate) => candidate.title === score.title);
      const sourceSystems = group ? unique(group.signals.map((signal) => signal.source)) : [];

      return {
        estimatedValueCents: group?.valueCents ?? 0,
        explanation: score.explanation,
        nextAction: group?.reviewNeeded ? "Review source records" : "Review audience",
        priorityScore: score.priorityScore,
        readOnly: true,
        sourceIds: group?.signals.map((signal) => signal.entityId) ?? [],
        sourceSystems,
        title: score.title,
        type: group?.type ?? "Operations"
      };
    }),
    readOnly: true,
    sourceReviewNeeded: normalized.filter((signal) => signal.reviewNeeded).length
  };
}

type OpportunityGroup = {
  confidence: number;
  reviewNeeded: boolean;
  signals: GrowthNormalizedSignal[];
  title: string;
  type: GrowthOpportunityType;
  valueCents: number;
};

function groupByOpportunity(signals: GrowthNormalizedSignal[]): OpportunityGroup[] {
  const groups = new Map<string, OpportunityGroup>();

  signals.forEach((signal) => {
    const type = classifyOpportunityType(signal);
    const title = titleForType(type);
    const existing = groups.get(title) ?? {
      confidence: 0,
      reviewNeeded: false,
      signals: [],
      title,
      type,
      valueCents: 0
    };

    existing.confidence = Math.max(existing.confidence, signal.confidence);
    existing.reviewNeeded = existing.reviewNeeded || signal.reviewNeeded;
    existing.signals.push(signal);
    existing.valueCents += signal.valueCents;
    groups.set(title, existing);
  });

  return [...groups.values()];
}

function classifyOpportunityType(signal: GrowthNormalizedSignal): GrowthOpportunityType {
  const summary = signal.summary.toLowerCase();
  if (signal.source === "Inventory" || summary.includes("aged") || summary.includes("retail-ready")) return "Advertising";
  if (signal.source === "Service" || summary.includes("service")) return "Retention";
  if (summary.includes("cold lead") || summary.includes("trade")) return "Lead nurture";
  if (signal.source === "CRM" || signal.source === "Sales" || summary.includes("quote") || summary.includes("estimate")) return "Customer recovery";
  return "Operations";
}

function titleForType(type: GrowthOpportunityType) {
  const titles: Record<GrowthOpportunityType, string> = {
    Advertising: "Promote aging retail-ready inventory",
    "Customer recovery": "Recover unsold estimates and quotes",
    "Lead nurture": "Reactivate cold leads with trade-in interest",
    Operations: "Create staff follow-up work",
    Retention: "Prepare service reminder outreach"
  };

  return titles[type];
}

function toOpportunitySignal(group: OpportunityGroup): GrowthOpportunitySignal {
  return {
    audienceReadiness: group.reviewNeeded ? 10 : 22,
    fatiguePenalty: group.reviewNeeded ? 6 : 2,
    ownerCapacity: group.type === "Operations" ? 12 : 16,
    riskPenalty: group.reviewNeeded ? 12 : 4,
    sourceConfidence: Math.round(group.confidence / 5),
    title: group.title,
    urgency: group.signals.length >= 2 ? 18 : 11,
    valuePotential: Math.min(70, Math.round(group.valueCents / 1000))
  };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
