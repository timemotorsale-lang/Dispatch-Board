import {
  WorkdayDailyFocusStatus,
  WorkdayPriority,
  WorkdayRiskLevel,
  WorkdayWorkbookScope,
  type BoardDay
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { WorkdayWorkbookRecord } from "@/server/repositories/workday-workbook-repository";
import { buildDailyPlanningEngine } from "@/server/services/workday-workbook-engines";

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
});
