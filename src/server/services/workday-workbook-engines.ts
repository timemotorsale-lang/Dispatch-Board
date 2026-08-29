import {
  WorkdayCarryoverStatus,
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayReportSeedStatus,
  WorkdayRiskLevel,
  WorkdaySupportActionStatus
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

export function buildRiskAndBlockerEngine(workbook: WorkdayWorkbookRecord, operatingSignals: WorkdayWorkbookOperatingSignals = { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }) {
  const dailyFocusBlockers = workbook.dailyFocusItems.filter((item) => item.riskLevel === WorkdayRiskLevel.BLOCKED);
  const dailyFocusWatch = workbook.dailyFocusItems.filter((item) => item.riskLevel === WorkdayRiskLevel.WATCH);
  const checklistRed = workbook.checklistItems.filter((item) => !item.done && item.status === WorkdayChecklistStatus.RED);
  const checklistYellow = workbook.checklistItems.filter((item) => !item.done && item.status === WorkdayChecklistStatus.YELLOW);
  const quickFollowUps = workbook.quickUpdates.filter((item) => item.followUpNeeded);
  const missingDueWindow = quickFollowUps.filter((item) => !item.dueWindow.trim());
  const openCarryovers = workbook.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.OPEN);
  const carriedSeeds = workbook.reportSeeds.filter((item) => item.status === WorkdayReportSeedStatus.CARRIED_OVER);
  const openSupport = workbook.supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED);
  const blockerCount = dailyFocusBlockers.length + checklistRed.length + missingDueWindow.length + openSupport.length + operatingSignals.approvalCount;
  const watchCount = dailyFocusWatch.length + checklistYellow.length + quickFollowUps.length + openCarryovers.length + carriedSeeds.length + operatingSignals.handoffCount + operatingSignals.reportExceptions;
  const riskScore = clampScore(100 - blockerCount * 16 - watchCount * 7);
  const blockerQueue = [
    ...dailyFocusBlockers.map((item) => ({ id: item.id, sourceType: "DAILY_FOCUS" as const, title: item.outcome, detail: item.riskNote || item.supportNeeded || "Daily focus is blocked." })),
    ...checklistRed.map((item) => ({ id: item.id, sourceType: "CHECKLIST_ITEM" as const, title: item.text, detail: item.riskNote || item.update || "Checklist item is blocked." })),
    ...missingDueWindow.map((item) => ({ id: item.id, sourceType: "QUICK_UPDATE" as const, title: item.text, detail: "Follow-up needs a due window." })),
    ...openSupport.map((item) => ({ id: item.id, sourceType: "SUPPORT_ACTION" as const, title: "Open support action", detail: item.note }))
  ];
  const tomorrowCarryoverCandidates = [
    ...workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER || item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE).map((item) => ({ id: item.id, sourceType: "DAILY_FOCUS" as const, title: item.outcome })),
    ...workbook.checklistItems.filter((item) => item.carryoverReady).map((item) => ({ id: item.id, sourceType: "CHECKLIST_ITEM" as const, title: item.text })),
    ...quickFollowUps.map((item) => ({ id: item.id, sourceType: "QUICK_UPDATE" as const, title: item.text })),
    ...carriedSeeds.map((item) => ({ id: item.id, sourceType: "REPORT_SEED" as const, title: item.title }))
  ];
  const prompts: string[] = [];

  if (blockerCount) prompts.push("Resolve or assign support for blocked work before close.");
  if (missingDueWindow.length) prompts.push("Add due windows to Quick Update follow-ups.");
  if (tomorrowCarryoverCandidates.length) prompts.push("Confirm tomorrow ownership for carryover candidates.");
  if (!prompts.length) prompts.push("Risk is controlled. Keep watching promise and handoff signals.");

  return {
    score: riskScore,
    status: statusLabel(riskScore),
    blockerCount,
    watchCount,
    dailyFocusBlockerCount: dailyFocusBlockers.length,
    checklistRedCount: checklistRed.length,
    checklistYellowCount: checklistYellow.length,
    quickFollowUpCount: quickFollowUps.length,
    missingDueWindowCount: missingDueWindow.length,
    openSupportCount: openSupport.length,
    operatingExceptionCount: operatingSignals.reportExceptions,
    blockerQueue,
    tomorrowCarryoverCandidates,
    staffGuidance: prompts[0],
    managerSummary: `${blockerCount} blocker(s), ${watchCount} watch signal(s), and ${tomorrowCarryoverCandidates.length} tomorrow candidate(s).`,
    prompts
  };
}

export function buildCoachingAndAccountabilityEngine(workbook: WorkdayWorkbookRecord, operatingSignals: WorkdayWorkbookOperatingSignals = { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }) {
  const planning = buildDailyPlanningEngine(workbook);
  const execution = buildExecutionTrackingEngine(workbook);
  const risk = buildRiskAndBlockerEngine(workbook, operatingSignals);
  const reviewedSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const reportingScore = workbook.reportSeeds.length ? clampScore((reviewedSeeds / workbook.reportSeeds.length) * 100) : 45;
  const effectivenessScore = clampScore((planning.score + execution.score + risk.score + reportingScore) / 4);
  const strengths: string[] = [];
  const opportunities: string[] = [];

  if (planning.score >= 75) strengths.push("Started with clear daily focus.");
  if (execution.completedWorkCount > 0) strengths.push("Moved planned work forward.");
  if (workbook.quickUpdates.length > 0) strengths.push("Captured meaningful unplanned work.");
  if (risk.blockerCount === 0) strengths.push("No hard blockers are open.");
  if (!strengths.length) strengths.push("The next improvement is to make the day visible early.");

  if (planning.score < 60) opportunities.push(planning.staffGuidance);
  if (execution.unfinishedWorkCount > 0) opportunities.push("Close, update, or carry over unfinished work.");
  if (risk.blockerCount > 0) opportunities.push("Ask for support on blocked work now.");
  if (workbook.quickUpdates.some((item) => item.followUpNeeded && !item.dueWindow.trim())) opportunities.push("Add due windows to follow-ups.");
  if (workbook.reportSeeds.length && reviewedSeeds < workbook.reportSeeds.length) opportunities.push("Review report seeds before generating the final draft.");
  if (!opportunities.length) opportunities.push("Keep the day current and close it cleanly.");

  return {
    effectivenessScore,
    status: statusLabel(effectivenessScore),
    planning,
    execution,
    risk,
    reportingScore,
    strengths,
    opportunities,
    supportNeededPrompt: risk.blockerCount > 0 || planning.supportNeededCount > 0 ? "Support is needed to keep at least one item moving." : "",
    staffSummary: opportunities[0],
    managerSummary: `${execution.completedWorkCount} of ${execution.plannedWorkCount} planned item(s) complete, ${risk.blockerCount} blocker(s), ${risk.tomorrowCarryoverCandidates.length} carryover candidate(s).`,
    coachingPrompts: [...opportunities.slice(0, 3), ...strengths.slice(0, 2)]
  };
}
