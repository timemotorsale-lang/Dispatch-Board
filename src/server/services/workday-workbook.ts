import {
  WorkdayCarryoverStatus,
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayPriority,
  WorkdayQuickUpdateCategory,
  WorkdayReportCadence,
  WorkdayReportSeedSourceType,
  WorkdayReportSeedStatus,
  WorkdayReportSeedTone,
  WorkdayRiskLevel,
  WorkdaySupportActionStatus,
  WorkdayWorkbookScope
} from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createWorkdayWorkbookRepository,
  type WorkdayCarryoverInput,
  type WorkdayReportSeedInput,
  type WorkdayWorkbookRecord,
  type WorkdayWorkbookRepository,
  type WorkdayWorkbookSummaryRecord
} from "@/server/repositories/workday-workbook-repository";
import {
  buildCoachingAndAccountabilityEngine,
  buildDailyPlanningEngine,
  buildExecutionTrackingEngine,
  buildReportIntelligenceEngine,
  buildRiskAndBlockerEngine,
  buildWorkflowGovernanceEngine
} from "@/server/services/workday-workbook-engines";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { normalizeBoardDate } from "@/server/validation/board-date";

export type WorkdayWorkbookOperatingSignals = {
  approvalCount: number;
  handoffCount: number;
  reportExceptions: number;
};

type Dependencies = {
  repository?: WorkdayWorkbookRepository;
};

const checklistStatuses = new Set(Object.values(WorkdayChecklistStatus));
const dailyFocusStatuses = new Set(Object.values(WorkdayDailyFocusStatus));
const priorities = new Set(Object.values(WorkdayPriority));
const quickUpdateCategories = new Set(Object.values(WorkdayQuickUpdateCategory));
const reportSeedStatuses = new Set(Object.values(WorkdayReportSeedStatus));
const reportCadences = new Set(Object.values(WorkdayReportCadence));
const carryoverStatuses = new Set(Object.values(WorkdayCarryoverStatus));
const riskLevels = new Set(Object.values(WorkdayRiskLevel));
const supportActionStatuses = new Set(Object.values(WorkdaySupportActionStatus));
const emptyOperatingSignals: WorkdayWorkbookOperatingSignals = {
  approvalCount: 0,
  handoffCount: 0,
  reportExceptions: 0
};

function normalizeRequiredText(value: unknown, errorMessage: string, maxLength = 500) {
  if (typeof value !== "string") throw new Error(errorMessage);
  const normalized = value.trim();
  if (!normalized) throw new Error(errorMessage);
  return normalized.slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, fieldName: string, maxLength = 500) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be text.`);
  return value.trim().slice(0, maxLength);
}

function normalizeBoolean(value: unknown, fieldName: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${fieldName} must be true or false.`);
  return value;
}

