import {
  BoardGenerationStatus,
  GenerationRunStatus,
  GenerationTriggerType,
  Prisma,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { GenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";
import type { TaskCommentRepository } from "@/server/repositories/task-comment-repository";
import type { TaskCreateRepository } from "@/server/repositories/task-create-repository";
import type { TaskStatusRepository } from "@/server/repositories/task-status-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

const mockState = vi.hoisted(() => ({
  boardRepository: null as BoardReadRepository | null,
  commentRepository: null as TaskCommentRepository | null,
  createRepository: null as TaskCreateRepository | null,
  currentUser: null as AuthenticatedUser | null,
  generationRepository: null as GenerationTasksRepository | null,
  getCurrentUser: vi.fn(),
  loadGenerationInputsForDate: vi.fn(),
  statusRepository: null as TaskStatusRepository | null
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mockState.getCurrentUser
}));

vi.mock("@/server/repositories/task-create-repository", async () => ({
  createTaskCreateRepository: () => {
    if (!mockState.createRepository) {
      throw new Error("Task create repository mock is not configured.");
    }

    return mockState.createRepository;
  }
}));

vi.mock("@/server/repositories/task-status-repository", async () => ({
  createTaskStatusRepository: () => {
    if (!mockState.statusRepository) {
      throw new Error("Task status repository mock is not configured.");
    }

    return mockState.statusRepository;
  }
}));

vi.mock("@/server/repositories/task-comment-repository", async () => ({
  createTaskCommentRepository: () => {
    if (!mockState.commentRepository) {
      throw new Error("Task comment repository mock is not configured.");
    }

    return mockState.commentRepository;
  }
}));

vi.mock("@/server/repositories/board-read-repository", async () => ({
  createBoardReadRepository: () => {
    if (!mockState.boardRepository) {
      throw new Error("Board read repository mock is not configured.");
    }

    return mockState.boardRepository;
  }
}));

vi.mock("@/server/repositories/generation-tasks-repository", async () => ({
  createGenerationTasksRepository: () => {
    if (!mockState.generationRepository) {
      throw new Error("Generation tasks repository mock is not configured.");
    }

    return mockState.generationRepository;
  }
}));

vi.mock("@/server/services/generation-inputs", async () => ({
  loadGenerationInputsForDate: (boardDate: string) => mockState.loadGenerationInputsForDate(boardDate)
}));

import { GET as getBoardForDate } from "@/app/api/board/[date]/route";
import { POST as postManualBoardGeneration } from "@/app/api/board/generate/route";
import { POST as postTask } from "@/app/api/tasks/route";
import { GET as getTaskComments, POST as postTaskComment } from "@/app/api/tasks/[id]/comments/route";
import { POST as postTaskStatus } from "@/app/api/tasks/[id]/status/route";

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
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
  blockerReason: string | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
};

type WorkflowComment = {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
};

type WorkflowGenerationRun = {
  id: string;
  boardDate: Date;
  startedAt: Date;
  finishedAt: Date | null;
  status: GenerationRunStatus;
  triggeredBy: GenerationTriggerType;
  triggeredByUserId: string | null;
  summary: Prisma.JsonValue;
  errorMessage: string | null;
};

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function createRouteHarness(authUsers: AuthenticatedUser[]) {
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
  const generationRuns: WorkflowGenerationRun[] = [];

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

  function getBoardDateValue(boardDate: string) {
    return new Date(`${boardDate}T00:00:00.000Z`);
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

  function ensureBoardDay(boardDate: string) {
    const existing = boardDays.find(
      (boardDay) => boardDay.date.toISOString().slice(0, 10) === boardDate
    );

    if (existing) {
      return existing;
    }

    const now = new Date();
    const boardDay: WorkflowBoardDay = {
      id: `board-day-${boardDays.length + 1}`,
      date: getBoardDateValue(boardDate),
      generationStatus: BoardGenerationStatus.NOT_STARTED,
      generatedAt: null,
      generatedByUserId: null,
      createdAt: now,
      updatedAt: now
    };

    boardDays.push(boardDay);
    return boardDay;
  }

  const createRepository: TaskCreateRepository = {
    async findAssignedUserById(userId) {
      return users.get(userId) ?? null;
    },
    async getOrCreateBoardDay(boardDate) {
      return ensureBoardDay(boardDate);
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
        vehicleReference: input.vehicleReference ?? null,
        customerReference: input.customerReference ?? null,
        sourceType: TaskSourceType.MANAGER,
        sourceTemplateId: null,
        sourceDutyId: null,
        workflowArea: input.workflowArea,
        blockerReason: input.blockerReason ?? null,
        readyForReviewAt: input.readyForReviewAt ?? null,
        completedAt: input.completedAt ?? null,
        reviewedByUserId: input.reviewedByUserId ?? null
      };

      tasks.push(task);

      return {
        ...task,
        boardDay: {
          id: input.boardDayId,
          date: getBoardDay(input.boardDayId).date
        },
        assignedUser: requireValue(userSummary(task.assignedUserId), "Assignee is required."),
        createdByUser: userSummary(task.createdByUserId),
        reviewedByUser: userSummary(task.reviewedByUserId)
      };
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
      if (data.readyForReviewAt !== undefined) task.readyForReviewAt = data.readyForReviewAt;
      if (data.completedAt !== undefined) task.completedAt = data.completedAt;
      if (data.reviewedByUserId !== undefined) task.reviewedByUserId = data.reviewedByUserId;

      return {
        id: task.id,
        assignedUserId: task.assignedUserId,
        requiresManagerApproval: task.requiresManagerApproval,
        status: task.status,
        blockerReason: task.blockerReason,
        readyForReviewAt: task.readyForReviewAt,
        completedAt: task.completedAt,
        reviewedByUserId: task.reviewedByUserId,
        updatedAt: task.updatedAt
      };
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
        .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())
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

  const generationRepository: GenerationTasksRepository = {
    async getOrCreateBoardDay(boardDate) {
      return ensureBoardDay(boardDate);
    },
    async listExistingGeneratedTasks(boardDayId) {
      return tasks
        .filter(
          (task) => task.boardDayId === boardDayId && task.sourceType === TaskSourceType.TEMPLATE
        )
        .map((task) => ({
          id: task.id,
          sourceTemplateId: task.sourceTemplateId,
          assignedUserId: task.assignedUserId
        }));
    },
    async countManualTasks(boardDayId) {
      return tasks.filter(
        (task) =>
          task.boardDayId === boardDayId &&
          (task.sourceType === TaskSourceType.MANAGER || task.sourceType === TaskSourceType.STAFF)
      ).length;
    },
    async createGeneratedTask(input) {
      const duplicate = tasks.find(
        (task) =>
          task.boardDayId === input.boardDayId &&
          task.assignedUserId === input.assignedUserId &&
          task.sourceTemplateId === input.sourceTemplateId
      );

      if (duplicate) {
        return null;
      }

      const task: WorkflowTask = {
        id: `task-${tasks.length + 1}`,
        boardDayId: input.boardDayId,
        title: input.title,
        description: input.description,
        assignedUserId: input.assignedUserId,
        recommendedUserId: input.recommendedUserId,
        recommendationReasonCode: input.recommendationReasonCode,
        recommendationExplanation: input.recommendationExplanation,
        status: TaskStatus.NOT_STARTED,
        dueAt: input.dueAt,
        createdByUserId: input.createdByUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiresManagerApproval: input.requiresManagerApproval,
        vehicleReference: null,
        customerReference: null,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: input.sourceTemplateId,
        sourceDutyId: input.sourceDutyId,
        workflowArea: input.workflowArea,
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null,
        reviewedByUserId: null
      };

      tasks.push(task);

      return {
        id: task.id,
        title: task.title,
        assignedUserId: task.assignedUserId,
        recommendedUserId: task.recommendedUserId,
        recommendationReasonCode: task.recommendationReasonCode,
        recommendationExplanation: task.recommendationExplanation,
        dueAt: task.dueAt,
        sourceTemplateId: task.sourceTemplateId,
        sourceDutyId: task.sourceDutyId,
        workflowArea: task.workflowArea
      };
    },
    async startGenerationRun(input) {
      const run: WorkflowGenerationRun = {
        id: `generation-run-${generationRuns.length + 1}`,
        boardDate: getBoardDateValue(input.boardDate),
        startedAt: input.startedAt,
        finishedAt: null,
        status: GenerationRunStatus.RUNNING,
        triggeredBy: input.triggeredBy,
        triggeredByUserId: input.triggeredByUserId,
        summary: input.summary as Prisma.JsonValue,
        errorMessage: null
      };

      generationRuns.push(run);
      return run;
    },
    async completeGenerationRun(input) {
      const run = requireValue(
        generationRuns.find((candidate) => candidate.id === input.id),
        `Missing generation run ${input.id}.`
      );

      run.finishedAt = input.finishedAt;
      run.status = GenerationRunStatus.SUCCEEDED;
      run.summary = input.summary as Prisma.JsonValue;
      run.errorMessage = null;

      return run;
    },
    async failGenerationRun(input) {
      const run = requireValue(
        generationRuns.find((candidate) => candidate.id === input.id),
        `Missing generation run ${input.id}.`
      );

      run.finishedAt = input.finishedAt;
      run.status = GenerationRunStatus.FAILED;
      run.summary = input.summary as Prisma.JsonValue;
      run.errorMessage = input.errorMessage;

      return run;
    },
    async listGenerationRunsForDate(boardDate) {
      return generationRuns
        .filter((run) => run.boardDate.toISOString().slice(0, 10) === boardDate)
        .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
    }
  };

  return {
    boardRepository,
    commentRepository,
    createRepository,
    generationRepository,
    readComments: () => comments.map((comment) => ({ ...comment })),
    readGenerationRuns: () => generationRuns.map((run) => ({ ...run })),
    readTasks: () => tasks.map((task) => ({ ...task })),
    seedTask(input: {
      assignedUserId: string;
      boardDate?: string;
      dueAt?: string;
      requiresManagerApproval?: boolean;
      status?: TaskStatus;
      title?: string;
      sourceType?: TaskSourceType;
      workflowArea?: WorkflowArea;
    }) {
      const boardDay = ensureBoardDay(input.boardDate ?? "2026-06-18");
      const dueAt = new Date(input.dueAt ?? "2026-06-18T17:00:00.000Z");
      const now = new Date();
      const task: WorkflowTask = {
        id: `task-${tasks.length + 1}`,
        boardDayId: boardDay.id,
        title: input.title ?? "Follow up with lead",
        description: "",
        assignedUserId: input.assignedUserId,
        recommendedUserId: null,
        recommendationReasonCode: null,
        recommendationExplanation: null,
        status: input.status ?? TaskStatus.NOT_STARTED,
        dueAt,
        createdByUserId: null,
        createdAt: now,
        updatedAt: now,
        requiresManagerApproval: input.requiresManagerApproval ?? false,
        vehicleReference: null,
        customerReference: null,
        sourceType: input.sourceType ?? TaskSourceType.MANAGER,
        sourceTemplateId: null,
        sourceDutyId: null,
        workflowArea: input.workflowArea ?? WorkflowArea.SALES,
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null,
        reviewedByUserId: null
      };

      tasks.push(task);
      return task;
    },
    statusRepository
  };
}

async function createRouteContext() {
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
  const harness = createRouteHarness([...usersByEmail.values()]);

  mockState.boardRepository = harness.boardRepository;
  mockState.commentRepository = harness.commentRepository;
  mockState.createRepository = harness.createRepository;
  mockState.generationRepository = harness.generationRepository;
  mockState.statusRepository = harness.statusRepository;

  return {
    harness,
    manager,
    otherStaff,
    staff
  };
}

function setCurrentUser(user: AuthenticatedUser | null) {
  mockState.currentUser = user;
}

describe("API route integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T15:30:00.000Z"));
    mockState.getCurrentUser.mockImplementation(async () => mockState.currentUser);
    mockState.loadGenerationInputsForDate.mockResolvedValue({
      users: [],
      warnings: []
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    setCurrentUser(null);
  });

  it("rejects unauthenticated task creation requests", async () => {
    await createRouteContext();
    setCurrentUser(null);

    const response = await postTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: "user-jordan.sales@local.test",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("creates a valid manager task through the API route boundary", async () => {
    const { harness, manager, staff } = await createRouteContext();
    setCurrentUser(manager);

    const response = await postTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: staff.id,
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      task: {
        title: "Review hot lead",
        assignedUser: {
          id: staff.id
        }
      }
    });
    expect(harness.readTasks()).toHaveLength(1);
    expect(harness.readTasks()[0]).toMatchObject({
      assignedUserId: staff.id,
      dueAt: new Date("2026-06-18T17:00:00.000Z"),
      title: "Review hot lead"
    });
  });

  it.each([
    [
      {
        assignedUserId: "user-jordan.sales@local.test",
        boardDate: "2026-06-18",
        dueAt: "2026-06-18T17:00:00.000Z",
        title: "   ",
        workflowArea: "SALES"
      },
      "Task creation requires a title."
    ],
    [
      {
        assignedUserId: "user-jordan.sales@local.test",
        boardDate: "2026-06-18",
        title: "Review hot lead",
        workflowArea: "SALES"
      },
      "Task creation requires a due time."
    ]
  ])("rejects invalid task creation payloads", async (payload, errorMessage) => {
    const { harness, manager } = await createRouteContext();
    setCurrentUser(manager);

    const response = await postTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: errorMessage
    });
    expect(harness.readTasks()).toHaveLength(0);
  });

  it("rejects staff access to the manager-only task creation route", async () => {
    const { harness, staff } = await createRouteContext();
    setCurrentUser(staff);

    const response = await postTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          assignedUserId: staff.id,
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: "SALES"
        })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
    expect(harness.readTasks()).toHaveLength(0);
  });

  it("allows staff to update their own task status and rejects cross-user updates", async () => {
    const { harness, manager, otherStaff, staff } = await createRouteContext();
    const ownTask = harness.seedTask({
      assignedUserId: staff.id
    });
    const otherTask = harness.seedTask({
      assignedUserId: otherStaff.id,
      title: "Inspect trade-in"
    });

    setCurrentUser(staff);

    const ownResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${ownTask.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }),
      {
        params: Promise.resolve({ id: ownTask.id })
      }
    );

    expect(ownResponse.status).toBe(200);
    await expect(ownResponse.json()).resolves.toMatchObject({
      task: {
        id: ownTask.id,
        status: "IN_PROGRESS"
      }
    });

    const otherResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${otherTask.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }),
      {
        params: Promise.resolve({ id: otherTask.id })
      }
    );

    expect(otherResponse.status).toBe(403);
    await expect(otherResponse.json()).resolves.toEqual({
      error: "You do not have permission to update this task."
    });

    setCurrentUser(manager);
    const boardResponse = await getBoardForDate(
      new Request("http://localhost/api/board/2026-06-18"),
      {
        params: Promise.resolve({ date: "2026-06-18" })
      }
    );

    expect(boardResponse.status).toBe(200);
    await expect(boardResponse.json()).resolves.toMatchObject({
      board: {
        taskCount: 2,
        tasks: expect.arrayContaining([
          expect.objectContaining({
            id: ownTask.id,
            status: "IN_PROGRESS"
          }),
          expect.objectContaining({
            id: otherTask.id,
            status: "NOT_STARTED"
          })
        ])
      }
    });
  });

  it("enforces blocker validation and trims a successful blocker reason", async () => {
    const { harness, staff } = await createRouteContext();
    const task = harness.seedTask({
      assignedUserId: staff.id
    });
    setCurrentUser(staff);

    const invalidResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "BLOCKED"
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({
      error: "Blocked tasks require a blocker reason."
    });
    expect(harness.readTasks()[0]).toMatchObject({
      blockerReason: null,
      status: TaskStatus.NOT_STARTED
    });

    const validResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "BLOCKED",
          blockerReason: "  Waiting on lender paperwork.  "
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(validResponse.status).toBe(200);
    await expect(validResponse.json()).resolves.toEqual({
      task: {
        id: task.id,
        status: "BLOCKED",
        blockerReason: "Waiting on lender paperwork.",
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });
  });

  it("requires approval tasks to move through ready for review before staff completion", async () => {
    const { harness, manager, staff } = await createRouteContext();
    const task = harness.seedTask({
      assignedUserId: staff.id,
      requiresManagerApproval: true
    });
    setCurrentUser(staff);

    const completeResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "COMPLETED"
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(completeResponse.status).toBe(403);
    await expect(completeResponse.json()).resolves.toEqual({
      error: "You do not have permission to update this task."
    });

    const reviewResponse = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "READY_FOR_REVIEW"
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(reviewResponse.status).toBe(200);
    await expect(reviewResponse.json()).resolves.toEqual({
      task: {
        id: task.id,
        status: "READY_FOR_REVIEW",
        blockerReason: null,
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });

    setCurrentUser(manager);
    const managerCompletion = await postTaskStatus(
      new Request(`http://localhost/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "COMPLETED"
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(managerCompletion.status).toBe(200);
    await expect(managerCompletion.json()).resolves.toEqual({
      task: {
        id: task.id,
        status: "COMPLETED",
        blockerReason: null,
        updatedAt: "2026-06-18T15:30:00.000Z"
      }
    });
  });

  it("rejects blank task comments and persists valid comments for the assigned user", async () => {
    const { harness, staff } = await createRouteContext();
    const task = harness.seedTask({
      assignedUserId: staff.id
    });
    setCurrentUser(staff);

    const invalidResponse = await postTaskComment(
      new Request(`http://localhost/api/tasks/${task.id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: "   "
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({
      error: "Task comments require a comment body."
    });
    expect(harness.readComments()).toHaveLength(0);

    const validResponse = await postTaskComment(
      new Request(`http://localhost/api/tasks/${task.id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: "  Customer confirmed the appointment.  "
        })
      }),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(validResponse.status).toBe(201);
    await expect(validResponse.json()).resolves.toMatchObject({
      comment: {
        taskId: task.id,
        body: "Customer confirmed the appointment.",
        author: {
          id: staff.id
        }
      }
    });

    const listResponse = await getTaskComments(
      new Request(`http://localhost/api/tasks/${task.id}/comments`),
      {
        params: Promise.resolve({ id: task.id })
      }
    );

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      comments: [
        {
          taskId: task.id,
          body: "Customer confirmed the appointment.",
          authorUserId: staff.id
        }
      ]
    });
  });

  it("rejects unauthenticated board reads", async () => {
    await createRouteContext();
    setCurrentUser(null);

    const response = await getBoardForDate(
      new Request("http://localhost/api/board/2026-06-18"),
      {
        params: Promise.resolve({ date: "2026-06-18" })
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required."
    });
  });

  it("requires manager permission for manual board generation and succeeds for a manager", async () => {
    const { harness, manager, staff } = await createRouteContext();
    mockState.loadGenerationInputsForDate.mockResolvedValue({
      users: [
        {
          userId: staff.id,
          templates: [
            {
              templateId: "template-1",
              dutyId: null,
              title: "Review inventory status",
              description: "Check new arrivals.",
              defaultDueTime: "16:00",
              requiresManagerApproval: false,
              workflowArea: WorkflowArea.INVENTORY
            }
          ]
        }
      ],
      warnings: []
    });

    setCurrentUser(staff);
    const forbiddenResponse = await postManualBoardGeneration(
      new Request("http://localhost/api/board/generate", {
        method: "POST",
        body: JSON.stringify({
          boardDate: "2026-06-18"
        })
      })
    );

    expect(forbiddenResponse.status).toBe(403);
    await expect(forbiddenResponse.json()).resolves.toEqual({
      error: "Manager access required."
    });

    setCurrentUser(manager);
    const successResponse = await postManualBoardGeneration(
      new Request("http://localhost/api/board/generate", {
        method: "POST",
        body: JSON.stringify({
          boardDate: "2026-06-18"
        })
      })
    );

    expect(successResponse.status).toBe(200);
    await expect(successResponse.json()).resolves.toMatchObject({
      status: "success",
      boardDate: "2026-06-18",
      createdTaskCount: 1,
      skippedExistingTaskCount: 0
    });
    expect(harness.readTasks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: TaskSourceType.TEMPLATE,
          title: "Review inventory status"
        })
      ])
    );
    expect(harness.readGenerationRuns()).toHaveLength(1);
    expect(harness.readGenerationRuns()[0]).toMatchObject({
      status: GenerationRunStatus.SUCCEEDED,
      triggeredBy: GenerationTriggerType.MANUAL,
      triggeredByUserId: manager.id
    });
  });
});
