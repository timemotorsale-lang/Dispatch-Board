import {
  WorkdayChecklistStatus,
  WorkdayQuickUpdateCategory,
  WorkdayReportSeedSourceType,
  WorkdayReportSeedTone,
  WorkdayWorkbookScope
} from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createWorkdayWorkbookRepository,
  type WorkdayReportSeedInput,
  type WorkdayWorkbookRecord,
  type WorkdayWorkbookRepository
} from "@/server/repositories/workday-workbook-repository";
import { assertAuthenticatedUser } from "@/server/policies/access";
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
      tone: seed.tone,
      status: seed.status,
      createdAt: dateToIso(seed.createdAt),
      updatedAt: dateToIso(seed.updatedAt)
    }))
  };
}

export type WorkdayWorkbookReadModel = ReturnType<typeof toReadModel>;

export async function getCooWorkbook(
  actor: AuthenticatedUser | null,
  boardDate: string,
  operatingSignals: WorkdayWorkbookOperatingSignals,
  dependencies: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const date = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(date);
  const workbook = await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope: WorkdayWorkbookScope.COO,
    userId: user.id
  });
  await repository.upsertReportSeeds({
    seeds: buildWorkdayReportSeeds(workbook, operatingSignals),
    workbookId: workbook.id
  });
  return toReadModel(await repository.getOrCreateWorkbook({
    boardDayId: boardDay.id,
    scope: WorkdayWorkbookScope.COO,
    userId: user.id
  }));
}

export async function createCooWorkbookChecklistItem(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const text = normalizeRequiredText(payload.text, "Checklist item text is required.");
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope: WorkdayWorkbookScope.COO, userId: user.id });
  await repository.createChecklistItem({ text, workbookId: workbook.id });
  return { ok: true };
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

export async function createCooWorkbookQuickUpdate(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  const payload = normalizeObject(input);
  const repository = dependencies.repository ?? createWorkdayWorkbookRepository();
  const boardDay = await repository.getOrCreateBoardDay(normalizeBoardDate(boardDate));
  const workbook = await repository.getOrCreateWorkbook({ boardDayId: boardDay.id, scope: WorkdayWorkbookScope.COO, userId: user.id });
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
