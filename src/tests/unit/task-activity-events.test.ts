import { BoardGenerationStatus, TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskAssignmentRepository } from "@/server/repositories/task-assignment-repository";
import type { TaskCreateRepository } from "@/server/repositories/task-create-repository";
import type { TaskStatusRepository } from "@/server/repositories/task-status-repository";
import { createManualTask } from "@/server/services/task-create-service";
import { updateTaskAssignment } from "@/server/services/task-assignment-service";
import { updateTaskStatus } from "@/server/services/task-status-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

const { recordBoardActivityEvent } = vi.hoisted(() => ({
  recordBoardActivityEvent: vi.fn()
}));

vi.mock("@/server/services/activity-feed", () => ({
  recordBoardActivityEvent
}));

function createTaskCreateRepositoryHarness() {
  return {
    repository: {
      async findAssignedUserById(userId: string) {
        return {
          id: userId,
          name: "Baraka Sales",
          email: "jordan.sales@local.test",
          isActive: true
        };
      },
      async getOrCreateBoardDay(boardDate: string) {
        return {
          id: "board-day-1",
          date: new Date(`${boardDate}T00:00:00.000Z`),
          generationStatus: BoardGenerationStatus.NOT_STARTED,
          generatedAt: null,
          generatedByUserId: null,
          createdAt: new Date("2026-06-28T15:00:00.000Z"),
          updatedAt: new Date("2026-06-28T15:00:00.000Z")
        };
      },
      async createTask(input: {
        assignedUserId: string;
        boardDayId: string;
        completedAt: Date | null;
        createdByUserId: string;
        customerReference?: string;
        description: string;
        dueAt: Date;
        readyForReviewAt: Date | null;
        requiresManagerApproval: boolean;
        reviewedByUserId: string | null;
        status: TaskStatus;
        title: string;
        vehicleReference?: string;
        workflowArea: WorkflowArea;
      }) {
        return {
          id: "task-1",
          title: input.title,
          description: input.description,
          status: input.status,
          dueAt: input.dueAt,
          workflowArea: input.workflowArea,
          sourceType: TaskSourceType.MANAGER,
          requiresManagerApproval: input.requiresManagerApproval,
          vehicleReference: input.vehicleReference ?? null,
          customerReference: input.customerReference ?? null,
          blockerReason: null,
          readyForReviewAt: input.readyForReviewAt,
          completedAt: input.completedAt,
          createdAt: new Date("2026-06-28T15:00:00.000Z"),
          updatedAt: new Date("2026-06-28T15:00:00.000Z"),
          boardDay: {
            id: input.boardDayId,
            date: new Date("2026-06-28T00:00:00.000Z")
          },
          assignedUser: {
            id: input.assignedUserId,
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          },
          createdByUser: {
            id: input.createdByUserId,
            name: "Eli Manager",
            email: "morgan.manager@local.test"
          },
          reviewedByUser: null
        };
      },
      supportsActivityEvents: true
    } satisfies TaskCreateRepository
  };
}

function createTaskAssignmentRepositoryHarness() {
  return {
    repository: {
      async findTaskById() {
        return {
          id: "task-1",
          title: "Review sales follow-up tasks",
          boardDayId: "board-day-1",
          assignedUserId: "user-jordan.sales@local.test",
          recommendedUserId: "user-jordan.sales@local.test",
          assignedUser: {
            id: "user-jordan.sales@local.test",
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          },
          recommendedUser: {
            id: "user-jordan.sales@local.test",
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          },
          recommendationReasonCode: "DIRECT_DUTY_MATCH",
          recommendationExplanation:
            "Recommended because this task matches the direct duty Follow up with assigned leads.",
          sourceTemplateId: null,
          sourceType: TaskSourceType.MANAGER,
          updatedAt: new Date("2026-06-28T15:00:00.000Z")
        };
      },
      async findAssignableUserById(userId: string) {
        return {
          id: userId,
          name: "Walter Mechanic",
          email: "casey.mechanic@local.test",
          isActive: true
        };
      },
      async findGeneratedAssignmentConflict() {
        return null;
      },
      async updateTaskAssignment() {
        return {
          id: "task-1",
          title: "Review sales follow-up tasks",
          boardDayId: "board-day-1",
          assignedUserId: "user-casey.mechanic@local.test",
          recommendedUserId: "user-jordan.sales@local.test",
          sourceType: TaskSourceType.MANAGER,
          sourceTemplateId: null,
          assignedUser: {
            id: "user-casey.mechanic@local.test",
            name: "Walter Mechanic",
            email: "casey.mechanic@local.test"
          },
          recommendedUser: {
            id: "user-jordan.sales@local.test",
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          },
          recommendationReasonCode: "DIRECT_DUTY_MATCH",
          recommendationExplanation:
            "Recommended because this task matches the direct duty Follow up with assigned leads.",
          updatedAt: new Date("2026-06-28T15:45:00.000Z")
        };
      },
      supportsActivityEvents: true
    } satisfies TaskAssignmentRepository
  };
}

