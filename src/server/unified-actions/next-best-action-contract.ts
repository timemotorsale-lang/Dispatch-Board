import type { UnifiedActionModel, UnifiedActionPriority } from "@/server/unified-actions/unified-action-contract";

export const NEXT_BEST_ACTION_CONTRACT_VERSION = "next-best-action/v1" as const;

export type NextBestActionRuleId =
  | "overdue-critical-work"
  | "blocked-work"
  | "promise-risk"
  | "appointment-today"
  | "unscheduled-follow-up"
  | "repeated-carryover"
  | "report-worthy-work"
  | "default-ranked-work";

export type NextBestActionRecommendation = {
  id: string;
  actionId: string;
  label: string;
  reason: string;
  priority: UnifiedActionPriority;
  ownerName: string;
  dueAt: string | null;
  sourceHref: string;
  suggestedButtonLabel: string;
  ruleId: NextBestActionRuleId;
  score: number;
};

export type NextBestActionReadModel = {
  contractVersion: typeof NEXT_BEST_ACTION_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  generatedAt: string;
  primary: NextBestActionRecommendation | null;
  recommendations: NextBestActionRecommendation[];
  explanation: string;
  source: {
    actionCount: number;
    includedActionIds: string[];
  };
};

export type NextBestActionInput = {
  actions: UnifiedActionModel[];
  limit?: number;
  now?: Date;
};