function normalizeNumber(value: unknown, fieldName: string, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${fieldName} must be a number.`);
  return Math.trunc(value);
}

function normalizeChecklistStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !checklistStatuses.has(value as WorkdayChecklistStatus)) {
    throw new Error("Checklist status must be green, yellow, or red.");
  }
  return value as WorkdayChecklistStatus;
}

function normalizeDailyFocusStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !dailyFocusStatuses.has(value as WorkdayDailyFocusStatus)) {
    throw new Error("Daily Focus status is not supported.");
  }
  return value as WorkdayDailyFocusStatus;
}

function normalizePriority(value: unknown, fallback: WorkdayPriority = WorkdayPriority.MEDIUM): WorkdayPriority {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !priorities.has(value as WorkdayPriority)) {
    throw new Error("Priority is not supported.");
  }
  return value as WorkdayPriority;
}

function normalizeOptionalPriority(value: unknown) {
  if (value === undefined) return undefined;
  return normalizePriority(value);
}

function normalizeRiskLevel(value: unknown, fallback = WorkdayRiskLevel.NONE) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !riskLevels.has(value as WorkdayRiskLevel)) {
    throw new Error("Risk level is not supported.");
  }
  return value as WorkdayRiskLevel;
}

function normalizeOptionalRiskLevel(value: unknown) {
  if (value === undefined) return undefined;
  return normalizeRiskLevel(value);
}

function normalizeQuickUpdateCategory(value: unknown) {
  if (value === undefined) return WorkdayQuickUpdateCategory.OTHER;
  if (typeof value !== "string" || !quickUpdateCategories.has(value as WorkdayQuickUpdateCategory)) {
    throw new Error("Quick Update category is not supported.");
  }
  return value as WorkdayQuickUpdateCategory;
}

function normalizeReportSeedStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !reportSeedStatuses.has(value as WorkdayReportSeedStatus)) {
    throw new Error("Report Seed status is not supported.");
  }
  return value as WorkdayReportSeedStatus;
}

function normalizeReportCadence(value: unknown) {
  if (value === undefined || value === null || value === "") return WorkdayReportCadence.DAILY;
  if (typeof value !== "string" || !reportCadences.has(value as WorkdayReportCadence)) {
    throw new Error("Report cadence is not supported.");
  }
  return value as WorkdayReportCadence;
}

function normalizeCarryoverStatus(value: unknown) {
  if (typeof value !== "string" || !carryoverStatuses.has(value as WorkdayCarryoverStatus)) {
    throw new Error("Carryover status is not supported.");
  }
  return value as WorkdayCarryoverStatus;
}

function normalizeSupportActionStatus(value: unknown) {
  if (typeof value !== "string" || !supportActionStatuses.has(value as WorkdaySupportActionStatus)) {
    throw new Error("Staff support status is not supported.");
  }
  return value as WorkdaySupportActionStatus;
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Workbook update payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function assertWorkbookOwner(user: AuthenticatedUser, workbook: { scope: WorkdayWorkbookScope; userId: string }) {
  if (workbook.userId !== user.id) {
    throw new Error("You do not have permission to update this workbook item.");
  }
}

function assertWorkbookEditable(user: AuthenticatedUser, workbook: { scope: WorkdayWorkbookScope; status: string; userId: string }) {
  assertWorkbookOwner(user, workbook);
  if (workbook.status === "CLOSED") {
    throw new Error("This workbook day is closed. Reopen it before making changes.");
  }
}

function assertCanManageWorkbook(user: AuthenticatedUser, workbook: { scope: WorkdayWorkbookScope; userId: string }) {
  if (workbook.userId === user.id) return;
  if (isManager(user)) return;
  throw new Error("Manager access is required for this workbook action.");
}

function dateToIso(value: Date) {
  return value.toISOString();
}

function addDays(boardDate: string, days: number) {
  const value = new Date(`${boardDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function periodFor(boardDate: string, cadence: WorkdayReportCadence) {
  const date = new Date(`${boardDate}T00:00:00.000Z`);
  if (cadence === WorkdayReportCadence.DAILY) return { end: boardDate, start: boardDate };
  const daysBack = cadence === WorkdayReportCadence.WEEKLY ? 6 : 29;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - daysBack);
  return { end: boardDate, start: start.toISOString().slice(0, 10) };
}

async function recordWorkbookActivity(repository: WorkdayWorkbookRepository, user: AuthenticatedUser, workbook: { boardDayId: string; id: string; scope: WorkdayWorkbookScope }, eventType: string, message: string, metadata: Record<string, unknown> = {}) {
  await repository.recordActivity({
    actorUserId: user.id,
    boardDayId: workbook.boardDayId,
    eventType,
    message,
    metadata: {
      ...metadata,
      scope: workbook.scope,
      workbookId: workbook.id
    }
  });
}

function seedToneForChecklist(status: WorkdayChecklistStatus): WorkdayReportSeedTone {
  if (status === WorkdayChecklistStatus.RED) return WorkdayReportSeedTone.RED;
  if (status === WorkdayChecklistStatus.YELLOW) return WorkdayReportSeedTone.YELLOW;
  return WorkdayReportSeedTone.GREEN;
}

function seedToneForRisk(riskLevel: WorkdayRiskLevel): WorkdayReportSeedTone {
  if (riskLevel === WorkdayRiskLevel.BLOCKED) return WorkdayReportSeedTone.RED;
  if (riskLevel === WorkdayRiskLevel.WATCH) return WorkdayReportSeedTone.YELLOW;
  return WorkdayReportSeedTone.BLUE;
}

function checklistLabel(item: WorkdayWorkbookRecord["checklistItems"][number]) {
  if (item.done) return "Marked done today.";
  if (item.riskLevel === WorkdayRiskLevel.BLOCKED) return item.riskNote || "Blocked or needs manager attention.";
  if (item.riskLevel === WorkdayRiskLevel.WATCH) return item.riskNote || "Needs watch before close.";
  if (item.status === WorkdayChecklistStatus.RED) return "Blocked or needs manager attention.";
  if (item.status === WorkdayChecklistStatus.YELLOW) return "Needs update, waiting, or delayed.";
  return "On track.";
}

function quickUpdateCategoryLabel(category: WorkdayQuickUpdateCategory) {
  return category.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function reportSeedSourceLabel(seed: WorkdayWorkbookRecord["reportSeeds"][number]) {
  if (seed.sourceType === WorkdayReportSeedSourceType.CHECKLIST_ITEM) return "Daily Checklist";
  if (seed.sourceType === WorkdayReportSeedSourceType.QUICK_UPDATE) return "Quick Update";
  if (seed.sourceId.startsWith("daily-focus:")) return "Daily Focus";
  return "Operations";
}

export type WorkdayReportDraftSection = {
  items: Array<{
    detail: string;
    reviewNote: string;
    sourceHref: string | null;
    sourceId: string;
    sourceLabel: string;
    status: WorkdayReportSeedStatus;
    title: string;
    tone: WorkdayReportSeedTone;
  }>;
  title: string;
};

export type WorkdayReportDraftContent = {
  cadence: WorkdayReportCadence;
  periodEnd: string;
  periodStart: string;
  sections: WorkdayReportDraftSection[];
  sourceSeedIds: string[];
  summary: string;
  title: string;
};

function draftItem(seed: WorkdayWorkbookRecord["reportSeeds"][number]) {
  return {
    detail: seed.detail,
    reviewNote: seed.reviewNote,
    sourceHref: seed.sourceHref,
    sourceId: seed.sourceId,
    sourceLabel: reportSeedSourceLabel(seed),
    status: seed.status,
    title: seed.title,
    tone: seed.tone
  };
}

function draftSection(title: string, seeds: WorkdayWorkbookRecord["reportSeeds"]) {
  return {
    items: seeds.map(draftItem),
    title
  };
}

export function buildWorkdayDailyReportDraft(workbook: WorkdayWorkbookRecord, boardDate: string, reportLabel = "COO Daily Report"): WorkdayReportDraftContent {
  const usableSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.EXCLUDED);
  const includedSeeds = usableSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.INCLUDED);
  const candidateSeeds = usableSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CANDIDATE);
  const carryoverSeeds = usableSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER);
  const reportSeeds = [...includedSeeds, ...candidateSeeds, ...carryoverSeeds];
  const completedSeeds = reportSeeds.filter((seed) => seed.tone === WorkdayReportSeedTone.GREEN);
  const riskSeeds = reportSeeds.filter((seed) => seed.tone === WorkdayReportSeedTone.RED || seed.tone === WorkdayReportSeedTone.YELLOW);
  const quickUpdateSeeds = reportSeeds.filter((seed) => seed.sourceType === WorkdayReportSeedSourceType.QUICK_UPDATE);
  const managementSeeds = reportSeeds.filter((seed) => seed.sourceType === WorkdayReportSeedSourceType.OPERATING_EXCEPTION);
  const effectiveness = buildDailyEffectiveness(workbook);
  const sections = [
    draftSection("Completed / Closed Today", completedSeeds),
    draftSection("Blockers and Risks", riskSeeds),
    draftSection("Quick Updates / Unplanned Events", quickUpdateSeeds),
    draftSection("Approval or Management Review", managementSeeds),
    draftSection("Carryover for Tomorrow", carryoverSeeds),
    {
      title: "Daily Effectiveness / Coaching",
      items: [{
        detail: effectiveness.managerSummary,
        reviewNote: effectiveness.staffGuidance,
        sourceHref: "/vehicles/coo-workbook/effectiveness-pilot",
        sourceId: `effectiveness:${workbook.id}`,
        sourceLabel: "Daily Effectiveness",
        status: WorkdayReportSeedStatus.INCLUDED,
        title: `Effectiveness score ${effectiveness.overallScore}/100`,
        tone: effectiveness.overallScore >= 80 ? WorkdayReportSeedTone.GREEN : effectiveness.overallScore >= 60 ? WorkdayReportSeedTone.YELLOW : WorkdayReportSeedTone.RED
      }]
    }
  ].filter((section) => section.items.length > 0);
  const reviewedCount = usableSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const summary = reportSeeds.length
    ? `${reportSeeds.length} report item(s) prepared from ${reviewedCount} reviewed seed(s). ${carryoverSeeds.length} item(s) marked for carryover.`
    : "No reviewed or candidate report items are ready yet.";

  return {
    cadence: WorkdayReportCadence.DAILY,
    periodEnd: boardDate,
    periodStart: boardDate,
    sections,
    sourceSeedIds: reportSeeds.map((seed) => seed.id),
    summary,
    title: `${reportLabel} - ${boardDate}`
  };
}

