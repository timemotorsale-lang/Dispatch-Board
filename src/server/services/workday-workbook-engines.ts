import {
  WorkdayActivityPurpose,
  WorkdayCarryoverStatus,
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayReportSeedStatus,
  WorkdayRiskLevel,
  WorkdaySupportActionStatus
} from "@prisma/client";

import type { WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import type { WorkdayWorkbookOperatingSignals } from "@/server/services/workday-workbook";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusLabel(score: number) {
  if (score >= 85) return "READY" as const;
  if (score >= 60) return "NEEDS_REVIEW" as const;
  return "NEEDS_SUPPORT" as const;
}

function countByPurpose(workbook: WorkdayWorkbookRecord, purpose: WorkdayActivityPurpose) {
  return (workbook.activitySignals ?? []).filter((signal) => signal.purpose === purpose).length;
}

function minutesFromSeconds(seconds: number) {
  return Math.round(seconds / 60);
}

function isAfterCloseWindow(now: Date, workbook: WorkdayWorkbookRecord) {
  const boardDate = workbook.boardDay.date;
  const closeWindowStart = new Date(boardDate);
  closeWindowStart.setUTCHours(21, 0, 0, 0);

  return now >= closeWindowStart;
}

function isAfterEndPrepNotice(now: Date, workbook: WorkdayWorkbookRecord) {
  const boardDate = workbook.boardDay.date;
  const endPrepNoticeAt = new Date(boardDate);
  endPrepNoticeAt.setUTCHours(20, 0, 0, 0);

  return now >= endPrepNoticeAt;
}

function latestRhythmSignal(workbook: WorkdayWorkbookRecord, actionType: string) {
  return (workbook.activitySignals ?? [])
    .filter((signal) => signal.actionType === actionType)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] ?? null;
}

function rhythmSignalsSince(workbook: WorkdayWorkbookRecord, actionType: string, since: Date | null) {
  return (workbook.activitySignals ?? []).filter((signal) =>
    signal.actionType === actionType &&
    (!since || signal.occurredAt > since)
  );
}

function activeCarryoverSourceIds(workbook: WorkdayWorkbookRecord) {
  return new Set(
    workbook.carryovers
      .filter((item) => item.status !== WorkdayCarryoverStatus.DISMISSED)
      .map((item) => item.sourceId)
  );
}

const startDayEvidenceActionTypes = new Set([
  "workbook.rhythm_start_confirmed",
  "workbook.daily_focus_created",
  "workbook.checklist_created",
  "workbook.quick_update_created",
  "workbook.report_draft_generated",
  "workbook.carryover_prepared"
]);

export function hasStartTheDayEvidence(workbook: WorkdayWorkbookRecord) {
  if (workbook.status === "CLOSED") return true;
  if (workbook.dailyFocusItems.length > 0) return true;
  return (workbook.activitySignals ?? []).some((signal) => startDayEvidenceActionTypes.has(signal.actionType));
}

type QuickUpdateIntelligenceType =
  "CUSTOMER_RISK" |
  "FACILITY_ISSUE" |
  "FINANCE_PAYMENT" |
  "INFORMATIONAL" |
  "INVENTORY_RECON_BLOCKER" |
  "PARTS_DELAY" |
  "PROCESS_IMPROVEMENT" |
  "SALES_OPPORTUNITY" |
  "STAFF_SUPPORT" |
  "TRAINING_MOMENT" |
  "VENDOR_DELAY";

