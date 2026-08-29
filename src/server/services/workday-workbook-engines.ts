import {
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
