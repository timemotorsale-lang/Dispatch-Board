import {
  BoardGenerationStatus,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { TaskAssignmentRepository } from "@/server/repositories/task-assignment-repository";
import type { TaskReadRepository } from "@/server/repositories/task-read-repository";
import { getBoardReadModelForDate } from "@/server/services/board-read";
import { updateTaskAssignment } from "@/server/services/task-assignment-service";
import { getTaskReadModelById } from "@/server/services/task-read";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type WorkflowUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

type WorkflowBoardDay = {
  id: string;
  date: Date;
  generationStatus: BoardGenerationStatus;
  generatedAt: Date | null;
};

type WorkflowTask = {
  id: string;
  boardDayId: string;
  title: string;
  description: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  recommendationReasonCode: string | null;
  recommendationExplanation: string | null;
  status: TaskStatus;
  dueAt: Date;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  requiresManagerApproval: boolean;
  vehicleReference: string | null;
  customerReference: string | null;
  sourceType: TaskSourceType;
  sourceTemplateId: string | null;
  workflowArea: WorkflowArea;
  blockerReason: string | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
};

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function createTaskAssignmentHarness(authUsers: AuthenticatedUser[]) {
  const users = new Map<string, WorkflowUser>(
    authUsers.map((user) => [
      user.id,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    ])
  );
  const boardDays: WorkflowBoardDay[] = [
    {
      id: "board-day-1",
      date: new Date("2026-06-28T00:00:00.000Z"),
      generationStatus: BoardGenerationStatus.GENERATED,
      generatedAt: new Date("2026-06-28T13:00:00.000Z")
    }
  ];
  const tasks: WorkflowTask[] = [
    {
      id: "task-1",
      boardDayId: "board-day-1",
      title: "Review sales follow-up tasks",
      description: "Call hot leads before noon.",
      assignedUserId: "user-jordan.sales@local.test",
      recommendedUserId: "user-jordan.sales@local.test",
      recommendationReasonCode: "DIRECT_DUTY_MATCH",
      recommendationExplanation:
        "Recommended because this task matches the direct duty Follow up with assigned leads.",
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-06-28T17:00:00.000Z"),
      createdByUserId: "user-morgan.manager@local.test",
      createdAt: new Date("2026-06-28T13:05:00.000Z"),
      updatedAt: new Date("2026-06-28T13:05:00.000Z"),
      requiresManagerApproval: false,
      vehicleReference: null,
      customerReference: "Taylor R.",
      sourceType: TaskSourceType.TEMPLATE,
      sourceTemplateId: "template-sales-follow-up",
      workflowArea: WorkflowArea.SALES,
      blockerReason: null,
      readyForReviewAt: null,
      completedAt: null,
      reviewedByUserId: null
    }
  ];

  function getUser(userId: string) {
    return requireValue(users.get(userId), `Missing workflow user ${userId}.`);
  }

  function userSummary(userId: string | null) {
    if (!userId) {
      return null;
    }

    const user = getUser(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  const assignmentRepository: TaskAssignmentRepository = {
    supportsActivityEvents: false,
    async findTaskById(taskId) {
      const task = tasks.find((candidate) => candidate.id === taskId);

      if (!task) {
        return null;
      }

        return {
          ...task,
          assignedUser: requireValue(userSummary(task.assignedUserId), "Assignee is required."),
          recommendedUser: userSummary(task.recommendedUserId),
          recommendationReasonCode: task.recommendationReasonCode,
          recommendationExplanation: task.recommendationExplanation
        };
    },
    async findAssignableUserById(userId) {
      return users.get(userId) ?? null;
    },
    async findGeneratedAssignmentConflict(input) {
      return (
        tasks.find(
          (task) =>
            task.id !== input.excludeTaskId &&
            task.boardDayId === input.boardDayId &&
            task.sourceTemplateId === input.sourceTemplateId &&
            task.assignedUserId === input.assignedUserId &&
            task.sourceType === TaskSourceType.TEMPLATE
        ) ?? null
      );
    },
    async updateTaskAssignment(taskId, assignedUserId) {
      const task = requireValue(
        tasks.find((candidate) => candidate.id === taskId),
        `Missing workflow task ${taskId}.`
      );

      task.assignedUserId = assignedUserId;
      task.updatedAt = new Date("2026-06-28T14:00:00.000Z");

      return {
        ...task,
        assignedUser: requireValue(userSummary(task.assignedUserId), "Assignee is required."),
        recommendedUser: userSummary(task.recommendedUserId),
        recommendationReasonCode: task.recommendationReasonCode,
        recommendationExplanation: task.recommendationExplanation
      };
    }
  };

  const boardRepository: BoardReadRepository = {
    async findBoardDayByDate(boardDate) {
      return (
        boardDays.find((boardDay) => boardDay.date.toISOString().slice(0, 10) === boardDate) ??
        null
      );
    },
    async listTasksForBoardDay(boardDayId) {
      return tasks
        .filter((task) => task.boardDayId === boardDayId)
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          dueAt: task.dueAt,
          workflowArea: task.workflowArea,
          sourceType: task.sourceType,
          requiresManagerApproval: task.requiresManagerApproval,
          vehicleReference: task.vehicleReference,
          customerReference: task.customerReference,
          blockerReason: task.blockerReason,
          readyForReviewAt: task.readyForReviewAt,
          completedAt: task.completedAt,
          assignedUser: requireValue(userSummary(task.assignedUserId), "Assignee is required."),
          recommendedUser: userSummary(task.recommendedUserId),
          recommendationReasonCode: task.recommendationReasonCode,
          recommendationExplanation: task.recommendationExplanation
        }));
    }
  };

  const taskReadRepository: TaskReadRepository = {
    async findTaskById(taskId) {
      const task = tasks.find((candidate) => candidate.id === taskId);

      if (!task) {
        return null;
      }

      const boardDay = requireValue(
        boardDays.find((candidate) => candidate.id === task.boardDayId),
        `Missing board day ${task.boardDayId}.`
      );

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        dueAt: task.dueAt,
        workflowArea: task.workflowArea,
        sourceType: task.sourceType,
        requiresManagerApproval: task.requiresManagerApproval,
        vehicleReference: task.vehicleReference,
        customerReference: task.customerReference,
        blockerReason: task.blockerReason,
        readyForReviewAt: task.readyForReviewAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        boardDay: {
          id: boardDay.id,
          date: boardDay.date
        },
        assignedUser: requireValue(userSummary(task.assignedUserId), "Assignee is required."),
        recommendedUser: userSummary(task.recommendedUserId),
        recommendationReasonCode: task.recommendationReasonCode,
        recommendationExplanation: task.recommendationExplanation,
        createdByUser: userSummary(task.createdByUserId),
        reviewedByUser: userSummary(task.reviewedByUserId),
        comments: []
      };
    }
  };

  return {
    assignmentRepository,
    boardRepository,
    taskReadRepository
  };
}