type QuickUpdateRecommendedRoute =
  "CARRYOVER" |
  "CONVERT_TO_TASK" |
  "INFORMATIONAL" |
  "REPORT_SEED" |
  "STAFF_SUPPORT" |
  "START_DAY_FOCUS" |
  "WORK_DAY_ATTENTION";

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function classifyQuickUpdate(item: WorkdayWorkbookRecord["quickUpdates"][number]): QuickUpdateIntelligenceType {
  const text = `${item.text} ${item.person} ${item.company}`.toLocaleLowerCase();
  if (item.category === "CUSTOMER" || item.category === "CUSTOMER_ISSUE" || includesAny(text, ["customer", "client", "approval", "authorization", "promise", "upset", "callback", "call back", "complaint", "issue"])) return "CUSTOMER_RISK";
  if (item.category === "PROMISE_COMMITMENT" || includesAny(text, ["promise", "promised", "commitment", "committed", "target time", "due today"])) return "CUSTOMER_RISK";
  if (item.category === "BLOCKER_RISK" || includesAny(text, ["blocked", "stuck", "risk", "urgent", "overdue", "cannot move"])) return "STAFF_SUPPORT";
  if (item.category === "VENDOR" || includesAny(text, ["vendor", "sublet", "outside", "estimate", "supplement", "pickup", "drop off"])) return "VENDOR_DELAY";
  if (item.category === "INVENTORY_PARTS" || item.category === "WARRANTY" || includesAny(text, ["part", "parts", "eta", "backorder", "mirror", "rim", "warranty", "claim"])) return "PARTS_DELAY";
  if (item.category === "SERVICE_REPAIR" || item.category === "TOWING" || includesAny(text, ["repair", "ro-", "diagnosis", "estimate", "technician", "shop", "qc", "tow", "towing", "transport"])) return "INVENTORY_RECON_BLOCKER";
  if (item.category === "PURCHASE_APPRAISAL" || includesAny(text, ["purchase", "appraisal", "manheim", "auction", "bought vehicle", "acquisition"])) return "INVENTORY_RECON_BLOCKER";
  if (item.category === "DELIVERY" || includesAny(text, ["deliver", "delivery", "pickup", "ready for customer", "sold vehicle"])) return "CUSTOMER_RISK";
  if (includesAny(text, ["recon", "ready", "detail", "body", "paint", "inspection", "inventory", "photo"])) return "INVENTORY_RECON_BLOCKER";
  if (item.category === "STAFF" || item.category === "MANAGEMENT" || item.category === "ADMINISTRATION" || includesAny(text, ["need help", "support", "blocked", "stuck", "training", "not sure", "who owns", "manager", "approval needed", "admin"])) return "STAFF_SUPPORT";
  if (item.category === "FACILITY" || includesAny(text, ["facility", "roof", "building", "lot", "snow", "camera", "internet", "phone"])) return "FACILITY_ISSUE";
  if (item.category === "SALES_OPPORTUNITY" || includesAny(text, ["lead", "buy", "sale", "sold", "opportunity", "prospect"])) return "SALES_OPPORTUNITY";
  if (item.category === "FINANCE" || item.category === "TITLE_REGISTRATION" || item.category === "LICENSING" || includesAny(text, ["payment", "finance", "deposit", "refund", "title", "registration", "plates", "license", "licensing", "bank"])) return "FINANCE_PAYMENT";
  if (item.category === "TRAINING" || includesAny(text, ["training", "coach", "mistake", "learn", "process"])) return "TRAINING_MOMENT";
  if (item.category === "PROCESS_IMPROVEMENT" || item.category === "DOCUMENTATION" || item.category === "COMPLIANCE" || includesAny(text, ["again", "keeps", "repeat", "bottleneck", "process", "policy", "document", "documentation", "compliance"])) return "PROCESS_IMPROVEMENT";
  if (item.category === "APPOINTMENT" || includesAny(text, ["appointment", "scheduled", "calendar", "visit", "arrived"])) return "INFORMATIONAL";
  if (item.category === "MARKETING" || includesAny(text, ["marketing", "ad", "campaign", "facebook", "google", "website"])) return "INFORMATIONAL";
  return "INFORMATIONAL";
}

