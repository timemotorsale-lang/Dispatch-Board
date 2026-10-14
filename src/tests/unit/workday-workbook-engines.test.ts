import {
  WorkdayActivityPurpose,
  WorkdayCarryoverStatus,
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayPriority,
  WorkdayQuickUpdateCategory,
  WorkdayReportSeedSourceType,
  WorkdayReportSeedStatus,
  WorkdayReportSeedTone,
  WorkdayRiskLevel,
  WorkdayWorkbookScope,
  type BoardDay
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import { buildActivityIntelligenceEngine, buildCoachingAndAccountabilityEngine, buildDailyPlanningEngine, buildExecutionTrackingEngine, buildOperatingRhythmEngine, buildQuickUpdateIntelligenceEngine, buildReportIntelligenceEngine, buildRiskAndBlockerEngine, buildTimeAndAttentionEngine, buildWorkflowGovernanceEngine } from "@/server/services/workday-workbook-engines";

const now = new Date("2026-08-29T14:00:00.000Z");
const boardDay: BoardDay = {
  id: "board-day-1",
  date: new Date("2026-08-29T00:00:00.000Z"),
  generationStatus: "GENERATED",
  generatedAt: now,
  generatedByUserId: null,
  createdAt: now,
  updatedAt: now
};

function workbook(overrides: Partial<WorkdayWorkbookRecord> = {}): WorkdayWorkbookRecord {
  return {
    id: "workbook-1",
    boardDayId: boardDay.id,
    boardDay,
    userId: "user-1",
    scope: WorkdayWorkbookScope.STAFF,
    status: "ACTIVE",
    closedAt: null,
    closedByUserId: null,
    closeSnapshot: null,
    createdAt: now,
    updatedAt: now,
    checklistItems: [],
    dailyFocusItems: [
      {
        id: "focus-1",
        workbookId: "workbook-1",
        outcome: "Complete customer promise review",
        mustCloseToday: true,
        priority: WorkdayPriority.CRITICAL,
        riskLevel: WorkdayRiskLevel.WATCH,
        riskNote: "Waiting on one callback.",
        supportNeeded: "Manager backup if no response.",
        progressUpdate: "",
        lastProgressAt: null,
        status: WorkdayDailyFocusStatus.PLANNED,
        sortOrder: 0,
        convertedTaskId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    quickUpdates: [],
    reportSeeds: [],
    reportDrafts: [],
    carryovers: [],
    supportActions: [],
    activitySignals: [],
    attentionSessions: [],
    ...overrides
  };
}

function activitySignal(actionType: string, occurredAt = now): WorkdayWorkbookRecord["activitySignals"][number] {
  return {
    id: `activity-${actionType}`,
    workbookId: "workbook-1",
    boardDayId: "board-day-1",
    actorUserId: "user-1",
    sourceModule: "COO_WORKBOOK",
    sourceType: "WORKBOOK_ACTIVITY",
    sourceId: actionType,
    actionType,
    purpose: WorkdayActivityPurpose.PLANNED_WORK,
    businessImpact: `${actionType} happened.`,
    reportRelevant: false,
    coachingRelevant: true,
    metadata: {},
    occurredAt,
    createdAt: occurredAt
  };
}

describe("workday workbook engines", () => {
  it("scores Daily Planning from focus, must-close, risk, and support signals", () => {
    const planning = buildDailyPlanningEngine(workbook());

    expect(planning).toMatchObject({
      focusItemCount: 1,
      mustCloseCount: 1,
      riskItemCount: 1,
      supportNeededCount: 1,
      suggestedFirstAction: "Complete customer promise review",
      status: "NEEDS_SUPPORT"
    });
    expect(planning.staffGuidance).toBe("Review focus items already marked watch or blocked.");
  });

  it("guides staff to add focus when the day has no plan", () => {
    const planning = buildDailyPlanningEngine(workbook({ dailyFocusItems: [] }));

    expect(planning.score).toBe(0);
    expect(planning.status).toBe("NEEDS_SUPPORT");
    expect(planning.staffGuidance).toBe("Add the top three outcomes before work gets busy.");
  });

  it("tracks execution across focus, checklist, quick updates, and task conversions", () => {
    const execution = buildExecutionTrackingEngine(workbook({
      checklistItems: [
        {
          id: "checklist-1",
          workbookId: "workbook-1",
          text: "Call customer",
          status: WorkdayChecklistStatus.GREEN,
          priority: WorkdayPriority.HIGH,
          riskLevel: WorkdayRiskLevel.NONE,
          riskNote: "",
          update: "Customer reached.",
          done: true,
          carryoverReady: false,
          convertedTaskId: "task-1",
          createdAt: now,
          updatedAt: now
        }
      ],
      quickUpdates: [
        {
          id: "quick-1",
          workbookId: "workbook-1",
          text: "Unexpected vendor visit.",
          category: WorkdayQuickUpdateCategory.VENDOR,
          person: "AJ",
          company: "Roof vendor",
          followUpNeeded: false,
          dueWindow: "",
          carryoverReady: false,
          convertedTaskId: null,
          createdAt: now,
          updatedAt: now
        }
      ]
    }));

    expect(execution).toMatchObject({
      plannedWorkCount: 2,
      completedWorkCount: 1,
      unplannedWorkCount: 1,
      taskConversionCount: 1,
      unfinishedWorkCount: 1
    });
    expect(execution.executionSummary).toBe("1 of 2 planned item(s) complete with 1 unplanned update(s).");
  });

  it("surfaces blockers, follow-up risk, and tomorrow carryover candidates", () => {
    const risk = buildRiskAndBlockerEngine(workbook({
      quickUpdates: [
        {
          id: "quick-1",
          workbookId: "workbook-1",
          text: "Customer needs a follow-up.",
          category: WorkdayQuickUpdateCategory.CUSTOMER,
          person: "Jordan",
          company: "",
          followUpNeeded: true,
          dueWindow: "",
          carryoverReady: false,
          convertedTaskId: null,
          createdAt: now,
          updatedAt: now
        }
      ]
    }), { approvalCount: 1, handoffCount: 0, reportExceptions: 1 });

    expect(risk.blockerCount).toBe(3);
    expect(risk.missingDueWindowCount).toBe(1);
    expect(risk.blockerQueue.map((item) => item.sourceType)).toContain("QUICK_UPDATE");
    expect(risk.blockerQueue.map((item) => item.sourceType)).toContain("QUICK_UPDATE_INTELLIGENCE");
    expect(risk.tomorrowCarryoverCandidates.map((item) => item.title)).toContain("Complete customer promise review");
    expect(risk.staffGuidance).toBe("Resolve or assign support for blocked work before close.");
  });

  it("classifies Quick Updates into operational intelligence", () => {
    const intelligence = buildQuickUpdateIntelligenceEngine(workbook({
      quickUpdates: [
        {
          id: "quick-1",
          workbookId: "workbook-1",
          text: "Customer is upset and needs authorization callback before close.",
          category: WorkdayQuickUpdateCategory.CUSTOMER,
          person: "Jordan",
          company: "",
          followUpNeeded: true,
          dueWindow: "",
          carryoverReady: false,
          convertedTaskId: null,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "quick-2",
          workbookId: "workbook-1",
          text: "Roof vendor stopped by with next-week timing.",
          category: WorkdayQuickUpdateCategory.FACILITY,
          person: "AJ",
          company: "Roof vendor",
          followUpNeeded: false,
          dueWindow: "",
          carryoverReady: false,
          convertedTaskId: null,
          createdAt: now,
          updatedAt: now
        }
      ]
    }));

    expect(intelligence).toMatchObject({
      totalCount: 2,
      highImpactCount: 1,
      followUpGapCount: 1,
      reportWorthyCount: 2,
      supportSignalCount: 1
    });
    expect(intelligence.items[0]).toMatchObject({
      signalType: "CUSTOMER_RISK",
      confidence: "HIGH",
      recommendedAction: "Add a follow-up date or convert this into a formal task."
    });
  });

  it("turns workbook signals into coaching and accountability guidance", () => {
    const coaching = buildCoachingAndAccountabilityEngine(workbook(), { approvalCount: 1, handoffCount: 0, reportExceptions: 0 });

    expect(coaching).toMatchObject({
      status: "NEEDS_SUPPORT",
      supportNeededPrompt: "Support is needed to keep at least one item moving.",
      managerSummary: "0 of 1 planned item(s) complete, 1 blocker(s), 1 carryover candidate(s)."
    });
    expect(coaching.opportunities).toContain("Ask for support on blocked work now.");
    expect(coaching.strengths).toContain("The next improvement is to make the day visible early.");
  });

  it("builds source-backed report intelligence without promoted excluded seeds", () => {
    const reporting = buildReportIntelligenceEngine(workbook({
      reportSeeds: [
        {
          id: "seed-1",
          workbookId: "workbook-1",
          sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
          sourceId: "checklist-1",
          sourceHref: null,
          title: "Included work",
          detail: "Use this.",
          tone: WorkdayReportSeedTone.GREEN,
          status: WorkdayReportSeedStatus.INCLUDED,
          reviewNote: "",
          createdAt: now,
          updatedAt: now
        },
        {
          id: "seed-2",
          workbookId: "workbook-1",
          sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
          sourceId: "noise",
          sourceHref: null,
          title: "Excluded noise",
          detail: "Do not use.",
          tone: WorkdayReportSeedTone.BLUE,
          status: WorkdayReportSeedStatus.EXCLUDED,
          reviewNote: "",
          createdAt: now,
          updatedAt: now
        }
      ]
    }));

    expect(reporting.includedSeedCount).toBe(1);
    expect(reporting.excludedSeedCount).toBe(1);
    expect(reporting.dailyDraftInputs.map((item) => item.title)).toEqual(["Included work"]);
    expect(reporting.auditTrail).toEqual([{ sourceId: "seed-1", sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM }]);
  });

  it("classifies activity intelligence from app activity signals", () => {
    const intelligence = buildActivityIntelligenceEngine(workbook({
      activitySignals: [
        {
          id: "activity-1",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "TASKS",
          sourceType: "TASK_ACTIVITY",
          sourceId: "task-1",
          actionType: "task.completed",
          purpose: WorkdayActivityPurpose.COMPLETED_WORK,
          businessImpact: "Completed customer callback.",
          reportRelevant: true,
          coachingRelevant: true,
          metadata: {},
          occurredAt: now,
          createdAt: now
        },
        {
          id: "activity-2",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "REPAIR_ORDERS",
          sourceType: "ACTIVITY_EVENT",
          sourceId: "event-1",
          actionType: "repair.blocker_raised",
          purpose: WorkdayActivityPurpose.BLOCKER_RISK,
          businessImpact: "Parts delay needs support.",
          reportRelevant: true,
          coachingRelevant: true,
          metadata: {},
          occurredAt: now,
          createdAt: now
        }
      ]
    }));

    expect(intelligence).toMatchObject({
      blockerRiskCount: 1,
      completedWorkCount: 1,
      reportRelevantCount: 2,
      signalCount: 2,
      status: "NEEDS_SUPPORT"
    });
    expect(intelligence.staffGuidance).toBe("1 completed work signal(s) captured from the app.");
  });

  it("summarizes time and attention by workbook area", () => {
    const attention = buildTimeAndAttentionEngine(workbook({
      attentionSessions: [
        {
          id: "attention-1",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          userId: "user-1",
          sourceArea: "COO_WORKBOOK_EFFECTIVENESS",
          sourcePath: "/vehicles/coo-workbook/effectiveness-pilot",
          sessionKey: "session-1",
          activeSeconds: 360,
          idleSeconds: 60,
          startedAt: now,
          lastHeartbeatAt: now,
          endedAt: null,
          metadata: {},
          createdAt: now,
          updatedAt: now
        },
        {
          id: "attention-2",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          userId: "user-1",
          sourceArea: "QUICK_UPDATE",
          sourcePath: "/vehicles/coo-workbook/quick-update",
          sessionKey: "session-2",
          activeSeconds: 120,
          idleSeconds: 0,
          startedAt: now,
          lastHeartbeatAt: now,
          endedAt: null,
          metadata: {},
          createdAt: now,
          updatedAt: now
        }
      ]
    }));

    expect(attention).toMatchObject({
      activeMinutes: 8,
      idleMinutes: 1,
      sessionCount: 2,
      status: "NEEDS_REVIEW"
    });
    expect(attention.areas[0]).toEqual({ activeMinutes: 6, area: "COO_WORKBOOK_EFFECTIVENESS" });
  });

  it("moves to End The Day when important work has a disposition", () => {
    const governance = buildWorkflowGovernanceEngine(workbook({
      dailyFocusItems: [
        {
          ...workbook().dailyFocusItems[0],
          progressUpdate: "Customer promise review complete.",
          riskLevel: WorkdayRiskLevel.NONE,
          riskNote: "",
          status: WorkdayDailyFocusStatus.DONE,
          supportNeeded: ""
        }
      ]
    }), { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, new Date("2026-08-29T18:00:00.000Z"));

    expect(governance.currentPhase).toBe("END");
    expect(governance.currentStage).toBe("CLOSE_THE_DAY");
    expect(governance.endTheDayEligibilityScore).toBeGreaterThanOrEqual(80);
    expect(governance.allImportantItemsDispositioned).toBe(true);
    expect(governance.allowedActions).toMatchObject({
      canAskForSupport: true,
      canCloseDay: true,
      canEdit: true,
      canReopenDay: false
    });
  });

  it("explains why the workflow is not ready to end the day", () => {
    const governance = buildWorkflowGovernanceEngine(workbook({
      dailyFocusItems: [
        {
          ...workbook().dailyFocusItems[0],
          progressUpdate: "",
          riskLevel: WorkdayRiskLevel.NONE,
          riskNote: "",
          supportNeeded: ""
        }
      ],
      quickUpdates: [
        {
          id: "quick-missing-due",
          workbookId: "workbook-1",
          text: "Customer needs a callback.",
          category: WorkdayQuickUpdateCategory.CUSTOMER,
          person: "Maria",
          company: "",
          followUpNeeded: true,
          dueWindow: "",
          carryoverReady: false,
          convertedTaskId: null,
          createdAt: now,
          updatedAt: now
        }
      ]
    }), { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, new Date("2026-08-29T18:00:00.000Z"));

    expect(governance.currentPhase).toBe("WORK");
    expect(governance.unresolvedAttentionCount).toBe(2);
    expect(governance.closeBlockers).toEqual(expect.arrayContaining([
      "1 focus item(s) need done, carryover, task, support, or progress decision.",
      "1 follow-up(s) need a due window, task, or carryover decision."
    ]));
  });

  it("does not recommend preparing carryover again after the source item already has carryover", () => {
    const lateDayWorkbook = workbook({
      carryovers: [
        {
          id: "carryover-1",
          workbookId: "workbook-1",
          sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
          sourceId: "daily-focus:focus-1",
          sourceHref: "/vehicles/coo-workbook/effectiveness-pilot",
          title: "Complete customer promise review",
          detail: "Daily focus item needs tomorrow ownership.",
          status: WorkdayCarryoverStatus.CONFIRMED,
          targetBoardDate: new Date("2026-08-30T00:00:00.000Z"),
          convertedTaskId: null,
          dismissedReason: "",
          confirmedAt: now,
          dismissedAt: null,
          convertedAt: null,
          createdAt: now,
          updatedAt: now
        }
      ],
      dailyFocusItems: [
        {
          ...workbook().dailyFocusItems[0],
          progressUpdate: "",
          riskLevel: WorkdayRiskLevel.NONE,
          riskNote: "",
          supportNeeded: ""
        }
      ]
    });

    const risk = buildRiskAndBlockerEngine(lateDayWorkbook);
    const governance = buildWorkflowGovernanceEngine(lateDayWorkbook, { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, new Date("2026-08-29T21:30:00.000Z"));

    expect(risk.tomorrowCarryoverCandidates).toHaveLength(0);
    expect(governance.closeBlockers).not.toContain("1 focus item(s) need done, carryover, task, support, or progress decision.");
    expect(governance.currentStage).not.toBe("PREPARE_TOMORROW");
  });

  it("does not recommend ending the day when attention remains after carryover is confirmed", () => {
    const lateDayWorkbook = workbook({
      carryovers: [
        {
          id: "carryover-1",
          workbookId: "workbook-1",
          sourceType: WorkdayReportSeedSourceType.OPERATING_EXCEPTION,
          sourceId: "daily-focus:focus-1",
          sourceHref: "/vehicles/coo-workbook/effectiveness-pilot",
          title: "Complete customer promise review",
          detail: "Daily focus item needs tomorrow ownership.",
          status: WorkdayCarryoverStatus.CONFIRMED,
          targetBoardDate: new Date("2026-08-30T00:00:00.000Z"),
          convertedTaskId: null,
          dismissedReason: "",
          confirmedAt: now,
          dismissedAt: null,
          convertedAt: null,
          createdAt: now,
          updatedAt: now
        }
      ],
      dailyFocusItems: [
        {
          ...workbook().dailyFocusItems[0],
          progressUpdate: "",
          riskLevel: WorkdayRiskLevel.NONE,
          riskNote: "",
          supportNeeded: ""
        }
      ]
    });

    const governance = buildWorkflowGovernanceEngine(lateDayWorkbook, { approvalCount: 0, handoffCount: 0, reportExceptions: 12 }, new Date("2026-08-29T21:30:00.000Z"));

    expect(governance.currentPhase).toBe("WORK");
    expect(governance.currentStage).toBe("ASK_FOR_SUPPORT");
    expect(governance.nextRecommendedAction).toBe("Review needs-attention work before ending the day.");
  });

  it("keeps End The Day from being recommended before Start The Day evidence exists", () => {
    const lateDayWorkbook = workbook({
      dailyFocusItems: [],
      checklistItems: [],
      quickUpdates: [],
      carryovers: [],
      reportDrafts: [],
      reportSeeds: [
        {
          id: "seed-ready",
          workbookId: "workbook-1",
          sourceType: WorkdayReportSeedSourceType.CHECKLIST_ITEM,
          sourceId: "checklist-1",
          sourceHref: null,
          title: "Ready report note",
          detail: "Reviewed and ready.",
          tone: WorkdayReportSeedTone.GREEN,
          status: WorkdayReportSeedStatus.INCLUDED,
          reviewNote: "",
          createdAt: now,
          updatedAt: now
        }
      ]
    });
    const governance = buildWorkflowGovernanceEngine(lateDayWorkbook, { approvalCount: 0, handoffCount: 0, reportExceptions: 0 }, new Date("2026-08-29T21:30:00.000Z"));
    const rhythm = buildOperatingRhythmEngine(lateDayWorkbook, governance, new Date("2026-08-29T21:30:00.000Z"));

    expect(governance.currentStage).toBe("START_THE_DAY");
    expect(governance.currentPhase).toBe("START");
    expect(governance.closeBlockers).toContain("Start The Day needs to be completed before End The Day can be recommended.");
    expect(rhythm.endTheDay.state).toBe("START_REQUIRED");
    expect(rhythm.endTheDay.message).toBe("Start The Day before End The Day reminders begin.");
  });

  it("treats workbook start activity as Start The Day evidence for reminders", () => {
    const rhythm = buildOperatingRhythmEngine(workbook({
      dailyFocusItems: [],
      activitySignals: [activitySignal("workbook.daily_focus_created")]
    }), undefined, new Date("2026-08-29T14:00:00.000Z"));

    expect(rhythm.startTheDay).toMatchObject({
      complete: true,
      state: "COMPLETE"
    });
    expect(rhythm.endTheDay.state).toBe("QUIET");
  });

  it("governs Start The Day reminders before requiring a reason", () => {
    const rhythm = buildOperatingRhythmEngine(workbook({
      dailyFocusItems: [],
      activitySignals: [
        {
          id: "rhythm-1",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "COO_WORKBOOK",
          sourceType: "OPERATING_RHYTHM",
          sourceId: "reminder-1",
          actionType: "workbook.rhythm_start_reminder_shown",
          purpose: WorkdayActivityPurpose.LEARNING_COACHING_SIGNAL,
          businessImpact: "Reminder 1",
          reportRelevant: false,
          coachingRelevant: true,
          metadata: {},
          occurredAt: new Date("2026-08-29T13:00:00.000Z"),
          createdAt: now
        },
        {
          id: "rhythm-2",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "COO_WORKBOOK",
          sourceType: "OPERATING_RHYTHM",
          sourceId: "reminder-2",
          actionType: "workbook.rhythm_start_reminder_shown",
          purpose: WorkdayActivityPurpose.LEARNING_COACHING_SIGNAL,
          businessImpact: "Reminder 2",
          reportRelevant: false,
          coachingRelevant: true,
          metadata: {},
          occurredAt: new Date("2026-08-29T14:00:00.000Z"),
          createdAt: now
        },
        {
          id: "rhythm-3",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "COO_WORKBOOK",
          sourceType: "OPERATING_RHYTHM",
          sourceId: "reminder-3",
          actionType: "workbook.rhythm_start_reminder_shown",
          purpose: WorkdayActivityPurpose.LEARNING_COACHING_SIGNAL,
          businessImpact: "Reminder 3",
          reportRelevant: false,
          coachingRelevant: true,
          metadata: {},
          occurredAt: new Date("2026-08-29T15:00:00.000Z"),
          createdAt: now
        }
      ]
    }));

    expect(rhythm.startTheDay).toMatchObject({
      complete: false,
      reminderCount: 3,
      remainingReminders: 0,
      state: "LOCKED_UNTIL_REASON"
    });
  });

  it("starts a new reminder cycle after staff explains why the day cannot start yet", () => {
    const rhythm = buildOperatingRhythmEngine(workbook({
      dailyFocusItems: [],
      activitySignals: [
        {
          id: "reason-1",
          workbookId: "workbook-1",
          boardDayId: "board-day-1",
          actorUserId: "user-1",
          sourceModule: "COO_WORKBOOK",
          sourceType: "OPERATING_RHYTHM",
          sourceId: "reason-1",
          actionType: "workbook.rhythm_start_delay_explained",
          purpose: WorkdayActivityPurpose.LEARNING_COACHING_SIGNAL,
          businessImpact: "Eli explained why Start The Day cannot happen yet: urgent customer issue.",
          reportRelevant: false,
          coachingRelevant: true,
          metadata: {},
          occurredAt: new Date("2026-08-29T15:05:00.000Z"),
          createdAt: now
        }
      ]
    }));

    expect(rhythm.startTheDay).toMatchObject({
      explanationCount: 1,
      reminderCount: 0,
      remainingReminders: 3,
      state: "REASON_ACCEPTED"
    });
  });

  it("opens End The Day preparation reminders at 3 PM and active preparation at 4 PM Central", () => {
    const notice = buildOperatingRhythmEngine(workbook(), undefined, new Date("2026-08-29T20:05:00.000Z"));
    const active = buildOperatingRhythmEngine(workbook(), undefined, new Date("2026-08-29T21:05:00.000Z"));

    expect(notice.endTheDay).toMatchObject({
      state: "PREP_NOTICE",
      readinessScore: expect.any(Number)
    });
    expect(notice.endTheDay.message).toContain("starts at 4 PM");
    expect(active.endTheDay.state).toBe("ACTIVE");
    expect(active.endTheDay.message).toContain("preparation is active");
  });
});
