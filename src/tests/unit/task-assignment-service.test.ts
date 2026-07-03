<<<<<<< HEAD
import { TaskSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  updateTaskAssignment,
  type TaskAssignmentResult
} from "@/server/services/task-assignment-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

type StoredTask = {
  id: string;
  title: string;
  boardDayId: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  recommendationReasonCode: string | null;
  recommendationExplanation: string | null;
  sourceTemplateId: string | null;
  sourceType: TaskSourceType;
  updatedAt: Date;
};

function createUser(id: string, name: string, email: string, isActive = true): StoredUser {
  return {
    id,
    name,
    email,
    isActive
  };
}

function createTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: "task-1",
    title: "Review sales follow-up tasks",
    boardDayId: "board-day-1",
    assignedUserId: "user-jordan.sales@local.test",
    recommendedUserId: "user-jordan.sales@local.test",
    recommendationReasonCode: "DIRECT_DUTY_MATCH",
    recommendationExplanation:
      "Recommended because this task matches the direct duty Follow up with assigned leads.",
    sourceTemplateId: null,
    sourceType: TaskSourceType.MANAGER,
    updatedAt: new Date("2026-06-28T15:00:00.000Z"),
=======
import { ActivityEventType, Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assignTask,
  type TaskAssignmentResult
} from "@/server/services/task-assignment-service";
import type {
  TaskAssignmentRecord,
  TaskAssignmentRepository,
  TaskAssignmentUserRecord
} from "@/server/repositories/task-assignment-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredActivityEvent = {
  actorUserId: string | null;
  boardDayId: string;
  eventType: ActivityEventType;
  message: string;
  metadata: Prisma.InputJsonValue;
  taskId: string | null;
};

function createAssignmentTask(overrides: Partial<TaskAssignmentRecord> = {}): TaskAssignmentRecord {
  return {
    id: "task-1",
    boardDayId: "board-day-1",
    assignedUserId: "user-jordan.sales@local.test",
    recommendedUserId: "user-casey.mechanic@local.test",
    recommendationReasonCode: "ROLE_MATCH",
    recommendationReasonText: "Casey Mechanic is recommended because their role matches this template.",
    recommendationReviewNeeded: false,
    sourceTemplateId: null,
    title: "Inspect trade-in",
    updatedAt: new Date("2026-06-18T15:00:00.000Z"),
    assignedUser: {
      id: "user-jordan.sales@local.test",
      name: "Jordan Sales",
      email: "jordan.sales@local.test"
    },
    recommendedUser: {
      id: "user-casey.mechanic@local.test",
      name: "Casey Mechanic",
      email: "casey.mechanic@local.test"
    },
>>>>>>> main
    ...overrides
  };
}

