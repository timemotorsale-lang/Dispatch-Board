export type GrowthOptimizationSignal = {
  conversionRate: number;
  costCents: number;
  name: string;
  opportunityValueCents: number;
  readinessScore: number;
  responses: number;
  suppressedCount: number;
};

export type GrowthOptimizationRecommendation = {
  confidence: "High" | "Medium" | "Low";
  guardrail: string;
  reason: string;
  recommendedAction: string;
  title: string;
};

export type GrowthOptimizationModel = {
  generatedFrom: string;
  nextAction: string;
  recommendations: GrowthOptimizationRecommendation[];
  summary: string;
};

export function rankGrowthOptimizationSignals(signals: GrowthOptimizationSignal[]) {
  return [...signals].sort((left, right) => scoreSignal(right) - scoreSignal(left));
}

export function buildGrowthOptimizationRecommendations(signals: GrowthOptimizationSignal[]): GrowthOptimizationRecommendation[] {
  const ranked = rankGrowthOptimizationSignals(signals);
  const best = ranked[0];
  const needsCleanup = signals.find((signal) => signal.suppressedCount >= 8);

  const recommendations: GrowthOptimizationRecommendation[] = [];

  if (best) {
    recommendations.push({
      confidence: best.readinessScore >= 80 ? "High" : "Medium",
      guardrail: "Manager approval is required before budget, audience, or message changes are applied.",
      reason: `${best.name} has the strongest mix of readiness, value, and response signal.`,
      recommendedAction: `Review ${best.name} for the next approved launch window.`,
      title: "Prioritize the clearest opportunity"
    });
  }

  if (needsCleanup) {
    recommendations.push({
      confidence: "High",
      guardrail: "Suppressed and opted-out records stay excluded.",
      reason: `${needsCleanup.name} has ${needsCleanup.suppressedCount} records that need cleanup before outreach.`,
      recommendedAction: "Assign CRM cleanup before expanding the audience.",
      title: "Clean the audience before scaling"
    });
  }

  recommendations.push({
    confidence: "Medium",
    guardrail: "No automatic ad spend shift is allowed.",
    reason: "Optimization should compare replies, appointments, sales, and service outcomes instead of vanity metrics.",
    recommendedAction: "Run one approved A/B message review after the current pilot has outcome data.",
    title: "Optimize from outcomes"
  });

  return recommendations;
}

export function buildGrowthOptimizationReviewModel(): GrowthOptimizationModel {
  const recommendations = buildGrowthOptimizationRecommendations([
    {
      conversionRate: 0.18,
      costCents: 0,
      name: "Unsold quote recovery",
      opportunityValueCents: 4200000,
      readinessScore: 92,
      responses: 8,
      suppressedCount: 3
    },
    {
      conversionRate: 0.08,
      costCents: 75000,
      name: "Aged inventory boost",
      opportunityValueCents: 6800000,
      readinessScore: 71,
      responses: 3,
      suppressedCount: 11
    }
  ]);

  return {
    generatedFrom: "CRM, sales, inventory, and campaign review signals",
    nextAction: recommendations[0]?.recommendedAction ?? "Collect more reviewed outcomes",
    recommendations,
    summary: "The console recommends where staff should focus next. It does not change budget, send messages, or update customers automatically."
  };
}

function scoreSignal(signal: GrowthOptimizationSignal) {
  const valueScore = signal.opportunityValueCents / 100000;
  const responseScore = signal.responses * 6;
  const conversionScore = signal.conversionRate * 100;
  const costPenalty = signal.costCents / 10000;
  const cleanupPenalty = signal.suppressedCount * 2;

  return signal.readinessScore + valueScore + responseScore + conversionScore - costPenalty - cleanupPenalty;
}
