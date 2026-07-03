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
    ...overrides
  };
}

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
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  return {
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
    }
  };
}

describe("task assignment service", () => {
  it("allows a manager to reassign a task while preserving the recommendation", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTask } = createTaskAssignmentRepository();

    const result = await updateTaskAssignment(
      managerUser,
      "task-1",
      {
        assignedUserId: "user-casey.mechanic@local.test"
      },
      repository
    );

    expect(result).toEqual<TaskAssignmentResult>({
      id: "task-1",
      assignedUser: {
        id: "user-casey.mechanic@local.test",
        name: "Casey Mechanic",
        email: "casey.mechanic@local.test"
      },
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
        },
        repository
      )
    ).rejects.toThrow("Manager access required.");
  });

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
        },
        repository
      )
    ).rejects.toThrow("Assigned user must be active.");
  });

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
  });
});