function createTaskStatusRepositoryHarness(initialTask?: Partial<{
  assignedUserId: string;
  boardDayId: string;
  blockerReason: string | null;
  completedAt: Date | null;
  readyForReviewAt: Date | null;
  requiresManagerApproval: boolean;
  reviewedByUserId: string | null;
  status: TaskStatus;
  title: string;
  updatedAt: Date;
}>) {
  const task = {
    id: "task-1",
    assignedUserId: "user-jordan.sales@local.test",
    boardDayId: "board-day-1",
    title: "Review sold vehicle prep",
    requiresManagerApproval: true,
    status: TaskStatus.IN_PROGRESS,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    reviewedByUserId: null,
    updatedAt: new Date("2026-06-28T15:00:00.000Z"),
    ...initialTask
  };

  return {
    repository: {
      async findTaskById() {
        return task;
      },
      async updateTaskStatus(
        _taskId: string,
        data: {
          status: TaskStatus;
          blockerReason?: string | null;
          readyForReviewAt?: Date | null;
          completedAt?: Date | null;
          reviewedByUserId?: string | null;
        }
      ) {
        task.status = data.status;
        if (data.blockerReason !== undefined) task.blockerReason = data.blockerReason;
        if (data.readyForReviewAt !== undefined) task.readyForReviewAt = data.readyForReviewAt;
        if (data.completedAt !== undefined) task.completedAt = data.completedAt;
        if (data.reviewedByUserId !== undefined) task.reviewedByUserId = data.reviewedByUserId;
        task.updatedAt = new Date("2026-06-28T15:30:00.000Z");

        return task;
      },
      supportsActivityEvents: true
    } satisfies TaskStatusRepository
  };
}

describe("task activity events", () => {
  beforeEach(() => {
    recordBoardActivityEvent.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-28T15:30:00.000Z"));
  });

  it("records an activity event when a manager creates a manual task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const assignee = usersByEmail.get("jordan.sales@local.test");
    const { repository } = createTaskCreateRepositoryHarness();

    await createManualTask(
      managerUser,
      {
        assignedUserId: assignee?.id,
        boardDate: "2026-06-28",
        dueAt: "2026-06-28T17:00:00.000Z",
        requiresManagerApproval: true,
        title: "Review hot lead",
        workflowArea: WorkflowArea.SALES
      },
      repository
    );

    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: managerUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.created",
      message: "Eli Manager created Review hot lead for Baraka Sales.",
      metadata: {
        assignedUserId: assignee?.id ?? "",
        assignedUserName: "Baraka Sales",
        requiresManagerApproval: true
      },
      taskId: "task-1"
    });
  });

  it("records an activity event when a manager overrides a recommendation during reassignment", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskAssignmentRepositoryHarness();

    await updateTaskAssignment(
      managerUser,
      "task-1",
      {
        assignedUserId: "user-casey.mechanic@local.test"
      },
      repository
    );

    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: managerUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.reassigned",
      message:
        "Eli Manager reassigned Review sales follow-up tasks from Baraka Sales to Walter Mechanic, overriding the recommendation for Baraka Sales.",
      metadata: {
        nextAssignedUserId: "user-casey.mechanic@local.test",
        nextAssignedUserName: "Walter Mechanic",
        previousAssignedUserId: "user-jordan.sales@local.test",
        previousAssignedUserName: "Baraka Sales",
        recommendedUserId: "user-jordan.sales@local.test",
        recommendedUserName: "Baraka Sales"
      },
      taskId: "task-1"
    });
  });

  it("records an activity event when staff moves approval-required work to ready for review", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskStatusRepositoryHarness();

    await updateTaskStatus(
      staffUser,
      "task-1",
      {
        status: TaskStatus.READY_FOR_REVIEW
      },
      repository,
      {
        taskAppointmentAutomationRunner: vi.fn()
      }
    );

    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: staffUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.ready_for_review",
      message: "Baraka Sales marked Review sold vehicle prep ready for review.",
      metadata: {
        nextStatus: TaskStatus.READY_FOR_REVIEW,
        previousStatus: TaskStatus.IN_PROGRESS
      },
      taskId: "task-1"
    });
  });

  it("records an activity event when a manager approves a ready-for-review task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskStatusRepositoryHarness({
      readyForReviewAt: new Date("2026-06-28T15:10:00.000Z"),
      status: TaskStatus.READY_FOR_REVIEW
    });

    await updateTaskStatus(
      managerUser,
      "task-1",
      {
        status: TaskStatus.COMPLETED
      },
      repository
    );

    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: managerUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.completed",
      message: "Eli Manager approved completion for Review sold vehicle prep.",
      metadata: {
        nextStatus: TaskStatus.COMPLETED,
        previousStatus: TaskStatus.READY_FOR_REVIEW
      },
      taskId: "task-1"
    });
  });
});