describe("task assignment integration", () => {
  it("updates both the board read model and task detail read model after reassignment", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const otherStaffUser = requireValue(
      usersByEmail.get("casey.mechanic@local.test"),
      "Other staff user is required."
    );
    const harness = createTaskAssignmentHarness([...usersByEmail.values()]);

    await updateTaskAssignment(
      managerUser,
      "task-1",
      {
        assignedUserId: otherStaffUser.id
      },
      harness.assignmentRepository
    );

    const board = await getBoardReadModelForDate(
      managerUser,
      "2026-06-28",
      {
        repository: harness.boardRepository
      }
    );
    const task = await getTaskReadModelById(managerUser, "task-1", harness.taskReadRepository);

    expect(board.board?.tasks[0]).toMatchObject({
      id: "task-1",
      assignedUser: {
        id: otherStaffUser.id,
        name: otherStaffUser.name
      },
      recommendedUser: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales"
      },
      recommendation: {
        reasonCode: "DIRECT_DUTY_MATCH",
        explanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads."
      }
    });
    expect(task).toMatchObject({
      id: "task-1",
      assignedUser: {
        id: otherStaffUser.id,
        name: otherStaffUser.name
      },
      recommendedUser: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales"
      },
      recommendation: {
        reasonCode: "DIRECT_DUTY_MATCH",
        explanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads."
      }
    });
  });
});
