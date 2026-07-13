import { Prisma, TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  createManualTask,
  type ManualTaskCreateResult
} from "@/server/services/task-create-service";
import { ActivityEventType } from "@/server/services/activity-events";
import type {
  CreateTaskRecordInput,
  TaskCreateAssignedUserRecord,
  TaskCreateRepository
} from "@/server/repositories/task-create-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

type StoredBoardDay = {
  date: string;
  id: string;
};

type StoredTask = CreateTaskRecordInput & {
  createdAt: Date;
  id: string;
  sourceType: TaskSourceType;
  updatedAt: Date;
};

type StoredActivityEvent = {
  actorUserId: string | null;
  boardDayId: string;
  eventType: ActivityEventType;
  message: string;
  metadata: Prisma.InputJsonValue;
  taskId: string | null;
};

function createTaskCreateRepositoryHarness(
  users: TaskCreateAssignedUserRecord[]
): {
  readBoardDays(): StoredBoardDay[];
  readActivityEvents(): StoredActivityEvent[];
  readTasks(): StoredTask[];
  repository: TaskCreateRepository;
} {
  const boardDays: StoredBoardDay[] = [];
  const activityEvents: StoredActivityEvent[] = [];
  const tasks: StoredTask[] = [];
  const usersById = new Map(users.map((user) => [user.id, user]));

  return {
    readBoardDays() {
      return [...boardDays];
    },
    readActivityEvents() {
      return [...activityEvents];
    },
    readTasks() {
      return [...tasks];
    },
    repository: {
      async createActivityEvent(input) {
        activityEvents.push(input);
      },

      async createTask(input) {
        const boardDay = boardDays.find((candidateBoardDay) => candidateBoardDay.id === input.boardDayId);

        if (!boardDay) {
          throw new Error("Board day not found.");
        }

        const assignedUser = usersById.get(input.assignedUserId);
        const createdByUser = usersById.get(input.createdByUserId);
        const reviewedByUser = input.reviewedByUserId
          ? usersById.get(input.reviewedByUserId) ?? null
          : null;

        if (!assignedUser || !createdByUser) {
          throw new Error("Missing related user.");
        }

        const now = new Date("2026-06-18T15:30:00.000Z");
        const storedTask: StoredTask = {
          ...input,
          createdAt: now,
          id: `task-${tasks.length + 1}`,
          sourceType: input.sourceType,
          updatedAt: now
        };

        tasks.push(storedTask);

        return {
          id: storedTask.id,
          title: storedTask.title,
          description: storedTask.description,
          status: storedTask.status,
          dueAt: storedTask.dueAt,
          workflowArea: storedTask.workflowArea,
          sourceType: storedTask.sourceType,
          requiresManagerApproval: storedTask.requiresManagerApproval,
          vehicleReference: storedTask.vehicleReference ?? null,
          customerReference: storedTask.customerReference ?? null,
          blockerReason: storedTask.blockerReason ?? null,
          readyForReviewAt: storedTask.readyForReviewAt ?? null,
          completedAt: storedTask.completedAt ?? null,
          createdAt: storedTask.createdAt,
          updatedAt: storedTask.updatedAt,
          boardDay: {
            id: boardDay.id,
            date: new Date(`${boardDay.date}T00:00:00.000Z`)
          },
          assignedUser: {
            id: assignedUser.id,
            name: assignedUser.name,
            email: assignedUser.email
          },
          createdByUser: {
            id: createdByUser.id,
            name: createdByUser.name,
            email: createdByUser.email
          },
          reviewedByUser: reviewedByUser
            ? {
                id: reviewedByUser.id,
                name: reviewedByUser.name,
                email: reviewedByUser.email
              }
            : null
        };
      },

      async findAssignedUserById(userId) {
        return usersById.get(userId) ?? null;
      },

      async getOrCreateBoardDay(boardDate) {
        const existingBoardDay = boardDays.find((candidateBoardDay) => candidateBoardDay.date === boardDate);

        if (existingBoardDay) {
          return {
            id: existingBoardDay.id,
            date: new Date(`${existingBoardDay.date}T00:00:00.000Z`),
            generationStatus: "NOT_STARTED",
            generatedAt: null,
            generatedByUserId: null,
            createdAt: new Date("2026-06-18T15:30:00.000Z"),
            updatedAt: new Date("2026-06-18T15:30:00.000Z")
          };
        }

        const createdBoardDay = {
          date: boardDate,
          id: `board-day-${boardDays.length + 1}`
        };

        boardDays.push(createdBoardDay);

        return {
          id: createdBoardDay.id,
          date: new Date(`${createdBoardDay.date}T00:00:00.000Z`),
          generationStatus: "NOT_STARTED",
          generatedAt: null,
          generatedByUserId: null,
          createdAt: new Date("2026-06-18T15:30:00.000Z"),
          updatedAt: new Date("2026-06-18T15:30:00.000Z")
        };
      }
    }
  };
}