export function buildWorkdayPeriodReportDraft(workbooks: WorkdayWorkbookRecord[], boardDate: string, cadence: WorkdayReportCadence, reportLabel = "COO Report"): WorkdayReportDraftContent {
  if (cadence === WorkdayReportCadence.DAILY) {
    return buildWorkdayDailyReportDraft(workbooks[0], boardDate, reportLabel);
  }
  const period = periodFor(boardDate, cadence);
  const seeds = workbooks.flatMap((workbook) => workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.EXCLUDED));
  const drafts = workbooks.flatMap((workbook) => workbook.reportDrafts.filter((draft) => draft.cadence === WorkdayReportCadence.DAILY));
  const carryovers = workbooks.flatMap((workbook) => workbook.carryovers.filter((item) => item.status !== WorkdayCarryoverStatus.DISMISSED));
  const supportActions = workbooks.flatMap((workbook) => workbook.supportActions);
  const effectivenessItems = workbooks.map((workbook) => buildDailyEffectiveness(workbook));
  const completed = seeds.filter((seed) => seed.tone === WorkdayReportSeedTone.GREEN);
  const risks = seeds.filter((seed) => seed.tone === WorkdayReportSeedTone.RED || seed.tone === WorkdayReportSeedTone.YELLOW);
  const management = seeds.filter((seed) => seed.sourceType === WorkdayReportSeedSourceType.OPERATING_EXCEPTION);
  const sections: WorkdayReportDraftSection[] = [
    draftSection("Completed / Closed Work", completed),
    draftSection("Repeated Blockers and Risks", risks),
    draftSection("Approval or Management Review", management),
    {
      title: "Carryover and Follow-up",
      items: carryovers.map((item) => ({
        detail: item.detail,
        reviewNote: item.dismissedReason,
        sourceHref: item.sourceHref,
        sourceId: item.sourceId,
        sourceLabel: "Carryover",
        status: WorkdayReportSeedStatus.CARRIED_OVER,
        title: item.title,
        tone: WorkdayReportSeedTone.YELLOW
      }))
    },
    {
      title: "Staff Support and Coaching",
      items: supportActions.map((item) => ({
        detail: item.note,
        reviewNote: item.requestedUpdate ? "Update requested." : "",
        sourceHref: null,
        sourceId: item.id,
        sourceLabel: "Staff Support",
        status: item.status === WorkdaySupportActionStatus.RESOLVED ? WorkdayReportSeedStatus.INCLUDED : WorkdayReportSeedStatus.CANDIDATE,
        title: item.status === WorkdaySupportActionStatus.RESOLVED ? "Support resolved" : "Support note",
        tone: item.status === WorkdaySupportActionStatus.RESOLVED ? WorkdayReportSeedTone.GREEN : WorkdayReportSeedTone.BLUE
      }))
    },
    {
      title: "Effectiveness Signals",
      items: effectivenessItems.map((item, index) => ({
        detail: item.managerSummary,
        reviewNote: item.supportNeeded,
        sourceHref: "/vehicles/coo-workbook/effectiveness-pilot",
        sourceId: `effectiveness:${workbooks[index].id}`,
        sourceLabel: "Daily Effectiveness",
        status: WorkdayReportSeedStatus.INCLUDED,
        title: `Daily effectiveness ${item.overallScore}/100`,
        tone: item.overallScore >= 80 ? WorkdayReportSeedTone.GREEN : item.overallScore >= 60 ? WorkdayReportSeedTone.YELLOW : WorkdayReportSeedTone.RED
      }))
    },
    {
      title: "Daily Draft Rollup",
      items: drafts.map((draft) => ({
        detail: draft.summary,
        reviewNote: "",
        sourceHref: null,
        sourceId: draft.id,
        sourceLabel: "Daily Draft",
        status: WorkdayReportSeedStatus.INCLUDED,
        title: draft.title,
        tone: WorkdayReportSeedTone.BLUE
      }))
    }
  ].filter((section) => section.items.length > 0);
  const cadenceLabel = cadence === WorkdayReportCadence.WEEKLY ? "Weekly" : "Monthly";
  const trainingSignals = supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED).length;
  const summary = `${cadenceLabel} report prepared from ${workbooks.length} workbook day(s), ${seeds.length} report seed(s), ${carryovers.length} carryover item(s), and ${trainingSignals} open support signal(s).`;

  return {
    cadence,
    periodEnd: period.end,
    periodStart: period.start,
    sections,
    sourceSeedIds: seeds.map((seed) => seed.id),
    summary,
    title: `${reportLabel} ${cadenceLabel} - ${period.start} to ${period.end}`
  };
}

export function buildWorkdayCarryovers(workbook: WorkdayWorkbookRecord, targetBoardDate: string): WorkdayCarryoverInput[] {
  return [
    ...workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER || item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE).map((item) => ({
      detail: [item.supportNeeded ? `Support needed: ${item.supportNeeded}.` : "", item.riskNote ? `Risk: ${item.riskNote}.` : ""].filter(Boolean).join(" ") || "Daily focus item needs tomorrow ownership.",
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : "/vehicles/coo-workbook/effectiveness-pilot",
      sourceId: `daily-focus:${item.id}`,
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      targetBoardDate,
      title: item.outcome
    })),
    ...workbook.checklistItems.filter((item) => item.carryoverReady).map((item) => ({
      detail: item.update || checklistLabel(item),
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : null,
      sourceId: item.id,
      sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
      targetBoardDate,
      title: item.text
    })),
    ...workbook.quickUpdates.filter((item) => item.carryoverReady || item.followUpNeeded).map((item) => ({
      detail: [item.text, item.person ? `Person: ${item.person}.` : "", item.company ? `Company: ${item.company}.` : "", item.dueWindow ? `Due: ${item.dueWindow}.` : ""].filter(Boolean).join(" "),
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : null,
      sourceId: item.id,
      sourceType: WorkdayReportSeedSourceType.QUICK_UPDATE,
      targetBoardDate,
      title: `${quickUpdateCategoryLabel(item.category)} follow-up`
    })),
    ...workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).map((seed) => ({
      detail: seed.detail,
      sourceHref: seed.sourceHref,
      sourceId: seed.id,
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      targetBoardDate,
      title: seed.title
    }))
  ];
}

export function buildWorkdayReportSeeds(
  workbook: WorkdayWorkbookRecord,
  operatingSignals: WorkdayWorkbookOperatingSignals
): WorkdayReportSeedInput[] {
  const seeds: WorkdayReportSeedInput[] = [];

  for (const item of workbook.dailyFocusItems) {
    if (item.status === WorkdayDailyFocusStatus.DONE && item.riskLevel === WorkdayRiskLevel.NONE && !item.supportNeeded.trim() && !item.riskNote.trim()) {
      continue;
    }
    seeds.push({
      detail: [
        item.status === WorkdayDailyFocusStatus.DONE ? "Completed today." : item.status === WorkdayDailyFocusStatus.CARRY_OVER ? "Needs carryover." : "Planned daily outcome.",
        item.mustCloseToday ? "Must close before end of day." : "",
        item.supportNeeded ? `Support needed: ${item.supportNeeded}.` : "",
        item.riskNote ? `Risk: ${item.riskNote}.` : ""
      ].filter(Boolean).join(" "),
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : "/vehicles/coo-workbook/effectiveness-pilot",
      sourceId: `daily-focus:${item.id}`,
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      title: item.outcome,
      tone: item.status === WorkdayDailyFocusStatus.DONE ? WorkdayReportSeedTone.GREEN : seedToneForRisk(item.riskLevel)
    });
  }

  for (const item of workbook.checklistItems) {
    const hasMeaningfulUpdate = item.update.trim().length > 0;
    if (!item.done && item.status === WorkdayChecklistStatus.GREEN && !hasMeaningfulUpdate && !item.carryoverReady) {
      continue;
    }
    seeds.push({
      detail: item.done ? item.update || checklistLabel(item) : item.update || checklistLabel(item),
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : null,
      sourceId: item.id,
      sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
      title: item.text,
      tone: seedToneForChecklist(item.status)
    });
  }

  for (const item of workbook.quickUpdates) {
    seeds.push({
      detail: [item.text, item.person ? `Person: ${item.person}.` : "", item.company ? `Company: ${item.company}.` : "", item.followUpNeeded ? `Follow-up: ${item.dueWindow || "needed"}.` : ""].filter(Boolean).join(" "),
      sourceHref: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : null,
      sourceId: item.id,
      sourceType: WorkdayReportSeedSourceType.QUICK_UPDATE,
      title: `${quickUpdateCategoryLabel(item.category)} update`,
      tone: item.followUpNeeded || item.carryoverReady ? WorkdayReportSeedTone.YELLOW : WorkdayReportSeedTone.BLUE
    });
  }

  if (operatingSignals.approvalCount > 0) {
    seeds.push({
      detail: `${operatingSignals.approvalCount} approval-sensitive item(s) need review before closeout.`,
      sourceHref: "/vehicles/advisor?queue=authorization",
      sourceId: "approval-review",
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      title: "Approval review",
      tone: WorkdayReportSeedTone.RED
    });
  }

  if (operatingSignals.reportExceptions > 0) {
    seeds.push({
      detail: `${operatingSignals.reportExceptions} unresolved risk or waiting item(s) may need daily report context.`,
      sourceHref: "/vehicles/coo-workbook",
      sourceId: "carryover-candidates",
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      title: "Carryover candidates",
      tone: WorkdayReportSeedTone.YELLOW
    });
  }

  if (operatingSignals.handoffCount > 0) {
    seeds.push({
      detail: `${operatingSignals.handoffCount} handoff item(s) should be reviewed for tomorrow ownership or customer impact.`,
      sourceHref: "/vehicles/advisor?queue=HANDOFF",
      sourceId: "handoff-control",
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      title: "Release and handoff control",
      tone: WorkdayReportSeedTone.BLUE
    });
  }

  return seeds;
}

