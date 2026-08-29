import {
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayRiskLevel,
} from "@prisma/client";

import type { WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusLabel(score: number) {
  if (score >= 85) return "READY" as const;
  if (score >= 60) return "NEEDS_REVIEW" as const;
  return "NEEDS_SUPPORT" as const;
}

export function buildDailyPlanningEngine(workbook: WorkdayWorkbookRecord) {
  const focusItems = workbook.dailyFocusItems;
  const topOutcomes = focusItems.slice(0, 3);
  const mustCloseItems = focusItems.filter((item) => item.mustCloseToday);
  const unresolvedMustCloseItems = mustCloseItems.filter((item) => item.status !== WorkdayDailyFocusStatus.DONE);
  const riskItems = focusItems.filter((item) => item.riskLevel !== WorkdayRiskLevel.NONE);
  const supportNeededItems = focusItems.filter((item) => item.supportNeeded.trim().length > 0);
  const prompts: string[] = [];

  if (!focusItems.length) prompts.push("Add the top three outcomes before work gets busy.");
  if (focusItems.length > 3) prompts.push("Reduce today to the three outcomes that matter most.");
  if (!mustCloseItems.length) prompts.push("Mark what must be completed before close.");
  if (riskItems.length) prompts.push("Review focus items already marked watch or blocked.");
  if (supportNeededItems.length) prompts.push("Confirm support needed for today's focus work.");
  if (!prompts.length) prompts.push("Today's focus is clear. Work from the highest-priority outcome first.");

  const focusCountScore = focusItems.length ? Math.min(focusItems.length, 3) * 22 : 0;
  const mustCloseScore = mustCloseItems.length ? 18 : 0;
  const priorityScore = topOutcomes.length > 0 && topOutcomes.every((item) => item.priority) ? 10 : 0;
  const riskPenalty = riskItems.length * 6 + unresolvedMustCloseItems.length * 8;
  const score = clampScore(focusCountScore + mustCloseScore + priorityScore - riskPenalty);

  return {
    score,
    status: statusLabel(score),
    focusItemCount: focusItems.length,
    topOutcomeCount: topOutcomes.length,
    mustCloseCount: mustCloseItems.length,
    unresolvedMustCloseCount: unresolvedMustCloseItems.length,
    riskItemCount: riskItems.length,
    supportNeededCount: supportNeededItems.length,
    suggestedFirstAction: topOutcomes[0]?.outcome ?? "Add today's top outcome.",
    staffGuidance: prompts[0],
    managerSummary: focusItems.length
      ? `${topOutcomes.length} focus outcome(s), ${mustCloseItems.length} must-close item(s), and ${riskItems.length} planning risk(s).`
      : "No Daily Focus outcomes have been set yet.",
    prompts
  };
}

export function buildExecutionTrackingEngine(workbook: WorkdayWorkbookRecord) {
  const plannedDailyFocus = workbook.dailyFocusItems.length;
  const completedDailyFocus = workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.DONE).length;
  const checklistCount = workbook.checklistItems.length;
  const completedChecklist = workbook.checklistItems.filter((item) => item.done).length;
  const plannedWorkCount = plannedDailyFocus + checklistCount;
  const completedWorkCount = completedDailyFocus + completedChecklist;
  const unplannedWorkCount = workbook.quickUpdates.length;
  const taskConversionCount =
    workbook.dailyFocusItems.filter((item) => item.convertedTaskId).length +
    workbook.checklistItems.filter((item) => item.convertedTaskId).length +
    workbook.quickUpdates.filter((item) => item.convertedTaskId).length +
    workbook.carryovers.filter((item) => item.convertedTaskId).length;
  const unfinishedWorkCount =
    workbook.dailyFocusItems.filter((item) => item.status !== WorkdayDailyFocusStatus.DONE).length +
    workbook.checklistItems.filter((item) => !item.done).length;
  const carryoverReadyCount =
    workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER).length +
    workbook.checklistItems.filter((item) => item.carryoverReady).length +
    workbook.quickUpdates.filter((item) => item.carryoverReady).length;
  const updatedChecklistCount = workbook.checklistItems.filter((item) => item.update.trim().length > 0).length;
  const blockedOrDelayedCount = workbook.checklistItems.filter((item) => !item.done && (item.status === WorkdayChecklistStatus.YELLOW || item.status === WorkdayChecklistStatus.RED)).length;
  const completionScore = plannedWorkCount ? (completedWorkCount / plannedWorkCount) * 75 : 35;
  const updateScore = plannedWorkCount ? Math.min(15, updatedChecklistCount * 5) : 0;
  const conversionScore = Math.min(10, taskConversionCount * 5);
  const penalty = blockedOrDelayedCount * 6 + unfinishedWorkCount * 3;
  const score = clampScore(completionScore + updateScore + conversionScore - penalty);
  const prompts: string[] = [];

  if (!plannedWorkCount) prompts.push("Add Daily Focus or checklist items so today's work can be tracked.");
  if (unfinishedWorkCount) prompts.push("Review unfinished work and mark done, update, or carry over.");
  if (unplannedWorkCount) prompts.push("Quick Updates captured unplanned work today.");
  if (blockedOrDelayedCount) prompts.push("Resolve or escalate delayed checklist items.");
  if (!prompts.length) prompts.push("Execution is clean. Keep work updated through close.");

  return {
    score,
    status: statusLabel(score),
    plannedDailyFocus,
    completedDailyFocus,
    checklistCount,
    completedChecklist,
    plannedWorkCount,
    completedWorkCount,
    unplannedWorkCount,
    taskConversionCount,
    unfinishedWorkCount,
    carryoverReadyCount,
    updatedChecklistCount,
    blockedOrDelayedCount,
    executionSummary: `${completedWorkCount} of ${plannedWorkCount} planned item(s) complete with ${unplannedWorkCount} unplanned update(s).`,
    staffGuidance: prompts[0],
    managerSummary: `${completedWorkCount}/${plannedWorkCount} planned complete, ${unfinishedWorkCount} unfinished, ${taskConversionCount} converted to formal task(s).`,
    prompts
  };
}