describe("task create service", () => {
  it("allows managers to create a manual task with the required workflow fields", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T15:30:00.000Z"));

    try {
      const { usersByEmail } = await createTestAuthStore();
      const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
      const assignee = usersByEmail.get("jordan.sales@local.test");
      const { repository, readActivityEvents, readBoardDays, readTasks } = createTaskCreateRepositoryHarness(
        [...usersByEmail.values()].map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }))
      );

      const result = await createManualTask(
        managerUser,
        {
          assignedUserId: assignee?.id,
          boardDate: "2026-06-18",
          customerReference: "Taylor R.",
          description: "Call before lunch and confirm final numbers.",
          dueAt: "2026-06-18T17:00:00.000Z",
          intakeMetadata: {
            channel: "Phone",
            expectedOutcome: "The customer receives final numbers and confirms the next step.",
            intakeType: "Sales Lead / Appointment",
            requiredUpdates: ["Next step", "Customer contacted"]
          },
          priority: "HIGH",
          requiresManagerApproval: true,
          title: "Review hot lead",
          vehicleReference: "2019 Camry",
          workflowArea: WorkflowArea.SALES
        },
        repository
      );

      expect(result).toEqual<ManualTaskCreateResult>({
        id: "task-1",
        boardDayId: "board-day-1",
        boardDate: "2026-06-18",
        title: "Review hot lead",
        description: "Call before lunch and confirm final numbers.",
        status: TaskStatus.NOT_STARTED,
        dueAt: "2026-06-18T17:00:00.000Z",
        workflowArea: WorkflowArea.SALES,
        sourceType: TaskSourceType.MANAGER,
        requiresManagerApproval: true,
        vehicleReference: "2019 Camry",
        customerReference: "Taylor R.",
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null,
        createdAt: "2026-06-18T15:30:00.000Z",
        updatedAt: "2026-06-18T15:30:00.000Z",
        assignedUser: {
          id: assignee?.id ?? "",
          name: assignee?.name ?? "",
          email: assignee?.email
        },
        createdByUser: {
          id: managerUser?.id ?? "",
          name: managerUser?.name ?? "",
          email: managerUser?.email
        },
        reviewedByUser: null
      });
      expect(readBoardDays()).toEqual([
        {
          date: "2026-06-18",
          id: "board-day-1"
        }
      ]);
      expect(readTasks()).toHaveLength(1);
      expect(readTasks()[0]).toMatchObject({
        assignedUserId: assignee?.id,
        boardDayId: "board-day-1",
        checklistItems: expect.arrayContaining([
          expect.objectContaining({ key: "customer_1" }),
          expect.objectContaining({ key: "customer_6" })
        ]),
        sourceType: TaskSourceType.MANAGER,
        priority: "HIGH",
        intakeMetadata: expect.objectContaining({
          expectedOutcome: "The customer receives final numbers and confirms the next step.",
          requiredUpdates: ["Next step", "Customer contacted"]
        }),
        title: "Review hot lead"
      });
      expect(readActivityEvents()).toEqual([
        {
          actorUserId: managerUser?.id ?? "",
          boardDayId: "board-day-1",
          eventType: ActivityEventType.TASK_CREATED,
          message: "Task created: Review hot lead",
          metadata: {
            assignedUserId: assignee?.id,
            dueAt: "2026-06-18T17:00:00.000Z",
            requiresManagerApproval: true,
            sourceType: TaskSourceType.MANAGER,
            title: "Review hot lead",
            workflowArea: WorkflowArea.SALES
          },
          taskId: "task-1"
        }
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects task creation without a due time and does not persist a task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const assignee = usersByEmail.get("jordan.sales@local.test");
    const { repository, readTasks } = createTaskCreateRepositoryHarness(
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      createManualTask(
        managerUser,
        {
          assignedUserId: assignee?.id,
          boardDate: "2026-06-18",
          title: "Review hot lead",
          workflowArea: WorkflowArea.SALES
        },
        repository
      )
    ).rejects.toThrow("Task creation requires a due time.");
    expect(readTasks()).toHaveLength(0);
  });

  it("rejects task creation without a title and does not persist a task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const assignee = usersByEmail.get("jordan.sales@local.test");
    const { repository, readTasks } = createTaskCreateRepositoryHarness(
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      createManualTask(
        managerUser,
        {
          assignedUserId: assignee?.id,
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "   ",
          workflowArea: WorkflowArea.SALES
        },
        repository
      )
    ).rejects.toThrow("Task creation requires a title.");
    expect(readTasks()).toHaveLength(0);
  });

  it("rejects task creation without an assigned user and does not persist a task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readTasks } = createTaskCreateRepositoryHarness(
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      createManualTask(
        managerUser,
        {
          assignedUserId: "   ",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review hot lead",
          workflowArea: WorkflowArea.SALES
        },
        repository
      )
    ).rejects.toThrow("Task creation requires an assigned user.");
    expect(readTasks()).toHaveLength(0);
  });

  it("allows staff to create their own not-started task", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const assignee = usersByEmail.get("jordan.sales@local.test");
    const { repository, readActivityEvents, readTasks } = createTaskCreateRepositoryHarness(
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    const result = await createManualTask(
      staffUser,
      {
        assignedUserId: assignee?.id,
        boardDate: "2026-06-18",
        dueAt: "2026-06-18T17:00:00.000Z",
        title: "Log customer follow-up",
        workflowArea: WorkflowArea.SALES
      },
      repository
    );

    expect(result).toMatchObject({
      assignedUser: {
        id: assignee?.id,
        name: assignee?.name
      },
      createdByUser: {
        id: staffUser?.id,
        name: staffUser?.name
      },
      requiresManagerApproval: false,
      sourceType: TaskSourceType.STAFF,
      status: TaskStatus.NOT_STARTED,
      title: "Log customer follow-up"
    });
    expect(readTasks()).toHaveLength(1);
    expect(readTasks()[0]).toMatchObject({
      assignedUserId: assignee?.id,
      createdByUserId: staffUser?.id,
      sourceType: TaskSourceType.STAFF
    });
    expect(readActivityEvents()[0]).toMatchObject({
      actorUserId: staffUser?.id,
      eventType: ActivityEventType.TASK_CREATED,
      metadata: expect.objectContaining({
        sourceType: TaskSourceType.STAFF,
        title: "Log customer follow-up"
      })
    });
  });

  it("prevents staff from creating tasks for other users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherAssignee = usersByEmail.get("casey.mechanic@local.test");
    const { repository, readTasks } = createTaskCreateRepositoryHarness(
      [...usersByEmail.values()].map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }))
    );

    await expect(
      createManualTask(
        staffUser,
        {
          assignedUserId: otherAssignee?.id,
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Create work for someone else",
          workflowArea: WorkflowArea.SALES
        },
        repository
      )
    ).rejects.toThrow("Staff can only create tasks assigned to themselves.");
    expect(readTasks()).toHaveLength(0);
  });

  it("runs task-to-appointment automation when a trigger code is provided at creation time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T15:30:00.000Z"));

    try {
      const { usersByEmail } = await createTestAuthStore();
      const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
      const assignee = usersByEmail.get("jordan.sales@local.test");
      const { repository, readTasks } = createTaskCreateRepositoryHarness(
        [...usersByEmail.values()].map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }))
      );
      const taskAppointmentAutomationRunner = vi.fn().mockResolvedValue({
        taskId: "task-1",
        triggerCode: "ANY_TASK_REQUIRES_MEETING",
        evaluatedRuleCount: 1,
        createdAppointmentCount: 1,
        executions: []
      });

      await createManualTask(
        managerUser,
        {
          assignedUserId: assignee?.id,
          appointmentAutomationReasonNotes: "Schedule a planning call after the task opens.",
          appointmentAutomationTriggerCode: "any_task_requires_meeting",
          boardDate: "2026-06-18",
          dueAt: "2026-06-18T17:00:00.000Z",
          title: "Review financing packet",
          workflowArea: WorkflowArea.SALES
        },
        repository,
        {
          taskAppointmentAutomationRunner
        }
      );

      expect(readTasks()).toHaveLength(1);
      expect(taskAppointmentAutomationRunner).toHaveBeenCalledWith(managerUser, {
        reasonNotes: "Schedule a planning call after the task opens.",
        taskId: "task-1",
        triggerCode: "ANY_TASK_REQUIRES_MEETING"
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