function latestTimestamp(values: Date[]) {
  const latest = values.reduce<Date | null>((current, value) => !current || value > current ? value : current, null);
  return latest ? dateToIso(latest) : null;
}

function percentScore(done: number, total: number, fallback: number) {
  return total ? Math.round((done / total) * 100) : fallback;
}

function buildDailyEffectiveness(workbook: WorkdayWorkbookRecord) {
  const focusTotal = workbook.dailyFocusItems.length;
  const focusDone = workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.DONE).length;
  const mustCloseOpen = workbook.dailyFocusItems.filter((item) => item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE).length;
  const focusRisks = workbook.dailyFocusItems.filter((item) => item.riskLevel !== WorkdayRiskLevel.NONE).length;
  const checklistTotal = workbook.checklistItems.length;
  const checklistDone = workbook.checklistItems.filter((item) => item.done).length;
  const plannedTotal = focusTotal + checklistTotal;
  const completedTotal = focusDone + checklistDone;
  const checklistRisks = workbook.checklistItems.filter((item) => !item.done && (item.status === WorkdayChecklistStatus.RED || item.status === WorkdayChecklistStatus.YELLOW || item.riskLevel !== WorkdayRiskLevel.NONE)).length;
  const quickUpdateCount = workbook.quickUpdates.length;
  const followUps = workbook.quickUpdates.filter((item) => item.followUpNeeded).length;
  const reviewedSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const carryovers =
    workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER).length +
    workbook.checklistItems.filter((item) => item.carryoverReady).length +
    workbook.quickUpdates.filter((item) => item.carryoverReady).length +
    workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).length +
    workbook.carryovers.filter((item) => item.status !== WorkdayCarryoverStatus.DISMISSED).length;
  const openSupport = workbook.supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED).length;
  const supportNotes = workbook.dailyFocusItems.map((item) => item.supportNeeded.trim()).filter(Boolean);
  const riskCount = focusRisks + checklistRisks + followUps + openSupport;
  const focusScore = Math.max(0, Math.min(100, focusTotal ? 70 + Math.min(focusTotal, 3) * 10 - mustCloseOpen * 12 - focusRisks * 8 : 35));
  const executionScore = percentScore(completedTotal, plannedTotal, plannedTotal ? 0 : 45);
  const communicationScore = Math.max(0, Math.min(100, quickUpdateCount ? 55 + Math.min(quickUpdateCount, 3) * 10 + reviewedSeeds * 5 - followUps * 6 : reviewedSeeds ? 60 : 40));
  const riskScore = Math.max(0, 100 - riskCount * 14);
  const carryoverQualityScore = carryovers ? Math.max(35, 85 - carryovers * 6 + workbook.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.CONFIRMED).length * 8) : 100;
  const overallScore = Math.round((focusScore + executionScore + communicationScore + riskScore + carryoverQualityScore) / 5);
  const coachingPrompts: string[] = [];

  if (!focusTotal) coachingPrompts.push("Start the day by naming the top three outcomes.");
  if (mustCloseOpen) coachingPrompts.push("Finish or carry over must-close outcomes before the day ends.");
  if (followUps) coachingPrompts.push("Add an owner or due window for Quick Update follow-ups.");
  if (checklistRisks || focusRisks) coachingPrompts.push("Raise blocked or watch items early so support can arrive sooner.");
  if (carryovers) coachingPrompts.push("Confirm tomorrow ownership for carryover work.");
  if (supportNotes.length) coachingPrompts.push("Manager support is requested on at least one focus item.");
  if (!coachingPrompts.length) coachingPrompts.push("The day is clear. Keep updates current before close.");

  return {
    overallScore,
    focusScore,
    executionScore,
    communicationScore,
    riskScore,
    carryoverQualityScore,
    plannedWork: plannedTotal,
    completedWork: completedTotal,
    dailyFocusTotal: focusTotal,
    dailyFocusDone: focusDone,
    mustCloseOpen,
    followUps,
    riskFlags: riskCount,
    carryoverItems: carryovers,
    supportNeeded: supportNotes[0] ?? (openSupport ? "Open manager support action." : ""),
    staffGuidance: coachingPrompts[0],
    managerSummary: `${completedTotal} of ${plannedTotal} planned item(s) completed, ${riskCount} risk/support signal(s), and ${carryovers} carryover item(s) identified.`,
    coachingPrompts
  };
}

function buildCloseReadiness(workbook: WorkdayWorkbookRecord) {
  const effectiveness = buildDailyEffectiveness(workbook);
  const checklistTotal = workbook.checklistItems.length;
  const checklistDone = workbook.checklistItems.filter((item) => item.done).length;
  const checklistCompletion = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const checklistNeedsSupport = workbook.checklistItems.filter((item) => !item.done && (item.status === WorkdayChecklistStatus.YELLOW || item.status === WorkdayChecklistStatus.RED || item.riskLevel !== WorkdayRiskLevel.NONE)).length;
  const focusNeedsSupport = workbook.dailyFocusItems.filter((item) => item.status !== WorkdayDailyFocusStatus.DONE && (item.riskLevel !== WorkdayRiskLevel.NONE || item.supportNeeded.trim().length > 0)).length;
  const quickFollowUps = workbook.quickUpdates.filter((item) => item.followUpNeeded).length;
  const carryoverItems =
    workbook.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER || item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE).length +
    workbook.checklistItems.filter((item) => item.carryoverReady).length +
    workbook.quickUpdates.filter((item) => item.carryoverReady).length +
    workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).length +
    workbook.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.OPEN).length;
  const supportActions = workbook.supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED).length;
  const reviewedSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const includedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.INCLUDED).length;
  const excludedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.EXCLUDED).length;
  const latestDraft = workbook.reportDrafts[0] ?? null;
  const checklistScore = checklistTotal ? Math.round((checklistDone / checklistTotal) * 35) : 20;
  const supportPenaltyCount = checklistNeedsSupport + focusNeedsSupport + quickFollowUps + supportActions;
  const supportScore = supportPenaltyCount ? Math.max(0, 25 - supportPenaltyCount * 6) : 25;
  const reviewScore = workbook.reportSeeds.length ? Math.round((reviewedSeeds / workbook.reportSeeds.length) * 25) : 10;
  const draftScore = latestDraft ? 15 : 0;
  const focusScore = Math.round(effectiveness.focusScore * 0.15);
  const score = Math.min(100, checklistScore + supportScore + reviewScore + draftScore + focusScore);
  const tone = score >= 85 ? "READY" : checklistNeedsSupport > 0 || focusNeedsSupport > 0 || quickFollowUps > 0 ? "SUPPORT" : "REVIEW";
  const prompts: string[] = [];

  if (!workbook.dailyFocusItems.length) prompts.push("Set the top daily outcomes before close.");
  if (!checklistTotal) prompts.push("Add today's simple checklist before closing the day.");
  if (focusNeedsSupport) prompts.push("Review daily focus items that need support or have risk.");
  if (checklistNeedsSupport) prompts.push("Review yellow/red checklist items and decide what needs help.");
  if (quickFollowUps) prompts.push("Confirm Quick Update follow-ups have an owner or due window.");
  if (carryoverItems) prompts.push("Set tomorrow ownership for carryover items.");
  if (supportActions) prompts.push("Review open staff support actions before close.");
  if (workbook.reportSeeds.length && reviewedSeeds < workbook.reportSeeds.length) prompts.push("Review remaining report seeds before generating the final draft.");
  if (!latestDraft) prompts.push("Generate the Daily Report Draft when today has enough signal.");
  if (!prompts.length) prompts.push("Daily close is ready for a manager review.");

  return {
    score,
    tone,
    checklistCompletion,
    checklistDone,
    checklistTotal,
    checklistNeedsSupport,
    dailyFocusDone: effectiveness.dailyFocusDone,
    dailyFocusTotal: effectiveness.dailyFocusTotal,
    dailyFocusNeedsSupport: focusNeedsSupport,
    mustCloseOpen: effectiveness.mustCloseOpen,
    quickFollowUps,
    carryoverItems,
    supportActions,
    reportSeedCount: workbook.reportSeeds.length,
    reviewedSeedCount: reviewedSeeds,
    includedSeedCount: includedSeeds,
    excludedSeedCount: excludedSeeds,
    latestDraftVersion: latestDraft?.version ?? null,
    prompts
  };
}