function quickUpdateTypeLabel(type: QuickUpdateIntelligenceType) {
  return type.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function quickUpdateImpactScore(item: WorkdayWorkbookRecord["quickUpdates"][number], type: QuickUpdateIntelligenceType) {
  const text = item.text.toLocaleLowerCase();
  const explicitRisk = includesAny(text, ["blocked", "stuck", "urgent", "overdue", "promise", "approval", "authorization", "upset"]);
  const base =
    type === "CUSTOMER_RISK" ? 66 :
    type === "VENDOR_DELAY" || type === "PARTS_DELAY" || type === "INVENTORY_RECON_BLOCKER" ? 60 :
    type === "STAFF_SUPPORT" ? 56 :
    type === "FINANCE_PAYMENT" ? 52 :
    type === "FACILITY_ISSUE" ? 44 :
    type === "SALES_OPPORTUNITY" ? 42 :
    type === "TRAINING_MOMENT" || type === "PROCESS_IMPROVEMENT" ? 36 :
    18;
  return clampScore(base + (item.followUpNeeded ? 18 : 0) + (item.carryoverReady ? 12 : 0) + (!item.dueWindow.trim() && item.followUpNeeded ? 10 : 0) + (explicitRisk ? 10 : 0) + (item.convertedTaskId ? -12 : 0));
}

function quickUpdateRoutes(item: WorkdayWorkbookRecord["quickUpdates"][number], type: QuickUpdateIntelligenceType, impactScore: number): QuickUpdateRecommendedRoute[] {
  const routes = new Set<QuickUpdateRecommendedRoute>();
  if (item.followUpNeeded || impactScore >= 70) routes.add("WORK_DAY_ATTENTION");
  if (item.followUpNeeded && !item.dueWindow.trim() || impactScore >= 78) routes.add("START_DAY_FOCUS");
  if (item.carryoverReady || item.followUpNeeded && item.dueWindow.trim()) routes.add("CARRYOVER");
  if (impactScore >= 45 || item.followUpNeeded || item.carryoverReady) routes.add("REPORT_SEED");
  if (type === "STAFF_SUPPORT" || impactScore >= 82) routes.add("STAFF_SUPPORT");
  if (!item.convertedTaskId && (impactScore >= 70 || item.followUpNeeded && !item.dueWindow.trim())) routes.add("CONVERT_TO_TASK");
  if (!routes.size) routes.add("INFORMATIONAL");
  return Array.from(routes);
}

function quickUpdateConfidence(item: WorkdayWorkbookRecord["quickUpdates"][number], type: QuickUpdateIntelligenceType) {
  const structuredFields = [item.person, item.company, item.dueWindow].filter((value) => value.trim()).length;
  if (type !== "INFORMATIONAL" && (item.followUpNeeded || item.carryoverReady || structuredFields >= 2)) return "HIGH" as const;
  if (type !== "INFORMATIONAL" || structuredFields > 0) return "MEDIUM" as const;
  return "LOW" as const;
}

export function buildQuickUpdateIntelligenceEngine(workbook: WorkdayWorkbookRecord) {
  const items = workbook.quickUpdates.map((item) => {
    const signalType = classifyQuickUpdate(item);
    const impactScore = quickUpdateImpactScore(item, signalType);
    const recommendedRoutes = quickUpdateRoutes(item, signalType, impactScore);
    const missingFollowUpDate = item.followUpNeeded && !item.dueWindow.trim();
    return {
      id: item.id,
      impactScore,
      signalType,
      signalLabel: quickUpdateTypeLabel(signalType),
      confidence: quickUpdateConfidence(item, signalType),
      recommendedRoutes,
      missingFollowUpDate,
      reportWorthy: recommendedRoutes.includes("REPORT_SEED"),
      needsSupport: recommendedRoutes.includes("STAFF_SUPPORT"),
      recommendedAction: missingFollowUpDate
        ? "Add a follow-up date or convert this into a formal task."
        : recommendedRoutes.includes("START_DAY_FOCUS")
          ? "Consider this for Start The Day focus."
          : recommendedRoutes.includes("CARRYOVER")
            ? "Confirm tomorrow ownership during close."
            : recommendedRoutes.includes("REPORT_SEED")
              ? "Review this as a report seed before close."
              : "Keep this as an informational note."
    };
  }).sort((left, right) => right.impactScore - left.impactScore);
  const highImpactCount = items.filter((item) => item.impactScore >= 70).length;
  const followUpGapCount = items.filter((item) => item.missingFollowUpDate).length;
  const reportWorthyCount = items.filter((item) => item.reportWorthy).length;
  const supportSignalCount = items.filter((item) => item.needsSupport).length;
  const categoryCounts = items.reduce<Record<QuickUpdateIntelligenceType, number>>((counts, item) => {
    counts[item.signalType] = (counts[item.signalType] ?? 0) + 1;
    return counts;
  }, {} as Record<QuickUpdateIntelligenceType, number>);
  const topSignal = items[0];
  const prompts = [
    ...(followUpGapCount ? [`${followUpGapCount} Quick Update follow-up(s) need a due date.`] : []),
    ...(highImpactCount ? [`${highImpactCount} high-impact Quick Update signal(s) should be reviewed today.`] : []),
    ...(supportSignalCount ? [`${supportSignalCount} Quick Update support signal(s) may need manager help.`] : []),
    ...(reportWorthyCount ? [`${reportWorthyCount} Quick Update(s) are report-worthy.`] : [])
  ];

  return {
    score: clampScore(45 + reportWorthyCount * 7 + highImpactCount * 6 - followUpGapCount * 10 + supportSignalCount * 4),
    status: statusLabel(clampScore(45 + reportWorthyCount * 7 + highImpactCount * 6 - followUpGapCount * 10 + supportSignalCount * 4)),
    totalCount: items.length,
    highImpactCount,
    followUpGapCount,
    reportWorthyCount,
    supportSignalCount,
    categoryCounts,
    topSignalId: topSignal?.id ?? null,
    staffGuidance: prompts[0] ?? (items.length ? "Quick Updates are classified and ready for close review." : "No Quick Updates captured yet."),
    managerSummary: `${items.length} Quick Update signal(s), ${highImpactCount} high-impact, ${reportWorthyCount} report-worthy, ${followUpGapCount} missing follow-up date(s).`,
    items
  };
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
  const quickUpdateIntelligence = buildQuickUpdateIntelligenceEngine(workbook);
  const preparedCarryoverSourceIds = activeCarryoverSourceIds(workbook);
  const dailyFocusBlockers = workbook.dailyFocusItems.filter((item) => item.riskLevel === WorkdayRiskLevel.BLOCKED);
  const dailyFocusWatch = workbook.dailyFocusItems.filter((item) => item.riskLevel === WorkdayRiskLevel.WATCH);
  const checklistRed = workbook.checklistItems.filter((item) => !item.done && item.status === WorkdayChecklistStatus.RED);
  const checklistYellow = workbook.checklistItems.filter((item) => !item.done && item.status === WorkdayChecklistStatus.YELLOW);
  const quickFollowUps = workbook.quickUpdates.filter((item) => item.followUpNeeded);
  const missingDueWindow = quickFollowUps.filter((item) => !item.dueWindow.trim() && !item.carryoverReady && !item.convertedTaskId && !preparedCarryoverSourceIds.has(item.id));
  const openCarryovers = workbook.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.OPEN);
  const carriedSeeds = workbook.reportSeeds.filter((item) => item.status === WorkdayReportSeedStatus.CARRIED_OVER);
  const openSupport = workbook.supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED);
  const blockerCount = dailyFocusBlockers.length + checklistRed.length + missingDueWindow.length + openSupport.length + operatingSignals.approvalCount + quickUpdateIntelligence.supportSignalCount;
  const watchCount = dailyFocusWatch.length + checklistYellow.length + quickFollowUps.length + openCarryovers.length + carriedSeeds.length + operatingSignals.handoffCount + operatingSignals.reportExceptions + quickUpdateIntelligence.highImpactCount;
  const riskScore = clampScore(100 - blockerCount * 16 - watchCount * 7);
  const blockerQueue = [
    ...dailyFocusBlockers.map((item) => ({ id: item.id, sourceType: "DAILY_FOCUS" as const, title: item.outcome, detail: item.riskNote || item.supportNeeded || "Daily focus is blocked." })),
    ...checklistRed.map((item) => ({ id: item.id, sourceType: "CHECKLIST_ITEM" as const, title: item.text, detail: item.riskNote || item.update || "Checklist item is blocked." })),
    ...missingDueWindow.map((item) => ({ id: item.id, sourceType: "QUICK_UPDATE" as const, title: item.text, detail: "Follow-up needs a due window." })),
    ...quickUpdateIntelligence.items.filter((item) => item.needsSupport).map((item) => ({ id: item.id, sourceType: "QUICK_UPDATE_INTELLIGENCE" as const, title: item.signalLabel, detail: item.recommendedAction })),
    ...openSupport.map((item) => ({ id: item.id, sourceType: "SUPPORT_ACTION" as const, title: "Open support action", detail: item.note }))
  ];
  const tomorrowCarryoverCandidates = [
    ...workbook.dailyFocusItems.filter((item) => (item.status === WorkdayDailyFocusStatus.CARRY_OVER || item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE) && !preparedCarryoverSourceIds.has(`daily-focus:${item.id}`)).map((item) => ({ id: item.id, sourceType: "DAILY_FOCUS" as const, title: item.outcome })),
    ...workbook.checklistItems.filter((item) => item.carryoverReady && !preparedCarryoverSourceIds.has(item.id)).map((item) => ({ id: item.id, sourceType: "CHECKLIST_ITEM" as const, title: item.text })),
    ...quickFollowUps.filter((item) => !preparedCarryoverSourceIds.has(item.id)).map((item) => ({ id: item.id, sourceType: "QUICK_UPDATE" as const, title: item.text })),
    ...carriedSeeds.filter((item) => !preparedCarryoverSourceIds.has(item.id)).map((item) => ({ id: item.id, sourceType: "REPORT_SEED" as const, title: item.title }))
  ];
  const prompts: string[] = [];

  if (blockerCount) prompts.push("Resolve or assign support for blocked work before close.");
  if (missingDueWindow.length) prompts.push("Add due windows to Quick Update follow-ups.");
  if (quickUpdateIntelligence.highImpactCount) prompts.push("Review high-impact Quick Updates before close.");
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
    quickUpdateHighImpactCount: quickUpdateIntelligence.highImpactCount,
    quickUpdateSupportSignalCount: quickUpdateIntelligence.supportSignalCount,
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
  const quickUpdateIntelligence = buildQuickUpdateIntelligenceEngine(workbook);
  const reviewedSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const reportingScore = workbook.reportSeeds.length ? clampScore((reviewedSeeds / workbook.reportSeeds.length) * 100) : 45;
  const effectivenessScore = clampScore((planning.score + execution.score + risk.score + reportingScore) / 4);
  const strengths: string[] = [];
  const opportunities: string[] = [];

  if (planning.score >= 75) strengths.push("Started with clear daily focus.");
  if (execution.completedWorkCount > 0) strengths.push("Moved planned work forward.");
  if (workbook.quickUpdates.length > 0) strengths.push("Captured meaningful unplanned work.");
  if (quickUpdateIntelligence.reportWorthyCount > 0) strengths.push("Quick Updates created report-ready operating signal.");
  if (risk.blockerCount === 0) strengths.push("No hard blockers are open.");
  if (!strengths.length) strengths.push("The next improvement is to make the day visible early.");

  if (planning.score < 60) opportunities.push(planning.staffGuidance);
  if (execution.unfinishedWorkCount > 0) opportunities.push("Close, update, or carry over unfinished work.");
  if (risk.blockerCount > 0) opportunities.push("Ask for support on blocked work now.");
  if (workbook.quickUpdates.some((item) => item.followUpNeeded && !item.dueWindow.trim())) opportunities.push("Add due windows to follow-ups.");
  if (quickUpdateIntelligence.highImpactCount > 0) opportunities.push("Review high-impact Quick Updates before close.");
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
    supportNeededPrompt: risk.blockerCount > 0 || planning.supportNeededCount > 0 || quickUpdateIntelligence.supportSignalCount > 0 ? "Support is needed to keep at least one item moving." : "",
    staffSummary: opportunities[0],
    managerSummary: `${execution.completedWorkCount} of ${execution.plannedWorkCount} planned item(s) complete, ${risk.blockerCount} blocker(s), ${risk.tomorrowCarryoverCandidates.length} carryover candidate(s).`,
    coachingPrompts: [...opportunities.slice(0, 3), ...strengths.slice(0, 2)]
  };
}

