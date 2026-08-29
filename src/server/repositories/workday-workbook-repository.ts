import {
  Prisma,
  PrismaClient,
  type BoardDay,
  type WorkdayChecklistStatus,
  type WorkdayQuickUpdateCategory,
  type WorkdayReportSeedSourceType,
  type WorkdayReportSeedStatus,
  type WorkdayReportSeedTone,
  type WorkdayWorkbookScope
} from "@prisma/client";

import { prisma } from "@/server/db/client";

type WorkdayWorkbookDatabase = Pick<PrismaClient, "boardDay" | "workdayChecklistItem" | "workdayQuickUpdate" | "workdayReportDraft" | "workdayReportSeed" | "workdayWorkbook">;

const workbookInclude = {
  checklistItems: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] },
  quickUpdates: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] },
  reportDrafts: { orderBy: [{ generatedAt: "desc" as const }, { id: "asc" as const }], take: 3 },
  reportSeeds: { orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }] }
} satisfies Prisma.WorkdayWorkbookInclude;

export type WorkdayWorkbookRecord = Prisma.WorkdayWorkbookGetPayload<{ include: typeof workbookInclude }>;

const workbookSummaryInclude = {
  checklistItems: { select: { carryoverReady: true, done: true, status: true, updatedAt: true } },
  quickUpdates: { select: { carryoverReady: true, followUpNeeded: true, updatedAt: true } },
  reportDrafts: { orderBy: [{ generatedAt: "desc" as const }, { id: "asc" as const }], select: { generatedAt: true, status: true, version: true }, take: 1 },
  reportSeeds: { select: { id: true, status: true } },
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

export type WorkdayWorkbookRepository = {
  createChecklistItem(input: { text: string; workbookId: string }): Promise<void>;
  createReportDraft(input: { generatedByUserId: string; sections: Prisma.InputJsonValue; sourceSeedIds: Prisma.InputJsonValue; summary: string; title: string; workbookId: string }): Promise<void>;
  createQuickUpdate(input: { category: WorkdayQuickUpdateCategory; company: string; dueWindow: string; followUpNeeded: boolean; person: string; text: string; workbookId: string }): Promise<void>;
  findChecklistItem(itemId: string): Promise<(Prisma.WorkdayChecklistItemGetPayload<{ include: { workbook: true } }>) | null>;
  findQuickUpdate(updateId: string): Promise<(Prisma.WorkdayQuickUpdateGetPayload<{ include: { workbook: true } }>) | null>;
  findReportSeed(seedId: string): Promise<(Prisma.WorkdayReportSeedGetPayload<{ include: { workbook: true } }>) | null>;
  getOrCreateBoardDay(boardDate: string): Promise<BoardDay>;
  getOrCreateWorkbook(input: { boardDayId: string; scope: WorkdayWorkbookScope; userId: string }): Promise<WorkdayWorkbookRecord>;
  listWorkbooksForBoardDay(input: { boardDayId: string; scope: WorkdayWorkbookScope }): Promise<WorkdayWorkbookSummaryRecord[]>;
  updateChecklistItem(input: { carryoverReady?: boolean; convertedTaskId?: string | null; done?: boolean; id: string; status?: WorkdayChecklistStatus; update?: string }): Promise<void>;
  updateQuickUpdate(input: { carryoverReady?: boolean; category?: WorkdayQuickUpdateCategory; company?: string; convertedTaskId?: string | null; dueWindow?: string; followUpNeeded?: boolean; id: string; person?: string; text?: string }): Promise<void>;
  updateReportSeed(input: { detail?: string; id: string; reviewNote?: string; status?: WorkdayReportSeedStatus; title?: string }): Promise<void>;
  upsertReportSeeds(input: { seeds: WorkdayReportSeedInput[]; workbookId: string }): Promise<void>;
};

function boardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createWorkdayWorkbookRepository(database: WorkdayWorkbookDatabase = prisma): WorkdayWorkbookRepository {
  return {
    async createChecklistItem(input) {
      await database.workdayChecklistItem.create({
        data: {
          text: input.text,
          workbookId: input.workbookId
        }
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
          generatedByUserId: input.generatedByUserId,
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
    async findChecklistItem(itemId) {
      return database.workdayChecklistItem.findUnique({ where: { id: itemId }, include: { workbook: true } });
    },
    async findQuickUpdate(updateId) {
      return database.workdayQuickUpdate.findUnique({ where: { id: updateId }, include: { workbook: true } });
    },
    async findReportSeed(seedId) {
      return database.workdayReportSeed.findUnique({ where: { id: seedId }, include: { workbook: true } });
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
    async updateChecklistItem(input) {
      await database.workdayChecklistItem.update({
        where: { id: input.id },
        data: {
          ...(input.carryoverReady !== undefined ? { carryoverReady: input.carryoverReady } : {}),
          ...(input.convertedTaskId !== undefined ? { convertedTaskId: input.convertedTaskId } : {}),
          ...(input.done !== undefined ? { done: input.done } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.update !== undefined ? { update: input.update } : {})
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