<<<<<<< HEAD
function createTaskAssignmentRepository(
  initialTasks: StoredTask[] = [createTask()],
  initialUsers: StoredUser[] = [
    createUser("user-jordan.sales@local.test", "Jordan Sales", "jordan.sales@local.test"),
    createUser("user-casey.mechanic@local.test", "Casey Mechanic", "casey.mechanic@local.test")
  ]
) {
  let tasks = initialTasks.map((task) => ({ ...task }));
  const users = new Map(initialUsers.map((user) => [user.id, { ...user }]));

  function userSummary(userId: string | null) {
    if (!userId) {
      return null;
    }

    const user = users.get(userId) ?? null;

    if (!user) {
      return null;
=======
function createAssignmentRepositoryHarness(
  initialTask: TaskAssignmentRecord,
  users: TaskAssignmentUserRecord[],
  duplicateGeneratedAssignment: { assignedUserId: string; boardDayId: string; id: string; sourceTemplateId: string } | null = null
): {
  readActivityEvents(): StoredActivityEvent[];
  readTask(): TaskAssignmentRecord;
  repository: TaskAssignmentRepository;
} {
  const activityEvents: StoredActivityEvent[] = [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  let task = { ...initialTask };

  function userSummary(userId: string) {
    const user = usersById.get(userId);

    if (!user) {
      throw new Error("Missing user.");
>>>>>>> main
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  return {
<<<<<<< HEAD
    repository: {
      async findTaskById(taskId: string) {
        const task = tasks.find((candidate) => candidate.id === taskId);

        if (!task) {
          return null;
        }

        return {
          ...task,
          assignedUser: userSummary(task.assignedUserId)!,
          recommendedUser: userSummary(task.recommendedUserId)
        };
      },
      async findAssignableUserById(userId: string) {
        return users.get(userId) ?? null;
      },
      async findGeneratedAssignmentConflict(input: {
        boardDayId: string;
        sourceTemplateId: string;
        assignedUserId: string;
        excludeTaskId: string;
      }) {
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
      async updateTaskAssignment(taskId: string, assignedUserId: string) {
        const taskIndex = tasks.findIndex((candidate) => candidate.id === taskId);

        if (taskIndex === -1) {
          throw new Error("Task not found.");
        }

        const updatedTask = {
          ...tasks[taskIndex],
          assignedUserId,
          updatedAt: new Date("2026-06-28T15:45:00.000Z")
        };

        tasks = tasks.map((task, index) => (index === taskIndex ? updatedTask : task));

        return {
          ...updatedTask,
          assignedUser: userSummary(updatedTask.assignedUserId)!,
          recommendedUser: userSummary(updatedTask.recommendedUserId)
        };
      },
      supportsActivityEvents: false
    },
    readTask(taskId = "task-1") {
      return tasks.find((task) => task.id === taskId) ?? null;
=======
    readActivityEvents() {
      return [...activityEvents];
    },
    readTask() {
      return task;
    },
    repository: {
      async createActivityEvent(input) {
        activityEvents.push(input);
      },

      async findTaskByBoardTemplateAndAssignee(input) {
        if (
          duplicateGeneratedAssignment &&
          duplicateGeneratedAssignment.id !== input.excludedTaskId &&
          duplicateGeneratedAssignment.assignedUserId === input.assignedUserId &&
          duplicateGeneratedAssignment.boardDayId === input.boardDayId &&
          duplicateGeneratedAssignment.sourceTemplateId === input.sourceTemplateId
        ) {
          return {
            id: duplicateGeneratedAssignment.id
          };
        }

        if (
          task.id !== input.excludedTaskId &&
          task.assignedUserId === input.assignedUserId &&
          task.boardDayId === input.boardDayId &&
          task.sourceTemplateId === input.sourceTemplateId
        ) {
          return {
            id: task.id
          };
        }

        return null;
      },

      async findTaskById(taskId) {
        return task.id === taskId ? task : null;
      },

      async findUserById(userId) {
        return usersById.get(userId) ?? null;
      },

      async updateTaskAssignment(taskId, assignedUserId) {
        if (task.id !== taskId) {
          throw new Error("Task not found.");
        }

        task = {
          ...task,
          assignedUserId,
          assignedUser: userSummary(assignedUserId),
          updatedAt: new Date("2026-06-18T15:30:00.000Z")
        };

        return task;
      }
>>>>>>> main
    }
  };
}

describe("task assignment service", () => {
<<<<<<< HEAD
  it("allows a manager to reassign a task while preserving the recommendation", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTask } = createTaskAssignmentRepository();

    const result = await updateTaskAssignment(
      managerUser,
      "task-1",
      {
        assignedUserId: "user-casey.mechanic@local.test"
=======
  it("lets managers accept a stored recommendation", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const assignee = usersByEmail.get("jordan.sales@local.test");
    const recommendedUser = usersByEmail.get("casey.mechanic@local.test");
    const { readActivityEvents, readTask, repository } = createAssignmentRepositoryHarness(
      createAssignmentTask({
        assignedUserId: assignee?.id ?? "",
        recommendedUserId: recommendedUser?.id ?? "",
        assignedUser: {
          id: assignee?.id ?? "",
          name: assignee?.name ?? "",
          email: assignee?.email ?? ""
        },
        recommendedUser: {
          id: recommendedUser?.id ?? "",
          name: recommendedUser?.name ?? "",
          email: recommendedUser?.email ?? ""
        }
      }),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    const result = await assignTask(
      managerUser,
      "task-1",
      {
        mode: "accept_recommendation"
>>>>>>> main
      },
      repository
    );

    expect(result).toEqual<TaskAssignmentResult>({
      id: "task-1",
      assignedUser: {
<<<<<<< HEAD
=======
        id: recommendedUser?.id ?? "",
        name: recommendedUser?.name ?? "",
        email: recommendedUser?.email
      },
      previousAssignedUserId: assignee?.id ?? "",
      recommendedUser: {
        id: recommendedUser?.id ?? "",
        name: recommendedUser?.name ?? "",
        email: recommendedUser?.email
      },
      recommendationReasonCode: "ROLE_MATCH",
      recommendationReasonText: "Casey Mechanic is recommended because their role matches this template.",
      recommendationReviewNeeded: false,
      updatedAt: "2026-06-18T15:30:00.000Z"
    });
    expect(readTask()).toMatchObject({
      assignedUserId: recommendedUser?.id
    });
    expect(readActivityEvents()).toEqual([
      {
        actorUserId: managerUser?.id ?? "",
        boardDayId: "board-day-1",
        eventType: ActivityEventType.TASK_ASSIGNED,
        message: `Recommendation accepted: assigned to ${recommendedUser?.name}`,
        metadata: {
          assignedUserId: recommendedUser?.id,
          mode: "accept_recommendation",
          previousAssignedUserId: assignee?.id,
          reason: null,
          recommendationReasonCode: "ROLE_MATCH",
          recommendedUserId: recommendedUser?.id
        },
        taskId: "task-1"
      }
    ]);
  });

  it("lets managers override the stored recommendation with another active user", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const overrideUser = usersByEmail.get("riley.inventory@local.test");
    const { readActivityEvents, readTask, repository } = createAssignmentRepositoryHarness(
      createAssignmentTask(),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    const result = await assignTask(
      managerUser,
      "task-1",
      {
        assignedUserId: ` ${overrideUser?.id} `,
        mode: "override",
        reason: " Better workload fit. "
      },
      repository
    );

    expect(result.assignedUser).toMatchObject({
      id: overrideUser?.id,
      name: overrideUser?.name
    });
    expect(result).toMatchObject({
      recommendedUser: {
>>>>>>> main
        id: "user-casey.mechanic@local.test",
        name: "Casey Mechanic",
        email: "casey.mechanic@local.test"
      },
<<<<<<< HEAD
      recommendedUser: {
        id: "user-jordan.sales@local.test",
        name: "Jordan Sales",
        email: "jordan.sales@local.test"
      },
      recommendation: {
        reasonCode: "DIRECT_DUTY_MATCH",
        explanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads."
      },
      updatedAt: "2026-06-28T15:45:00.000Z"
    });
    expect(readTask()).toMatchObject({
      assignedUserId: "user-casey.mechanic@local.test",
      recommendedUserId: "user-jordan.sales@local.test"
    });
  });

  it("rejects staff users who try to reassign a task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createTaskAssignmentRepository();

    await expect(
      updateTaskAssignment(
        staffUser,
        "task-1",
        {
          assignedUserId: "user-casey.mechanic@local.test"
=======
      recommendationReasonCode: "ROLE_MATCH",
      recommendationReasonText:
        "Casey Mechanic is recommended because their role matches this template.",
      recommendationReviewNeeded: false
    });
    expect(readTask()).toMatchObject({
      assignedUserId: overrideUser?.id,
      recommendedUserId: "user-casey.mechanic@local.test",
      recommendationReasonCode: "ROLE_MATCH",
      recommendationReasonText:
        "Casey Mechanic is recommended because their role matches this template.",
      recommendationReviewNeeded: false,
      title: "Inspect trade-in"
    });
    expect(readActivityEvents()).toMatchObject([
      {
        actorUserId: managerUser?.id,
        boardDayId: "board-day-1",
        eventType: ActivityEventType.ASSIGNMENT_CHANGED,
        message: `Recommendation overridden: assigned to ${overrideUser?.name}`,
        metadata: {
          assignedUserId: overrideUser?.id,
          mode: "override",
          previousAssignedUserId: "user-jordan.sales@local.test",
          reason: "Better workload fit.",
          recommendationReasonCode: "ROLE_MATCH",
          recommendedUserId: "user-casey.mechanic@local.test"
        },
        taskId: "task-1"
      }
    ]);
  });

  it("rejects unknown assignees without changing the task or writing activity", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { readActivityEvents, readTask, repository } = createAssignmentRepositoryHarness(
      createAssignmentTask(),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      assignTask(
        managerUser,
        "task-1",
        {
          assignedUserId: "user-missing",
          mode: "override"
        },
        repository
      )
    ).rejects.toThrow("Assigned user not found.");

    expect(readTask()).toMatchObject({
      assignedUserId: "user-jordan.sales@local.test"
    });
    expect(readActivityEvents()).toHaveLength(0);
  });

  it("lets managers reassign an already assigned task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const nextUser = usersByEmail.get("casey.mechanic@local.test");
    const { readActivityEvents, readTask, repository } = createAssignmentRepositoryHarness(
      createAssignmentTask({
        recommendedUserId: null,
        recommendedUser: null,
        recommendationReasonCode: null,
        recommendationReasonText: null,
        recommendationReviewNeeded: true
      }),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await assignTask(
      managerUser,
      "task-1",
      {
        assignedUserId: nextUser?.id,
        mode: "reassign"
      },
      repository
    );

    expect(readTask()).toMatchObject({
      assignedUserId: nextUser?.id
    });
    expect(readActivityEvents()).toMatchObject([
      {
        eventType: ActivityEventType.ASSIGNMENT_CHANGED,
        message: `Task reassigned to ${nextUser?.name}`
      }
    ]);
  });

  it("rejects staff assignment requests", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createAssignmentRepositoryHarness(
      createAssignmentTask(),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      assignTask(
        staffUser,
        "task-1",
        {
          mode: "accept_recommendation"
>>>>>>> main
        },
        repository
      )
    ).rejects.toThrow("Manager access required.");
  });

<<<<<<< HEAD
  it("rejects reassignments to inactive users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskAssignmentRepository(undefined, [
      createUser("user-jordan.sales@local.test", "Jordan Sales", "jordan.sales@local.test"),
      createUser(
        "user-casey.mechanic@local.test",
        "Casey Mechanic",
        "casey.mechanic@local.test",
        false
      )
    ]);

    await expect(
      updateTaskAssignment(
        managerUser,
        "task-1",
        {
          assignedUserId: "user-casey.mechanic@local.test"
=======
  it("rejects inactive assignees", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const inactiveUser = {
      id: "user-inactive",
      name: "Inactive Staff",
      email: "inactive@local.test",
      isActive: false
    };
    const { repository } = createAssignmentRepositoryHarness(
      createAssignmentTask(),
      [
        ...[...usersByEmail.values()].map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        })),
        inactiveUser
      ]
    );

    await expect(
      assignTask(
        managerUser,
        "task-1",
        {
          assignedUserId: inactiveUser.id,
          mode: "override"
>>>>>>> main
        },
        repository
      )
    ).rejects.toThrow("Assigned user must be active.");
  });

<<<<<<< HEAD
  it("rejects generated-task reassignments that would duplicate an existing template assignment", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskAssignmentRepository([
      createTask({
        id: "task-1",
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-1"
      }),
      createTask({
        id: "task-2",
        assignedUserId: "user-casey.mechanic@local.test",
        recommendedUserId: "user-casey.mechanic@local.test",
        recommendationReasonCode: "DIRECT_DUTY_MATCH",
        recommendationExplanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads.",
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-1"
      })
    ]);

    await expect(
      updateTaskAssignment(
        managerUser,
        "task-1",
        {
          assignedUserId: "user-casey.mechanic@local.test"
        },
        repository
      )
    ).rejects.toThrow("This generated task already exists for the selected user on the same board date.");
=======
  it("rejects accepting a task without a stored recommendation", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createAssignmentRepositoryHarness(
      createAssignmentTask({
        recommendedUserId: null,
        recommendedUser: null
      }),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      assignTask(
        managerUser,
        "task-1",
        {
          mode: "accept_recommendation"
        },
        repository
      )
    ).rejects.toThrow("Task does not have a stored recommendation to accept.");
  });

  it("rejects assignments that would duplicate a generated template task for the assignee", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const nextUser = usersByEmail.get("casey.mechanic@local.test");
    const { repository } = createAssignmentRepositoryHarness(
      createAssignmentTask({
        sourceTemplateId: "template-1"
      }),
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      })),
      {
        assignedUserId: nextUser?.id ?? "",
        boardDayId: "board-day-1",
        id: "task-duplicate",
        sourceTemplateId: "template-1"
      }
    );

    await expect(
      assignTask(
        managerUser,
        "task-1",
        {
          assignedUserId: nextUser?.id,
          mode: "reassign"
        },
        repository
      )
    ).rejects.toThrow("Assigned user already has this generated template task.");
>>>>>>> main
  });
});
