import { Prisma, PrismaClient, type BoardDay } from "@prisma/client";

import type { TaskChecklistItemKind, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCreateDatabase = Pick<PrismaClient, "activityEvent" | "boardDay" | "task" | "user">;

const taskCreateAssigneeSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true
} satisfies Prisma.UserSelect;

const createdTaskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueAt: true,
  workflowArea: true,
  sourceType: true,
  requiresManagerApproval: true,
  vehicleReference: true,
  customerReference: true,
  blockerReason: true,
  readyForReviewAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  boardDay: {
    select: {
      id: true,
      date: true
    }
  },
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  reviewedByUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.TaskSelect;

export type TaskCreateAssignedUserRecord = Prisma.UserGetPayload<{
  select: typeof taskCreateAssigneeSelect;
}>;

export type CreatedTaskRecord = Prisma.TaskGetPayload<{
  select: typeof createdTaskSelect;
}>;

export type CreateTaskRecordInput = {
  assignedUserId: string;
  collaboratorIds?: string[];
  collaboratorRequests?: Array<{ userId: string; collaborationScope: string; capacityRequested?: string }>;
  blockerReason?: string;
  boardDayId: string;
  completedAt?: Date | null;
  createdByUserId: string;
  customerReference?: string;
  description: string;
  dueAt: Date;
  conversionContract?: {
    classificationReason: string;
    confidence: string;
    executionIntent: string;
    linkedWorkflowAreas: WorkflowArea[];
    origin: {
      channel: string;
      sourceId?: string;
      sourceKind: string;
      text: string;
    };
    selectedWorkflowArea: WorkflowArea;
    suggestedWorkflowArea: WorkflowArea;
    version: number;
  };
  intakeMetadata?: {
    channel: string;
    expectedOutcome: string;
    intakeType: string;
    requiredUpdates: string[];
  };
  priority: TaskTemplatePriority;
  readyForReviewAt?: Date | null;
  requiresManagerApproval: boolean;
  reviewedByUserId?: string | null;
  sourceType: CreatedTaskRecord["sourceType"];
  status: CreatedTaskRecord["status"];
  title: string;
  vehicleReference?: string;
  workflowArea: CreatedTaskRecord["workflowArea"];
  checklistItems?: Array<{ isRequired?: boolean; key: string; kind?: TaskChecklistItemKind; label: string }>;
};

export type TaskCreateRepository = {
  supportsActivityEvents?: boolean;
  createActivityEvent?(input: {
    actorUserId: string | null;
    boardDayId: string;
    eventType: string;
    message: string;
    metadata: Prisma.InputJsonValue;
    taskId: string | null;
  }): Promise<unknown>;
  createTask(input: CreateTaskRecordInput): Promise<CreatedTaskRecord>;
  findAssignedUserById(userId: string): Promise<TaskCreateAssignedUserRecord | null>;
  findActiveUsersByIds?(userIds: string[]): Promise<TaskCreateAssignedUserRecord[]>;
  getOrCreateBoardDay(boardDate: string): Promise<BoardDay>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createTaskCreateRepository(
  database: TaskCreateDatabase = prisma
): TaskCreateRepository {
  return {
    supportsActivityEvents: true,
    async createActivityEvent(input) {
      return database.activityEvent.create({
        data: input
      });
    },
    async createTask(input) {
      return database.task.create({
        data: {
          assignedUserId: input.assignedUserId,
          ownerUserId: input.createdByUserId,
          ...(input.collaboratorRequests?.length ? { collaborators: { createMany: { data: input.collaboratorRequests.map((request) => ({
            userId: request.userId,
            addedByUserId: input.createdByUserId,
            collaborationScope: request.collaborationScope,
            capacityRequested: request.capacityRequested ?? null
          })) } } } : input.collaboratorIds?.length ? { collaborators: { createMany: { data: input.collaboratorIds.map((userId) => ({ userId, addedByUserId: input.createdByUserId })) } } } : {}),
          ...(input.blockerReason ? { blockerReason: input.blockerReason } : {}),
          boardDayId: input.boardDayId,
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
          createdByUserId: input.createdByUserId,
          ...(input.customerReference ? { customerReference: input.customerReference } : {}),
          description: input.description,
          dueAt: input.dueAt,
          priority: input.priority,
          ...(input.readyForReviewAt !== undefined ? { readyForReviewAt: input.readyForReviewAt } : {}),
          requiresManagerApproval: input.requiresManagerApproval,
          ...(input.reviewedByUserId !== undefined
            ? { reviewedByUserId: input.reviewedByUserId }
            : {}),
          sourceType: input.sourceType,
          status: input.status,
          title: input.title,
          ...(input.intakeMetadata || input.conversionContract
            ? {
                templateSnapshot: {
                  ...(input.intakeMetadata
                    ? {
                        completionCriteria: {
                          mode: "update_fields",
                          requiredChecklistKeys: [],
                          requiredFieldKeys: input.intakeMetadata.requiredUpdates.map((_, index) => `intake_update_${index + 1}`)
                        },
                        intake: input.intakeMetadata,
                        requiredUpdateFields: input.intakeMetadata.requiredUpdates.map((label, index) => ({
                          helpText: `Required by ${input.intakeMetadata?.intakeType} intake via ${input.intakeMetadata?.channel}.`,
                          key: `intake_update_${index + 1}`,
                          label,
                          required: true,
                          type: "long_text"
                        }))
                      }
                    : {}),
                  ...(input.conversionContract
                    ? {
                        conversionContract: input.conversionContract
                      }
                    : {}),
                  version: 1
                }
              }
            : {}),
          ...(input.vehicleReference ? { vehicleReference: input.vehicleReference } : {}),
          workflowArea: input.workflowArea,
          ...(input.checklistItems?.length
            ? {
                checklistItems: {
                  createMany: {
                    data: input.checklistItems.map((item, index) => ({
                      kind: item.kind ?? "DEFINITION_OF_DONE",
                      key: item.key,
                      label: item.label,
                      isRequired: item.isRequired ?? false,
                      sortOrder: index
                    }))
                  }
                }
              }
            : {})
        },
        select: createdTaskSelect
      });
    },

    async findAssignedUserById(userId) {
      return database.user.findUnique({
        where: {
          id: userId
        },
        select: taskCreateAssigneeSelect
      });
    },
    async findActiveUsersByIds(userIds) {
      return database.user.findMany({ where: { id: { in: userIds }, isActive: true }, select: taskCreateAssigneeSelect });
    },

    async getOrCreateBoardDay(boardDate) {
      return database.boardDay.upsert({
        where: {
          date: toBoardDateValue(boardDate)
        },
        update: {},
        create: {
          date: toBoardDateValue(boardDate)
        }
      });
    }
  };
}