export function buildReportIntelligenceEngine(workbook: WorkdayWorkbookRecord, operatingSignals: WorkdayWorkbookOperatingSignals = { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }) {
  const quickUpdateIntelligence = buildQuickUpdateIntelligenceEngine(workbook);
  const includedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.INCLUDED);
  const candidateSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CANDIDATE);
  const carriedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER);
  const excludedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.EXCLUDED);
  const completedFocusSeeds = workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.DONE);
  const unresolvedFocusSeeds = workbook.dailyFocusItems.filter((item) => item.status !== WorkdayDailyFocusStatus.DONE && (item.mustCloseToday || item.riskLevel !== WorkdayRiskLevel.NONE || item.supportNeeded.trim()));
  const meaningfulChecklistSeeds = workbook.checklistItems.filter((item) => item.update.trim() || item.done || item.status !== WorkdayChecklistStatus.GREEN || item.carryoverReady);
  const quickUpdateSeeds = workbook.quickUpdates;
  const supportSeeds = workbook.supportActions;
  const reportActivitySignals = (workbook.activitySignals ?? []).filter((signal) => signal.reportRelevant);
  const sourceBackedCount = includedSeeds.length + candidateSeeds.length + carriedSeeds.length + completedFocusSeeds.length + unresolvedFocusSeeds.length + meaningfulChecklistSeeds.length + quickUpdateIntelligence.reportWorthyCount + supportSeeds.length + reportActivitySignals.length + operatingSignals.reportExceptions;
  const reviewedCount = includedSeeds.length + carriedSeeds.length + excludedSeeds.length;
  const reviewScore = workbook.reportSeeds.length ? (reviewedCount / workbook.reportSeeds.length) * 50 : 20;
  const sourceScore = Math.min(35, sourceBackedCount * 5);
  const noisePenalty = excludedSeeds.length * 2;
  const score = clampScore(reviewScore + sourceScore + 15 - noisePenalty);
  const dailyDraftInputs = [
    ...includedSeeds.map((seed) => ({ id: seed.id, sourceType: seed.sourceType, title: seed.title, status: seed.status })),
    ...candidateSeeds.map((seed) => ({ id: seed.id, sourceType: seed.sourceType, title: seed.title, status: seed.status })),
    ...carriedSeeds.map((seed) => ({ id: seed.id, sourceType: seed.sourceType, title: seed.title, status: seed.status }))
  ];
  const prompts: string[] = [];

  if (!sourceBackedCount) prompts.push("Work the day before generating a report draft.");
  if (candidateSeeds.length) prompts.push("Review candidate Report Seeds before finalizing the draft.");
  if (carriedSeeds.length) prompts.push("Confirm carried-over seeds appear in tomorrow setup.");
  if (quickUpdateIntelligence.reportWorthyCount) prompts.push("Review report-worthy Quick Updates before finalizing.");
  if (unresolvedFocusSeeds.length) prompts.push("Include unresolved must-close focus items in the manager summary.");
  if (!prompts.length) prompts.push("Report inputs are reviewed and ready for a manager-ready draft.");

  return {
    score,
    status: statusLabel(score),
    sourceBackedCount,
    reviewedCount,
    includedSeedCount: includedSeeds.length,
    candidateSeedCount: candidateSeeds.length,
    carriedSeedCount: carriedSeeds.length,
    excludedSeedCount: excludedSeeds.length,
    completedFocusCount: completedFocusSeeds.length,
    unresolvedFocusCount: unresolvedFocusSeeds.length,
    meaningfulChecklistCount: meaningfulChecklistSeeds.length,
    quickUpdateCount: quickUpdateSeeds.length,
    quickUpdateReportWorthyCount: quickUpdateIntelligence.reportWorthyCount,
    supportSignalCount: supportSeeds.length,
    reportActivitySignalCount: reportActivitySignals.length,
    dailyDraftInputs,
    weeklyRollupInputs: dailyDraftInputs,
    monthlyRollupInputs: dailyDraftInputs,
    auditTrail: dailyDraftInputs.map((item) => ({ sourceId: item.id, sourceType: item.sourceType })),
    staffGuidance: prompts[0],
    managerSummary: `${sourceBackedCount} source-backed report signal(s), ${reviewedCount} reviewed seed(s), and ${candidateSeeds.length} candidate seed(s).`,
    prompts
  };
}

