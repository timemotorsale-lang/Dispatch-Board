import { TaskStatus, WorkRecommendationStatus, WorkflowArea } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { AvailableWorkCandidate, AvailableWorkRepository } from "@/server/repositories/available-work-repository";
import { claimAvailableWork, dismissAvailableWork, getAvailableWork, scoreAvailableWorkCandidate } from "@/server/services/available-work";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Baraka Sales",
  email: "staff@example.com",
  isActive: true,
  roles: ["Sales"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

function candidate(overrides: Partial<AvailableWorkCandidate> = {}): AvailableWorkCandidate {
  return {
    id: "task-1",
    title: "Follow up with customer",
    description: "Confirm the customer's next step.",
    priority: "HIGH",
    dueAt: new Date("2026-07-11T15:00:00.000Z"),
    workflowArea: WorkflowArea.SALES,
    sourceDutyId: "duty-1",
    assignedUserId: "manager-1",
    blockerReason: null,
    status: TaskStatus.NOT_STARTED,
    isClaimable: true,
    requiresManagerApproval: false,
    recommendedUserId: null,
    ...overrides
  };
}

const flags = {
  enabled: true,
  startDayGateEnabled: true,
  taskAcceptanceEnabled: true,
  availableWorkEnabled: true,
  endOfDayReportEnabled: false,
  managerHealthEnabled: false
};

describe("available work recommendations", () => {
  it("scores critical, overdue, workflow, and direct-duty matches deterministically", () => {
    const result = scoreAvailableWorkCandidate({
      candidate: candidate({ priority: "CRITICAL", dueAt: new Date("2026-07-11T12:00:00.000Z") }),
      dutyIds: new Set(["duty-1"]),
      workflowAreas: new Set([WorkflowArea.SALES]),
      activeWorkCount: 2,
      now: new Date("2026-07-11T14:00:00.000Z")
    });

    expect(result.breakdown).toEqual({
      availability: 15,
      continuity: 0,
      dutyMatch: 25,
      penalties: 0,
      priorityUrgency: 23,
      workloadCapacity: 8,
      workflowMatch: 25
    });
    expect(result.score).toBe(96);
    expect(result.explanation).toContain("Task is overdue");
  });

  it("persists only eligible workflow matches in stable rank order", async () => {
    const matching = candidate();
    const wrongWorkflow = candidate({ id: "task-2", workflowArea: WorkflowArea.SHOP, sourceDutyId: null });
    const replaceShownRecommendations = vi.fn(async (_staffDayId, inputs) => inputs.map((input) => ({
      id: `recommendation-${input.taskId}`,
      rank: input.rank,
      score: input.score,
      scoreBreakdown: input.scoreBreakdown,
      explanation: input.explanation,
      status: WorkRecommendationStatus.SHOWN,
      dismissalReasonCode: null,
      task: input.taskId === matching.id ? matching : wrongWorkflow
    })));
    const repository: AvailableWorkRepository = {
      findStaffDay: vi.fn(async () => ({
        id: "staff-day-1",
        boardDayId: "board-1",
        startAcknowledgedAt: new Date("2026-07-11T13:00:00.000Z"),
        dutyItems: [{ sourceDutyId: "duty-1", workflowArea: WorkflowArea.SALES }]
      })),
      countActiveAssignedTasks: vi.fn(async () => 1),
      listClaimableTasks: vi.fn(async () => [wrongWorkflow, matching]),
      replaceShownRecommendations,
      claimRecommendation: vi.fn(),
      dismissRecommendation: vi.fn()
    };

    const result = await getAvailableWork(staff, "2026-07-11", {
      flags,
      now: () => new Date("2026-07-11T14:00:00.000Z"),
      repository
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.task.id).toBe(matching.id);
    expect(replaceShownRecommendations).toHaveBeenCalledWith("staff-day-1", [expect.objectContaining({ taskId: matching.id, rank: 1 })]);
  });

  it("requires Start Day before exposing recommendations", async () => {
    const repository: AvailableWorkRepository = {
      findStaffDay: vi.fn(async () => ({ id: "staff-day-1", boardDayId: "board-1", startAcknowledgedAt: null, dutyItems: [] })),
      countActiveAssignedTasks: vi.fn(async () => 0),
      listClaimableTasks: vi.fn(async () => []),
      replaceShownRecommendations: vi.fn(async () => []),
      claimRecommendation: vi.fn(),
      dismissRecommendation: vi.fn()
    };

    await expect(getAvailableWork(staff, "2026-07-11", { flags, repository })).rejects.toThrow("Start Day must be completed");
  });

  it("claims atomically through the repository and records an audit event", async () => {
    const claimRecommendation = vi.fn(async () => ({ boardDayId: "board-1", recommendationId: "rec-1", taskId: "task-1", taskTitle: "Follow up with customer" }));
    const recordActivity = vi.fn(async () => undefined);
    const repository = {
      findStaffDay: vi.fn(), countActiveAssignedTasks: vi.fn(), listClaimableTasks: vi.fn(), replaceShownRecommendations: vi.fn(), dismissRecommendation: vi.fn(), claimRecommendation
    } as AvailableWorkRepository;

    const result = await claimAvailableWork(staff, "rec-1", { flags, repository, recordActivity, now: () => new Date("2026-07-11T14:00:00.000Z") });

    expect(result.taskId).toBe("task-1");
    expect(claimRecommendation).toHaveBeenCalledWith("rec-1", staff.id, new Date("2026-07-11T14:00:00.000Z"));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ eventType: "work_recommendation.claimed", taskId: "task-1" }));
  });

  it("requires a supportive dismissal reason and audits a valid decline", async () => {
    const dismissRecommendation = vi.fn(async () => ({ boardDayId: "board-1", recommendationId: "rec-1", taskId: "task-1", taskTitle: "Follow up with customer" }));
    const recordActivity = vi.fn(async () => undefined);
    const repository = {
      findStaffDay: vi.fn(), countActiveAssignedTasks: vi.fn(), listClaimableTasks: vi.fn(), replaceShownRecommendations: vi.fn(), claimRecommendation: vi.fn(), dismissRecommendation
    } as AvailableWorkRepository;

    await expect(dismissAvailableWork(staff, "rec-1", { reasonCode: "PUNISH_ME" }, { flags, repository })).rejects.toThrow("valid dismissal reason");
    await dismissAvailableWork(staff, "rec-1", { reasonCode: "NEED_MANAGER_DIRECTION" }, { flags, repository, recordActivity });
    expect(dismissRecommendation).toHaveBeenCalledWith("rec-1", staff.id, "NEED_MANAGER_DIRECTION");
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ eventType: "work_recommendation.dismissed" }));
  });
});
