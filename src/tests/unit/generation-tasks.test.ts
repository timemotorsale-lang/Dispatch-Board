import {
  BoardGenerationStatus,
  GenerationRunStatus,
  GenerationTriggerType,
  Prisma,
  TaskSourceType,
  TaskStatus,
  WorkflowArea
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createMissingGeneratedTasksForDate,
  getGenerationRunFailureContext,
  listGenerationRunsForDate,
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
  recommendationReasonCode: string | null;
  recommendationExplanation: string | null;
  status: TaskStatus;
  dueAt: Date;
  createdByUserId: string | null;
  requiresManagerApproval: boolean;
  sourceType: TaskSourceType;
  sourceTemplateId: string | null;
  templateSnapshot: Prisma.JsonValue | null;
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
  createdAt: Date;
  updatedAt: Date;
};

type StoredGenerationRun = {
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
            templateCategory: "inventory_recon",
            workflowArea: WorkflowArea.INVENTORY,
            priority: "HIGH",
            defaultDueTime: "09:00",
            requiresManagerApproval: false,
            requiredUpdateFields: [
              {
                key: "unit_reference",
                label: "Unit reference",
                type: "short_text",
                required: true,
                helpText: null
              }
            ],
            checklistItems: [
              {
                key: "review_unit",
                label: "Review unit",
                description: "Confirm current inventory status.",
                required: true
              }
            ],
            completionCriteria: {
              mode: "checklist_and_update_fields",
              requiredChecklistKeys: ["review_unit"],
              requiredFieldKeys: ["unit_reference"]
            },
            defaultStatusRules: {
              allowedStatuses: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_REVIEW", "COMPLETED"],
              blockedReasonRequired: true,
              waitingReasonRequiredStatuses: []
            },
            approvalRules: {
              mode: "none",
              readyForReviewRequired: false
            },
            intelligenceSignalType: "INVENTORY_UPDATE",
            taskCardDisplayHints: {
              emphasizeDueTime: true,
              emphasizeVehicle: true,
              emphasizeCustomer: false,
              showChecklistProgress: true,
              highlightReadyForReview: false
            },
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
        userName: "Baraka Sales",
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
            templateCategory: "sales_follow_up",
            workflowArea: WorkflowArea.SALES,
            priority: "HIGH",
            defaultDueTime: "15:30",
            requiresManagerApproval: true,
            requiredUpdateFields: [
              {
                key: "customer_name",
                label: "Customer name",
                type: "short_text",
                required: true,
                helpText: null
              }
            ],
            checklistItems: [
              {
                key: "log_follow_up",
                label: "Log follow-up",
                description: "Record the latest customer follow-up.",
                required: true
              }
            ],
            completionCriteria: {
              mode: "checklist_and_update_fields",
              requiredChecklistKeys: ["log_follow_up"],
              requiredFieldKeys: ["customer_name"]
            },
            defaultStatusRules: {
              allowedStatuses: [
                "NOT_STARTED",
                "IN_PROGRESS",
                "BLOCKED",
                "WAITING_ON_PARTS",
                "WAITING_ON_APPROVAL",
                "READY_FOR_REVIEW",
                "COMPLETED"
              ],
              blockedReasonRequired: true,
              waitingReasonRequiredStatuses: ["WAITING_ON_APPROVAL"]
            },
            approvalRules: {
              mode: "manager_review",
              readyForReviewRequired: true
            },
            intelligenceSignalType: "SALES_UPDATE",
            taskCardDisplayHints: {
              emphasizeDueTime: true,
              emphasizeVehicle: false,
              emphasizeCustomer: true,
              showChecklistProgress: true,
              highlightReadyForReview: true
            },
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

function createNowSequence(...timestamps: string[]) {
  let index = 0;

  return () => {
    const timestamp = timestamps[Math.min(index, timestamps.length - 1)];

    index += 1;

    return new Date(timestamp);
  };
}

function compareDatesDescending(left: Date, right: Date) {
  return right.getTime() - left.getTime();
}

function createGenerationTasksHarness(
  generationInput = createGenerationInput(),
  options: {
    boardDays?: StoredBoardDay[];
    tasks?: StoredTask[];
    generationRuns?: StoredGenerationRun[];
    beforeCreateTask?: (task: Pick<StoredTask, "boardDayId" | "assignedUserId" | "sourceTemplateId">) => void;
  } = {}
) {
  let boardDayCounter = 1;
  let taskCounter = 1;
  let generationRunCounter = 1;
  let boardDays = [...(options.boardDays ?? [])];
  let tasks = [...(options.tasks ?? [])];
  let generationRuns = [...(options.generationRuns ?? [])];

  function requireBoardDay(boardDayId: string) {
    const boardDay = boardDays.find((candidate) => candidate.id === boardDayId);

    if (!boardDay) {
      throw new Error(`Unknown board day ${boardDayId}.`);
    }

    return boardDay;
  }

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

    async markBoardDayGenerationStarted(boardDayId) {
      const boardDay = requireBoardDay(boardDayId);

      boardDay.generationStatus = BoardGenerationStatus.IN_PROGRESS;

      return boardDay;
    },

    async markBoardDayGenerationSucceeded(input) {
      const boardDay = requireBoardDay(input.boardDayId);

      boardDay.generationStatus = BoardGenerationStatus.GENERATED;
      boardDay.generatedAt = input.generatedAt;
      boardDay.generatedByUserId = input.generatedByUserId;

      return boardDay;
    },

    async markBoardDayGenerationFailed(boardDayId) {
      const boardDay = requireBoardDay(boardDayId);

      boardDay.generationStatus = BoardGenerationStatus.FAILED;

      return boardDay;
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

    async countManualTasks(boardDayId) {
      return tasks.filter(
        (task) =>
          task.boardDayId === boardDayId &&
          (task.sourceType === TaskSourceType.MANAGER || task.sourceType === TaskSourceType.STAFF)
      ).length;
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
        recommendationReasonCode: input.recommendationReasonCode,
        recommendationExplanation: input.recommendationExplanation,
        status: TaskStatus.NOT_STARTED,
        dueAt: input.dueAt,
        createdByUserId: input.createdByUserId,
        requiresManagerApproval: input.requiresManagerApproval,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: input.sourceTemplateId,
        templateSnapshot: input.templateSnapshot as Prisma.JsonValue,
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
        recommendationReasonCode: createdTask.recommendationReasonCode,
        recommendationExplanation: createdTask.recommendationExplanation,
        dueAt: createdTask.dueAt,
        sourceTemplateId: createdTask.sourceTemplateId,
        templateSnapshot: createdTask.templateSnapshot,
        sourceDutyId: createdTask.sourceDutyId,
        workflowArea: createdTask.workflowArea
      };
    },

    async startGenerationRun(input) {
      const generationRun: StoredGenerationRun = {
        id: `generation-run-${generationRunCounter++}`,
        boardDate: new Date(`${input.boardDate}T00:00:00.000Z`),
        startedAt: input.startedAt,
        finishedAt: null,
        status: GenerationRunStatus.RUNNING,
        triggeredBy: input.triggeredBy,
        triggeredByUserId: input.triggeredByUserId,
        summary: input.summary as Prisma.JsonValue,
        errorMessage: null
      };

      generationRuns = [...generationRuns, generationRun];

      return generationRun;
    },

    async completeGenerationRun(input) {
      const generationRun = generationRuns.find((candidate) => candidate.id === input.id);

      if (!generationRun) {
        throw new Error(`Unknown generation run ${input.id}.`);
      }

      generationRun.finishedAt = input.finishedAt;
      generationRun.status = GenerationRunStatus.SUCCEEDED;
      generationRun.summary = input.summary as Prisma.JsonValue;
      generationRun.errorMessage = null;

      return generationRun;
    },

    async failGenerationRun(input) {
      const generationRun = generationRuns.find((candidate) => candidate.id === input.id);

      if (!generationRun) {
        throw new Error(`Unknown generation run ${input.id}.`);
      }

      generationRun.finishedAt = input.finishedAt;
      generationRun.status = GenerationRunStatus.FAILED;
      generationRun.summary = input.summary as Prisma.JsonValue;
      generationRun.errorMessage = input.errorMessage;

      return generationRun;
    },

    async listGenerationRunsForDate(boardDate) {
      const boardDateKey = new Date(`${boardDate}T00:00:00.000Z`).toISOString().slice(0, 10);

      return generationRuns
        .filter((run) => run.boardDate.toISOString().slice(0, 10) === boardDateKey)
        .sort(
          (left, right) =>
            compareDatesDescending(left.startedAt, right.startedAt) || right.id.localeCompare(left.id)
        );
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
    readGenerationRuns() {
      return generationRuns;
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
  it("creates a generation run, completes it, and returns a useful success summary", async () => {
    const harness = createGenerationTasksHarness();

    const result = await createMissingGeneratedTasksForDate(
      "2026-06-17",
      { createdByUserId: "  user-manager  " },
      {
        ...harness,
        now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:05.000Z")
      }
    );

    expect(result).toMatchObject({
      generationRunId: "generation-run-1",
      generationRunStatus: GenerationRunStatus.SUCCEEDED,
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
        recommendationReasonCode: "ROLE_DEFAULT_DUTY_MATCH",
        recommendationExplanation:
          "Recommended because this task matches the Review inventory status duty provided by the Inventory Manager role.",
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
        recommendationReasonCode: "DIRECT_DUTY_MATCH",
        recommendationExplanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads.",
        dueAt: new Date("2026-06-17T15:30:00.000Z"),
        sourceTemplateId: "template-sales-duty",
        sourceDutyId: "duty-sales",
        workflowArea: WorkflowArea.SALES
      }
    ]);

    expect(harness.readBoardDays()).toHaveLength(1);
    expect(harness.readBoardDays()[0]).toEqual(
      expect.objectContaining({
        generationStatus: BoardGenerationStatus.GENERATED,
        generatedAt: new Date("2026-06-17T08:00:05.000Z"),
        generatedByUserId: "user-manager"
      })
    );
    expect(harness.readTasks()).toEqual([
      expect.objectContaining({
        title: "Review inventory status",
        description: "Check stale and ready-for-sale units.",
        assignedUserId: "user-inventory",
        recommendedUserId: "user-inventory",
        recommendationReasonCode: "ROLE_DEFAULT_DUTY_MATCH",
        recommendationExplanation:
          "Recommended because this task matches the Review inventory status duty provided by the Inventory Manager role.",
        status: TaskStatus.NOT_STARTED,
        dueAt: new Date("2026-06-17T09:00:00.000Z"),
        createdByUserId: "user-manager",
        requiresManagerApproval: false,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-inventory",
        templateSnapshot: expect.objectContaining({
          templateId: "template-inventory",
          templateCategory: "inventory_recon",
          priority: "HIGH",
          intelligenceSignalType: "INVENTORY_UPDATE"
        }),
        sourceDutyId: "duty-inventory",
        workflowArea: WorkflowArea.INVENTORY
      }),
      expect.objectContaining({
        title: "Follow up with assigned leads",
        description: "",
        assignedUserId: "user-sales",
        recommendedUserId: "user-sales",
        recommendationReasonCode: "DIRECT_DUTY_MATCH",
        recommendationExplanation:
          "Recommended because this task matches the direct duty Follow up with assigned leads.",
        status: TaskStatus.NOT_STARTED,
        dueAt: new Date("2026-06-17T15:30:00.000Z"),
        createdByUserId: "user-manager",
        requiresManagerApproval: true,
        sourceType: TaskSourceType.TEMPLATE,
        sourceTemplateId: "template-sales-duty",
        templateSnapshot: expect.objectContaining({
          templateId: "template-sales-duty",
          approvalRules: expect.objectContaining({
            mode: "manager_review",
            readyForReviewRequired: true
          })
        }),
        sourceDutyId: "duty-sales",
        workflowArea: WorkflowArea.SALES
      })
    ]);

    expect(harness.readGenerationRuns()).toEqual([
      expect.objectContaining({
        id: "generation-run-1",
        boardDate: new Date("2026-06-17T00:00:00.000Z"),
        startedAt: new Date("2026-06-17T08:00:00.000Z"),
        finishedAt: new Date("2026-06-17T08:00:05.000Z"),
        status: GenerationRunStatus.SUCCEEDED,
        triggeredBy: GenerationTriggerType.MANUAL,
        triggeredByUserId: "user-manager",
        errorMessage: null,
        summary: {
          boardDate: "2026-06-17",
          boardDayId: result.boardDayId,
          triggeredBy: "manual",
          triggeredByUserId: "user-manager",
          usersConsidered: 2,
          templatesConsidered: 2,
          tasksCreated: 2,
          tasksSkippedAsDuplicates: 0,
          manualTasksPreserved: 0,
          tasksAlreadyExisting: 0,
          durationMs: 5000
        }
      })
    ]);
  });

  it("returns generation warnings and succeeds cleanly when there are no task candidates", async () => {
    const harness = createGenerationTasksHarness({
      boardDate: "2026-06-17",
      users: [
        {
          userId: "user-empty",
          userName: "No Match",
          userEmail: "no.match@local.test",
          roles: [],
          directDuties: [],
          dutySource: "none",
          resolvedDuties: [],
          templates: []
        }
      ],
      warnings: [
        {
          userId: "user-empty",
          code: "USER_HAS_NO_ELIGIBLE_DUTIES",
          message: "No Match has no custom duties or role default duties available for generation."
        }
      ]
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:01.000Z")
    });

    expect(result).toMatchObject({
      generationRunStatus: GenerationRunStatus.SUCCEEDED,
      totalCandidatesConsidered: 0,
      createdTaskCount: 0,
      skippedExistingTaskCount: 0,
      warnings: [
        {
          userId: "user-empty",
          code: "USER_HAS_NO_ELIGIBLE_DUTIES"
        }
      ]
    });
    expect(result.createdTasks).toEqual([]);
    expect(harness.readGenerationRuns()[0]).toEqual(
      expect.objectContaining({
        status: GenerationRunStatus.SUCCEEDED,
        summary: expect.objectContaining({
          usersConsidered: 1,
          templatesConsidered: 0,
          tasksCreated: 0,
          tasksSkippedAsDuplicates: 0
        })
      })
    );
  });

  it("creates a separate completed generation run on retry without duplicating generated tasks", async () => {
    const harness = createGenerationTasksHarness();

    const firstRun = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:02.000Z")
    });
    const secondRun = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T09:00:00.000Z", "2026-06-17T09:00:03.000Z")
    });

    expect(secondRun.boardDayId).toBe(firstRun.boardDayId);
    expect(secondRun).toMatchObject({
      generationRunId: "generation-run-2",
      generationRunStatus: GenerationRunStatus.SUCCEEDED,
      totalCandidatesConsidered: 2,
      createdTaskCount: 0,
      skippedExistingTaskCount: 2
    });
    expect(secondRun.createdTasks).toEqual([]);
    expect(harness.readBoardDays()).toHaveLength(1);
    expect(harness.readTasks()).toHaveLength(2);
    expect(harness.readGenerationRuns()).toHaveLength(2);
    expect(harness.readGenerationRuns().map((run) => run.status)).toEqual([
      GenerationRunStatus.SUCCEEDED,
      GenerationRunStatus.SUCCEEDED
    ]);
    expect(harness.readGenerationRuns()[1].summary).toEqual(
      expect.objectContaining({
        tasksCreated: 0,
        tasksSkippedAsDuplicates: 2,
        tasksAlreadyExisting: 2
      })
    );
  });

  it("preserves manual tasks on retries and records the preserved count in the completed run summary", async () => {
    const harness = createGenerationTasksHarness();
    const boardDay = harness.createBoardDay("2026-06-17");
    const manualTask: StoredTask = {
      id: "manual-task-1",
      boardDayId: boardDay.id,
      title: "Review inventory status",
      description: "Manager-created follow-up.",
      assignedUserId: "user-inventory",
      recommendedUserId: null,
      recommendationReasonCode: null,
      recommendationExplanation: null,
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-06-17T08:45:00.000Z"),
      createdByUserId: "user-manager",
      requiresManagerApproval: false,
      sourceType: TaskSourceType.MANAGER,
      sourceTemplateId: null,
      templateSnapshot: null,
      sourceDutyId: null,
      workflowArea: WorkflowArea.INVENTORY,
      createdAt: new Date("2026-06-17T08:10:00.000Z"),
      updatedAt: new Date("2026-06-17T08:20:00.000Z")
    };
    const manualHarness = createGenerationTasksHarness(createGenerationInput(), {
      boardDays: harness.readBoardDays(),
      tasks: [manualTask]
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...manualHarness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:04.000Z")
    });

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
    expect(manualHarness.readGenerationRuns()[0].summary).toEqual(
      expect.objectContaining({
        manualTasksPreserved: 1
      })
    );
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
      recommendationReasonCode: "ROLE_DEFAULT_DUTY_MATCH",
      recommendationExplanation:
        "Recommended because this task matches the Review inventory status duty provided by the Inventory Manager role.",
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date("2026-06-17T10:15:00.000Z"),
      createdByUserId: "user-manager",
      requiresManagerApproval: false,
      sourceType: TaskSourceType.TEMPLATE,
      sourceTemplateId: "template-inventory",
      templateSnapshot: {
        templateId: "template-inventory",
        title: "Review inventory status"
      },
      sourceDutyId: "duty-inventory",
      workflowArea: WorkflowArea.INVENTORY,
      createdAt: new Date("2026-06-17T08:10:00.000Z"),
      updatedAt: new Date("2026-06-17T11:20:00.000Z")
    };
    const existingHarness = createGenerationTasksHarness(createGenerationInput(), {
      boardDays: harness.readBoardDays(),
      tasks: [existingGeneratedTask]
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...existingHarness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:03.000Z")
    });

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
          recommendationReasonCode: "DIRECT_DUTY_MATCH",
          recommendationExplanation:
            "Recommended because this task matches the direct duty Follow up with assigned leads.",
          status: TaskStatus.NOT_STARTED,
          dueAt: new Date("2026-06-17T15:30:00.000Z"),
          createdByUserId: null,
          requiresManagerApproval: true,
          sourceType: TaskSourceType.TEMPLATE,
          sourceTemplateId: "template-sales-duty",
          templateSnapshot: {
            templateId: "template-sales-duty",
            title: "Follow up with assigned leads"
          },
          sourceDutyId: "duty-sales",
          workflowArea: WorkflowArea.SALES,
          createdAt: new Date("2026-06-17T08:40:00.000Z"),
          updatedAt: new Date("2026-06-17T08:40:00.000Z")
        };

        const existingTasks = concurrentHarness.readTasks();
        existingTasks.push(concurrentTask);
      }
    });

    const result = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...concurrentHarness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:03.000Z")
    });

    expect(result).toMatchObject({
      totalCandidatesConsidered: 2,
      createdTaskCount: 1,
      skippedExistingTaskCount: 1
    });
    expect(concurrentHarness.readTasks().filter((task) => task.sourceType === TaskSourceType.TEMPLATE)).toHaveLength(2);
  });

  it("records a failed generation run when input loading throws and keeps the run persisted", async () => {
    const harness = createGenerationTasksHarness();

    const thrownError = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      repository: harness.repository,
      loadGenerationInputs: async () => {
        throw new Error("Input loading failed during preparation.");
      },
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:04.000Z")
    }).catch((error) => error);

    expect(thrownError).toBeInstanceOf(Error);
    expect(getGenerationRunFailureContext(thrownError)).toEqual({
      generationRunId: "generation-run-1",
      generationRunStatus: GenerationRunStatus.FAILED,
      safeErrorMessage: "Input loading failed during preparation."
    });
    expect(harness.readGenerationRuns()).toEqual([
      expect.objectContaining({
        id: "generation-run-1",
        finishedAt: new Date("2026-06-17T08:00:04.000Z"),
        status: GenerationRunStatus.FAILED,
        errorMessage: "Input loading failed during preparation.",
        summary: {
          boardDate: "2026-06-17",
          triggeredBy: "scheduled",
          triggeredByUserId: null,
          phase: "loading_inputs",
          durationMs: 4000,
          errorName: "Error",
          boardDayId: null,
          usersConsidered: 0,
          templatesConsidered: 0,
          tasksCreated: 0,
          tasksSkippedAsDuplicates: 0,
          tasksAlreadyExisting: 0,
          manualTasksPreserved: null
        }
      })
    ]);
    expect(harness.readBoardDays()).toEqual([]);
    expect(harness.readTasks()).toHaveLength(0);
  });

  it("stores a template snapshot on generated tasks so later template edits do not rewrite history", async () => {
    const harness = createGenerationTasksHarness();

    await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:03.000Z")
    });

    const [inventoryTask, salesTask] = harness.readTasks();

    expect(inventoryTask.templateSnapshot).toEqual({
      templateId: "template-inventory",
      title: "Review inventory status",
      description: "Check stale and ready-for-sale units.",
      templateCategory: "inventory_recon",
      workflowArea: WorkflowArea.INVENTORY,
      priority: "HIGH",
      defaultDueTime: "09:00",
      requiresManagerApproval: false,
      requiredUpdateFields: [
        {
          key: "unit_reference",
          label: "Unit reference",
          type: "short_text",
          required: true,
          helpText: null
        }
      ],
      checklistItems: [
        {
          key: "review_unit",
          label: "Review unit",
          description: "Confirm current inventory status.",
          required: true
        }
      ],
      completionCriteria: {
        mode: "checklist_and_update_fields",
        requiredChecklistKeys: ["review_unit"],
        requiredFieldKeys: ["unit_reference"]
      },
      defaultStatusRules: {
        allowedStatuses: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_REVIEW", "COMPLETED"],
        blockedReasonRequired: true,
        waitingReasonRequiredStatuses: []
      },
      approvalRules: {
        mode: "none",
        readyForReviewRequired: false
      },
      intelligenceSignalType: "INVENTORY_UPDATE",
      taskCardDisplayHints: {
        emphasizeDueTime: true,
        emphasizeVehicle: true,
        emphasizeCustomer: false,
        showChecklistProgress: true,
        highlightReadyForReview: false
      },
      roleId: "role-inventory",
      roleName: "Inventory Manager",
      dutyId: "duty-inventory",
      dutyName: "Review inventory status"
    });
    expect(salesTask.templateSnapshot).toEqual(
      expect.objectContaining({
        templateId: "template-sales-duty",
        requiresManagerApproval: true,
        approvalRules: {
          mode: "manager_review",
          readyForReviewRequired: true
        }
      })
    );
  });

  it("records a failed generation run when task creation throws after the run has started", async () => {
    const harness = createGenerationTasksHarness(createGenerationInput(), {
      beforeCreateTask(task) {
        if (task.sourceTemplateId === "template-sales-duty") {
          throw new Error("Task insert failed for the sales template.");
        }
      }
    });

    const thrownError = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:06.000Z")
    }).catch((error) => error);

    expect(getGenerationRunFailureContext(thrownError)).toEqual({
      generationRunId: "generation-run-1",
      generationRunStatus: GenerationRunStatus.FAILED,
      safeErrorMessage: "Task insert failed for the sales template."
    });
    expect(harness.readGenerationRuns()[0]).toEqual(
      expect.objectContaining({
        status: GenerationRunStatus.FAILED,
        errorMessage: "Task insert failed for the sales template.",
        summary: expect.objectContaining({
          phase: "creating_tasks",
          boardDayId: "board-day-1",
          usersConsidered: 2,
          templatesConsidered: 2,
          tasksCreated: 1,
          tasksSkippedAsDuplicates: 0,
          tasksAlreadyExisting: 0,
          manualTasksPreserved: 0
        })
      })
    );
    expect(harness.readBoardDays()).toEqual([
      expect.objectContaining({
        generationStatus: BoardGenerationStatus.FAILED,
        generatedAt: null,
        generatedByUserId: null
      })
    ]);
    expect(harness.readTasks()).toEqual([
      expect.objectContaining({
        sourceTemplateId: "template-inventory"
      })
    ]);
  });

  it("lists generation runs for a board date with the most recent attempt first", async () => {
    const harness = createGenerationTasksHarness();

    await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...harness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:01.000Z")
    });
    await createMissingGeneratedTasksForDate(
      "2026-06-17",
      { triggeredBy: "manual", triggeredByUserId: "user-manager", createdByUserId: "user-manager" },
      {
        ...harness,
        now: createNowSequence("2026-06-17T09:00:00.000Z", "2026-06-17T09:00:02.000Z")
      }
    );

    const runs = await listGenerationRunsForDate("2026-06-17", harness.repository);

    expect(runs).toEqual([
      expect.objectContaining({
        id: "generation-run-2",
        boardDate: "2026-06-17",
        status: GenerationRunStatus.SUCCEEDED,
        triggeredBy: GenerationTriggerType.MANUAL,
        triggeredByUserId: "user-manager"
      }),
      expect.objectContaining({
        id: "generation-run-1",
        boardDate: "2026-06-17",
        status: GenerationRunStatus.SUCCEEDED,
        triggeredBy: GenerationTriggerType.SCHEDULED,
        triggeredByUserId: null
      })
    ]);
  });

  it("rejects invalid board dates and invalid template due times", async () => {
    const invalidDateHarness = createGenerationTasksHarness();

    await expect(
      createMissingGeneratedTasksForDate("06/17/2026", undefined, invalidDateHarness)
    ).rejects.toThrow(/YYYY-MM-DD/);
    expect(invalidDateHarness.readGenerationRuns()).toEqual([]);

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

    const thrownError = await createMissingGeneratedTasksForDate("2026-06-17", undefined, {
      ...invalidDueTimeHarness,
      now: createNowSequence("2026-06-17T08:00:00.000Z", "2026-06-17T08:00:02.000Z")
    }).catch((error) => error);

    expect(thrownError).toBeInstanceOf(Error);
    expect(getGenerationRunFailureContext(thrownError)).toEqual({
      generationRunId: "generation-run-1",
      generationRunStatus: GenerationRunStatus.FAILED,
      safeErrorMessage: "Task template defaultDueTime must use HH:mm format."
    });
  });
});
