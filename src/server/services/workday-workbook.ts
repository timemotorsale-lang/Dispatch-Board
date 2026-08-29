import {
  WorkdayChecklistStatus,
  WorkdayQuickUpdateCategory,
  WorkdayReportSeedSourceType,
  WorkdayReportSeedStatus,
  WorkdayReportSeedTone,
  WorkdayWorkbookScope
} from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createWorkdayWorkbookRepository,
  type WorkdayReportSeedInput,
  type WorkdayWorkbookRecord,
  type WorkdayWorkbookRepository,
  type WorkdayWorkbookSummaryRecord
} from "@/server/repositories/workday-workbook-repository";
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
const quickUpdateCategories = new Set(Object.values(WorkdayQuickUpdateCategory));
const reportSeedStatuses = new Set(Object.values(WorkdayReportSeedStatus));
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

function normalizeChecklistStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !checklistStatuses.has(value as WorkdayChecklistStatus)) {
    throw new Error("Checklist status must be green, yellow, or red.");
  }
  return value as WorkdayChecklistStatus;
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

function dateToIso(value: Date) {
  return value.toISOString();
}

function seedToneForChecklist(status: WorkdayChecklistStatus): WorkdayReportSeedTone {
  if (status === WorkdayChecklistStatus.RED) return WorkdayReportSeedTone.RED;
  if (status === WorkdayChecklistStatus.YELLOW) return WorkdayReportSeedTone.YELLOW;
  return WorkdayReportSeedTone.GREEN;
}

function checklistLabel(item: WorkdayWorkbookRecord["checklistItems"][number]) {
  if (item.done) return "Marked done today.";
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
  const sections = [
    draftSection("Completed / Closed Today", completedSeeds),
    draftSection("Blockers and Risks", riskSeeds),
    draftSection("Quick Updates / Unplanned Events", quickUpdateSeeds),
    draftSection("Approval or Management Review", managementSeeds),
    draftSection("Carryover for Tomorrow", carryoverSeeds)
  ].filter((section) => section.items.length > 0);
  const reviewedCount = usableSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const summary = reportSeeds.length
    ? `${reportSeeds.length} report item(s) prepared from ${reviewedCount} reviewed seed(s). ${carryoverSeeds.length} item(s) marked for carryover.`
    : "No reviewed or candidate report items are ready yet.";

  return {
    sections,
    sourceSeedIds: reportSeeds.map((seed) => seed.id),
    summary,
    title: `${reportLabel} - ${boardDate}`
  };
}