function toStaffWorkbookSummary(record: WorkdayWorkbookSummaryRecord) {
  const redYellowCount = record.checklistItems.filter((item) => item.status === WorkdayChecklistStatus.RED || item.status === WorkdayChecklistStatus.YELLOW).length;
  const latestDraft = record.reportDrafts[0] ?? null;
  const checklistCount = record.checklistItems.length;
  const completedChecklistCount = record.checklistItems.filter((item) => item.done).length;
  const dailyFocusCount = record.dailyFocusItems.length;
  const completedDailyFocusCount = record.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.DONE).length;
  const dailyFocusRiskCount = record.dailyFocusItems.filter((item) => item.riskLevel !== WorkdayRiskLevel.NONE || item.supportNeeded.trim().length > 0).length;
  const followUpNeededCount = record.quickUpdates.filter((item) => item.followUpNeeded).length;
  const carryoverCount =
    record.dailyFocusItems.filter((item) => item.status === WorkdayDailyFocusStatus.CARRY_OVER || item.mustCloseToday && item.status !== WorkdayDailyFocusStatus.DONE).length +
    record.checklistItems.filter((item) => item.carryoverReady).length +
    record.quickUpdates.filter((item) => item.carryoverReady).length +
    record.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).length +
    record.carryovers.filter((item) => item.status === WorkdayCarryoverStatus.OPEN).length;
  const openSupportActions = record.supportActions.filter((item) => item.status !== WorkdaySupportActionStatus.RESOLVED).length;
  const reviewedSeedCount = record.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const checklistScore = checklistCount ? Math.round((completedChecklistCount / checklistCount) * 30) : 15;
  const focusScore = dailyFocusCount ? Math.round((completedDailyFocusCount / dailyFocusCount) * 20) : 10;
  const supportScore = redYellowCount + dailyFocusRiskCount + followUpNeededCount + openSupportActions ? Math.max(0, 25 - (redYellowCount + dailyFocusRiskCount + followUpNeededCount + openSupportActions) * 6) : 25;
  const reviewScore = record.reportSeeds.length ? Math.round((reviewedSeedCount / record.reportSeeds.length) * 20) : 10;
  const draftScore = latestDraft ? 15 : 0;
  const closeScore = Math.min(100, checklistScore + focusScore + supportScore + reviewScore + draftScore);
  const closeTone = closeScore >= 85 ? "READY" : redYellowCount > 0 || dailyFocusRiskCount > 0 || followUpNeededCount > 0 ? "SUPPORT" : "REVIEW";
  const closePrompts: string[] = [];

  if (!dailyFocusCount) closePrompts.push("Needs top daily outcomes.");
  if (dailyFocusRiskCount) closePrompts.push("Has daily focus items needing support.");
  if (!checklistCount) closePrompts.push("Needs a simple checklist for today.");
  if (redYellowCount) closePrompts.push("Has checklist items needing support.");
  if (followUpNeededCount) closePrompts.push("Has Quick Update follow-up to assign.");
  if (carryoverCount) closePrompts.push("Has carryover to plan for tomorrow.");
  if (openSupportActions) closePrompts.push("Has open support or coaching action.");
  if (record.reportSeeds.length && reviewedSeedCount < record.reportSeeds.length) closePrompts.push("Report seeds still need review.");
  if (!latestDraft) closePrompts.push("No daily draft yet.");
  if (!closePrompts.length) closePrompts.push("Ready for daily close review.");

  return {
    workbookId: record.id,
    staffUserId: record.user.id,
    staffName: record.user.name,
    checklistCount,
    completedChecklistCount,
    dailyFocusCount,
    completedDailyFocusCount,
    dailyFocusRiskCount,
    redYellowItemCount: redYellowCount,
    quickUpdateCount: record.quickUpdates.length,
    followUpNeededCount,
    carryoverCount,
    openSupportActions,
    reportSeedCount: record.reportSeeds.length,
    reviewedSeedCount,
    closeReadinessScore: closeScore,
    closeReadinessTone: closeTone,
    closeReadinessPrompts: closePrompts,
    effectivenessScore: closeScore,
    managerCoachingSummary: `${completedChecklistCount + completedDailyFocusCount} of ${checklistCount + dailyFocusCount} planned item(s) complete with ${redYellowCount + dailyFocusRiskCount + followUpNeededCount} support signal(s).`,
    latestUpdateAt: latestTimestamp([
      record.updatedAt,
      ...record.checklistItems.map((item) => item.updatedAt),
      ...record.dailyFocusItems.map((item) => item.updatedAt),
      ...record.quickUpdates.map((item) => item.updatedAt),
      ...record.carryovers.map((item) => item.updatedAt),
      ...record.supportActions.map((item) => item.updatedAt),
      ...record.reportDrafts.map((draft) => draft.generatedAt)
    ]),
    latestDraftStatus: latestDraft?.status ?? null,
    latestDraftVersion: latestDraft?.version ?? null
  };
}

