import {
  WorkdayActivityPurpose,
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
  WorkdayWorkbookScope,
  type BoardDay
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { WorkdayWorkbookRepository, WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import {
  buildWorkdayDailyReportDraft,
  buildWorkdayCarryovers,
  buildWorkdayReportSeeds,
  bringForwardCooWorkbookItem,
  closeWorkbookDay,
  createWorkbookManualReportItems,
  createCooWorkbookChecklistItem,
  createCooWorkbookDailyFocusItem,
  createCooWorkbookReportDraft,
  createStaffSupportAction,
  createStaffWorkbookChecklistItem,
  currentWorkdayBoardDate,
  deleteWorkbookDailyFocusItem,
  getStaffWorkbook,
  getStaffWorkbookSummaries,
  prepareWorkbookCarryovers,
  recordWorkbookAttentionHeartbeat,
  recordWorkbookOperatingRhythmEvent,
  reopenWorkbookDay,
  updateCooWorkbookChecklistItem,
  updateCooWorkbookReportSeed,
  updateWorkbookDailyFocusItem,
  updateWorkbookCarryover
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
    boardDay,
    userId,
    scope: WorkdayWorkbookScope.COO,
    status: "ACTIVE",
    closedAt: null,
    closedByUserId: null,
    closeSnapshot: null,
    createdAt: now,
    updatedAt: now,
    checklistItems: [
      {
        id: "checklist-1",
        workbookId: "workbook-1",
        text: "Call vendor about roof estimate",
        status: WorkdayChecklistStatus.YELLOW,
        priority: WorkdayPriority.HIGH,
        riskLevel: WorkdayRiskLevel.WATCH,
        riskNote: "Roof timing could slip.",
        update: "Waiting on AJ to confirm timing.",
        done: false,
        carryoverReady: true,
        convertedTaskId: null,
        sourceType: null,
        sourceId: null,
        sourceBoardDate: null,
        sourceHref: null,
        broughtForwardAt: null,
        broughtForwardByUserId: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "checklist-2",
        workbookId: "workbook-1",
        text: "Clean desk",
        status: WorkdayChecklistStatus.GREEN,
        priority: WorkdayPriority.LOW,
        riskLevel: WorkdayRiskLevel.NONE,
        riskNote: "",
        update: "",
        done: false,
        carryoverReady: false,
        convertedTaskId: null,
        sourceType: null,
        sourceId: null,
        sourceBoardDate: null,
        sourceHref: null,
        broughtForwardAt: null,
        broughtForwardByUserId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    dailyFocusItems: [
      {
        id: "focus-1",
        workbookId: "workbook-1",
        outcome: "Confirm roof repair path",
        mustCloseToday: true,
        priority: WorkdayPriority.CRITICAL,
        riskLevel: WorkdayRiskLevel.BLOCKED,
        riskNote: "Waiting on AJ to confirm timing.",
        supportNeeded: "Need manager approval if roof quote is high.",
        progressUpdate: "",
        lastProgressAt: null,
        status: WorkdayDailyFocusStatus.PLANNED,
        sortOrder: 0,
        convertedTaskId: null,
        sourceType: null,
        sourceId: null,
        sourceBoardDate: null,
        sourceHref: null,
        broughtForwardAt: null,
        broughtForwardByUserId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    carryovers: [],
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
    reportSeeds: [
      {
        id: "seed-1",
        workbookId: "workbook-1",
        sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
        sourceId: "checklist-1",
        title: "Call vendor about roof estimate",
        detail: "Waiting on AJ to confirm timing.",
        tone: WorkdayReportSeedTone.YELLOW,
        status: WorkdayReportSeedStatus.CARRIED_OVER,
        reviewNote: "Ask for firm timing tomorrow.",
        sourceHref: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "seed-2",
        workbookId: "workbook-1",
        sourceType: WorkdayReportSeedSourceType.QUICK_UPDATE,
        sourceId: "quick-1",
        title: "Sales opportunity update",
        detail: "Moises from T-Mobile visited to discuss products.",
        tone: WorkdayReportSeedTone.YELLOW,
        status: WorkdayReportSeedStatus.INCLUDED,
        reviewNote: "",
        sourceHref: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "seed-3",
        workbookId: "workbook-1",
        sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
        sourceId: "noise",
        title: "Noisy exception",
        detail: "Do not include this line.",
        tone: WorkdayReportSeedTone.BLUE,
        status: WorkdayReportSeedStatus.EXCLUDED,
        reviewNote: "",
        sourceHref: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    reportDrafts: [],
    supportActions: [],
    activitySignals: [],
    attentionSessions: []
  };
}

function repositoryHarness(ownerUserId = "user-jordan.sales@local.test", rangeWorkbooks?: WorkdayWorkbookRecord[]) {
  const createdChecklistItems: unknown[] = [];
  const createdDailyFocusItems: unknown[] = [];
  const createdReportDrafts: unknown[] = [];
  const createdSupportActions: unknown[] = [];
  const createdActivitySignals: unknown[] = [];
  const attentionSessions: unknown[] = [];
  const activityEvents: unknown[] = [];
  const activityEventsForSync: Awaited<ReturnType<WorkdayWorkbookRepository["listActivityEventsForWorkbookContext"]>> = [];
  const checklistUpdates: unknown[] = [];
  const carryoverUpdates: unknown[] = [];
  const dailyFocusUpdates: unknown[] = [];
  const deletedDailyFocusItems: unknown[] = [];
  const closedWorkbooks: unknown[] = [];
  const reportSeedUpdates: unknown[] = [];
  const reopenedWorkbooks: unknown[] = [];
  const supportActionUpdates: unknown[] = [];
  const upsertedCarryovers: unknown[] = [];
  const currentWorkbook = workbook(ownerUserId);
  const repository: WorkdayWorkbookRepository = {
    async closeWorkbook(input) {
      closedWorkbooks.push(input);
    },
    async createChecklistItem(input) {
      createdChecklistItems.push(input);
    },
    async createDailyFocusItem(input) {
      createdDailyFocusItems.push(input);
    },
    async createReportDraft(input) {
      createdReportDrafts.push(input);
    },
    async createQuickUpdate() {
      throw new Error("not needed");
    },
    async createSupportAction(input) {
      createdSupportActions.push(input);
    },
    async createActivitySignal(input) {
      createdActivitySignals.push(input);
    },
    async deleteDailyFocusItem(input) {
      deletedDailyFocusItems.push(input);
    },
    async findChecklistItem(itemId) {
      const item = currentWorkbook.checklistItems.find((candidate) => candidate.id === itemId);
      return item ? { ...item, workbook: currentWorkbook } : null;
    },
    async findCarryover(carryoverId) {
      const item = currentWorkbook.carryovers.find((candidate) => candidate.id === carryoverId);
      return item ? { ...item, workbook: currentWorkbook } : null;
    },
    async findDailyFocusItem(itemId) {
      const item = currentWorkbook.dailyFocusItems.find((candidate) => candidate.id === itemId);
      return item ? { ...item, workbook: currentWorkbook } : null;
    },
    async findQuickUpdate() {
      return null;
    },
    async findReportSeed(seedId) {
      const seed = currentWorkbook.reportSeeds.find((candidate) => candidate.id === seedId);
      return seed ? { ...seed, workbook: currentWorkbook } : null;
    },
    async findSupportAction(actionId) {
      const item = currentWorkbook.supportActions.find((candidate) => candidate.id === actionId);
      return item ? { ...item, workbook: currentWorkbook } : null;
    },
    async getOrCreateBoardDay() {
      return boardDay;
    },
    async getOrCreateWorkbook() {
      return currentWorkbook;
    },
    async getWorkbookById(id) {
      return id === currentWorkbook.id ? currentWorkbook : null;
    },
    async listWorkbooksForBoardDateRange() {
      return rangeWorkbooks ?? [currentWorkbook];
    },
    async listWorkbooksForBoardDay() {
      return [{
        ...currentWorkbook,
        user: {
          id: currentWorkbook.userId,
          name: "Jordan Sales"
        },
        checklistItems: currentWorkbook.checklistItems.map((item) => ({
          carryoverReady: item.carryoverReady,
          done: item.done,
          status: item.status,
          updatedAt: item.updatedAt
        })),
        dailyFocusItems: currentWorkbook.dailyFocusItems.map((item) => ({
          mustCloseToday: item.mustCloseToday,
          priority: item.priority,
          riskLevel: item.riskLevel,
          status: item.status,
          supportNeeded: item.supportNeeded,
          updatedAt: item.updatedAt
        })),
        quickUpdates: currentWorkbook.quickUpdates.map((item) => ({
          carryoverReady: item.carryoverReady,
          followUpNeeded: item.followUpNeeded,
          updatedAt: item.updatedAt
        })),
        carryovers: currentWorkbook.carryovers.map((item) => ({
          status: item.status,
          targetBoardDate: item.targetBoardDate,
          updatedAt: item.updatedAt
        })),
        reportDrafts: [{
          cadence: WorkdayReportCadence.DAILY,
          createdAt: new Date("2026-08-29T15:00:00.000Z"),
          generatedAt: new Date("2026-08-29T15:00:00.000Z"),
          generatedByUserId: "user-jordan.sales@local.test",
          id: "draft-1",
          periodEnd: new Date("2026-08-29T00:00:00.000Z"),
          periodStart: new Date("2026-08-29T00:00:00.000Z"),
          sections: [{
            id: "execution",
            items: [{
              detail: "Customer callback is still pending.",
              reviewNote: "",
              sourceId: "seed-1",
              sourceType: WorkdayReportSeedSourceType.OPERATING_SIGNAL,
              title: "Approval follow-up"
            }],
            summary: "One staff report item is ready.",
            title: "Execution"
          }],
          sourceSeedIds: ["seed-1"],
          status: "DRAFT",
          summary: "Jordan prepared one staff report item.",
          title: "Jordan Daily Report - 2026-08-29",
          updatedAt: new Date("2026-08-29T15:00:00.000Z"),
          version: 1,
          workbookId: currentWorkbook.id
        }],
        reportSeeds: currentWorkbook.reportSeeds.map((seed) => ({ id: seed.id, status: seed.status })),
        supportActions: currentWorkbook.supportActions.map((item) => ({
          status: item.status,
          updatedAt: item.updatedAt
        }))
      }];
    },
    async listActivityEventsForWorkbookContext() {
      return activityEventsForSync;
    },
    async recordActivity(input) {
      activityEvents.push(input);
    },
    async reopenWorkbook(input) {
      reopenedWorkbooks.push(input);
    },
    async updateChecklistItem(input) {
      checklistUpdates.push(input);
    },
    async updateCarryover(input) {
      carryoverUpdates.push(input);
    },
    async updateDailyFocusItem(input) {
      dailyFocusUpdates.push(input);
    },
    async updateQuickUpdate() {
      throw new Error("not needed");
    },
    async updateReportSeed(input) {
      reportSeedUpdates.push(input);
    },
    async updateSupportAction(input) {
      supportActionUpdates.push(input);
    },
    async upsertAttentionSession(input) {
      attentionSessions.push(input);
    },
    async upsertCarryovers(input) {
      upsertedCarryovers.push(input);
    },
    async upsertReportSeeds() {
      return undefined;
    }
  };

  return { activityEvents, activityEventsForSync, attentionSessions, carryoverUpdates, checklistUpdates, closedWorkbooks, createdActivitySignals, createdChecklistItems, createdDailyFocusItems, createdReportDrafts, createdSupportActions, currentWorkbook, dailyFocusUpdates, deletedDailyFocusItems, reopenedWorkbooks, reportSeedUpdates, repository, supportActionUpdates, upsertedCarryovers };
}

describe("workday workbook service", () => {
  it("syncs cross-app work before generating a report without opening the workbook first, and deduplicates repeat syncs", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);
    harness.currentWorkbook.activitySignals = [];
    harness.currentWorkbook.reportSeeds = [];
    harness.activityEventsForSync.push(...Array.from({ length: 121 }, (_, index) => ({ id: `audit:${index}`, eventType: "PRESENT_ESTIMATE_COMPLETED", message: `Estimate revision ${index} saved; awaiting approval`, metadata: { sourceType: "ENTERPRISE_AUDIT", sourceModule: "SHOP_PLANNING", commandType: "PRESENT_ESTIMATE", sourceHref: `/vehicles/repair-workbench?repairOrderId=ro-${index}` }, taskId: null, task: null, createdAt: new Date("2026-08-29T16:00:00Z") })));
    harness.repository.createActivitySignal = async input => {
      const existing = harness.currentWorkbook.activitySignals.find(row => row.sourceId === input.sourceId && row.actionType === input.actionType && row.sourceType === input.sourceType);
      const row = { ...input, metadata: JSON.parse(JSON.stringify(input.metadata)), id: existing?.id ?? `signal-${input.sourceId}`, occurredAt: input.occurredAt ?? new Date(), createdAt: new Date(), updatedAt: new Date() };
      if (existing) Object.assign(existing, row); else harness.currentWorkbook.activitySignals.push(row);
    };
    harness.repository.upsertReportSeeds = async ({ seeds, workbookId }) => {
      for (const seed of seeds) {
        const existing = harness.currentWorkbook.reportSeeds.find(row => row.sourceId === seed.sourceId && row.sourceType === seed.sourceType);
        if (existing) Object.assign(existing, seed);
        else harness.currentWorkbook.reportSeeds.push({ ...seed, id: `seed-${seed.sourceId}`, workbookId, sourceHref: seed.sourceHref ?? null, status: seed.status ?? WorkdayReportSeedStatus.CANDIDATE, reviewNote: "", createdAt: new Date(), updatedAt: new Date() });
      }
    };
    for (let attempt = 0; attempt < 2; attempt++) await createCooWorkbookReportDraft(user, "2026-08-29", "DAILY", { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, { repository: harness.repository });
    expect(harness.currentWorkbook.activitySignals.filter(signal => signal.reportRelevant)).toHaveLength(121);
    expect(harness.currentWorkbook.reportSeeds.filter(seed => seed.sourceId.startsWith("activity:"))).toHaveLength(121);
    const report = harness.createdReportDrafts[1] as { sections: Array<{ title: string; items: Array<{ sourceHref: string }> }> };
    expect(report.sections.find(section => section.title === "Work performed across the app")?.items).toHaveLength(121);
    expect(report.sections.find(section => section.title === "Completed / Closed Today")?.items.some(item => item.sourceHref?.startsWith("/vehicles/repair-workbench?repairOrderId=")) ?? false).toBe(false);
    expect(report.sections.find(section => section.title === "Work performed across the app")?.items[0].sourceHref).toContain("/vehicles/repair-workbench?repairOrderId=");
  });
  it("uses the dealership local date for the current workbook date", () => {
    expect(currentWorkdayBoardDate(new Date("2026-09-01T01:51:00.000Z"))).toBe("2026-08-31");
    expect(currentWorkdayBoardDate(new Date("2026-09-01T06:01:00.000Z"))).toBe("2026-09-01");
  });

  it("generates report seeds from meaningful checklist items, quick updates, and operating signals", () => {
    const seeds = buildWorkdayReportSeeds(workbook(), {
      approvalCount: 1,
      handoffCount: 1,
      reportExceptions: 2
    });

    expect(seeds.map((seed) => seed.title)).toEqual([
      "Confirm roof repair path",
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

  it("adds report seeds from report-worthy app activity signals", () => {
    const now = new Date("2026-08-29T16:00:00.000Z");
    const seeds = buildWorkdayReportSeeds({
      ...workbook(),
      dailyFocusItems: [],
      checklistItems: [],
      quickUpdates: [],
      activitySignals: [
        {
          id: "activity-1",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-jordan.sales@local.test",
          sourceModule: "CUSTOMER_UPDATES",
          sourceType: "ACTIVITY_EVENT",
          sourceId: "customer-event-1",
          actionType: "customer.update_sent",
          purpose: WorkdayActivityPurpose.CUSTOMER_COMMUNICATION,
          businessImpact: "Customer was updated before close.",
          reportRelevant: true,
          coachingRelevant: true,
          metadata: {},
          occurredAt: now,
          createdAt: now
        }
      ]
    }, {
      approvalCount: 0,
      handoffCount: 0,
      reportExceptions: 0
    });

    expect(seeds).toEqual([
      expect.objectContaining({
        detail: "Customer was updated before close.",
        sourceId: "activity:activity-1",
        sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
        title: "Customer update sent"
      })
    ]);
  });

  it("includes Daily Focus progress updates in report seed details", () => {
    const seeds = buildWorkdayReportSeeds({
      ...workbook(),
      dailyFocusItems: workbook().dailyFocusItems.map((item) => ({
        ...item,
        progressUpdate: "Customer callback completed and approval is waiting."
      }))
    }, {
      approvalCount: 0,
      handoffCount: 0,
      reportExceptions: 0
    });

    expect(seeds.find((seed) => seed.sourceId === "daily-focus:focus-1")?.detail).toContain("Progress update: Customer callback completed and approval is waiting.");
  });


  it("builds a saved daily report draft from reviewed seeds and excludes rejected noise", () => {
    const draft = buildWorkdayDailyReportDraft(workbook(), "2026-08-29");

    expect(draft.title).toBe("COO Daily Report - 2026-08-29");
    expect(draft.cadence).toBe(WorkdayReportCadence.DAILY);
    expect(draft.sourceSeedIds).toEqual(["seed-2", "seed-1"]);
    expect(draft.summary).toContain("2 report item(s)");
    expect(draft.sections.map((section) => section.title)).toContain("Blockers and Risks");
    expect(draft.sections.map((section) => section.title)).toContain("Carryover for Tomorrow");
    expect(JSON.stringify(draft.sections)).not.toContain("Do not include this line.");
  });

  it("does not turn report-generation bookkeeping into future report content", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookReportDraft(user, "2026-08-29", WorkdayReportCadence.DAILY, {
      approvalCount: 0,
      handoffCount: 0,
      reportExceptions: 0
    }, { repository: harness.repository });

    expect(harness.createdActivitySignals).toContainEqual(expect.objectContaining({
      actionType: "workbook.report_draft_generated",
      reportRelevant: false
    }));
  });

  it("builds carryovers from checklist, Quick Updates, and reviewed carried seeds", () => {
    const targetBoardDate = "2026-08-30";
    const seeds = buildWorkdayCarryovers(workbook(), targetBoardDate);

    expect(seeds).toEqual([
      expect.objectContaining({
        sourceId: "daily-focus:focus-1",
        sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
        targetBoardDate,
        title: "Confirm roof repair path"
      }),
      expect.objectContaining({
        sourceId: "checklist-1",
        sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
        targetBoardDate,
        title: "Call vendor about roof estimate"
      }),
      expect.objectContaining({
        sourceId: "quick-1",
        sourceType: WorkdayReportSeedSourceType.QUICK_UPDATE,
        targetBoardDate,
        title: "Sales opportunity follow-up"
      }),
      expect.objectContaining({
        sourceId: "seed-1",
        sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
        targetBoardDate,
        title: "Call vendor about roof estimate"
      })
    ]);
  });

  it("creates a checklist item in the current user's COO workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookChecklistItem(user, "2026-08-29", { text: "Review Quick Updates" }, { repository: harness.repository });

    expect(harness.createdChecklistItems).toEqual([
      {
        carryoverReady: false,
        priority: WorkdayPriority.MEDIUM,
        riskLevel: WorkdayRiskLevel.NONE,
        riskNote: "",
        text: "Review Quick Updates",
        workbookId: "workbook-1"
      }
    ]);
    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "workbook.checklist_created",
        purpose: WorkdayActivityPurpose.PLANNED_WORK,
        reportRelevant: false
      })
    ]);
  });

  it("creates a checklist item in the current user's staff workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createStaffWorkbookChecklistItem(user, "2026-08-29", { text: "Finish customer callbacks" }, { repository: harness.repository });

    expect(harness.createdChecklistItems).toEqual([
      {
        carryoverReady: false,
        priority: WorkdayPriority.MEDIUM,
        riskLevel: WorkdayRiskLevel.NONE,
        riskNote: "",
        text: "Finish customer callbacks",
        workbookId: "workbook-1"
      }
    ]);
  });

  it("creates source-backed checklist items for search-result carryover", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookChecklistItem(user, "2026-08-29", {
      carryoverReady: true,
      priority: "HIGH",
      riskLevel: "WATCH",
      riskNote: "Marked from workbook search.",
      sourceBoardDate: "2026-08-28",
      sourceHref: "/vehicles/coo-workbook?tool=bring-forward",
      sourceId: "history-1",
      sourceType: "WORKBOOK_HISTORY",
      text: "DealerCenter follow-up"
    }, { repository: harness.repository });

    expect(harness.createdChecklistItems).toEqual([
      expect.objectContaining({
        broughtForwardByUserId: user.id,
        carryoverReady: true,
        priority: WorkdayPriority.HIGH,
        riskLevel: WorkdayRiskLevel.WATCH,
        sourceId: "history-1",
        sourceType: "WORKBOOK_HISTORY",
        text: "DealerCenter follow-up",
        workbookId: "workbook-1"
      })
    ]);
  });

  it("returns daily close readiness from saved workbook activity", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    const readModel = await getStaffWorkbook(user, "2026-08-29", { repository: harness.repository });

    expect(readModel.closeReadiness).toMatchObject({
      carryoverItems: 3,
      checklistCompletion: 0,
      checklistNeedsSupport: 1,
      quickFollowUps: 1,
      reviewedSeedCount: 3,
      score: 41,
      tone: "SUPPORT"
    });
    expect(readModel.closeReadiness.prompts).toContain("Review daily focus items that need support or have risk.");
    expect(readModel.effectiveness).toMatchObject({
      dailyFocusTotal: 1,
      mustCloseOpen: 1,
      supportNeeded: "Need manager approval if roof quote is high."
    });
    expect(readModel.activityIntelligence).toMatchObject({
      reportRelevantCount: 0,
      signalCount: 0
    });
    expect(readModel.timeAttention).toMatchObject({
      activeMinutes: 0,
      sessionCount: 0
    });
  });

  it("brings prior-day carryover assignments into today's planning view", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const priorWorkbook = workbook(user.id);
    priorWorkbook.id = "workbook-prior";
    priorWorkbook.boardDayId = "board-day-prior";
    priorWorkbook.boardDay = {
      ...boardDay,
      id: "board-day-prior",
      date: new Date("2026-08-28T00:00:00.000Z")
    };
    priorWorkbook.carryovers = [{
      confirmedAt: null,
      convertedAt: null,
      convertedTaskId: null,
      createdAt: new Date("2026-08-28T22:00:00.000Z"),
      detail: "Customer approval is still outstanding.",
      dismissedAt: null,
      dismissedReason: "",
      id: "carryover-prior-1",
      sourceHref: "/tasks/task-approval",
      sourceId: "task-approval",
      sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
      status: WorkdayCarryoverStatus.OPEN,
      targetBoardDate: new Date("2026-08-29T00:00:00.000Z"),
      title: "Obtain customer approval",
      updatedAt: new Date("2026-08-28T22:00:00.000Z"),
      workbookId: "workbook-prior"
    }];
    const harness = repositoryHarness(user.id, [priorWorkbook]);

    const readModel = await getStaffWorkbook(user, "2026-08-29", { repository: harness.repository });

    expect(readModel.incomingCarryovers).toEqual([
      expect.objectContaining({
        id: "carryover-prior-1",
        sourceHref: "/tasks/task-approval",
        targetBoardDate: "2026-08-29",
        title: "Obtain customer approval"
      })
    ]);
  });

  it("lists unfinished prior work as bring-forward candidates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const priorWorkbook = workbook(user.id);
    priorWorkbook.id = "workbook-prior";
    priorWorkbook.boardDayId = "board-day-prior";
    priorWorkbook.boardDay = {
      ...boardDay,
      id: "board-day-prior",
      date: new Date("2026-08-28T00:00:00.000Z")
    };
    const harness = repositoryHarness(user.id, [priorWorkbook]);

    const readModel = await getStaffWorkbook(user, "2026-08-29", { repository: harness.repository });

    expect(readModel.bringForwardCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "DAILY_FOCUS:focus-1",
        sourceBoardDate: "2026-08-28",
        sourceType: "DAILY_FOCUS",
        title: "Confirm roof repair path"
      }),
      expect.objectContaining({
        id: "CHECKLIST_ITEM:checklist-1",
        recommendedTarget: "ACTION_PLAN",
        sourceType: "CHECKLIST_ITEM",
        title: "Call vendor about roof estimate"
      }),
      expect.objectContaining({
        id: "QUICK_UPDATE:quick-1",
        sourceType: "QUICK_UPDATE",
        title: "Moises from T-Mobile visited to discuss products."
      })
    ]));
  });

  it("brings prior work into today's focus with source lineage", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const priorWorkbook = workbook(user.id);
    priorWorkbook.id = "workbook-prior";
    priorWorkbook.boardDayId = "board-day-prior";
    priorWorkbook.boardDay = {
      ...boardDay,
      id: "board-day-prior",
      date: new Date("2026-08-28T00:00:00.000Z")
    };
    const harness = repositoryHarness(user.id, [priorWorkbook]);

    const result = await bringForwardCooWorkbookItem(user, "2026-08-29", {
      candidateId: "DAILY_FOCUS:focus-1",
      target: "FOCUS"
    }, { repository: harness.repository });

    expect(result).toMatchObject({ ok: true, target: "FOCUS", title: "Confirm roof repair path" });
    expect(harness.createdDailyFocusItems).toEqual([
      expect.objectContaining({
        mustCloseToday: true,
        outcome: "Confirm roof repair path",
        sourceId: "focus-1",
        sourceType: "DAILY_FOCUS",
        workbookId: "workbook-1"
      })
    ]);
    expect(harness.activityEvents).toEqual([
      expect.objectContaining({
        eventType: "workbook.prior_work_brought_forward",
        metadata: expect.objectContaining({ candidateId: "DAILY_FOCUS:focus-1", target: "FOCUS" })
      })
    ]);
  });

  it("syncs existing app activity into the workbook read model", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);
    harness.activityEventsForSync.push({
      id: "event-1",
      eventType: "task.completed",
      message: "Completed delivery checklist.",
      metadata: { sourceModule: "TASKS" },
      taskId: "task-1",
      createdAt: new Date("2026-08-29T16:00:00.000Z"),
      task: {
        id: "task-1",
        status: "DONE",
        title: "Delivery checklist",
        workflowArea: "DELIVERY"
      }
    });

    await getStaffWorkbook(user, "2026-08-29", { repository: harness.repository });

    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "task.completed",
        businessImpact: "Completed delivery checklist.",
        purpose: WorkdayActivityPurpose.COMPLETED_WORK,
        reportRelevant: true,
        sourceId: "event-1",
        sourceType: "TASK_ACTIVITY"
      })
    ]);
  });

  it("creates and updates Daily Focus items in the current workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookDailyFocusItem(user, "2026-08-29", {
      mustCloseToday: true,
      outcome: "Finish morning promise review",
      priority: "CRITICAL",
      riskLevel: "WATCH",
      supportNeeded: "Need parts ETA"
    }, { repository: harness.repository });
    await updateWorkbookDailyFocusItem(user, "focus-1", { status: "DONE", riskLevel: "NONE" }, { repository: harness.repository });

    expect(harness.createdDailyFocusItems).toEqual([
      expect.objectContaining({
        mustCloseToday: true,
        outcome: "Finish morning promise review",
        priority: WorkdayPriority.CRITICAL,
        riskLevel: WorkdayRiskLevel.WATCH,
        supportNeeded: "Need parts ETA",
        workbookId: "workbook-1"
      })
    ]);
    expect(harness.dailyFocusUpdates).toEqual([
      expect.objectContaining({
        id: "focus-1",
        riskLevel: WorkdayRiskLevel.NONE,
        status: WorkdayDailyFocusStatus.DONE
      })
    ]);
  });

  it("saves Daily Focus progress updates as report-worthy activity", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await updateWorkbookDailyFocusItem(user, "focus-1", {
      progressUpdate: "Called AJ and confirmed roof quote timing."
    }, { repository: harness.repository });

    expect(harness.dailyFocusUpdates).toEqual([
      expect.objectContaining({
        id: "focus-1",
        progressUpdate: "Called AJ and confirmed roof quote timing.",
        lastProgressAt: expect.any(Date)
      })
    ]);
    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "workbook.daily_focus_progress_updated",
        businessImpact: expect.stringContaining("Called AJ and confirmed roof quote timing."),
        purpose: WorkdayActivityPurpose.REPORT_WORTHY_EVENT,
        reportRelevant: true,
        sourceId: "daily-focus:focus-1",
        sourceType: "DAILY_FOCUS"
      })
    ]);
  });

  it("replaces a Daily Focus outcome without retaining the prior execution state", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await updateWorkbookDailyFocusItem(user, "focus-1", {
      mustCloseToday: true,
      outcome: "Call customer about the updated repair promise",
      priority: "HIGH",
      replaceOutcome: true,
      riskLevel: "WATCH",
      riskNote: "Customer confirmation is still needed.",
      status: "PLANNED",
      supportNeeded: ""
    }, { repository: harness.repository });

    expect(harness.dailyFocusUpdates).toEqual([
      expect.objectContaining({
        convertedTaskId: null,
        id: "focus-1",
        lastProgressAt: null,
        outcome: "Call customer about the updated repair promise",
        progressUpdate: "",
        riskLevel: WorkdayRiskLevel.WATCH,
        status: WorkdayDailyFocusStatus.PLANNED
      })
    ]);
    expect(harness.activityEvents).toEqual([
      expect.objectContaining({
        eventType: "workbook.daily_focus_replaced",
        metadata: expect.objectContaining({
          previousOutcome: "Confirm roof repair path",
          replacementOutcome: "Call customer about the updated repair promise"
        })
      })
    ]);
  });

  it("records explicit approval of a chosen Daily Focus outcome", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await updateWorkbookDailyFocusItem(user, "focus-1", { approveOutcome: true }, { repository: harness.repository });

    expect(harness.dailyFocusUpdates).toEqual([]);
    expect(harness.activityEvents).toEqual([
      expect.objectContaining({
        eventType: "workbook.daily_focus_approved",
        metadata: expect.objectContaining({
          dailyFocusItemId: "focus-1",
          outcome: "Confirm roof repair path"
        })
      })
    ]);
    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "workbook.daily_focus_approved",
        sourceId: "daily-focus:focus-1",
        sourceType: "DAILY_FOCUS"
      })
    ]);
  });

  it("removes Daily Focus items in the current workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await deleteWorkbookDailyFocusItem(user, "focus-1", { repository: harness.repository });

    expect(harness.deletedDailyFocusItems).toEqual([{ id: "focus-1" }]);
    expect(harness.activityEvents).toEqual([
      expect.objectContaining({
        eventType: "workbook.daily_focus_removed",
        metadata: expect.objectContaining({
          dailyFocusItemId: "focus-1",
          outcome: "Confirm roof repair path",
          sourceId: "daily-focus:focus-1"
        })
      })
    ]);
  });

  it("rejects checklist updates for another user's workbook", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness("someone-else");

    await expect(updateCooWorkbookChecklistItem(user, "checklist-1", { done: true }, { repository: harness.repository })).rejects.toThrow("permission");
    expect(harness.checklistUpdates).toEqual([]);
  });

  it("updates a report seed only for the workbook owner", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await updateCooWorkbookReportSeed(user, "seed-1", { reviewNote: "Confirmed carryover.", status: "INCLUDED" }, { repository: harness.repository });

    expect(harness.reportSeedUpdates).toEqual([
      {
        detail: undefined,
        id: "seed-1",
        reviewNote: "Confirmed carryover.",
        status: WorkdayReportSeedStatus.INCLUDED,
        title: undefined
      }
    ]);
  });

  it("generates weekly report drafts from the workbook range", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await createCooWorkbookReportDraft(user, "2026-08-29", "WEEKLY", {
      approvalCount: 1,
      handoffCount: 1,
      reportExceptions: 2
    }, { repository: harness.repository });

    expect(harness.createdReportDrafts).toEqual([
      expect.objectContaining({
        cadence: WorkdayReportCadence.WEEKLY,
        periodEnd: "2026-08-29",
        periodStart: "2026-08-23",
        workbookId: "workbook-1"
      })
    ]);
    expect(harness.activityEvents).toEqual([
      expect.objectContaining({ eventType: "workbook.report_draft_generated" })
    ]);
  });

  it("prepares, confirms, closes, and reopens carryover workflow state", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness(user.id);
    const now = new Date("2026-08-29T15:30:00.000Z");
    harness.currentWorkbook.carryovers.push({
      id: "carryover-1",
      workbookId: "workbook-1",
      sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
      sourceId: "checklist-1",
      sourceHref: null,
      title: "Call vendor about roof estimate",
      detail: "Waiting on AJ to confirm timing.",
      status: WorkdayCarryoverStatus.OPEN,
      targetBoardDate: new Date("2026-08-30T00:00:00.000Z"),
      convertedTaskId: null,
      dismissedReason: "",
      confirmedAt: null,
      dismissedAt: null,
      convertedAt: null,
      createdAt: now,
      updatedAt: now
    });

    await prepareWorkbookCarryovers(user, "2026-08-29", WorkdayWorkbookScope.COO, { repository: harness.repository });
    await updateWorkbookCarryover(user, "carryover-1", { status: "CONFIRMED" }, { repository: harness.repository });
    harness.currentWorkbook.dailyFocusItems[0].status = WorkdayDailyFocusStatus.CARRY_OVER;
    harness.currentWorkbook.checklistItems[1].done = true;
    await closeWorkbookDay(user, "2026-08-29", WorkdayWorkbookScope.COO, { reviewedDay: true }, { repository: harness.repository });
    await reopenWorkbookDay(user, "workbook-1", { repository: harness.repository });

    expect(harness.upsertedCarryovers).toHaveLength(2);
    expect(harness.upsertedCarryovers[0]).toEqual(expect.objectContaining({
      carryovers: expect.arrayContaining([
        expect.objectContaining({ sourceId: "daily-focus:focus-1", title: "Confirm roof repair path" })
      ])
    }));
    expect(harness.carryoverUpdates).toEqual([
      expect.objectContaining({ id: "carryover-1", status: WorkdayCarryoverStatus.CONFIRMED })
    ]);
    expect(harness.closedWorkbooks).toEqual([
      expect.objectContaining({ closedByUserId: user.id, id: "workbook-1" })
    ]);
    expect(harness.reopenedWorkbooks).toEqual([{ id: "workbook-1" }]);
  });

  it("requires an explicit End The Day review before closing", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness(user.id);

    await expect(closeWorkbookDay(user, "2026-08-29", WorkdayWorkbookScope.COO, {}, { repository: harness.repository })).rejects.toThrow("Review End The Day");
    expect(harness.closedWorkbooks).toHaveLength(0);
  });

  it("adds attributable manual report items without overwriting the generated evidence", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness(user.id);
    const savedSeeds: Array<{ reviewNote?: string; sourceId: string; status?: WorkdayReportSeedStatus; title: string }> = [];
    harness.repository.upsertReportSeeds = async ({ seeds }) => { savedSeeds.push(...seeds); };

    await createWorkbookManualReportItems(user, "2026-08-29", WorkdayWorkbookScope.COO, {
      items: [
        { category: "COMPLETED", title: "Vendor payment reconciled", detail: "Invoice matched and paid.", relatedContext: "Task TMS-100" },
        { category: "CARRYOVER", title: "Call warranty adjuster", detail: "Waiting on claim response." }
      ]
    }, { repository: harness.repository });

    expect(savedSeeds).toHaveLength(2);
    expect(savedSeeds[0]).toEqual(expect.objectContaining({ sourceId: expect.stringContaining("manual:completed:"), status: WorkdayReportSeedStatus.INCLUDED, title: "Vendor payment reconciled" }));
    expect(savedSeeds[0].reviewNote).toContain(user.name);
    expect(savedSeeds[1]).toEqual(expect.objectContaining({ sourceId: expect.stringContaining("manual:carryover:"), status: WorkdayReportSeedStatus.CARRIED_OVER }));
    expect(harness.activityEvents).toContainEqual(expect.objectContaining({ eventType: "workbook.manual_report_items_added" }));
  });

  it("does not close while a planned item still lacks a close decision", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness(user.id);

    await expect(closeWorkbookDay(user, "2026-08-29", WorkdayWorkbookScope.COO, { reviewedDay: true }, { repository: harness.repository })).rejects.toThrow("Resolve every planned item");
    expect(harness.closedWorkbooks).toHaveLength(0);
  });

  it("allows managers to create staff support actions", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness("user-jordan.sales@local.test");

    await createStaffSupportAction(user, "workbook-1", { note: "Please add a clear callback outcome.", requestedUpdate: true }, { repository: harness.repository });

    expect(harness.createdSupportActions).toEqual([
      {
        actorUserId: user.id,
        note: "Please add a clear callback outcome.",
        requestedUpdate: true,
        status: WorkdaySupportActionStatus.UPDATE_REQUESTED,
        targetUserId: "user-jordan.sales@local.test",
        workbookId: "workbook-1"
      }
    ]);
  });

  it("records basic time-in-area attention heartbeats", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await recordWorkbookAttentionHeartbeat(user, {
      activeSeconds: 75,
      idleSeconds: 15,
      sessionKey: "session-1",
      sourceArea: "quick update",
      sourcePath: "/vehicles/coo-workbook/quick-update",
      workbookId: "workbook-1"
    }, { repository: harness.repository });

    expect(harness.attentionSessions).toEqual([
      expect.objectContaining({
        activeSeconds: 75,
        idleSeconds: 15,
        sessionKey: "session-1",
        sourceArea: "QUICK_UPDATE",
        workbookId: "workbook-1"
      })
    ]);
    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "workbook.attention_heartbeat",
        coachingRelevant: false,
        purpose: WorkdayActivityPurpose.TIME_ATTENTION,
        reportRelevant: false,
        sourceType: "ATTENTION_SESSION"
      })
    ]);
  });

  it("records an auditable Start The Day confirmation snapshot", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);
    harness.currentWorkbook.activitySignals.push({
      actionType: "workbook.daily_focus_approved",
      actorUserId: user.id,
      boardDayId: harness.currentWorkbook.boardDayId,
      businessImpact: "Jordan approved the outcome.",
      coachingRelevant: true,
      createdAt: new Date("2026-08-29T14:01:00.000Z"),
      id: "approval-focus-1",
      metadata: {},
      occurredAt: new Date("2026-08-29T14:01:00.000Z"),
      purpose: WorkdayActivityPurpose.PLANNED_WORK,
      reportRelevant: false,
      sourceId: "daily-focus:focus-1",
      sourceModule: "COO_WORKBOOK",
      sourceType: "DAILY_FOCUS",
      workbookId: harness.currentWorkbook.id
    });

    await recordWorkbookOperatingRhythmEvent(user, {
      action: "START_CONFIRMED",
      capacityState: "AT_RISK",
      reviewedPlan: true,
      sourcePath: "/vehicles/coo-workbook/effectiveness-pilot",
      supportBy: "10:30",
      supportNeeded: "Parts ETA could affect the customer promise.",
      supportOwner: "Parts",
      workbookId: "workbook-1"
    }, { repository: harness.repository });

    expect(harness.createdActivitySignals).toEqual([
      expect.objectContaining({
        actionType: "workbook.rhythm_start_confirmed",
        metadata: expect.objectContaining({
          capacityState: "AT_RISK",
          focusSnapshot: [expect.objectContaining({ id: "focus-1", outcome: "Confirm roof repair path" })],
          supportBy: "10:30",
          supportOwner: "Parts"
        }),
        sourceType: "OPERATING_RHYTHM"
      })
    ]);
  });

  it("prevents Start The Day confirmation while an outcome still needs approval", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await expect(recordWorkbookOperatingRhythmEvent(user, {
      action: "START_CONFIRMED",
      capacityState: "ON_TRACK",
      reviewedPlan: true,
      sourcePath: "/vehicles/coo-workbook/effectiveness-pilot",
      workbookId: "workbook-1"
    }, { repository: harness.repository })).rejects.toThrow("still need approval");

    expect(harness.activityEvents).toEqual([]);
  });

  it("prevents direct Start The Day adoption without the review checkpoint", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);

    await expect(recordWorkbookOperatingRhythmEvent(user, {
      action: "START_CONFIRMED",
      capacityState: "ON_TRACK",
      workbookId: "workbook-1"
    }, { repository: harness.repository })).rejects.toThrow("Review Start The Day");

    expect(harness.activityEvents).toEqual([]);
  });

  it("requires fresh approval when an approved outcome was edited afterward", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("jordan.sales@local.test")!;
    const harness = repositoryHarness(user.id);
    harness.currentWorkbook.activitySignals.push({
      actionType: "workbook.daily_focus_approved",
      actorUserId: user.id,
      boardDayId: harness.currentWorkbook.boardDayId,
      businessImpact: "Jordan approved the earlier version.",
      coachingRelevant: true,
      createdAt: new Date("2026-08-29T13:59:00.000Z"),
      id: "stale-approval-focus-1",
      metadata: {},
      occurredAt: new Date("2026-08-29T13:59:00.000Z"),
      purpose: WorkdayActivityPurpose.PLANNED_WORK,
      reportRelevant: false,
      sourceId: "daily-focus:focus-1",
      sourceModule: "COO_WORKBOOK",
      sourceType: "DAILY_FOCUS",
      workbookId: harness.currentWorkbook.id
    });

    await expect(recordWorkbookOperatingRhythmEvent(user, {
      action: "START_CONFIRMED",
      capacityState: "ON_TRACK",
      reviewedPlan: true,
      workbookId: "workbook-1"
    }, { repository: harness.repository })).rejects.toThrow("still need approval");
  });

  it("allows managers to read Staff Today summaries", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const user = usersByEmail.get("morgan.manager@local.test")!;
    const harness = repositoryHarness("user-jordan.sales@local.test");

    const summaries = await getStaffWorkbookSummaries(user, "2026-08-29", { repository: harness.repository });

    expect(summaries).toEqual([
      expect.objectContaining({
        carryoverCount: 3,
        checklistCount: 2,
        closeReadinessScore: 42,
        closeReadinessTone: "SUPPORT",
        completedChecklistCount: 0,
        dailyFocusCount: 1,
        dailyFocusRiskCount: 1,
        effectivenessScore: 42,
        followUpNeededCount: 1,
        latestDraftStatus: "DRAFT",
        redYellowItemCount: 1,
        reviewedSeedCount: 3,
        staffName: "Jordan Sales"
      })
    ]);
    expect(summaries[0].closeReadinessPrompts).toContain("Has checklist items needing support.");
  });
});
