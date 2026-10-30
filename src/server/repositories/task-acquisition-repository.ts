import {
  Prisma,
  PrismaClient,
  TaskAssignmentRequestStatus,
  TaskStatus
} from "@prisma/client";

import { prisma } from "@/server/db/client";

const acquisitionTaskSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  blockerReason: true,
  dueAt: true,
  isClaimable: true,
  priority: true,
  recommendedUserId: true,
  requiresManagerApproval: true,
  sourceDutyId: true,
  status: true,
  workflowArea: true,
  boardDay: { select: { date: true } },
  assignedUser: { select: { id: true, name: true } }
} satisfies Prisma.TaskSelect;

const requestSelect = {
  id: true,
  status: true,
  requestReason: true,
  decisionReason: true,
  decidedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  requesterUser: { select: { id: true, name: true, email: true } },
  decidedByUser: { select: { id: true, name: true } },
  task: { select: acquisitionTaskSelect }
} satisfies Prisma.TaskAssignmentRequestSelect;

export type TaskAcquisitionTaskRecord = Prisma.TaskGetPayload<{ select: typeof acquisitionTaskSelect }>;
export type TaskAssignmentRequestRecord = Prisma.TaskAssignmentRequestGetPayload<{ select: typeof requestSelect }>;

export type TaskAcquisitionRepository = {
  findActorProfile(userId: string, boardDayId: string): Promise<{
    activeWorkCount: number;
    dutyIds: string[];
    isActive: boolean;
    workflowAreas: string[];
  } | null>;
  findTask(taskId: string): Promise<TaskAcquisitionTaskRecord | null>;
  listClaimableTasks(boardDate: string): Promise<TaskAcquisitionTaskRecord[]>;
  listRequestsForUser(userId: string): Promise<TaskAssignmentRequestRecord[]>;
  listPendingRequests(): Promise<TaskAssignmentRequestRecord[]>;
  claimTask(task: TaskAcquisitionTaskRecord, userId: string, claimedAt: Date): Promise<TaskAcquisitionTaskRecord>;
  createRequest(taskId: string, requesterUserId: string, requestReason: string | null): Promise<TaskAssignmentRequestRecord>;
  cancelRequest(requestId: string, requesterUserId: string, cancelledAt: Date): Promise<TaskAssignmentRequestRecord>;
  decideRequest(input: {
    requestId: string;
    decision: "APPROVED" | "DECLINED" | "ASSIGNED_OTHER";
    decisionReason: string | null;
    decidedAt: Date;
    decidedByUserId: string;
    targetUserId?: string;
  }): Promise<TaskAssignmentRequestRecord>;
  startTask(taskId: string, userId: string, startedAt: Date): Promise<TaskAcquisitionTaskRecord>;
};