function toReadModel(workbook: WorkdayWorkbookRecord, operatingSignals: WorkdayWorkbookOperatingSignals = emptyOperatingSignals) {
  const planning = buildDailyPlanningEngine(workbook);
  const execution = buildExecutionTrackingEngine(workbook);
  const risk = buildRiskAndBlockerEngine(workbook, operatingSignals);
  const coaching = buildCoachingAndAccountabilityEngine(workbook, operatingSignals);
  const reporting = buildReportIntelligenceEngine(workbook, operatingSignals);
  const governance = buildWorkflowGovernanceEngine(workbook, operatingSignals);
  return {
    id: workbook.id,
    boardDayId: workbook.boardDayId,
    userId: workbook.userId,
    scope: workbook.scope,
    status: workbook.status,
    closedAt: workbook.closedAt ? dateToIso(workbook.closedAt) : null,
    closedByUserId: workbook.closedByUserId,
    closeSnapshot: workbook.closeSnapshot,
    createdAt: dateToIso(workbook.createdAt),
    updatedAt: dateToIso(workbook.updatedAt),
    checklistItems: workbook.checklistItems.map((item) => ({
      id: item.id,
      text: item.text,
      status: item.status,
      priority: item.priority,
      riskLevel: item.riskLevel,
      riskNote: item.riskNote,
      update: item.update,
      done: item.done,
      carryoverReady: item.carryoverReady,
      convertedTaskId: item.convertedTaskId,
      createdAt: dateToIso(item.createdAt),
      updatedAt: dateToIso(item.updatedAt)
    })),
    dailyFocusItems: workbook.dailyFocusItems.map((item) => ({
      id: item.id,
      outcome: item.outcome,
      mustCloseToday: item.mustCloseToday,
      priority: item.priority,
      riskLevel: item.riskLevel,
      riskNote: item.riskNote,
      supportNeeded: item.supportNeeded,
      status: item.status,
      sortOrder: item.sortOrder,
      convertedTaskId: item.convertedTaskId,
      createdAt: dateToIso(item.createdAt),
      updatedAt: dateToIso(item.updatedAt)
    })),
    carryovers: workbook.carryovers.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceHref: item.sourceHref,
      title: item.title,
      detail: item.detail,
      status: item.status,
      targetBoardDate: item.targetBoardDate.toISOString().slice(0, 10),
      convertedTaskId: item.convertedTaskId,
      dismissedReason: item.dismissedReason,
      confirmedAt: item.confirmedAt ? dateToIso(item.confirmedAt) : null,
      dismissedAt: item.dismissedAt ? dateToIso(item.dismissedAt) : null,
      convertedAt: item.convertedAt ? dateToIso(item.convertedAt) : null,
      createdAt: dateToIso(item.createdAt),
      updatedAt: dateToIso(item.updatedAt)
    })),
    quickUpdates: workbook.quickUpdates.map((item) => ({
      id: item.id,
      text: item.text,
      category: item.category,
      person: item.person,
      company: item.company,
      followUpNeeded: item.followUpNeeded,
      dueWindow: item.dueWindow,
      carryoverReady: item.carryoverReady,
      convertedTaskId: item.convertedTaskId,
      createdAt: dateToIso(item.createdAt),
      updatedAt: dateToIso(item.updatedAt)
    })),
    reportSeeds: workbook.reportSeeds.map((seed) => ({
      id: seed.id,
      sourceType: seed.sourceType,
      sourceId: seed.sourceId,
      sourceHref: seed.sourceHref,
      title: seed.title,
      detail: seed.detail,
      reviewNote: seed.reviewNote,
      tone: seed.tone,
      status: seed.status,
      createdAt: dateToIso(seed.createdAt),
      updatedAt: dateToIso(seed.updatedAt)
    })),
    reportDrafts: workbook.reportDrafts.map((draft) => ({
      id: draft.id,
      version: draft.version,
      cadence: draft.cadence,
      periodStart: draft.periodStart.toISOString().slice(0, 10),
      periodEnd: draft.periodEnd.toISOString().slice(0, 10),
      status: draft.status,
      title: draft.title,
      summary: draft.summary,
      sections: draft.sections as WorkdayReportDraftSection[],
      sourceSeedIds: draft.sourceSeedIds as string[],
      generatedByUserId: draft.generatedByUserId,
      generatedAt: dateToIso(draft.generatedAt),
      createdAt: dateToIso(draft.createdAt),
      updatedAt: dateToIso(draft.updatedAt)
    })),
    supportActions: workbook.supportActions.map((item) => ({
      id: item.id,
      targetUserId: item.targetUserId,
      actorUserId: item.actorUserId,
      status: item.status,
      note: item.note,
      requestedUpdate: item.requestedUpdate,
      resolvedAt: item.resolvedAt ? dateToIso(item.resolvedAt) : null,
      createdAt: dateToIso(item.createdAt),
      updatedAt: dateToIso(item.updatedAt)
    })),
    planning,
    execution,
    risk,
    coaching,
    reporting,
    governance,
    closeReadiness: buildCloseReadiness(workbook),
    effectiveness: buildDailyEffectiveness(workbook)
  };
}

export type WorkdayWorkbookReadModel = ReturnType<typeof toReadModel>;
export type StaffWorkbookSummaryModel = ReturnType<typeof toStaffWorkbookSummary>;

async function getWorkbookByScope(
  actor: AuthenticatedUser | null,
  boardDate: string,
  scope: WorkdayWorkbookScope,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const date = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(date);
  const workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  });
  await repository.upsertReportSeeds({
    seeds: buildWorkdayReportSeeds(workbook, operatingSignals),
    workbookId: workbook.id
  });
  return toReadModel(await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  }), operatingSignals);
}

export async function getCooWorkbook(
  actor: AuthenticatedUser | null,
  boardDate: string,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  return getWorkbookByScope(actor, boardDate, WorkdayWorkbookScope.COO, operatingSignals, dependencies);
}

export async function getStaffWorkbook(actor: AuthenticatedUser | null, boardDate: string, dependencies: Dependencies = {}) {
  return getWorkbookByScope(actor, boardDate, WorkdayWorkbookScope.STAFF, emptyOperatingSignals, dependencies);
}

export async function getStaffWorkbookSummaries(actor: AuthenticatedUser | null, boardDate: string, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager access is required to view Staff Today.");
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const records = await repository.listWorkbooksForBoardDay({
    boardDayId: boardDay.id,
    scope: WorkdayWorkbookScope.STAFF
  });

  return records.map(toStaffWorkbookSummary);
}

async function createWorkbookChecklistItem(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const text = normalizeRequiredText(payload.text, "Checklist item text is required.");
  const priority = normalizePriority(payload.priority, WorkdayPriority.MEDIUM);
  const riskLevel = normalizeRiskLevel(payload.riskLevel, WorkdayRiskLevel.NONE);
  const riskNote = normalizeOptionalText(payload.riskNote, "riskNote", 500) ?? "";
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  assertWorkbookEditable(user, workbook);
  await repository.createChecklistItem({ priority, riskLevel, riskNote, text, workbookId: workbook.id });
  await recordWorkbookActivity(repository, user, workbook, "workbook.checklist_created", `${user.name} added a workbook checklist item.`, { priority, riskLevel, sourceType: "CHECKLIST_ITEM", text });
  return { ok: true };
}

export async function createCooWorkbookChecklistItem(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookChecklistItem(actor, boardDate, WorkdayWorkbookScope.COO, input, dependencies);
}

export async function createStaffWorkbookChecklistItem(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookChecklistItem(actor, boardDate, WorkdayWorkbookScope.STAFF, input, dependencies);
}

export async function updateCooWorkbookChecklistItem(actor: AuthenticatedUser | null, itemId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const item = await repository.findChecklistItem(itemId.trim());
  if (!item) throw new Error("Checklist item not found.");
  assertWorkbookEditable(user, item.workbook);
  await repository.updateChecklistItem({
    carryoverReady: normalizeBoolean(payload.carryoverReady, "carryoverReady"),
    convertedTaskId: normalizeOptionalText(payload.convertedTaskId, "convertedTaskId", 120),
    done: normalizeBoolean(payload.done, "done"),
    id: item.id,
    priority: normalizeOptionalPriority(payload.priority),
    riskLevel: normalizeOptionalRiskLevel(payload.riskLevel),
    riskNote: normalizeOptionalText(payload.riskNote, "riskNote", 500),
    status: normalizeChecklistStatus(payload.status),
    update: normalizeOptionalText(payload.update, "update", 1000)
  });
  await recordWorkbookActivity(repository, user, item.workbook, payload.done === true ? "workbook.checklist_completed" : "workbook.checklist_updated", `${user.name} updated a workbook checklist item.`, { checklistItemId: item.id });
  return { ok: true };
}