export function buildWorkdayReportSeeds(
  workbook: WorkdayWorkbookRecord,
  operatingSignals: WorkdayWorkbookOperatingSignals
): WorkdayReportSeedInput[] {
  const seeds: WorkdayReportSeedInput[] = [];

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

function buildCloseReadiness(workbook: WorkdayWorkbookRecord) {
  const checklistTotal = workbook.checklistItems.length;
  const checklistDone = workbook.checklistItems.filter((item) => item.done).length;
  const checklistCompletion = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const checklistNeedsSupport = workbook.checklistItems.filter((item) => !item.done && (item.status === WorkdayChecklistStatus.YELLOW || item.status === WorkdayChecklistStatus.RED)).length;
  const quickFollowUps = workbook.quickUpdates.filter((item) => item.followUpNeeded).length;
  const carryoverItems =
    workbook.checklistItems.filter((item) => item.carryoverReady).length +
    workbook.quickUpdates.filter((item) => item.carryoverReady).length +
    workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).length;
  const reviewedSeeds = workbook.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const includedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.INCLUDED).length;
  const excludedSeeds = workbook.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.EXCLUDED).length;
  const latestDraft = workbook.reportDrafts[0] ?? null;
  const checklistScore = checklistTotal ? Math.round((checklistDone / checklistTotal) * 35) : 20;
  const supportPenaltyCount = checklistNeedsSupport + quickFollowUps;
  const supportScore = supportPenaltyCount ? Math.max(0, 25 - supportPenaltyCount * 6) : 25;
  const reviewScore = workbook.reportSeeds.length ? Math.round((reviewedSeeds / workbook.reportSeeds.length) * 25) : 10;
  const draftScore = latestDraft ? 15 : 0;
  const score = Math.min(100, checklistScore + supportScore + reviewScore + draftScore);
  const tone = score >= 85 ? "READY" : checklistNeedsSupport > 0 || quickFollowUps > 0 ? "SUPPORT" : "REVIEW";
  const prompts: string[] = [];

  if (!checklistTotal) prompts.push("Add today's simple checklist before closing the day.");
  if (checklistNeedsSupport) prompts.push("Review yellow/red checklist items and decide what needs help.");
  if (quickFollowUps) prompts.push("Confirm Quick Update follow-ups have an owner or due window.");
  if (carryoverItems) prompts.push("Set tomorrow ownership for carryover items.");
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
    quickFollowUps,
    carryoverItems,
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
  const followUpNeededCount = record.quickUpdates.filter((item) => item.followUpNeeded).length;
  const carryoverCount =
    record.checklistItems.filter((item) => item.carryoverReady).length +
    record.quickUpdates.filter((item) => item.carryoverReady).length +
    record.reportSeeds.filter((seed) => seed.status === WorkdayReportSeedStatus.CARRIED_OVER).length;
  const reviewedSeedCount = record.reportSeeds.filter((seed) => seed.status !== WorkdayReportSeedStatus.CANDIDATE).length;
  const checklistScore = checklistCount ? Math.round((completedChecklistCount / checklistCount) * 40) : 20;
  const supportScore = redYellowCount + followUpNeededCount ? Math.max(0, 25 - (redYellowCount + followUpNeededCount) * 6) : 25;
  const reviewScore = record.reportSeeds.length ? Math.round((reviewedSeedCount / record.reportSeeds.length) * 20) : 10;
  const draftScore = latestDraft ? 15 : 0;
  const closeScore = Math.min(100, checklistScore + supportScore + reviewScore + draftScore);
  const closeTone = closeScore >= 85 ? "READY" : redYellowCount > 0 || followUpNeededCount > 0 ? "SUPPORT" : "REVIEW";
  const closePrompts: string[] = [];

  if (!checklistCount) closePrompts.push("Needs a simple checklist for today.");
  if (redYellowCount) closePrompts.push("Has checklist items needing support.");
  if (followUpNeededCount) closePrompts.push("Has Quick Update follow-up to assign.");
  if (carryoverCount) closePrompts.push("Has carryover to plan for tomorrow.");
  if (record.reportSeeds.length && reviewedSeedCount < record.reportSeeds.length) closePrompts.push("Report seeds still need review.");
  if (!latestDraft) closePrompts.push("No daily draft yet.");
  if (!closePrompts.length) closePrompts.push("Ready for daily close review.");

  return {
    workbookId: record.id,
    staffUserId: record.user.id,
    staffName: record.user.name,
    checklistCount,
    completedChecklistCount,
    redYellowItemCount: redYellowCount,
    quickUpdateCount: record.quickUpdates.length,
    followUpNeededCount,
    carryoverCount,
    reportSeedCount: record.reportSeeds.length,
    reviewedSeedCount,
    closeReadinessScore: closeScore,
    closeReadinessTone: closeTone,
    closeReadinessPrompts: closePrompts,
    latestUpdateAt: latestTimestamp([
      record.updatedAt,
      ...record.checklistItems.map((item) => item.updatedAt),
      ...record.quickUpdates.map((item) => item.updatedAt),
      ...record.reportDrafts.map((draft) => draft.generatedAt)
    ]),
    latestDraftStatus: latestDraft?.status ?? null,
    latestDraftVersion: latestDraft?.version ?? null
  };
}