export function buildActivityIntelligenceEngine(workbook: WorkdayWorkbookRecord) {
  const signals = workbook.activitySignals ?? [];
  const reportRelevantSignals = signals.filter((signal) => signal.reportRelevant);
  const coachingRelevantSignals = signals.filter((signal) => signal.coachingRelevant);
  const completedWorkCount = countByPurpose(workbook, WorkdayActivityPurpose.COMPLETED_WORK);
  const customerCommunicationCount = countByPurpose(workbook, WorkdayActivityPurpose.CUSTOMER_COMMUNICATION);
  const blockerRiskCount = countByPurpose(workbook, WorkdayActivityPurpose.BLOCKER_RISK);
  const followUpCount = countByPurpose(workbook, WorkdayActivityPurpose.FOLLOW_UP);
  const supportRequestCount = countByPurpose(workbook, WorkdayActivityPurpose.SUPPORT_REQUEST);
  const taskConversionCount = countByPurpose(workbook, WorkdayActivityPurpose.TASK_CONVERSION);
  const promiseCommitmentCount = countByPurpose(workbook, WorkdayActivityPurpose.PROMISE_COMMITMENT);
  const score = clampScore(
    45 +
    completedWorkCount * 8 +
    customerCommunicationCount * 4 +
    followUpCount * 5 +
    reportRelevantSignals.length * 3 +
    taskConversionCount * 5 -
    blockerRiskCount * 8 +
    supportRequestCount * 2
  );
  const feedback = [
    ...(completedWorkCount ? [`${completedWorkCount} completed work signal(s) captured from the app.`] : []),
    ...(customerCommunicationCount ? [`${customerCommunicationCount} customer communication signal(s) captured.`] : []),
    ...(blockerRiskCount ? [`${blockerRiskCount} blocker or risk signal(s) need attention.`] : []),
    ...(followUpCount ? [`${followUpCount} follow-up signal(s) should stay visible through close.`] : []),
    ...(supportRequestCount ? [`${supportRequestCount} support request signal(s) captured.`] : [])
  ];

  return {
    score,
    status: statusLabel(score),
    signalCount: signals.length,
    reportRelevantCount: reportRelevantSignals.length,
    coachingRelevantCount: coachingRelevantSignals.length,
    completedWorkCount,
    customerCommunicationCount,
    blockerRiskCount,
    followUpCount,
    supportRequestCount,
    taskConversionCount,
    promiseCommitmentCount,
    feedback,
    recentSignals: signals.slice(0, 8).map((signal) => ({
      id: signal.id,
      actionType: signal.actionType,
      businessImpact: signal.businessImpact,
      occurredAt: signal.occurredAt.toISOString(),
      purpose: signal.purpose,
      reportRelevant: signal.reportRelevant,
      sourceModule: signal.sourceModule,
      sourceType: signal.sourceType,
      title: signal.businessImpact || signal.actionType
    })),
    staffGuidance: feedback[0] ?? "No app activity signals have been attached to this workbook day yet.",
    managerSummary: `${signals.length} activity signal(s), ${reportRelevantSignals.length} report-ready, ${blockerRiskCount} blocker/risk signal(s).`
  };
}

