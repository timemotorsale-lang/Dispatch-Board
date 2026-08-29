import {
  WorkdayChecklistStatus,
  WorkdayDailyFocusStatus,
  WorkdayPriority,
  WorkdayQuickUpdateCategory,
  WorkdayRiskLevel,
  WorkdayWorkbookScope,
  type BoardDay
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import { buildCoachingAndAccountabilityEngine, buildDailyPlanningEngine, buildExecutionTrackingEngine, buildRiskAndBlockerEngine } from "@/server/services/workday-workbook-engines";

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
    ...overrides
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

    expect(risk.blockerCount).toBe(2);
    expect(risk.missingDueWindowCount).toBe(1);
    expect(risk.blockerQueue.map((item) => item.sourceType)).toContain("QUICK_UPDATE");
    expect(risk.tomorrowCarryoverCandidates.map((item) => item.title)).toContain("Complete customer promise review");
    expect(risk.staffGuidance).toBe("Resolve or assign support for blocked work before close.");
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
});
