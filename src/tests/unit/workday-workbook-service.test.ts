import {
  WorkdayChecklistStatus,
  WorkdayQuickUpdateCategory,
  WorkdayReportSeedTone,
  WorkdayWorkbookScope,
  type BoardDay
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { WorkdayWorkbookRepository, WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import {
  buildWorkdayReportSeeds,
  createCooWorkbookChecklistItem,
  updateCooWorkbookChecklistItem
} from "@/server/services/workday-workbook";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

const boardDay: BoardDay = {
  id: "board-day-1",
  date: new Date("2026-08-29T00:00:00.000Z"),
  generationStatus: "GENERATED",
  generatedAt: new Date("2026-08-29T14:00:00.000Z"),
  generatedByUserId: null,
  createdAt: new Date("2026-08-29T14:00:00.000Z"),
  updatedAt: new Date("2026-08-29T14:00:00.000Z")
};

function workbook(userId = "user-jordan.sales@local.test"): WorkdayWorkbookRecord {
  const now = new Date("2026-08-29T14:00:00.000Z");
  return {
    id: "workbook-1",
    boardDayId: boardDay.id,
    userId,
    scope: WorkdayWorkbookScope.COO,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    checklistItems: [
      {
        id: "checklist-1",
        workbookId: "workbook-1",
        text: "Call vendor about roof estimate",
        status: WorkdayChecklistStatus.YELLOW,
        update: "Waiting on AJ to confirm timing.",
        done: false,
        carryoverReady: true,
        convertedTaskId: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "checklist-2",
        workbookId: "workbook-1",
        text: "Clean desk",
        status: WorkdayChecklistStatus.GREEN,
        update: "",
        done: false,
        carryoverReady: false,
        convertedTaskId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    quickUpdates: [
      {
        id: "quick-1",
        workbookId: "workbook-1",
        text: "Moises from T-Mobile visited to discuss products.",
        category: WorkdayQuickUpdateCategory.SALES_OPPORTUNITY,
        person: "Moises",
        company: "T-Mobile",
        followUpNeeded: true,
        dueWindow: "Next week",
        carryoverReady: false,
        convertedTaskId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    reportSeeds: []
  };
}

function repositoryHarness(ownerUserId = "user-jordan.sales@local.test") {
  const createdChecklistItems: Array<{ text: string; workbookId: string }> = [];
  const checklistUpdates: unknown[] = [];
  const currentWorkbook = workbook(ownerUserId);
  const repository: WorkdayWorkbookRepository = {
    async createChecklistItem(input) {
      createdChecklistItems.push(input);
    },
    async createQuickUpdate() {
      throw new Error("not needed");
    },
    async findChecklistItem(itemId) {
      const item = currentWorkbook.checklistItems.find((candidate) => candidate.id === itemId);
      return item ? { ...item, workbook: currentWorkbook } : null;
    },
    async findQuickUpdate() {
      return null;
    },
    async getOrCreateBoardDay() {
      return boardDay;
    },
    async getOrCreateWorkbook() {
      return currentWorkbook;
    },
    async updateChecklistItem(input) {
      checklistUpdates.push(input);
    },
    async updateQuickUpdate() {
      throw new Error("not needed");
    },
    async upsertReportSeeds() {
      return undefined;
    }
  };

  return { checklistUpdates, createdChecklistItems, repository };
}

describe("workday workbook service", () => {
  it("generates report seeds from meaningful checklist items, quick updates, and operating signals", () => {
    const seeds = buildWorkdayReportSeeds(workbook(), {
      approvalCount: 1,
      handoffCount: 1,
      reportExceptions: 2
    });

    expect(seeds.map((seed) => seed.title)).toEqual([
      "Call vendor about roof estimate",
      "Sales opportunity update",
      "Approval review",
      "Carryover candidates",
      "Release and handoff control"
    ]);
    expect(seeds.find((seed) => seed.sourceId === "checklist-2")).toBeUndefined();
    expect(seeds.find((seed) => seed.sourceId === "quick-1")).toMatchObject({
      detail: expect.stringContaining("Moises"),
      tone: WorkdayReportSeedTone.YELLOW
    });
  });

  it("creates a checklist item in the current user's COO workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookChecklistItem(user, "2026-08-29", { text: "Review Quick Updates" }, { repository: harness.repository });

    expect(harness.createdChecklistItems).toEqual([
      {
        text: "Review Quick Updates",
        workbookId: "workbook-1"
      }
    ]);
  });

  it("rejects checklist updates for another user's workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness("someone-else");

    await expect(updateCooWorkbookChecklistItem(user, "checklist-1", { done: true }, { repository: harness.repository })).rejects.toThrow("permission");
    expect(harness.checklistUpdates).toEqual([]);
  });
});