export function buildTimeAndAttentionEngine(workbook: WorkdayWorkbookRecord) {
  const sessions = workbook.attentionSessions ?? [];
  const activeSeconds = sessions.reduce((total, session) => total + session.activeSeconds, 0);
  const idleSeconds = sessions.reduce((total, session) => total + session.idleSeconds, 0);
  const areaTotals = sessions.reduce<Record<string, number>>((totals, session) => {
    totals[session.sourceArea] = (totals[session.sourceArea] ?? 0) + session.activeSeconds;
    return totals;
  }, {});
  const areas = Object.entries(areaTotals)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([area, seconds]) => ({ area, activeMinutes: minutesFromSeconds(seconds) }));
  const focusAlignmentScore = clampScore(areas.length ? 55 + Math.min(35, areas[0].activeMinutes * 2) - Math.min(25, minutesFromSeconds(idleSeconds)) : 40);
  const topArea = areas[0]?.area ?? "No active area yet";

  return {
    score: focusAlignmentScore,
    status: statusLabel(focusAlignmentScore),
    activeMinutes: minutesFromSeconds(activeSeconds),
    idleMinutes: minutesFromSeconds(idleSeconds),
    sessionCount: sessions.length,
    areas,
    staffGuidance: sessions.length
      ? `Most active workbook time is in ${topArea}. Keep time aligned with today's priority work.`
      : "Time-in-area tracking has not started for this workbook day.",
    managerSummary: `${minutesFromSeconds(activeSeconds)} active minute(s) captured across ${areas.length} area(s).`
  };
}

