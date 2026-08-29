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
  closeWorkbookDay,
  createCooWorkbookChecklistItem,
  createCooWorkbookDailyFocusItem,
  createCooWorkbookReportDraft,
  createStaffSupportAction,
  createStaffWorkbookChecklistItem,
  getStaffWorkbook,
  getStaffWorkbookSummaries,
  prepareWorkbookCarryovers,
  recordWorkbookAttentionHeartbeat,
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
        status: WorkdayDailyFocusStatus.PLANNED,
        sortOrder: 0,
        convertedTaskId: null,
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

function repositoryHarness(ownerUserId = "user-jordan.sales@local.test") {
  const createdChecklistItems: Array<{ priority?: WorkdayPriority; riskLevel?: WorkdayRiskLevel; riskNote?: string; text: string; workbookId: string }> = [];
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
      return [currentWorkbook];
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
          generatedAt: new Date("2026-08-29T15:00:00.000Z"),
          status: "DRAFT",
          version: 1
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

  return { activityEvents, activityEventsForSync, attentionSessions, carryoverUpdates, checklistUpdates, closedWorkbooks, createdActivitySignals, createdChecklistItems, createdDailyFocusItems, createdReportDrafts, createdSupportActions, currentWorkbook, dailyFocusUpdates, reopenedWorkbooks, reportSeedUpdates, repository, supportActionUpdates, upsertedCarryovers };
}

describe("workday workbook service", () => {
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
        title: "Customer updates"
      })
    ]);
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
        priority: WorkdayPriority.MEDIUM,
        riskLevel: WorkdayRiskLevel.NONE,
        riskNote: "",
        text: "Finish customer callbacks",
        workbookId: "workbook-1"
      }
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
    await closeWorkbookDay(user, "2026-08-29", WorkdayWorkbookScope.COO, { repository: harness.repository });
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