function toReadModel(workbook: WorkdayWorkbookRecord) {
  return {
    id: workbook.id,
    boardDayId: workbook.boardDayId,
    userId: workbook.userId,
    scope: workbook.scope,
    status: workbook.status,
    createdAt: dateToIso(workbook.createdAt),
    updatedAt: dateToIso(workbook.updatedAt),
    checklistItems: workbook.checklistItems.map((item) => ({
      id: item.id,
      text: item.text,
      status: item.status,
      update: item.update,
      done: item.done,
      carryoverReady: item.carryoverReady,
      convertedTaskId: item.convertedTaskId,
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
    closeReadiness: buildCloseReadiness(workbook)
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
  }));
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
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  await repository.createChecklistItem({ text, workbookId: workbook.id });
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
  assertWorkbookOwner(user, item.workbook);
  await repository.updateChecklistItem({
    carryoverReady: normalizeBoolean(payload.carryoverReady, "carryoverReady"),
    convertedTaskId: normalizeOptionalText(payload.convertedTaskId, "convertedTaskId", 120),
    done: normalizeBoolean(payload.done, "done"),
    id: item.id,
    status: normalizeChecklistStatus(payload.status),
    update: normalizeOptionalText(payload.update, "update", 1000)
  });
  return { ok: true };
}

async function createWorkbookQuickUpdate(actor: AuthenticatedUser | null, boardDate: string, scope: WorkdayWorkbookScope, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope, userId: user.id });
  await repository.createQuickUpdate({
    category: normalizeQuickUpdateCategory(payload.category),
    company: normalizeOptionalText(payload.company, "company", 180) ?? "",
    dueWindow: normalizeOptionalText(payload.dueWindow, "dueWindow", 180) ?? "",
    followUpNeeded: normalizeBoolean(payload.followUpNeeded, "followUpNeeded") ?? false,
    person: normalizeOptionalText(payload.person, "person", 180) ?? "",
    text: normalizeRequiredText(payload.text, "Quick Update text is required.", 1200),
    workbookId: workbook.id
  });
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
  assertWorkbookOwner(user, item.workbook);
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
  return { ok: true };
}

export async function updateCooWorkbookReportSeed(actor: AuthenticatedUser | null, seedId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const seed = await repository.findReportSeed(seedId.trim());
  if (!seed) throw new Error("Report Seed not found.");
  assertWorkbookOwner(user, seed.workbook);
  await repository.updateReportSeed({
    detail: normalizeOptionalText(payload.detail, "detail", 1600),
    id: seed.id,
    reviewNote: normalizeOptionalText(payload.reviewNote, "reviewNote", 1000),
    status: normalizeReportSeedStatus(payload.status),
    title: normalizeOptionalText(payload.title, "title", 240)
  });
  return { ok: true };
}

async function createWorkbookDailyReportDraft(
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
  let workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  });
  await repository.upsertReportSeeds({
    seeds: buildWorkdayReportSeeds(workbook, operatingSignals),
    workbookId: workbook.id
  });
  workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope,
    userId: user.id
  });
  const draft = buildWorkdayDailyReportDraft(workbook, date, scope === WorkdayWorkbookScope.STAFF ? "Staff Daily Report" : "COO Daily Report");
  await repository.createReportDraft({
    generatedByUserId: user.id,
    sections: draft.sections,
    sourceSeedIds: draft.sourceSeedIds,
    summary: draft.summary,
    title: draft.title,
    workbookId: workbook.id
  });
  return { ok: true };
}

export async function createCooWorkbookDailyReportDraft(
  actor: AuthenticatedUser | null,
  boardDate: string,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.COO, operatingSignals, dependencies);
}

export async function createStaffWorkbookDailyReportDraft(actor: AuthenticatedUser | null, boardDate: string, dependencies: Dependencies = {}) {
  return createWorkbookDailyReportDraft(actor, boardDate, WorkdayWorkbookScope.STAFF, emptyOperatingSignals, dependencies);
}
