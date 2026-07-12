import { Prisma, PrismaClient, StaffDayStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

export type DailyHandoffRepository = {
  findStaffDay(boardDate: string, userId: string): Promise<{ id: string; boardDayId: string; userId: string; startAcknowledgedAt: Date | null } | null>;
  listTasks(boardDayId: string, userId: string): Promise<Array<{
    id: string; title: string; status: string; priority: string; dueAt: Date; blockerReason: string | null;
    workflowArea: string; customerReference: string | null; vehicleReference: string | null;
    checklistItems: Array<{ isRequired: boolean; completed: boolean }>;
    comments: Array<{ body: string; createdAt: Date }>;
  }>>;
  listActivity(boardDayId: string, userId: string): Promise<Array<{ eventType: string; message: string; createdAt: Date; taskId: string | null }>>;
  listRecommendations(staffDayId: string): Promise<Array<{ status: string; dismissalReasonCode: string | null; taskId: string }>>;
  findLatestReport(staffDayId: string): Promise<{ id: string; version: number; sourceSnapshot: Prisma.JsonValue; additionalContext: string | null; tomorrowFollowUp: string | null; submittedAt: Date } | null>;
  submitReport(input: { staffDayId: string; sourceSnapshot: Prisma.InputJsonValue; accuracyConfirmed: boolean; additionalContext: string | null; tomorrowFollowUp: string | null; submittedAt: Date; submittedByUserId: string; submittedOnBehalfReason: string | null }): Promise<{ id: string; version: number; submittedAt: Date }>;
};

export function createDailyHandoffRepository(database: PrismaClient = prisma): DailyHandoffRepository {
  return {
    findStaffDay: (boardDate, userId) => database.staffDay.findFirst({ where: { userId, boardDay: { date: new Date(`${boardDate}T00:00:00.000Z`) } }, select: { id: true, boardDayId: true, userId: true, startAcknowledgedAt: true } }),
    listTasks: (boardDayId, userId) => database.task.findMany({ where: { boardDayId, assignedUserId: userId }, select: { id: true, title: true, status: true, priority: true, dueAt: true, blockerReason: true, workflowArea: true, customerReference: true, vehicleReference: true, checklistItems: { select: { isRequired: true, completed: true } }, comments: { select: { body: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }] }),
    listActivity: (boardDayId, userId) => database.activityEvent.findMany({ where: { boardDayId, actorUserId: userId }, select: { eventType: true, message: true, createdAt: true, taskId: true }, orderBy: { createdAt: "asc" } }),
    listRecommendations: (staffDayId) => database.workRecommendation.findMany({ where: { staffDayId }, select: { status: true, dismissalReasonCode: true, taskId: true } }),
    findLatestReport: (staffDayId) => database.staffDailyReport.findFirst({ where: { staffDayId }, select: { id: true, version: true, sourceSnapshot: true, additionalContext: true, tomorrowFollowUp: true, submittedAt: true }, orderBy: { version: "desc" } }),
    submitReport: (input) => database.$transaction(async (transaction) => {
      const latest = await transaction.staffDailyReport.aggregate({ where: { staffDayId: input.staffDayId }, _max: { version: true } });
      const report = await transaction.staffDailyReport.create({ data: { ...input, version: (latest._max.version ?? 0) + 1 }, select: { id: true, version: true, submittedAt: true } });
      await transaction.staffDay.update({ where: { id: input.staffDayId }, data: { status: StaffDayStatus.CLOSED, closedAt: input.submittedAt } });
      return report;
    })
  };
}