async function createWorkbookDailyFocusItem(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const outcome = normalizeRequiredText(payload.outcome, "Daily Focus outcome is required.", 500);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  assertWorkbookEditable(user, workbook);
  await repository.createDailyFocusItem({
    mustCloseToday: normalizeBoolean(payload.mustCloseToday, "mustCloseToday") ?? false,
    outcome,
    priority: normalizePriority(payload.priority, WorkdayPriority.HIGH),
    riskLevel: normalizeRiskLevel(payload.riskLevel, WorkdayRiskLevel.NONE),
    riskNote: normalizeOptionalText(payload.riskNote, "riskNote", 500) ?? "",
    sortOrder: normalizeNumber(payload.sortOrder, "sortOrder", workbook.dailyFocusItems.length),
    supportNeeded: normalizeOptionalText(payload.supportNeeded, "supportNeeded", 500) ?? "",
    workbookId: workbook.id
  });
  await recordWorkbookActivity(repository, user, workbook, "workbook.daily_focus_created", `${user.name} added a daily focus outcome.`, { outcome, scope });
  return { ok: true };
}

export async function createCooWorkbookDailyFocusItem(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookDailyFocusItem(actor, boardDate, WorkdayWorkbookScope.COO, input, dependencies);
}

export async function createStaffWorkbookDailyFocusItem(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookDailyFocusItem(actor, boardDate, WorkdayWorkbookScope.STAFF, input, dependencies);
}

export async function updateWorkbookDailyFocusItem(actor: AuthenticatedUser | null, itemId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const item = await repository.findDailyFocusItem(itemId.trim());
  if (!item) throw new Error("Daily Focus item not found.");
  assertWorkbookEditable(user, item.workbook);
  await repository.updateDailyFocusItem({
    convertedTaskId: normalizeOptionalText(payload.convertedTaskId, "convertedTaskId", 120),
    id: item.id,
    mustCloseToday: normalizeBoolean(payload.mustCloseToday, "mustCloseToday"),
    outcome: payload.outcome === undefined ? undefined : normalizeRequiredText(payload.outcome, "Daily Focus outcome is required.", 500),
    priority: normalizeOptionalPriority(payload.priority),
    riskLevel: normalizeOptionalRiskLevel(payload.riskLevel),
    riskNote: normalizeOptionalText(payload.riskNote, "riskNote", 500),
    sortOrder: payload.sortOrder === undefined ? undefined : normalizeNumber(payload.sortOrder, "sortOrder"),
    status: normalizeDailyFocusStatus(payload.status),
    supportNeeded: normalizeOptionalText(payload.supportNeeded, "supportNeeded", 500)
  });
  await recordWorkbookActivity(repository, user, item.workbook, "workbook.daily_focus_updated", `${user.name} updated a daily focus outcome.`, { dailyFocusItemId: item.id, status: payload.status ?? item.status });
  return { ok: true };
}

async function createWorkbookQuickUpdate(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  assertWorkbookEditable(user, workbook);
  await repository.createQuickUpdate({
    category: normalizeQuickUpdateCategory(payload.category),
    company: normalizeOptionalText(payload.company, "company", 180) ?? "",
    dueWindow: normalizeOptionalText(payload.dueWindow, "dueWindow", 180) ?? "",
    followUpNeeded: normalizeBoolean(payload.followUpNeeded, "followUpNeeded") ?? false,
    person: normalizeOptionalText(payload.person, "person", 180) ?? "",
    text: normalizeRequiredText(payload.text, "Quick Update text is required.", 1200),
    workbookId: workbook.id
  });
  await recordWorkbookActivity(repository, user, workbook, "workbook.quick_update_created", `${user.name} saved a Quick Update.`, { category: payload.category ?? "OTHER" });
  return { ok: true };
}

export async function createCooWorkbookQuickUpdate(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookQuickUpdate(actor, boardDate, WorkdayWorkbookScope.COO, input, dependencies);
}

export async function createStaffWorkbookQuickUpdate(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  return createWorkbookQuickUpdate(actor, boardDate, WorkdayWorkbookScope.STAFF, input, dependencies);
}

export async function updateCooWorkbookQuickUpdate(actor: AuthenticatedUser | null, updateId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const item = await repository.findQuickUpdate(updateId.trim());
  if (!item) throw new Error("Quick Update not found.");
  assertWorkbookEditable(user, item.workbook);
  await repository.updateQuickUpdate({
    carryoverReady: normalizeBoolean(payload.carryoverReady, "carryoverReady"),
    category: payload.category === undefined ? undefined : normalizeQuickUpdateCategory(payload.category),
    company: normalizeOptionalText(payload.company, "company", 180),
    convertedTaskId: normalizeOptionalText(payload.convertedTaskId, "convertedTaskId", 120),
    dueWindow: normalizeOptionalText(payload.dueWindow, "dueWindow", 180),
    followUpNeeded: normalizeBoolean(payload.followUpNeeded, "followUpNeeded"),
    id: item.id,
    person: normalizeOptionalText(payload.person, "person", 180),
    text: payload.text === undefined ? undefined : normalizeRequiredText(payload.text, "Quick Update text is required.", 1200)
  });
  await recordWorkbookActivity(repository, user, item.workbook, "workbook.quick_update_updated", `${user.name} updated a Quick Update.`, { quickUpdateId: item.id });
  return { ok: true };
}

export async function updateCooWorkbookReportSeed(actor: AuthenticatedUser | null, seedId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const seed = await repository.findReportSeed(seedId.trim());
  if (!seed) throw new Error("Report Seed not found.");
  assertWorkbookEditable(user, seed.workbook);
  await repository.updateReportSeed({
    detail: normalizeOptionalText(payload.detail, "detail", 1600),
    id: seed.id,
    reviewNote: normalizeOptionalText(payload.reviewNote, "reviewNote", 1000),
    status: normalizeReportSeedStatus(payload.status),
    title: normalizeOptionalText(payload.title, "title", 240)
  });
  await recordWorkbookActivity(repository, user, seed.workbook, "workbook.report_seed_reviewed", `${user.name} reviewed a Report Seed.`, { reportSeedId: seed.id, status: payload.status ?? seed.status });
  return { ok: true };
}

async function createWorkbookDailyReportDraft(
  actor: AuthenticatedUser | null,
  boardDate: string,
  scope: WorkdayWorkbookScope,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  cadenceInput: unknown = WorkdayReportCadence.DAILY,
  dependencies: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const date = normalizeBoardDate(boardDate);
  const cadence = normalizeReportCadence(cadenceInput);
  const period = periodFor(date, cadence);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(date);
  let workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  });
  assertWorkbookEditable(user, workbook);
  await repository.upsertReportSeeds({
    seeds: buildWorkdayReportSeeds(workbook, operatingSignals),
    workbookId: workbook.id
  });
  workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  });
  const draft = cadence === WorkdayReportCadence.DAILY
    ? buildWorkdayDailyReportDraft(workbook, date, scope === WorkdayWorkbookScope.STAFF ? "Staff Daily Report" : "COO Daily Report")
    : buildWorkdayPeriodReportDraft(await repository.listWorkbooksForBoardDateRange({ endDate: period.end, scope, startDate: period.start, userId: user.id }), date, cadence, scope === WorkdayWorkbookScope.STAFF ? "Staff" : "COO");
  await repository.createReportDraft({
    cadence: draft.cadence,
    generatedByUserId: user.id,
    periodEnd: draft.periodEnd,
    periodStart: draft.periodStart,
    sections: draft.sections,
    sourceSeedIds: draft.sourceSeedIds,
    summary: draft.summary,
    title: draft.title,
    workbookId: workbook.id
  });
  await recordWorkbookActivity(repository, user, workbook, "workbook.report_draft_generated", `${user.name} generated a ${draft.cadence.toLocaleLowerCase()} workbook report draft.`, { cadence: draft.cadence, periodEnd: draft.periodEnd, periodStart: draft.periodStart });
  return { ok: true };
}

