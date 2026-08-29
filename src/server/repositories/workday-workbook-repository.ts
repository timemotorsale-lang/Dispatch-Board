import {
  Prisma,
  PrismaClient,
  type BoardDay,
  type WorkdayCarryoverStatus,
  type WorkdayChecklistStatus,
  type WorkdayDailyFocusStatus,
  type WorkdayPriority,
  type WorkdayQuickUpdateCategory,
  type WorkdayReportCadence,
  type WorkdayReportSeedSourceType,
  type WorkdayReportSeedStatus,
  type WorkdayReportSeedTone,
  type WorkdayRiskLevel,
  type WorkdaySupportActionStatus,
  type WorkdayWorkbookScope
} from "@prisma/client";

import { prisma } from "@/server/db/client";

type WorkdayWorkbookDatabase = Pick<PrismaClient, "activityEvent" | "boardDay" | "workdayCarryover" | "workdayChecklistItem" | "workdayDailyFocusItem" | "workdayQuickUpdate" | "workdayReportDraft" | "workdayReportSeed" | "workdaySupportAction" | "workdayWorkbook">;

const workbookInclude = {
  boardDay: true,
  checklistItems: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] },
  carryovers: { orderBy: [{ targetBoardDate: "asc" as const }, { createdAt: "desc" as const }] },
  dailyFocusItems: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }] },
  quickUpdates: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] },
  reportDrafts: { orderBy: [{ generatedAt: "desc" as const }, { id: "asc" as const }], take: 3 },
  reportSeeds: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] },
  supportActions: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }], take: 10 }
} satisfies Prisma.WorkdayWorkbookInclude;

export type WorkdayWorkbookRecord = Prisma.WorkdayWorkbookGetPayload<{ include: typeof workbookInclude }>;

const workbookSummaryInclude = {
  checklistItems: { select: { carryoverReady: true, done: true, status: true, updatedAt: true } },
  carryovers: { select: { status: true, targetBoardDate: true, updatedAt: true } },
  dailyFocusItems: { select: { mustCloseToday: true, priority: true, riskLevel: true, status: true, supportNeeded: true, updatedAt: true } },
  quickUpdates: { select: { carryoverReady: true, followUpNeeded: true, updatedAt: true } },
  reportDrafts: { orderBy: [{ generatedAt: "desc" as const }, { id: "asc" as const }], select: { generatedAt: true, status: true, version: true }, take: 1 },
  reportSeeds: { select: { id: true, status: true } },
  supportActions: { select: { status: true, updatedAt: true } },
  user: { select: { id: true, name: true } }
} satisfies Prisma.WorkdayWorkbookInclude;

export type WorkdayWorkbookSummaryRecord = Prisma.WorkdayWorkbookGetPayload<{ include: typeof workbookSummaryInclude }>;

export type WorkdayReportSeedInput = {
  detail: string;
  sourceHref?: string | null;
  sourceId: string;
  sourceType: WorkdayReportSeedSourceType;
  status?: WorkdayReportSeedStatus;
  title: string;
  tone: WorkdayReportSeedTone;
};

export type WorkdayCarryoverInput = {
  detail: string;
  sourceHref?: string | null;
  sourceId: string;
  sourceType: WorkdayReportSeedSourceType;
  targetBoardDate: string;
  title: string;
};

