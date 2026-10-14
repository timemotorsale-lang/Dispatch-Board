export type GrowthSourceName = "CRM" | "Inventory" | "Sales" | "Service" | "Appointments" | "Tasks";

export type GrowthSourceFreshness = "Fresh" | "Aging" | "Stale";

export type GrowthSourceReadSignal = {
  confidence: number;
  entityId: string;
  generatedAt: string;
  source: GrowthSourceName;
  summary: string;
  valueCents: number;
};

export type GrowthNormalizedSignal = GrowthSourceReadSignal & {
  authority: string;
  freshness: GrowthSourceFreshness;
  readOnly: true;
  reviewNeeded: boolean;
};

export type GrowthSourceAdapter<TSignal extends GrowthSourceReadSignal = GrowthSourceReadSignal> = {
  readonly mutatesRecords: false;
  readonly source: GrowthSourceName;
  normalize(signal: TSignal, now?: Date): GrowthNormalizedSignal;
};

const authorityBySource: Record<GrowthSourceName, string> = {
  Appointments: "Appointment schedule and outcome records",
  CRM: "Customer identity, consent, owner, and relationship history",
  Inventory: "Vehicle availability, retail readiness, price posture, and age",
  Sales: "Lead stage, quote status, deal activity, and salesperson ownership",
  Service: "Repair order, service recommendation, and completed work history",
  Tasks: "Assigned follow-up ownership and staff workload"
};

export function createGrowthSourceAdapter(source: GrowthSourceName): GrowthSourceAdapter {
  return {
    mutatesRecords: false,
    normalize(signal, now = new Date("2026-09-07T12:00:00-05:00")) {
      if (signal.source !== source) throw new Error(`Expected ${source} signal.`);
      const freshness = classifySourceFreshness(signal.generatedAt, now);

      return {
        ...signal,
        authority: authorityBySource[source],
        confidence: clampConfidence(signal.confidence),
        freshness,
        readOnly: true,
        reviewNeeded: freshness !== "Fresh" || signal.confidence < 70
      };
    },
    source
  };
}

export function normalizeGrowthSourceSignals(signals: GrowthSourceReadSignal[], now = new Date("2026-09-07T12:00:00-05:00")) {
  return signals.map((signal) => createGrowthSourceAdapter(signal.source).normalize(signal, now));
}

export function summarizeGrowthSourceSignals(signals: GrowthNormalizedSignal[]) {
  const totalValueCents = signals.reduce((total, signal) => total + signal.valueCents, 0);
  const reviewNeeded = signals.filter((signal) => signal.reviewNeeded).length;
  const sources = [...new Set(signals.map((signal) => signal.source))];

  return {
    readOnly: true as const,
    reviewNeeded,
    sources,
    totalSignals: signals.length,
    totalValueCents
  };
}

function classifySourceFreshness(generatedAt: string, now: Date): GrowthSourceFreshness {
  const ageHours = (now.getTime() - new Date(generatedAt).getTime()) / 3600000;
  if (ageHours <= 24) return "Fresh";
  if (ageHours <= 72) return "Aging";
  return "Stale";
}

function clampConfidence(confidence: number) {
  return Math.max(0, Math.min(100, Math.round(confidence)));
}