export async function createCooWorkbookDailyReportDraft(
  actor: AuthenticatedUser | null,
  boardDate: string,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.COO, operatingSignals, WorkdayReportCadence.DAILY, dependencies);
}

export async function createCooWorkbookReportDraft(
  actor: AuthenticatedUser | null,
  boardDate: string,
  cadence: unknown,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.COO, operatingSignals, cadence, dependencies);
}

export async function createStaffWorkbookDailyReportDraft(actor: AuthenticatedUser | null, boardDate: string, dependencies: Dependencies = {}) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.STAFF, emptyOperatingSignals, WorkdayReportCadence.DAILY, dependencies);
}

export async function createStaffWorkbookReportDraft(actor: AuthenticatedUser | null, boardDate: string, cadence: unknown, dependencies: Dependencies = {}) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.STAFF, emptyOperatingSignals, cadence, dependencies);
}

async function getOwnedWorkbook(user: AuthenticatedUser, boardDate: string, scope: WorkdayWorkbookScope, dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  return { boardDay, repository, workbook };
}

export async function prepareWorkbookCarryovers(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope = WorkdayWorkbookScope.COO, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const date = normalizeBoardDate(boardDate);
  const { repository, workbook } = await getOwnedWorkbook(user, date, scope, dependencies);
  assertWorkbookEditable(user, workbook);
  const targetBoardDate = addDays(date, 1);
  const carryovers = buildWorkdayCarryovers(workbook, targetBoardDate);
  await repository.upsertCarryovers({ carryovers, workbookId: workbook.id });
  await recordWorkbookActivity(repository, user, workbook, "workbook.carryover_prepared", `${user.name} prepared ${carryovers.length} carryover item(s).`, { count: carryovers.length, targetBoardDate });
  return { count: carryovers.length, ok: true, targetBoardDate };
}

export async function updateWorkbookCarryover(actor: AuthenticatedUser | null, carryoverId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const status = normalizeCarryoverStatus(payload.status);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const carryover = await repository.findCarryover(carryoverId.trim());
  if (!carryover) throw new Error("Carryover item not found.");
  assertWorkbookEditable(user, carryover.workbook);
  await repository.updateCarryover({
    convertedTaskId: normalizeOptionalText(payload.convertedTaskId, "convertedTaskId", 120),
    dismissedReason: normalizeOptionalText(payload.dismissedReason, "dismissedReason", 500),
    id: carryover.id,
    status
  });
  await recordWorkbookActivity(repository, user, carryover.workbook, "workbook.carryover_updated", `${user.name} updated a carryover item.`, { carryoverId: carryover.id, status });
  return { ok: true };
}

export async function closeWorkbookDay(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope = WorkdayWorkbookScope.COO, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const date = normalizeBoardDate(boardDate);
  const { repository, workbook } = await getOwnedWorkbook(user, date, scope, dependencies);
  if (scope === WorkdayWorkbookScope.COO && !isManager(user)) throw new Error("Manager access is required to close the COO workbook.");
  assertWorkbookEditable(user, workbook);
  const targetBoardDate = addDays(date, 1);
  const carryovers = buildWorkdayCarryovers(workbook, targetBoardDate);
  await repository.upsertCarryovers({ carryovers, workbookId: workbook.id });
  const snapshot = {
    carryoverCount: carryovers.length,
    dailyFocusItems: workbook.dailyFocusItems.map((item) => ({ id: item.id, outcome: item.outcome, mustCloseToday: item.mustCloseToday, priority: item.priority, riskLevel: item.riskLevel, status: item.status, supportNeeded: item.supportNeeded })),
    checklistItems: workbook.checklistItems.map((item) => ({ id: item.id, text: item.text, status: item.status, done: item.done, update: item.update })),
    closeReadiness: buildCloseReadiness(workbook),
    effectiveness: buildDailyEffectiveness(workbook),
    quickUpdates: workbook.quickUpdates.map((item) => ({ id: item.id, text: item.text, followUpNeeded: item.followUpNeeded, dueWindow: item.dueWindow })),
    reportDraftId: workbook.reportDrafts[0]?.id ?? null,
    reportSeedIds: workbook.reportSeeds.map((seed) => seed.id)
  };
  await repository.closeWorkbook({ closeSnapshot: snapshot, closedByUserId: user.id, id: workbook.id });
  await recordWorkbookActivity(repository, user, workbook, "workbook.day_closed", `${user.name} closed the workbook day.`, { targetBoardDate });
  return { carryoverCount: carryovers.length, ok: true };
}

export async function reopenWorkbookDay(actor: AuthenticatedUser | null, workbookId: string, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const workbook = await repository.getWorkbookById(workbookId.trim());
  if (!workbook) throw new Error("Workbook not found.");
  assertCanManageWorkbook(user, workbook);
  if (workbook.scope === WorkdayWorkbookScope.COO && !isManager(user)) throw new Error("Manager access is required to reopen the COO workbook.");
  await repository.reopenWorkbook({ id: workbook.id });
  await recordWorkbookActivity(repository, user, workbook, "workbook.day_reopened", `${user.name} reopened the workbook day.`, {});
  return { ok: true };
}

export async function createStaffSupportAction(actor: AuthenticatedUser | null, workbookId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const note = normalizeRequiredText(payload.note, "Support note is required.", 1000);
  const requestedUpdate = normalizeBoolean(payload.requestedUpdate, "requestedUpdate") ?? false;
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const workbook = await repository.getWorkbookById(workbookId.trim());
  if (!workbook) throw new Error("Workbook not found.");
  if (workbook.userId !== user.id && !isManager(user)) throw new Error("Manager access is required for Staff Support.");
  await repository.createSupportAction({
    actorUserId: user.id,
    note,
    requestedUpdate,
    status: requestedUpdate ? WorkdaySupportActionStatus.UPDATE_REQUESTED : WorkdaySupportActionStatus.OPEN,
    targetUserId: workbook.userId,
    workbookId: workbook.id
  });
  await recordWorkbookActivity(repository, user, workbook, "workbook.staff_support_created", `${user.name} added a staff support note.`, { requestedUpdate, targetUserId: workbook.userId });
  return { ok: true };
}

export async function updateStaffSupportAction(actor: AuthenticatedUser | null, actionId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager access is required for Staff Support.");
  const payload = normalizeObject(input);
  const status = normalizeSupportActionStatus(payload.status);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const action = await repository.findSupportAction(actionId.trim());
  if (!action) throw new Error("Staff support action not found.");
  await repository.updateSupportAction({
    id: action.id,
    note: normalizeOptionalText(payload.note, "note", 1000),
    requestedUpdate: normalizeBoolean(payload.requestedUpdate, "requestedUpdate"),
    status
  });
  await recordWorkbookActivity(repository, user, action.workbook, "workbook.staff_support_updated", `${user.name} updated a staff support action.`, { actionId: action.id, status });
  return { ok: true };
}