export function createTaskAcquisitionRepository(database: PrismaClient = prisma): TaskAcquisitionRepository {
  return {
    async findActorProfile(userId, boardDayId) {
      const [user, activeWorkCount] = await Promise.all([
        database.user.findUnique({
          where: { id: userId },
          select: {
            isActive: true,
            userDuties: { select: { duty: { select: { id: true, workflowArea: true } } } },
            userRoles: {
              select: {
                role: {
                  select: { roleDuties: { select: { duty: { select: { id: true, workflowArea: true } } } } }
                }
              }
            }
          }
        }),
        database.task.count({
          where: {
            boardDayId,
            assignedUserId: userId,
            status: { in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS] }
          }
        })
      ]);
      if (!user) return null;
      const duties = [
        ...user.userDuties.map((item) => item.duty),
        ...user.userRoles.flatMap((item) => item.role.roleDuties.map((roleDuty) => roleDuty.duty))
      ];
      return {
        activeWorkCount,
        dutyIds: [...new Set(duties.map((duty) => duty.id))],
        isActive: user.isActive,
        workflowAreas: [...new Set(duties.map((duty) => duty.workflowArea))]
      };
    },
    findTask: (taskId) => database.task.findUnique({ where: { id: taskId }, select: acquisitionTaskSelect }),
    listClaimableTasks: (boardDate) => database.task.findMany({
      where: {
        boardDay: { date: new Date(`${boardDate}T00:00:00.000Z`) },
        isClaimable: true,
        status: TaskStatus.NOT_STARTED
      },
      select: acquisitionTaskSelect,
      orderBy: [{ dueAt: "asc" }, { id: "asc" }]
    }),
    listRequestsForUser: (userId) => database.taskAssignmentRequest.findMany({
      where: { requesterUserId: userId },
      select: requestSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 100
    }),
    listPendingRequests: () => database.taskAssignmentRequest.findMany({
      where: { status: TaskAssignmentRequestStatus.PENDING },
      select: requestSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100
    }),
    async claimTask(task, userId, claimedAt) {
      return database.$transaction(async (transaction) => {
        const changed = await transaction.task.updateMany({
          where: {
            id: task.id,
            assignedUserId: task.assignedUserId,
            isClaimable: true,
            status: TaskStatus.NOT_STARTED
          },
          data: {
            acceptedAt: claimedAt,
            acceptedByUserId: userId,
            assignedUserId: userId,
            ownerUserId: userId,
            isClaimable: false
          }
        });
        if (changed.count !== 1) throw new Error("This task was already claimed or is no longer available.");
        await transaction.taskAssignmentRequest.updateMany({
          where: { taskId: task.id, status: TaskAssignmentRequestStatus.PENDING },
          data: { status: TaskAssignmentRequestStatus.SUPERSEDED, decidedAt: claimedAt }
        });
        return transaction.task.findUniqueOrThrow({ where: { id: task.id }, select: acquisitionTaskSelect });
      });
    },
    async createRequest(taskId, requesterUserId, requestReason) {
      return database.$transaction(async (transaction) => {
        const existing = await transaction.taskAssignmentRequest.findFirst({
          where: { taskId, requesterUserId, status: TaskAssignmentRequestStatus.PENDING }
        });
        if (existing) throw new Error("You already have a pending request for this task.");
        return transaction.taskAssignmentRequest.create({
          data: { taskId, requesterUserId, requestReason },
          select: requestSelect
        });
      });
    },
    async cancelRequest(requestId, requesterUserId, cancelledAt) {
      return database.$transaction(async (transaction) => {
        const changed = await transaction.taskAssignmentRequest.updateMany({
          where: { id: requestId, requesterUserId, status: TaskAssignmentRequestStatus.PENDING },
          data: { status: TaskAssignmentRequestStatus.CANCELLED, cancelledAt }
        });
        if (changed.count !== 1) throw new Error("This assignment request can no longer be cancelled.");
        return transaction.taskAssignmentRequest.findUniqueOrThrow({ where: { id: requestId }, select: requestSelect });
      });
    },
    async decideRequest(input) {
      return database.$transaction(async (transaction) => {
        const request = await transaction.taskAssignmentRequest.findUnique({
          where: { id: input.requestId },
          include: { task: true }
        });
        if (!request || request.status !== TaskAssignmentRequestStatus.PENDING) {
          throw new Error("This assignment request is no longer pending.");
        }
        if (input.decision === "APPROVED" || input.decision === "ASSIGNED_OTHER") {
          const targetUserId = input.decision === "APPROVED" ? request.requesterUserId : input.targetUserId;
          if (!targetUserId) throw new Error("Select another active owner.");
          const targetUser = await transaction.user.findFirst({ where: { id: targetUserId, isActive: true }, select: { id: true } });
          if (!targetUser) throw new Error("Selected owner is not active.");
          const assigned = await transaction.task.updateMany({
            where: {
              id: request.taskId,
              assignedUserId: request.task.assignedUserId,
              isClaimable: true,
              status: TaskStatus.NOT_STARTED
            },
            data: {
              acceptedAt: input.decidedAt,
              acceptedByUserId: targetUserId,
              assignedUserId: targetUserId,
              ownerUserId: targetUserId,
              isClaimable: false
            }
          });
          if (assigned.count !== 1) throw new Error("This task was already assigned or is no longer available.");
        }
        await transaction.taskAssignmentRequest.update({
          where: { id: request.id },
          data: {
            decidedAt: input.decidedAt,
            decidedByUserId: input.decidedByUserId,
            decisionReason: input.decisionReason,
            status: input.decision === "ASSIGNED_OTHER" ? TaskAssignmentRequestStatus.SUPERSEDED : input.decision
          }
        });
        if (input.decision === "APPROVED" || input.decision === "ASSIGNED_OTHER") {
          await transaction.taskAssignmentRequest.updateMany({
            where: { taskId: request.taskId, status: TaskAssignmentRequestStatus.PENDING, id: { not: request.id } },
            data: {
              decidedAt: input.decidedAt,
              decidedByUserId: input.decidedByUserId,
              decisionReason: "Another request was approved.",
              status: TaskAssignmentRequestStatus.SUPERSEDED
            }
          });
        }
        return transaction.taskAssignmentRequest.findUniqueOrThrow({ where: { id: request.id }, select: requestSelect });
      });
    },
    async startTask(taskId, userId, startedAt) {
      const changed = await database.task.updateMany({
        where: { id: taskId, assignedUserId: userId, status: TaskStatus.NOT_STARTED },
        data: { acceptedAt: startedAt, acceptedByUserId: userId, status: TaskStatus.IN_PROGRESS }
      });
      if (changed.count !== 1) throw new Error("Only your assigned not-started task can be started.");
      return database.task.findUniqueOrThrow({ where: { id: taskId }, select: acquisitionTaskSelect });
    }
  };
}
