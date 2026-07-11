import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskReadDatabase = Pick<PrismaClient, "task"> &
  Partial<Pick<PrismaClient, "taskChecklistItem">>;

const taskReadSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  workflowArea: true,
  sourceType: true,
  requiresManagerApproval: true,
  templateSnapshot: true,
  updateFieldValues: true,
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
  recommendedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  recommendationReasonCode: true,
  recommendationExplanation: true,
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
  },
  concernLink: {
    select: {
      stepCode: true,
      sortOrder: true,
      required: true,
      dependsOnStepCodes: true,
      completionCriteria: true,
      concernCase: {
        select: {
          id: true,
          concernNumber: true,
          title: true,
          description: true,
          category: true,
          riskType: true,
          priority: true,
          status: true,
          customerReference: true,
          vehicleReference: true,
          dueAt: true,
          escalationRequired: true,
          escalateAt: true,
          createdAt: true,
          reportedByUser: { select: { id: true, name: true, email: true } },
          assignedOwner: { select: { id: true, name: true, email: true } },
          taskLinks: {
            orderBy: { sortOrder: "asc" },
            select: {
              stepCode: true,
              sortOrder: true,
              required: true,
              dependsOnStepCodes: true,
              completionCriteria: true,
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  dueAt: true,
                  requiresManagerApproval: true,
                  assignedUser: { select: { id: true, name: true, email: true } },
                  checklistItems: {
                    select: { id: true, completed: true, isRequired: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  comments: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      taskId: true,
      authorUserId: true,
      body: true,
      createdAt: true,
      authorUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  },
  activityEvents: {
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      eventType: true,
      message: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  },
  appointmentLinks: {
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      linkType: true,
      linkCode: true,
      title: true,
      explanation: true,
      isRequired: true,
      blocksAppointment: true,
      blocksTask: true,
      createdAt: true,
      appointment: {
        select: {
          id: true,
          appointmentNumber: true,
          title: true,
          startsAt: true,
          endsAt: true,
          bookingStatus: true,
          attendanceStatus: true,
          executionStatus: true,
          followUpDispositionCode: true
        }
      }
    }
  }
} as const;

export type TaskReadRecord = Prisma.TaskGetPayload<{
  select: typeof taskReadSelect;
}> & {
  checklistItems: Array<{
    id: string;
    kind: string;
    key: string | null;
    label: string;
    isRequired: boolean;
    completed: boolean;
    sortOrder: number;
    completedAt: Date | null;
    completedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export type TaskReadRepository = {
  findTaskById(taskId: string): Promise<TaskReadRecord | null>;
};

const taskChecklistReadSelect = {
  id: true,
  kind: true,
  key: true,
  label: true,
  isRequired: true,
  completed: true,
  sortOrder: true,
  completedAt: true,
  completedByUserId: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaskChecklistItemSelect;

function isChecklistStorageUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  return (
    message.includes("Unknown field `checklistItems`") ||
    message.includes("taskChecklistItem") ||
    message.includes("TaskChecklistItem")
  );
}

export function createTaskReadRepository(database: TaskReadDatabase = prisma): TaskReadRepository {
  return {
    async findTaskById(taskId) {
      const task = await database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskReadSelect
      });

      if (!task) {
        return null;
      }

      const checklistDelegate = database.taskChecklistItem;

      if (!checklistDelegate) {
        return {
          ...task,
          checklistItems: []
        };
      }

      try {
        const checklistItems = await checklistDelegate.findMany({
          where: {
            taskId
          },
          orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
          select: taskChecklistReadSelect
        });

        return {
          ...task,
          checklistItems
        };
      } catch (error) {
        if (isChecklistStorageUnavailable(error)) {
          return {
            ...task,
            checklistItems: []
          };
        }

        throw error;
      }
    }
  };
}
