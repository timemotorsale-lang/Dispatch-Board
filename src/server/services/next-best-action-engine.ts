import {
  NEXT_BEST_ACTION_CONTRACT_VERSION,
  type NextBestActionInput,
  type NextBestActionReadModel,
  type NextBestActionRecommendation,
  type NextBestActionRuleId
} from "@/server/unified-actions/next-best-action-contract";
import type { UnifiedActionModel } from "@/server/unified-actions/unified-action-contract";

type RuleOutput = {
  label: string;
  reason: string;
  ruleId: NextBestActionRuleId;
  score: number;
  suggestedButtonLabel: string;
};

function relationshipKey(action: UnifiedActionModel) {
  return action.relationships.customerId
    ?? action.relationships.vehicleId
    ?? action.relationships.repairOrderId
    ?? action.source.recordId;
}

function priorityScore(action: UnifiedActionModel) {
  if (action.priority === "critical") return 40;
  if (action.priority === "high") return 30;
  if (action.priority === "medium") return 18;
  return 8;
}

function dueScore(action: UnifiedActionModel) {
  if (action.dueState === "overdue") return 45;
  if (action.dueState === "due_today") return 30;
  if (action.dueState === "upcoming") return 12;
  return 0;
}

function completedOrCancelled(action: UnifiedActionModel) {
  return action.status === "done" || action.status === "cancelled" || action.dueState === "completed";
}

function ruleFor(action: UnifiedActionModel, allActions: UnifiedActionModel[]): RuleOutput {
  const relatedCarryovers = allActions.filter((item) => item.actionType === "carry_over" && relationshipKey(item) === relationshipKey(action)).length;

  if (action.dueState === "overdue" && ["critical", "high"].includes(action.priority)) {
    return {
      label: action.title,
      reason: `${action.owner.name} has ${action.priority} priority work past due. ${action.businessImpact}`,
      ruleId: "overdue-critical-work",
      score: 120 + priorityScore(action),
      suggestedButtonLabel: action.nextRecommendedAction || "Open overdue work"
    };
  }

  if (action.status === "blocked") {
    return {
      label: action.title,
      reason: `This work is blocked and needs the unblock owner, next step, and review time confirmed. ${action.businessImpact}`,
      ruleId: "blocked-work",
      score: 110 + priorityScore(action),
      suggestedButtonLabel: "Resolve blocker"
    };
  }

  if (action.actionType === "review_promise" && ["overdue", "due_today"].includes(action.dueState)) {
    return {
      label: action.title,
      reason: `A customer promise is ${action.dueState === "overdue" ? "overdue" : "due today"} and should be protected before staff updates the customer.`,
      ruleId: "promise-risk",
      score: 104 + dueScore(action),
      suggestedButtonLabel: "Review promise"
    };
  }

  if (action.actionType === "schedule_appointment" && action.dueState === "due_today") {
    return {
      label: action.title,
      reason: "An appointment is due today. Prepare the visit, confirm ownership, and record the result.",
      ruleId: "appointment-today",
      score: 88 + priorityScore(action),
      suggestedButtonLabel: "Prepare appointment"
    };
  }

  if (action.actionType === "follow_up" && action.dueState === "unscheduled" && action.source.module === "SALES") {
    return {
      label: action.title,
      reason: "Active sales follow-up has no due time. Set the next contact window so it does not disappear from staff work.",
      ruleId: "unscheduled-follow-up",
      score: 78 + priorityScore(action),
      suggestedButtonLabel: "Set follow-up"
    };
  }

  if (relatedCarryovers >= 2) {
    return {
      label: action.title,
      reason: "This relationship has repeated carryover. Confirm whether it needs manager help, clearer ownership, or a smaller next step.",
      ruleId: "repeated-carryover",
      score: 74 + priorityScore(action),
      suggestedButtonLabel: "Review carryover"
    };
  }

  if (action.reportWorthy) {
    return {
      label: action.title,
      reason: `This action is report-worthy and should have a clear outcome before close. ${action.businessImpact}`,
      ruleId: "report-worthy-work",
      score: 62 + priorityScore(action) + dueScore(action),
      suggestedButtonLabel: action.nextRecommendedAction || "Review action"
    };
  }

  return {
    label: action.title,
    reason: action.businessImpact || "Work is available and ranked by priority, due date, and source freshness.",
    ruleId: "default-ranked-work",
    score: priorityScore(action) + dueScore(action),
    suggestedButtonLabel: action.nextRecommendedAction || "Open work"
  };
}

function toRecommendation(action: UnifiedActionModel, allActions: UnifiedActionModel[]): NextBestActionRecommendation {
  const rule = ruleFor(action, allActions);
  return {
    actionId: action.id,
    dueAt: action.dueAt,
    id: `${rule.ruleId}:${action.id}`,
    label: rule.label,
    ownerName: action.owner.name,
    priority: action.priority,
    reason: rule.reason,
    ruleId: rule.ruleId,
    score: rule.score,
    sourceHref: action.source.href,
    suggestedButtonLabel: rule.suggestedButtonLabel
  };
}

export function getNextBestActions(input: NextBestActionInput): NextBestActionReadModel {
  const now = input.now ?? new Date();
  const limit = Math.max(1, Math.min(input.limit ?? 5, 10));
  const actionable = input.actions.filter((action) => !completedOrCancelled(action));
  const recommendations = actionable
    .map((action) => toRecommendation(action, actionable))
    .sort((left, right) => right.score - left.score || (left.dueAt ?? "").localeCompare(right.dueAt ?? "") || left.actionId.localeCompare(right.actionId))
    .slice(0, limit);

  return {
    contractVersion: NEXT_BEST_ACTION_CONTRACT_VERSION,
    explanation: recommendations.length
      ? "Recommendations are rule-ranked from unified actions. Each recommendation keeps its source link, owner, due date, and explainable reason."
      : "No actionable unified actions are available. Completed and cancelled work is not surfaced.",
    generatedAt: now.toISOString(),
    primary: recommendations[0] ?? null,
    recommendations,
    source: {
      actionCount: input.actions.length,
      includedActionIds: recommendations.map((item) => item.actionId)
    },
    state: recommendations.length ? "READY" : "EMPTY"
  };
}