export function buildWorkflowGovernanceEngine(workbook: WorkdayWorkbookRecord, operatingSignals: WorkdayWorkbookOperatingSignals = { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, now = new Date()) {
  const planning = buildDailyPlanningEngine(workbook);
  const execution = buildExecutionTrackingEngine(workbook);
  const risk = buildRiskAndBlockerEngine(workbook, operatingSignals);
  const reporting = buildReportIntelligenceEngine(workbook, operatingSignals);
  const isClosed = workbook.status === "CLOSED";
  const startComplete = hasStartTheDayEvidence(workbook);
  const closeWindowOpen = isAfterCloseWindow(now, workbook);
  const preparedCarryoverSourceIds = activeCarryoverSourceIds(workbook);
  const unconfirmedCarryovers = workbook.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.OPEN).length;
  const needsDraft = reporting.sourceBackedCount > 0 && workbook.reportDrafts.length === 0;
  const focusWithoutDisposition = workbook.dailyFocusItems.filter((item) =>
    item.status !== WorkdayDailyFocusStatus.DONE &&
    item.status !== WorkdayDailyFocusStatus.CARRY_OVER &&
    !item.convertedTaskId &&
    !preparedCarryoverSourceIds.has(`daily-focus:${item.id}`) &&
    !item.progressUpdate.trim() &&
    !item.supportNeeded.trim() &&
    !item.riskNote.trim()
  ).length;
  const checklistWithoutDisposition = workbook.checklistItems.filter((item) =>
    !item.done &&
    !item.carryoverReady &&
    !item.convertedTaskId &&
    !preparedCarryoverSourceIds.has(item.id) &&
    !item.update.trim() &&
    item.status === WorkdayChecklistStatus.GREEN
  ).length;
  const followUpsWithoutDisposition = workbook.quickUpdates.filter((item) =>
    item.followUpNeeded &&
    !item.dueWindow.trim() &&
    !item.carryoverReady &&
    !item.convertedTaskId &&
    !preparedCarryoverSourceIds.has(item.id)
  ).length;
  const unresolvedAttentionCount =
    focusWithoutDisposition +
    checklistWithoutDisposition +
    followUpsWithoutDisposition +
    unconfirmedCarryovers;
  const allImportantItemsDispositioned = unresolvedAttentionCount === 0;
  const startReadyScore = startComplete && planning.focusItemCount ? 20 : 0;
  const quickUpdateReviewScore = followUpsWithoutDisposition === 0 ? 20 : Math.max(0, 20 - followUpsWithoutDisposition * 7);
  const workDispositionScore = execution.unfinishedWorkCount === 0
    ? 20
    : focusWithoutDisposition + checklistWithoutDisposition === 0
      ? Math.max(0, 12 - execution.unfinishedWorkCount * 2)
      : Math.max(0, 20 - (focusWithoutDisposition + checklistWithoutDisposition) * 5 - execution.unfinishedWorkCount * 2);
  const unresolvedOperatingAttentionCount = operatingSignals.approvalCount + operatingSignals.handoffCount + operatingSignals.reportExceptions;
  const attentionDispositionScore = unresolvedOperatingAttentionCount === 0 && (risk.blockerCount === 0 || allImportantItemsDispositioned)
    ? 20
    : Math.max(0, 20 - risk.blockerCount * 5 - unresolvedOperatingAttentionCount * 2);
  const reportScore = reporting.candidateSeedCount === 0 || workbook.reportDrafts.length > 0 ? 10 : Math.max(0, 10 - reporting.candidateSeedCount * 2);
  const staffReviewScore = workbook.supportActions.every((item) => item.status === WorkdaySupportActionStatus.RESOLVED) || allImportantItemsDispositioned ? 10 : 0;
  const endTheDayEligibilityScore = clampScore(startReadyScore + quickUpdateReviewScore + workDispositionScore + attentionDispositionScore + reportScore + staffReviewScore + (closeWindowOpen ? 8 : 0));
  const closeBlockers = [
    ...(startComplete ? [] : ["Start The Day needs to be completed before End The Day can be recommended."]),
    ...(planning.focusItemCount ? [] : ["Start The Day needs at least one focus outcome."]),
    ...(focusWithoutDisposition ? [`${focusWithoutDisposition} focus item(s) need done, carryover, task, support, or progress decision.`] : []),
    ...(checklistWithoutDisposition ? [`${checklistWithoutDisposition} checklist item(s) need done, carryover, task, support, or progress decision.`] : []),
    ...(followUpsWithoutDisposition ? [`${followUpsWithoutDisposition} follow-up(s) need a due window, task, or carryover decision.`] : []),
    ...(unconfirmedCarryovers ? [`${unconfirmedCarryovers} carryover item(s) not confirmed.`] : []),
    ...(needsDraft && endTheDayEligibilityScore >= 80 ? ["Daily report draft has not been generated."] : [])
  ];
  const workHasActuallyMoved = execution.completedWorkCount > 0 || execution.taskConversionCount > 0 || workbook.quickUpdates.length > 0;
  const readyToCloseActiveWork = execution.unfinishedWorkCount === 0 || closeWindowOpen && allImportantItemsDispositioned && workHasActuallyMoved;
  const endTheDayReady =
    !isClosed &&
    startComplete &&
    planning.focusItemCount > 0 &&
    allImportantItemsDispositioned &&
    unresolvedOperatingAttentionCount === 0 &&
    readyToCloseActiveWork &&
    endTheDayEligibilityScore >= 80;
  const currentStage = isClosed
    ? "GENERATE_REPORT" as const
    : !startComplete || planning.focusItemCount === 0
      ? "START_THE_DAY" as const
      : risk.blockerCount > 0 && !allImportantItemsDispositioned || unresolvedOperatingAttentionCount > 0
        ? "ASK_FOR_SUPPORT" as const
      : execution.unfinishedWorkCount > 0
        ? "WORK_THE_DAY" as const
        : closeWindowOpen && closeBlockers.length
          ? "PREPARE_TOMORROW" as const
          : endTheDayReady
            ? "CLOSE_THE_DAY" as const
          : risk.tomorrowCarryoverCandidates.length > 0
            ? "PREPARE_TOMORROW" as const
            : "WORK_THE_DAY" as const;
  const nextRecommendedAction =
    currentStage === "START_THE_DAY" ? planning.staffGuidance :
      currentStage === "ASK_FOR_SUPPORT" ? unresolvedOperatingAttentionCount > 0 ? "Review needs-attention work before ending the day." : risk.staffGuidance :
        currentStage === "WORK_THE_DAY" ? execution.staffGuidance :
          currentStage === "PREPARE_TOMORROW" ? "Prepare tomorrow from carryovers and unresolved focus." :
            currentStage === "GENERATE_REPORT" ? "Review or share the latest report draft." :
              closeBlockers[0] ?? "Close the day and generate the report.";

  return {
    currentStage,
    currentPhase: isClosed ? "CLOSED" as const : currentStage === "START_THE_DAY" ? "START" as const : currentStage === "CLOSE_THE_DAY" || currentStage === "PREPARE_TOMORROW" || currentStage === "GENERATE_REPORT" ? "END" as const : "WORK" as const,
    closeWindowOpen,
    endTheDayEligibilityScore,
    allImportantItemsDispositioned,
    unresolvedAttentionCount,
    dispositionCounts: {
      focusWithoutDisposition,
      checklistWithoutDisposition,
      followUpsWithoutDisposition,
      unconfirmedCarryovers
    },
    nextRecommendedAction,
    closeReadinessState: closeBlockers.length ? "BLOCKED" as const : "CLEAN" as const,
    closeBlockers,
    allowedActions: {
      canEdit: !isClosed,
      canAskForSupport: !isClosed,
      canPrepareTomorrow: !isClosed && risk.tomorrowCarryoverCandidates.length > 0,
      canGenerateReport: !isClosed && reporting.sourceBackedCount > 0,
      canCloseDay: !isClosed,
      canReopenDay: isClosed
    },
    managerReviewPrompts: closeBlockers.length ? closeBlockers : ["Workbook is ready for manager review."]
  };
}