export type WorkdayWorkbookRepository = {
  closeWorkbook(input: { closeSnapshot: Prisma.InputJsonValue; closedByUserId: string; id: string }): Promise<void>;
  createChecklistItem(input: { priority?: WorkdayPriority; riskLevel?: WorkdayRiskLevel; riskNote?: string; text: string; workbookId: string }): Promise<void>;
  createDailyFocusItem(input: { mustCloseToday: boolean; outcome: string; priority: WorkdayPriority; riskLevel: WorkdayRiskLevel; riskNote: string; sortOrder: number; supportNeeded: string; workbookId: string }): Promise<void>;
  createReportDraft(input: { cadence: WorkdayReportCadence; generatedByUserId: string; periodEnd: string; periodStart: string; sections: Prisma.InputJsonValue; sourceSeedIds: Prisma.InputJsonValue; summary: string; title: string; workbookId: string }): Promise<void>;
  createQuickUpdate(input: { category: WorkdayQuickUpdateCategory; company: string; dueWindow: string; followUpNeeded: boolean; person: string; text: string; workbookId: string }): Promise<void>;
  createSupportAction(input: { actorUserId: string; note: string; requestedUpdate: boolean; status: WorkdaySupportActionStatus; targetUserId: string; workbookId: string }): Promise<void>;
  findChecklistItem(itemId: string): Promise<(Prisma.WorkdayChecklistItemGetPayload<{ include: { workbook: true } }>) | null>;
  findCarryover(carryoverId: string): Promise<(Prisma.WorkdayCarryoverGetPayload<{ include: { workbook: true } }>) | null>;
  findDailyFocusItem(itemId: string): Promise<(Prisma.WorkdayDailyFocusItemGetPayload<{ include: { workbook: true } }>) | null>;
  findQuickUpdate(updateId: string): Promise<(Prisma.WorkdayQuickUpdateGetPayload<{ include: { workbook: true } }>) | null>;
  findReportSeed(seedId: string): Promise<(Prisma.WorkdayReportSeedGetPayload<{ include: { workbook: true } }>) | null>;
  findSupportAction(actionId: string): Promise<(Prisma.WorkdaySupportActionGetPayload<{ include: { workbook: true } }>) | null>;
  getOrCreateBoardDay(boardDate: string): Promise<BoardDay>;
  getOrCreateWorkbook(input: { boardDayId: string; scope: WorkdayWorkbookScope; userId: string }): Promise<WorkdayWorkbookRecord>;
  getWorkbookById(id: string): Promise<WorkdayWorkbookRecord | null>;
  listWorkbooksForBoardDateRange(input: { endDate: string; scope: WorkdayWorkbookScope; startDate: string; userId: string }): Promise<WorkdayWorkbookRecord[]>;
  listWorkbooksForBoardDay(input: { boardDayId: string; scope: WorkdayWorkbookScope }): Promise<WorkdayWorkbookSummaryRecord[]>;
  recordActivity(input: { actorUserId: string; boardDayId: string; eventType: string; message: string; metadata: Prisma.InputJsonValue; taskId?: string | null }): Promise<void>;
  reopenWorkbook(input: { id: string }): Promise<void>;
  updateChecklistItem(input: { carryoverReady?: boolean; convertedTaskId?: string | null; done?: boolean; id: string; priority?: WorkdayPriority; riskLevel?: WorkdayRiskLevel; riskNote?: string; status?: WorkdayChecklistStatus; update?: string }): Promise<void>;
  updateCarryover(input: { convertedTaskId?: string | null; dismissedReason?: string; id: string; status: WorkdayCarryoverStatus }): Promise<void>;
  updateDailyFocusItem(input: { convertedTaskId?: string | null; id: string; mustCloseToday?: boolean; outcome?: string; priority?: WorkdayPriority; riskLevel?: WorkdayRiskLevel; riskNote?: string; sortOrder?: number; status?: WorkdayDailyFocusStatus; supportNeeded?: string }): Promise<void>;
  updateQuickUpdate(input: { carryoverReady?: boolean; category?: WorkdayQuickUpdateCategory; company?: string; convertedTaskId?: string | null; dueWindow?: string; followUpNeeded?: boolean; id: string; person?: string; text?: string }): Promise<void>;
  updateReportSeed(input: { detail?: string; id: string; reviewNote?: string; status?: WorkdayReportSeedStatus; title?: string }): Promise<void>;
  updateSupportAction(input: { id: string; note?: string; requestedUpdate?: boolean; status: WorkdaySupportActionStatus }): Promise<void>;
  upsertCarryovers(input: { carryovers: WorkdayCarryoverInput[]; workbookId: string }): Promise<void>;
  upsertReportSeeds(input: { seeds: WorkdayReportSeedInput[]; workbookId: string }): Promise<void>;
};

function boardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createWorkdayWorkbookRepository(database: WorkdayWorkbookDatabase = prisma): WorkdayWorkbookRepository {
  return {
    async closeWorkbook(input) {
      await database.workdayWorkbook.update({
        where: { id: input.id },
        data: {
          closeSnapshot: input.closeSnapshot,
          closedAt: new Date(),
          closedByUserId: input.closedByUserId,
          status: "CLOSED"
        }
      });
    },
    async createChecklistItem(input) {
      await database.workdayChecklistItem.create({
        data: {
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel } : {}),
          ...(input.riskNote !== undefined ? { riskNote: input.riskNote } : {}),
          text: input.text,
          workbookId: input.workbookId
        }
      });
    },
    async createDailyFocusItem(input) {
      await database.workdayDailyFocusItem.create({
        data: input
      });
    },
    async createReportDraft(input) {
      const latest = await database.workdayReportDraft.findFirst({
        orderBy: { version: "desc" },
        select: { version: true },
        where: { workbookId: input.workbookId }
      });
      await database.workdayReportDraft.create({
        data: {
          cadence: input.cadence,
          generatedByUserId: input.generatedByUserId,
          periodEnd: boardDateValue(input.periodEnd),
          periodStart: boardDateValue(input.periodStart),
          sections: input.sections,
          sourceSeedIds: input.sourceSeedIds,
          summary: input.summary,
          title: input.title,
          version: (latest?.version ?? 0) + 1,
          workbookId: input.workbookId
        }
      });
    },
    async createQuickUpdate(input) {
      await database.workdayQuickUpdate.create({
        data: input
      });
    },
    async createSupportAction(input) {
      await database.workdaySupportAction.create({
        data: input
      });
    },
    async findChecklistItem(itemId) {
      return database.workdayChecklistItem.findUnique({ where: { id: itemId }, include: { workbook: true } });
    },
    async findCarryover(carryoverId) {
      return database.workdayCarryover.findUnique({ where: { id: carryoverId }, include: { workbook: true } });
    },
    async findDailyFocusItem(itemId) {
      return database.workdayDailyFocusItem.findUnique({ where: { id: itemId }, include: { workbook: true } });
    },
    async findQuickUpdate(updateId) {
      return database.workdayQuickUpdate.findUnique({ where: { id: updateId }, include: { workbook: true } });
    },
    async findReportSeed(seedId) {
      return database.workdayReportSeed.findUnique({ where: { id: seedId }, include: { workbook: true } });
    },
    async findSupportAction(actionId) {
      return database.workdaySupportAction.findUnique({ where: { id: actionId }, include: { workbook: true } });
    },
    async getOrCreateBoardDay(boardDate) {
      return database.boardDay.upsert({
        where: { date: boardDateValue(boardDate) },
        update: {},
        create: { date: boardDateValue(boardDate) }
      });
    },
    async getOrCreateWorkbook(input) {
      const workbook = await database.workdayWorkbook.upsert({
        where: {
          boardDayId_userId_scope: {
            boardDayId: input.boardDayId,
            scope: input.scope,
            userId: input.userId
          }
        },
        update: {},
        create: input
      });

      return database.workdayWorkbook.findUniqueOrThrow({
        where: { id: workbook.id },
        include: workbookInclude
      });
    },
    async getWorkbookById(id) {
      return database.workdayWorkbook.findUnique({
        where: { id },
        include: workbookInclude
      });
    },
    async listWorkbooksForBoardDateRange(input) {
      return database.workdayWorkbook.findMany({
        include: workbookInclude,
        orderBy: [{ boardDay: { date: "asc" } }, { id: "asc" }],
        where: {
          scope: input.scope,
          userId: input.userId,
          boardDay: {
            date: {
              gte: boardDateValue(input.startDate),
              lte: boardDateValue(input.endDate)
            }
          }
        }
      });
    },
    async listWorkbooksForBoardDay(input) {
      return database.workdayWorkbook.findMany({
        include: workbookSummaryInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        where: {
          boardDayId: input.boardDayId,
          scope: input.scope
        }
      });
    },
    async recordActivity(input) {
      await database.activityEvent.create({
        data: {
          actorUserId: input.actorUserId,
          boardDayId: input.boardDayId,
          eventType: input.eventType,
          message: input.message,
          metadata: input.metadata,
          taskId: input.taskId ?? null
        }
      });
    },
    async reopenWorkbook(input) {
      await database.workdayWorkbook.update({
        where: { id: input.id },
        data: {
          closedAt: null,
          closedByUserId: null,
          status: "ACTIVE"
        }
      });
    },
    async updateChecklistItem(input) {
      await database.workdayChecklistItem.update({
        where: { id: input.id },
        data: {
          ...(input.carryoverReady !== undefined ? { carryoverReady: input.carryoverReady } : {}),
          ...(input.convertedTaskId !== undefined ? { convertedTaskId: input.convertedTaskId } : {}),
          ...(input.done !== undefined ? { done: input.done } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel } : {}),
          ...(input.riskNote !== undefined ? { riskNote: input.riskNote } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.update !== undefined ? { update: input.update } : {})
        }
      });
    },
    async updateCarryover(input) {
      const now = new Date();
      await database.workdayCarryover.update({
        where: { id: input.id },
        data: {
          ...(input.convertedTaskId !== undefined ? { convertedTaskId: input.convertedTaskId } : {}),
          ...(input.dismissedReason !== undefined ? { dismissedReason: input.dismissedReason } : {}),
          ...(input.status === "CONFIRMED" ? { confirmedAt: now } : {}),
          ...(input.status === "DISMISSED" ? { dismissedAt: now } : {}),
          ...(input.status === "CONVERTED" ? { convertedAt: now } : {}),
          status: input.status
        }
      });
    },
    async updateDailyFocusItem(input) {
      await database.workdayDailyFocusItem.update({
        where: { id: input.id },
        data: {
          ...(input.convertedTaskId !== undefined ? { convertedTaskId: input.convertedTaskId } : {}),
          ...(input.mustCloseToday !== undefined ? { mustCloseToday: input.mustCloseToday } : {}),
          ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel } : {}),
          ...(input.riskNote !== undefined ? { riskNote: input.riskNote } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.supportNeeded !== undefined ? { supportNeeded: input.supportNeeded } : {})
        }
      });
    },
    async updateQuickUpdate(input) {
      await database.workdayQuickUpdate.update({
        where: { id: input.id },
        data: {
          ...(input.carryoverReady !== undefined ? { carryoverReady: input.carryoverReady } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.company !== undefined ? { company: input.company } : {}),
          ...(input.convertedTaskId !== undefined ? { convertedTaskId: input.convertedTaskId } : {}),
          ...(input.dueWindow !== undefined ? { dueWindow: input.dueWindow } : {}),
          ...(input.followUpNeeded !== undefined ? { followUpNeeded: input.followUpNeeded } : {}),
          ...(input.person !== undefined ? { person: input.person } : {}),
          ...(input.text !== undefined ? { text: input.text } : {})
        }
      });
    },
    async updateReportSeed(input) {
      await database.workdayReportSeed.update({
        where: { id: input.id },
        data: {
          ...(input.detail !== undefined ? { detail: input.detail } : {}),
          ...(input.reviewNote !== undefined ? { reviewNote: input.reviewNote } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.title !== undefined ? { title: input.title } : {})
        }
      });
    },
    async updateSupportAction(input) {
      await database.workdaySupportAction.update({
        where: { id: input.id },
        data: {
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.requestedUpdate !== undefined ? { requestedUpdate: input.requestedUpdate } : {}),
          ...(input.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
          status: input.status
        }
      });
    },
    async upsertCarryovers(input) {
      await Promise.all(input.carryovers.map((carryover) => database.workdayCarryover.upsert({
        where: {
          workbookId_sourceType_sourceId_targetBoardDate: {
            sourceId: carryover.sourceId,
            sourceType: carryover.sourceType,
            targetBoardDate: boardDateValue(carryover.targetBoardDate),
            workbookId: input.workbookId
          }
        },
        update: {
          detail: carryover.detail,
          sourceHref: carryover.sourceHref ?? null,
          title: carryover.title
        },
        create: {
          detail: carryover.detail,
          sourceHref: carryover.sourceHref ?? null,
          sourceId: carryover.sourceId,
          sourceType: carryover.sourceType,
          targetBoardDate: boardDateValue(carryover.targetBoardDate),
          title: carryover.title,
          workbookId: input.workbookId
        }
      })));
    },
    async upsertReportSeeds(input) {
      await Promise.all(input.seeds.map((seed) => database.workdayReportSeed.upsert({
        where: {
          workbookId_sourceType_sourceId: {
            sourceId: seed.sourceId,
            sourceType: seed.sourceType,
            workbookId: input.workbookId
          }
        },
        update: {
          detail: seed.detail,
          sourceHref: seed.sourceHref ?? null,
          title: seed.title,
          tone: seed.tone
        },
        create: {
          detail: seed.detail,
          sourceHref: seed.sourceHref ?? null,
          sourceId: seed.sourceId,
          sourceType: seed.sourceType,
          status: seed.status ?? "CANDIDATE",
          title: seed.title,
          tone: seed.tone,
          workbookId: input.workbookId
        }
      })));
    }
  };
}
