import { type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleCoachingSignal =
  | "appointment-show-rate"
  | "deal-stage-aging"
  | "follow-up-completion"
  | "response-time";

export type SalesConsoleCoachingInsight = {
  coachingOnly: true;
  evidence: string;
  hiddenScore: false;
  insightId: string;
  punitiveAutomation: false;
  signal: SalesConsoleCoachingSignal;
  staleDataHandling: "verify-first";
  suggestedTopic: string;
  visibleTo: SalesConsoleEnterpriseRole[];
};

export type SalesConsoleSalesCoachingReadModel = {
  guardrails: string[];
  insights: SalesConsoleCoachingInsight[];
  readOnly: true;
};

export const salesConsoleSalesCoachingReadModel = {
  guardrails: [
    "Coaching insights are explainable and coaching-only, not disciplinary automation.",
    "No hidden seller score is created or displayed.",
    "Managers see team coaching context; salespeople see their own coaching context later.",
    "Stale inputs must be verify-first before manager coaching use."
  ],
  insights: [
    {
      coachingOnly: true,
      evidence: "Follow-up completion is behind today compared with assigned seller queue due labels.",
      hiddenScore: false,
      insightId: "coaching-placeholder-1001",
      punitiveAutomation: false,
      signal: "follow-up-completion",
      staleDataHandling: "verify-first",
      suggestedTopic: "Review today’s overdue follow-up rhythm and next-action clarity.",
      visibleTo: ["salesperson", "sales-manager", "admin-owner"]
    },
    {
      coachingOnly: true,
      evidence: "Deal has been in structure-review with manager blocker visible.",
      hiddenScore: false,
      insightId: "coaching-placeholder-1002",
      punitiveAutomation: false,
      signal: "deal-stage-aging",
      staleDataHandling: "verify-first",
      suggestedTopic: "Coach deal progression and escalation timing.",
      visibleTo: ["sales-manager", "admin-owner"]
    }
  ],
  readOnly: true
} as const satisfies SalesConsoleSalesCoachingReadModel;

export function coachingInsightsAreExplainable(readModel = salesConsoleSalesCoachingReadModel) {
  return readModel.insights.every((insight) =>
    insight.evidence.length > 0 &&
    insight.suggestedTopic.length > 0 &&
    insight.coachingOnly === true
  );
}

export function coachingHasNoHiddenScoringOrPunitiveAutomation(readModel = salesConsoleSalesCoachingReadModel) {
  return readModel.insights.every((insight) => insight.hiddenScore === false && insight.punitiveAutomation === false);
}

export function coachingVisibilityIsRoleLimited(readModel = salesConsoleSalesCoachingReadModel) {
  return readModel.insights.every((insight) => insight.visibleTo.length > 0) &&
    readModel.insights
      .filter((insight) => !(insight.visibleTo as readonly SalesConsoleEnterpriseRole[]).includes("salesperson"))
      .every((insight) => insight.visibleTo.includes("sales-manager") || insight.visibleTo.includes("admin-owner"));
}

export function staleCoachingDataIsVerifyFirst(readModel = salesConsoleSalesCoachingReadModel) {
  return readModel.insights.every((insight) => insight.staleDataHandling === "verify-first");
}
