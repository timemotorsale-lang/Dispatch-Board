import { Prisma, PrismaClient, TaskStatus, WorkRecommendationStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

const candidateSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  dueAt: true,
  workflowArea: true,
  sourceDutyId: true,
  assignedUserId: true,
  blockerReason: true,
  status: true,
  isClaimable: true
} satisfies Prisma.TaskSelect;

export type AvailableWorkCandidate = Prisma.TaskGetPayload<{ select: typeof candidateSelect }>;

const recommendationSelect = {
  id: true,
  rank: true,
  score: true,
  scoreBreakdown: true,
  explanation: true,
  status: true,
  dismissalReasonCode: true,
  task: { select: candidateSelect }
} satisfies Prisma.WorkRecommendationSelect;

export type AvailableWorkRecommendationRecord = Prisma.WorkRecommendationGetPayload<{ select: typeof recommendationSelect }>;

export type AvailableWorkRepository = {
  findStaffDay(boardDate: string, userId: string): Promise<{
    id: string;
    boardDayId: string;
    startAcknowledgedAt: Date | null;
    dutyItems: Array<{ sourceDutyId: string | null; workflowArea: string }>;
  } | null>;
  countActiveAssignedTasks(boardDayId: string, userId: string): Promise<number>;
  listClaimableTasks(boardDayId: string, userId: string): Promise<AvailableWorkCandidate[]>;
  replaceShownRecommendations(staffDayId: string, recommendations: Array<{
    taskId: string;
    rank: number;
    score: number;
    scoreBreakdown: Prisma.InputJsonValue;
    explanation: string;
  }>): Promise<AvailableWorkRecommendationRecord[]>;
  claimRecommendation(recommendationId: string, userId: string, claimedAt: Date): Promise<{
    boardDayId: string;
    recommendationId: string;
    taskId: string;
    taskTitle: string;
  }>;
  dismissRecommendation(recommendationId: string, userId: string, reasonCode: string): Promise<{
    boardDayId: string;
    recommendationId: string;
    taskId: string;
    taskTitle: string;
  }>;
};

export function createAvailableWorkRepository(database: PrismaClient = prisma): AvailableWorkRepository {
  return {
    findStaffDay: (boardDate, userId) => database.staffDay.findFirst({
      where: { userId, boardDay: { date: new Date(`${boardDate}T00:00:00.000Z`) } },
      select: {
        id: true,
        boardDayId: true,
        startAcknowledgedAt: true,
        dutyItems: { select: { sourceDutyId: true, workflowArea: true } }
      }
    }),
    countActiveAssignedTasks: (boardDayId, userId) => database.task.count({
      where: {
        boardDayId,
        assignedUserId: userId,
        status: { in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS] }
      }
    }),
    listClaimableTasks: (boardDayId, userId) => database.task.findMany({
      where: {
        boardDayId,
        isClaimable: true,
        assignedUserId: { not: userId },
        blockerReason: null,
        status: TaskStatus.NOT_STARTED
      },
      select: candidateSelect,
      orderBy: [{ dueAt: "asc" }, { id: "asc" }]
    }),
    async replaceShownRecommendations(staffDayId, recommendations) {
      const taskIds = recommendations.map((item) => item.taskId);
      await database.workRecommendation.updateMany({
        where: { staffDayId, status: WorkRecommendationStatus.SHOWN, taskId: { notIn: taskIds } },
        data: { status: WorkRecommendationStatus.EXPIRED }
      });
      for (const recommendation of recommendations) {
        await database.workRecommendation.upsert({
          where: { staffDayId_taskId: { staffDayId, taskId: recommendation.taskId } },
          create: { staffDayId, status: WorkRecommendationStatus.SHOWN, ...recommendation },
          update: { status: WorkRecommendationStatus.SHOWN, dismissalReasonCode: null, ...recommendation }
        });
      }
      return database.workRecommendation.findMany({
        where: { staffDayId, status: WorkRecommendationStatus.SHOWN },
        select: recommendationSelect,
        orderBy: [{ rank: "asc" }, { id: "asc" }]
      });
    },
    async claimRecommendation(recommendationId, userId, claimedAt) {
      return database.$transaction(async (transaction) => {
        const recommendation = await transaction.workRecommendation.findUnique({
          where: { id: recommendationId },
          include: { staffDay: true, task: true }
        });
        if (!recommendation || recommendation.staffDay.userId !== userId) throw new Error("Work recommendation not found.");
        if (recommendation.status !== WorkRecommendationStatus.SHOWN) throw new Error("This work recommendation is no longer available.");
        const claimed = await transaction.task.updateMany({
          where: {
            id: recommendation.taskId,
            assignedUserId: recommendation.task.assignedUserId,
            isClaimable: true,
            status: TaskStatus.NOT_STARTED
          },
          data: { assignedUserId: userId, isClaimable: false }
        });
        if (claimed.count !== 1) throw new Error("This task was already claimed or is no longer available.");
        await transaction.workRecommendation.update({
          where: { id: recommendation.id },
          data: { status: WorkRecommendationStatus.CLAIMED, claimedAt, claimedByUserId: userId }
        });
        await transaction.workRecommendation.updateMany({
          where: { taskId: recommendation.taskId, status: WorkRecommendationStatus.SHOWN, id: { not: recommendation.id } },
          data: { status: WorkRecommendationStatus.EXPIRED }
        });
        await transaction.staffDay.update({
          where: { id: recommendation.staffDayId },
          data: { status: "ACTIVE", availabilityDeclaredAt: null, availabilityReasonCode: null }
        });
        return { boardDayId: recommendation.staffDay.boardDayId, recommendationId: recommendation.id, taskId: recommendation.taskId, taskTitle: recommendation.task.title };
      });
    },
    async dismissRecommendation(recommendationId, userId, reasonCode) {
      return database.$transaction(async (transaction) => {
        const recommendation = await transaction.workRecommendation.findUnique({
          where: { id: recommendationId },
          include: { staffDay: true, task: true }
        });
        if (!recommendation || recommendation.staffDay.userId !== userId) throw new Error("Work recommendation not found.");
        if (recommendation.status !== WorkRecommendationStatus.SHOWN) throw new Error("This work recommendation is no longer available.");
        await transaction.workRecommendation.update({
          where: { id: recommendation.id },
          data: { status: WorkRecommendationStatus.DISMISSED, dismissalReasonCode: reasonCode }
        });
        return { boardDayId: recommendation.staffDay.boardDayId, recommendationId: recommendation.id, taskId: recommendation.taskId, taskTitle: recommendation.task.title };
      });
    }
  };
}
