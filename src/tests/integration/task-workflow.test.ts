import {
  BoardGenerationStatus,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { TaskCommentRepository } from "@/server/repositories/task-comment-repository";
import type { TaskCreateRepository } from "@/server/repositories/task-create-repository";
import type { TaskReadRepository } from "@/server/repositories/task-read-repository";
import type { TaskStatusRepository } from "@/server/repositories/task-status-repository";
import { getBoardReadModelForDate } from "@/server/services/board-read";
import { createTaskComment } from "@/server/services/task-comments";
import { createManualTask } from "@/server/services/task-create-service";
import { getTaskReadModelById } from "@/server/services/task-read";
import { updateTaskStatus } from "@/server/services/task-status-service";
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
  generatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type WorkflowComment = {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
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
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  requiresManagerApproval: boolean;
  templateSnapshot: Prisma.JsonValue | null;
  updateFieldValues: Prisma.JsonValue | null;
  vehicleReference: string | null;
  customerReference: string | null;
  sourceType: TaskSourceType;
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

function createWorkflowHarness(authUsers: AuthenticatedUser[]) {
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
  const boardDays: WorkflowBoardDay[] = [];
  const tasks: WorkflowTask[] = [];
  const comments: WorkflowComment[] = [];

  function getUser(userId: string) {
    return requireValue(users.get(userId), `Missing workflow user ${userId}.`);
  }

  function getBoardDay(boardDayId: string) {
    return requireValue(
      boardDays.find((boardDay) => boardDay.id === boardDayId),
      `Missing board day ${boardDayId}.`
    );
  }

  function getTask(taskId: string) {
    return requireValue(
      tasks.find((task) => task.id === taskId),
      `Missing workflow task ${taskId}.`
    );
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

  function commentRecord(comment: WorkflowComment) {
    return {
      ...comment,
      authorUser: requireValue(userSummary(comment.authorUserId), "Comment author is required.")
    };
  }

  function taskReadRecord(task: WorkflowTask) {
    const boardDay = getBoardDay(task.boardDayId);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueAt: task.dueAt,
      workflowArea: task.workflowArea,
      sourceType: task.sourceType,
      requiresManagerApproval: task.requiresManagerApproval,
      templateSnapshot: task.templateSnapshot,
      updateFieldValues: task.updateFieldValues,
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
      comments: comments
        .filter((comment) => comment.taskId === task.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map(commentRecord)
    };
  }

  const createRepository: TaskCreateRepository = {
    async findAssignedUserById(userId) {
      return users.get(userId) ?? null;
    },
    async getOrCreateBoardDay(boardDate) {
      const existing = boardDays.find(
        (boardDay) => boardDay.date.toISOString().slice(0, 10) === boardDate
      );

      if (existing) {
        return existing;
      }

      const now = new Date();
      const boardDay: WorkflowBoardDay = {
        id: `board-day-${boardDays.length + 1}`,
        date: new Date(`${boardDate}T00:00:00.000Z`),
        generationStatus: BoardGenerationStatus.NOT_STARTED,
        generatedAt: null,
        generatedByUserId: null,
        createdAt: now,
        updatedAt: now
      };

      boardDays.push(boardDay);
      return boardDay;
    },
    async createTask(input) {
      const now = new Date();
      const task: WorkflowTask = {
        id: `task-${tasks.length + 1}`,
        boardDayId: input.boardDayId,
        title: input.title,
        description: input.description,
        assignedUserId: input.assignedUserId,
        recommendedUserId: null,
        recommendationReasonCode: null,
        recommendationExplanation: null,
        status: input.status,
        dueAt: input.dueAt,
        createdByUserId: input.createdByUserId,
        createdAt: now,
        updatedAt: now,
        requiresManagerApproval: input.requiresManagerApproval,
        templateSnapshot: null,
        updateFieldValues: null,
        vehicleReference: input.vehicleReference ?? null,
        customerReference: input.customerReference ?? null,
        sourceType: TaskSourceType.MANAGER,
        workflowArea: input.workflowArea,
        blockerReason: input.blockerReason ?? null,
        readyForReviewAt: input.readyForReviewAt ?? null,
        completedAt: input.completedAt ?? null,
        reviewedByUserId: input.reviewedByUserId ?? null
      };

      tasks.push(task);
      return taskReadRecord(task);
    }
  };

  const statusRepository: TaskStatusRepository = {
    async findTaskById(taskId) {
      return tasks.find((task) => task.id === taskId) ?? null;
    },
    async updateTaskStatus(taskId, data) {
      const task = getTask(taskId);

      task.status = data.status;
      task.updatedAt = new Date();
      if (data.blockerReason !== undefined) task.blockerReason = data.blockerReason;
      if (data.updateFieldValues !== undefined) {
        task.updateFieldValues = data.updateFieldValues as Prisma.JsonValue;
      }
      if (data.readyForReviewAt !== undefined) task.readyForReviewAt = data.readyForReviewAt;
      if (data.completedAt !== undefined) task.completedAt = data.completedAt;
      if (data.reviewedByUserId !== undefined) task.reviewedByUserId = data.reviewedByUserId;

      return task;
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

  const commentRepository: TaskCommentRepository = {
    async findTaskById(taskId) {
      const task = tasks.find((candidate) => candidate.id === taskId);

      return task
        ? {
            id: task.id,
            assignedUserId: task.assignedUserId,
            requiresManagerApproval: task.requiresManagerApproval
          }
        : null;
    },
    async listCommentsForTask(taskId) {
      return comments
        .filter((comment) => comment.taskId === taskId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map(commentRecord);
    },
    async createComment(taskId, authorUserId, body) {
      const comment: WorkflowComment = {
        id: `comment-${comments.length + 1}`,
        taskId,
        authorUserId,
        body,
        createdAt: new Date()
      };

      comments.push(comment);
      return commentRecord(comment);
    }
  };

  const readRepository: TaskReadRepository = {
    async findTaskById(taskId) {
      const task = tasks.find((candidate) => candidate.id === taskId);
      return task ? taskReadRecord(task) : null;
    }
  };

  return {
    boardRepository,
    commentRepository,
    createRepository,
    readRepository,
    statusRepository,
    readTasks: () => tasks.map((task) => ({ ...task }))
  };
}

async function createWorkflowContext() {
  const { usersByEmail } = await createTestAuthStore();
  const manager = requireValue(
    usersByEmail.get("morgan.manager@local.test"),
    "Manager fixture is required."
  );
  const staff = requireValue(
    usersByEmail.get("jordan.sales@local.test"),
    "Staff fixture is required."
  );
  const otherStaff = requireValue(
    usersByEmail.get("casey.mechanic@local.test"),
    "Second staff fixture is required."
  );

  return {
    manager,
    staff,
    otherStaff,
    harness: createWorkflowHarness([...usersByEmail.values()])
  };
}

async function createTask(
  manager: AuthenticatedUser,
  assignedUserId: string,
  repository: TaskCreateRepository,
  overrides: Record<string, unknown> = {}
) {
  return createManualTask(
    manager,
    {
      assignedUserId,
      boardDate: "2026-06-18",
      dueAt: "2026-06-18T17:00:00.000Z",
      requiresManagerApproval: false,
      title: "Review hot lead",
      workflowArea: WorkflowArea.SALES,
      ...overrides
    },
    repository
  );
}

describe("board and task workflow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T15:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a valid manager task and returns its due time through the board read path", async () => {
    const { manager, staff, harness } = await createWorkflowContext();
    const created = await createTask(manager, staff.id, harness.createRepository);
    const board = await getBoardReadModelForDate(staff, "2026-06-18", {
      repository: harness.boardRepository
    });

    expect(created).toMatchObject({
      assignedUser: { id: staff.id },
      dueAt: "2026-06-18T17:00:00.000Z",
      sourceType: TaskSourceType.MANAGER,
      title: "Review hot lead"
    });
    expect(board.board).toMatchObject({
      taskCount: 1,
      tasks: [
        {
          id: created.id,
          assignedUser: { id: staff.id },
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead"
        }
      ]
    });
  });

  it.each([
    [{ dueAt: undefined }, "Task creation requires a due time."],
    [{ dueAt: "not-a-time" }, "Task creation requires dueAt to be a valid timestamp."],
    [{ title: "   " }, "Task creation requires a title."],
    [{ assignedUserId: "   " }, "Task creation requires an assigned user."]
  ])("rejects invalid required creation input without persisting a task", async (overrides, message) => {
    const { manager, staff, harness } = await createWorkflowContext();

    await expect(
      createTask(manager, staff.id, harness.createRepository, overrides)
    ).rejects.toThrow(message);
    expect(harness.readTasks()).toHaveLength(0);
  });

  it("enforces staff ownership and preserves state after a failed blocked transition", async () => {
    const { manager, staff, otherStaff, harness } = await createWorkflowContext();
    const ownTask = await createTask(manager, staff.id, harness.createRepository);
    const otherTask = await createTask(manager, otherStaff.id, harness.createRepository, {
      title: "Inspect trade-in"
    });

    await expect(
      updateTaskStatus(staff, otherTask.id, { status: TaskStatus.IN_PROGRESS }, harness.statusRepository)
    ).rejects.toThrow("You do not have permission to update this task.");
    await expect(
      updateTaskStatus(staff, ownTask.id, { status: TaskStatus.BLOCKED }, harness.statusRepository)
    ).rejects.toThrow("Blocked tasks require a blocker reason.");

    expect(await getTaskReadModelById(staff, ownTask.id, harness.readRepository)).toMatchObject({
      status: TaskStatus.NOT_STARTED,
      blockerReason: null
    });

    await updateTaskStatus(
      staff,
      ownTask.id,
      { status: TaskStatus.BLOCKED, blockerReason: "  Waiting on lender paperwork.  " },
      harness.statusRepository
    );

    expect(await getTaskReadModelById(staff, ownTask.id, harness.readRepository)).toMatchObject({
      status: TaskStatus.BLOCKED,
      blockerReason: "Waiting on lender paperwork."
    });
  });

  it("moves approval-required work through staff review and manager completion", async () => {
    const { manager, staff, harness } = await createWorkflowContext();
    const task = await createTask(manager, staff.id, harness.createRepository, {
      requiresManagerApproval: true
    });

    await expect(
      updateTaskStatus(staff, task.id, { status: TaskStatus.COMPLETED }, harness.statusRepository)
    ).rejects.toThrow("You do not have permission to update this task.");

    await updateTaskStatus(
      staff,
      task.id,
      { status: TaskStatus.READY_FOR_REVIEW },
      harness.statusRepository
    );
    expect(await getTaskReadModelById(manager, task.id, harness.readRepository)).toMatchObject({
      status: TaskStatus.READY_FOR_REVIEW,
      readyForReviewAt: "2026-06-18T15:30:00.000Z"
    });

    await updateTaskStatus(
      manager,
      task.id,
      { status: TaskStatus.COMPLETED },
      harness.statusRepository
    );
    expect(await getTaskReadModelById(manager, task.id, harness.readRepository)).toMatchObject({
      status: TaskStatus.COMPLETED,
      completedAt: "2026-06-18T15:30:00.000Z",
      reviewedByUser: { id: manager.id }
    });
  });

  it("allows assigned staff to complete non-review work directly", async () => {
    const { manager, staff, harness } = await createWorkflowContext();
    const task = await createTask(manager, staff.id, harness.createRepository);

    await updateTaskStatus(
      staff,
      task.id,
      { status: TaskStatus.COMPLETED },
      harness.statusRepository
    );

    expect(await getTaskReadModelById(staff, task.id, harness.readRepository)).toMatchObject({
      status: TaskStatus.COMPLETED,
      completedAt: "2026-06-18T15:30:00.000Z",
      reviewedByUser: null
    });
  });

  it("adds a task comment and returns task and author context from the task read model", async () => {
    const { manager, staff, harness } = await createWorkflowContext();
    const task = await createTask(manager, staff.id, harness.createRepository);

    await createTaskComment(
      staff,
      task.id,
      { body: "  Customer confirmed the appointment.  " },
      harness.commentRepository
    );

    expect(await getTaskReadModelById(manager, task.id, harness.readRepository)).toMatchObject({
      id: task.id,
      comments: [
        {
          taskId: task.id,
          authorUserId: staff.id,
          body: "Customer confirmed the appointment.",
          author: {
            id: staff.id,
            name: staff.name
          }
        }
      ]
    });
  });
});
