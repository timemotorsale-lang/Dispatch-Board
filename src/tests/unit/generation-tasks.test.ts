import {
  BoardGenerationStatus,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createMissingGeneratedTasksForDate,
  type CreateMissingGeneratedTasksDependencies
} from "@/server/services/generation-tasks";
import type { GenerationInput } from "@/server/services/generation-inputs";

type StoredBoardDay = {
  id: string;
  date: Date;
  generationStatus: BoardGenerationStatus;
  generatedAt: Date | null;
  generatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredTask = {
  id: string;
  boardDayId: string;
  title: string;
  description: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  status: TaskStatus;
  dueAt: Date;
  createdByUserId: string | null;
  requiresManagerApproval: boolean;
  sourceType: TaskSourceType;
  sourceTemplateId: string | null;
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
  createdAt: Date;
  updatedAt: Date;
};

function createGenerationInput(): GenerationInput {
  return {
    boardDate: "2026-06-17",
    users: [
      {
        userId: "user-inventory",
        userName: "Avery Inventory",
        userEmail: "avery.inventory@local.test",
        roles: [{ roleId: "role-inventory", roleName: "Inventory Manager" }],
        directDuties: [],
        dutySource: "role_default" as const,
        resolvedDuties: [
          {
            dutyId: "duty-inventory",
            title: "Review inventory status",
            workflowArea: "Inventory",
            source: "role_default" as const,
            roleIds: ["role-inventory"],
            roleNames: ["Inventory Manager"]
          }
        ],
        templates: [
          {
            templateId: "template-inventory",
            title: "Review inventory status",
            description: "Check stale and ready-for-sale units.",
            workflowArea: WorkflowArea.INVENTORY,
            defaultDueTime: "09:00",
            requiresManagerApproval: false,
            roleId: "role-inventory",
            roleName: "Inventory Manager",
            dutyId: "duty-inventory",
            dutyName: "Review inventory status",
            matchedByRole: true,
            matchedByDuty: true
          }
        ]
      },
      {
        userId: "user-sales",
        userName: "Jordan Sales",
        userEmail: "jordan.sales@local.test",
        roles: [{ roleId: "role-sales", roleName: "Salesperson" }],
        directDuties: [
          {
            dutyId: "duty-sales",
            title: "Follow up with assigned leads",
            workflowArea: "Sales",
            source: "custom" as const,
            roleIds: [],
            roleNames: []
          }
        ],
        dutySource: "custom" as const,
        resolvedDuties: [
          {
            dutyId: "duty-sales",
            title: "Follow up with assigned leads",
            workflowArea: "Sales",
            source: "custom" as const,
            roleIds: [],
            roleNames: []
          }
        ],
        templates: [
          {
            templateId: "template-sales-duty",
            title: "Follow up with assigned leads",
            description: null,
            workflowArea: WorkflowArea.SALES,
            defaultDueTime: "15:30",
            requiresManagerApproval: true,
            roleId: null,
            roleName: null,
            dutyId: "duty-sales",
            dutyName: "Follow up with assigned leads",
            matchedByRole: false,
            matchedByDuty: true
          }
        ]
      }
    ],
    warnings: []
  };
}

function createGenerationTasksHarness(
  generationInput = createGenerationInput(),
  options: {
    boardDays?: StoredBoardDay[];
    tasks?: StoredTask[];
    beforeCreateTask?: (task: Pick<StoredTask, "boardDayId" | "assignedUserId" | "sourceTemplateId">) => void;
  } = {}
) {
  let boardDayCounter = 1;
  let taskCounter = 1;
  let boardDays = [...(options.boardDays ?? [])];
  let tasks = [...(options.tasks ?? [])];

  const repository: NonNullable<CreateMissingGeneratedTasksDependencies["repository"]> = {
    async getOrCreateBoardDay(boardDate) {
      const boardDateValue = new Date(`${boardDate}T00:00:00.000Z`);
      const existingBoardDay = boardDays.find(
        (candidate) => candidate.date.toISOString().slice(0, 10) === boardDateValue.toISOString().slice(0, 10)
      );

      if (existingBoardDay) {
        return existingBoardDay;
      }

      const createdBoardDay: StoredBoardDay = {
        id: `board-day-${boardDayCounter++}`,
        date: boardDateValue,
        generationStatus: BoardGenerationStatus.NOT_STARTED,
        generatedAt: null,
        generatedByUserId: null,
        createdAt: new Date("2026-06-17T08:00:00.000Z"),
        updatedAt: new Date("2026-06-17T08:00:00.000Z")
      };

      boardDays = [...boardDays, createdBoardDay];

      return createdBoardDay;
    },

    async listExistingGeneratedTasks(boardDayId) {
      return tasks
        .filter((task) => task.boardDayId === boardDayId && task.sourceType === TaskSourceType.TEMPLATE)
        .map((task) => ({
          id: task.id,
          sourceTemplateId: task.sourceTemplateId,
          assignedUserId: task.assignedUserId
        }));
    },

    async createGeneratedTask(input) {
      options.beforeCreateTask?.({
        boardDayId: input.boardDayId,
        assignedUserId: input.assignedUserId,
        sourceTemplateId: input.sourceTemplateId
      });

      const existingTask = tasks.find(
        (task) =>
          task.boardDayId === input.boardDayId &&
          task.assignedUserId === input.assignedUserId &&
          task.sourceTemplateId === input.sourceTemplateId
      );

      if (existingTask) {
        return null;
      }

      const createdTask: StoredTask = {
        id: `task-${taskCounter++}`,
        boardDayId: input.boardDayId,
        title: input.title,
        description: input.description,
        assignedUserId: input.assignedUserId,
        recommendedUserId: input.recommendedUserId,
        status: TaskStatus.NOT_STARTED,
        dueAt: input.dueAt,
        createdByUserId: input.createdByUserId,
        requiresManagerApproval: input.requiresManagerApproval,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: input.sourceTemplateId,
        sourceDutyId: input.sourceDutyId,
        workflowArea: input.workflowArea,
        createdAt: new Date("2026-06-17T08:30:00.000Z"),
        updatedAt: new Date("2026-06-17T08:30:00.000Z")
      };

      tasks = [...tasks, createdTask];

      return {
        id: createdTask.id,
        title: createdTask.title,
        assignedUserId: createdTask.assignedUserId,
        recommendedUserId: createdTask.recommendedUserId,
        dueAt: createdTask.dueAt,
        sourceTemplateId: createdTask.sourceTemplateId,
        sourceDutyId: createdTask.sourceDutyId,
        workflowArea: createdTask.workflowArea
      };
    }
  };

  return {
    repository,
    loadGenerationInputs: async () => generationInput,
    readBoardDays() {
      return boardDays;
    },
    readTasks() {
      return tasks;
    },
    createBoardDay(boardDate: string) {
      const boardDay: StoredBoardDay = {
        id: `board-day-${boardDayCounter++}`,
        date: new Date(`${boardDate}T00:00:00.000Z`),
        generationStatus: BoardGenerationStatus.NOT_STARTED,
        generatedAt: null,
        generatedByUserId: null,
        createdAt: new Date("2026-06-17T08:00:00.000Z"),
        updatedAt: new Date("2026-06-17T08:00:00.000Z")
      };

      boardDays = [...boardDays, boardDay];

      return boardDay;
    }
  };
}

describe("generation tasks service", () => {
  it("creates generated tasks for the first run and returns a useful summary", async () => {
    const harness = createGenerationTasksHarness();

    const result = await createMissingGeneratedTasksForDate(
      "2026-06-17",
      { createdByUserId: "  user-manager  " },
      harness
    );

    expect(result).toMatchObject({
      boardDate: "2026-06-17",
      totalCandidatesConsidered: 2,
      createdTaskCount: 2,
      skippedExistingTaskCount: 0,
      warnings: []
    });
    expect(result.createdTasks).toEqual([
      {
        id: "task-1",
        title: "Review inventory status",
        assignedUserId: "user-inventory",
        recommendedUserId: "user-inventory",
        dueAt: new Date("2026-06-17T09:00:00.000Z"),
        sourceTemplateId: "template-inventory",
        sourceDutyId: "duty-inventory",
        workflowArea: WorkflowArea.INVENTORY
      },
      {
        id: "task-2",
        title: "Follow up with assigned leads",
        assignedUserId: "user-sales",
        recommendedUserId: "user-sales",
        dueAt: new Date("2026-06-17T15:30:00.000Z"),
        sourceTemplateId: "template-sales-duty",
        sourceDutyId: "duty-sales",
        workflowArea: WorkflowArea.SALES
      }
    ]);

    expect(harness.readBoardDays()).toHaveLength(1);
    expect(harness.readTasks()).toEqual([
      expect.objectContaining({
        title: "Review inventory status",
        description: "Check stale and ready-for-sale units.",
        assignedUserId: "user-inventory",
        recommendedUserId: "user-inventory",
        status: TaskStatus.NOT_STARTED,
        dueAt: new Date("2026-06-17T09:00:00.000Z"),
        createdByUserId: "user-manager",
        requiresManagerApproval: false,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-inventory",
        sourceDutyId: "duty-inventory",
        workflowArea: WorkflowArea.INVENTORY
      }),
      expect.objectContaining({
        title: "Follow up with assigned leads",
        description: "",
        assignedUserId: "user-sales",
        recommendedUserId: "user-sales",
        status: TaskStatus.NOT_STARTED,
        dueAt: new Date("2026-06-17T15:30:00.000Z"),
        createdByUserId: "user-manager",
        requiresManagerApproval: true,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-sales-duty",
        sourceDutyId: "duty-sales",
        workflowArea: WorkflowArea.SALES
      })
    ]);
  });

  it("skips duplicate generated tasks on a second run for the same board date", async () => {
    const harness = createGenerationTasksHarness();

    const firstRun = await createMissingGeneratedTasksForDate("2026-06-17", undefined, harness);
    const secondRun = await createMissingGeneratedTasksForDate("2026-06-17", undefined, harness);

    expect(secondRun.boardDayId).toBe(firstRun.boardDayId);
    expect(secondRun).toMatchObject({
      totalCandidatesConsidered: 2,
      createdTaskCount: 0,
      skippedExistingTaskCount: 2
    });
    expect(secondRun.createdTasks).toEqual([]);
    expect(harness.readBoardDays()).toHaveLength(1);
    expect(harness.readTasks()).toHaveLength(2);
  });

  it("preserves manual tasks on the same board and does not treat them as duplicates", async () => {
    const harness = createGenerationTasksHarness();
    const boardDay = harness.createBoardDay("2026-06-17");
    const manualTask: StoredTask = {
      id: "manual-task-1",
      boardDayId: boardDay.id,
      title: "Review inventory status",
      description: "Manager-created follow-up.",
      assignedUserId: "user-inventory",
      recommendedUserId: null,
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-06-17T08:45:00.000Z"),
      createdByUserId: "user-manager",
      requiresManagerApproval: false,
      sourceType: TaskSourceType.MANAGER,
      sourceTemplateId: null,
      sourceDutyId: null,
      workflowArea: WorkflowArea.INVENTORY,
      createdAt: new Date("2026-06-17T08:10:00.000Z"),
      updatedAt: new Date("2026-06-17T08:20:00.000Z")
    };
    const manualHarness = createGenerationTasksHarness(createGenerationInput(), {
      boardDays: harness.readBoardDays(),
      tasks: [manualTask]
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, manualHarness);

    expect(result).toMatchObject({
      createdTaskCount: 2,
      skippedExistingTaskCount: 0
    });
    expect(manualHarness.readTasks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "manual-task-1",
          description: "Manager-created follow-up.",
          sourceType: TaskSourceType.MANAGER,
          status: TaskStatus.IN_PROGRESS
        }),
        expect.objectContaining({
          sourceType: TaskSourceType.TEMPLATE,
          sourceTemplateId: "template-inventory"
        })
      ])
    );
    expect(manualHarness.readTasks()).toHaveLength(3);
  });

  it("does not overwrite existing generated tasks and only creates missing candidates", async () => {
    const harness = createGenerationTasksHarness();
    const boardDay = harness.createBoardDay("2026-06-17");
    const existingGeneratedTask: StoredTask = {
      id: "existing-generated-1",
      boardDayId: boardDay.id,
      title: "Review inventory status",
      description: "Manager edited this generated task.",
      assignedUserId: "user-inventory",
      recommendedUserId: "user-inventory",
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-06-17T10:15:00.000Z"),
      createdByUserId: "user-manager",
      requiresManagerApproval: false,
      sourceType: TaskSourceType.TEMPLATE,
      sourceTemplateId: "template-inventory",
      sourceDutyId: "duty-inventory",
      workflowArea: WorkflowArea.INVENTORY,
      createdAt: new Date("2026-06-17T08:10:00.000Z"),
      updatedAt: new Date("2026-06-17T11:20:00.000Z")
    };
    const existingHarness = createGenerationTasksHarness(createGenerationInput(), {
      boardDays: harness.readBoardDays(),
      tasks: [existingGeneratedTask]
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, existingHarness);

    expect(result).toMatchObject({
      totalCandidatesConsidered: 2,
      createdTaskCount: 1,
      skippedExistingTaskCount: 1
    });
    expect(result.createdTasks).toEqual([
      expect.objectContaining({
        title: "Follow up with assigned leads",
        sourceTemplateId: "template-sales-duty"
      })
    ]);
    expect(existingHarness.readTasks()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "existing-generated-1",
          description: "Manager edited this generated task.",
          status: TaskStatus.IN_PROGRESS,
          dueAt: new Date("2026-06-17T10:15:00.000Z")
        })
      ])
    );
  });

  it("treats a concurrent duplicate insert as an idempotent skip instead of a fatal error", async () => {
    const insertedKeys = new Set<string>();
    const harness = createGenerationTasksHarness(createGenerationInput(), {
      beforeCreateTask(task) {
        const identityKey = `${task.boardDayId}:${task.sourceTemplateId}:${task.assignedUserId}`;

        if (insertedKeys.has(identityKey) || task.sourceTemplateId !== "template-sales-duty") {
          return;
        }

        insertedKeys.add(identityKey);
      }
    });

    const boardDay = harness.createBoardDay("2026-06-17");
    const concurrentHarness = createGenerationTasksHarness(createGenerationInput(), {
      boardDays: harness.readBoardDays(),
      tasks: [],
      beforeCreateTask(task) {
        const identityKey = `${task.boardDayId}:${task.sourceTemplateId}:${task.assignedUserId}`;

        if (insertedKeys.has(identityKey) || task.sourceTemplateId !== "template-sales-duty") {
          return;
        }

        insertedKeys.add(identityKey);

        const concurrentTask: StoredTask = {
          id: "concurrent-generated-1",
          boardDayId: boardDay.id,
          title: "Follow up with assigned leads",
          description: "",
          assignedUserId: "user-sales",
          recommendedUserId: "user-sales",
          status: TaskStatus.NOT_STARTED,
          dueAt: new Date("2026-06-17T15:30:00.000Z"),
          createdByUserId: null,
          requiresManagerApproval: true,
          sourceType: TaskSourceType.TEMPLATE,
          sourceTemplateId: "template-sales-duty",
          sourceDutyId: "duty-sales",
          workflowArea: WorkflowArea.SALES,
          createdAt: new Date("2026-06-17T08:40:00.000Z"),
          updatedAt: new Date("2026-06-17T08:40:00.000Z")
        };

        const existingTasks = concurrentHarness.readTasks();
        existingTasks.push(concurrentTask);
      }
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, concurrentHarness);

    expect(result).toMatchObject({
      totalCandidatesConsidered: 2,
      createdTaskCount: 1,
      skippedExistingTaskCount: 1
    });
    expect(concurrentHarness.readTasks().filter((task) => task.sourceType === TaskSourceType.TEMPLATE)).toHaveLength(2);
  });

  it("rejects invalid board dates and invalid template due times", async () => {
    const invalidDateHarness = createGenerationTasksHarness();

    await expect(
      createMissingGeneratedTasksForDate("06/17/2026", undefined, invalidDateHarness)
    ).rejects.toThrow(/YYYY-MM-DD/);

    const invalidDueTimeHarness = createGenerationTasksHarness({
      ...createGenerationInput(),
      users: [
        {
          ...createGenerationInput().users[0],
          templates: [
            {
              ...createGenerationInput().users[0].templates[0],
              defaultDueTime: "9 AM"
            }
          ]
        }
      ]
    });

    await expect(
      createMissingGeneratedTasksForDate("2026-06-17", undefined, invalidDueTimeHarness)
    ).rejects.toThrow(/defaultDueTime/);
  });
});