export function buildOperatingRhythmEngine(
  workbook: WorkdayWorkbookRecord,
  governance = buildWorkflowGovernanceEngine(workbook),
  now = new Date()
) {
  const startComplete = hasStartTheDayEvidence(workbook);
  const latestDelay = latestRhythmSignal(workbook, "workbook.rhythm_start_delay_explained");
  const startReminderCount = rhythmSignalsSince(workbook, "workbook.rhythm_start_reminder_shown", latestDelay?.occurredAt ?? null).length;
  const explanationCount = rhythmSignalsSince(workbook, "workbook.rhythm_start_delay_explained", null).length;
  const reminderLimit = 3;
  const startGateState = startComplete
    ? "COMPLETE" as const
    : startReminderCount >= reminderLimit
      ? "LOCKED_UNTIL_REASON" as const
      : latestDelay
        ? "REASON_ACCEPTED" as const
        : "REMIND" as const;
  const endPrepNoticeOpen = isAfterEndPrepNotice(now, workbook);
  const endPrepActive = isAfterCloseWindow(now, workbook);
  const endPrepState = workbook.status === "CLOSED"
    ? "CLOSED" as const
    : !startComplete
      ? "START_REQUIRED" as const
    : endPrepActive
      ? "ACTIVE" as const
      : endPrepNoticeOpen
        ? "PREP_NOTICE" as const
        : "QUIET" as const;

  return {
    startTheDay: {
      complete: startComplete,
      state: startGateState,
      reminderCount: Math.min(startReminderCount, reminderLimit),
      reminderLimit,
      remainingReminders: Math.max(0, reminderLimit - startReminderCount),
      explanationCount,
      latestExplanation: latestDelay?.businessImpact ?? "",
      message: startComplete
        ? "Start The Day is complete."
        : startReminderCount >= reminderLimit
          ? "Start The Day has not been completed. Start the day or explain the delay to keep working."
          : `Start The Day has not been completed. ${Math.max(0, reminderLimit - startReminderCount)} reminder(s) left before a reason is required.`
    },
    endTheDay: {
      state: endPrepState,
      readinessScore: governance.endTheDayEligibilityScore,
      closeWindowOpen: governance.closeWindowOpen,
      message: endPrepState === "ACTIVE"
        ? `End The Day preparation is active. You are ${governance.endTheDayEligibilityScore}/100 ready.`
        : endPrepState === "PREP_NOTICE"
          ? `End The Day preparation starts at 4 PM. You are ${governance.endTheDayEligibilityScore}/100 ready.`
          : endPrepState === "START_REQUIRED"
            ? "Start The Day before End The Day reminders begin."
          : workbook.status === "CLOSED"
            ? "End The Day is complete."
            : "End The Day reminders are quiet until 3 PM.",
      blockers: governance.closeBlockers
    }
  };
}
