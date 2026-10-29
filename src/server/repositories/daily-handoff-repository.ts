import { Prisma, PrismaClient, StaffDayStatus } from "@prisma/client";

import { readDispatchEvidence } from "@/server/dispatch/evidence";
import { reconcileReportTasks } from "@/lib/reporting/reconciliation";
import { loadReportingCalendar } from "@/server/reporting/calendar-service";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { resolveReportPeriod } from "@/lib/reporting/calendar";
import { recordReportingCommand } from "@/server/reporting/command";

export type DailyHandoffRepository = {
  loadDispatchEvidence?(date: string, userId: string, name: string, cutoff: Date): ReturnType<typeof readDispatchEvidence>;
  recordsActivity?: boolean;
  findStaffDay(boardDate: string, userId: string): Promise<{ id: string; boardDayId: string; userId: string; startAcknowledgedAt: Date | null; user?: { name: string } } | null>;
  listTasks(boardDayId: string, userId: string): Promise<Array<{
    id: string; title: string; status: string; priority: string; dueAt: Date; blockerReason: string | null;
    workflowArea: string; customerReference: string | null; vehicleReference: string | null; carryoverSourceTaskId?: string | null;
    checklistItems: Array<{ isRequired: boolean; completed: boolean }>;
    comments: Array<{ body: string; createdAt: Date }>;
  }>>;
  listActivity(boardDayId: string, userId: string): Promise<Array<{ eventType: string; message: string; createdAt: Date; taskId: string | null }>>;
  listRecommendations(staffDayId: string): Promise<Array<{ status: string; dismissalReasonCode: string | null; taskId: string }>>;
  findLatestReport(staffDayId: string): Promise<{ id: string; version: number; sourceSnapshot: Prisma.JsonValue; additionalContext: string | null; tomorrowFollowUp: string | null; submittedAt: Date } | null>;
  submitReport(input: { staffDayId: string; sourceSnapshot: Prisma.InputJsonValue; accuracyConfirmed: boolean; additionalContext: string | null; tomorrowFollowUp: string | null; submittedAt: Date; submittedByUserId: string; submittedOnBehalfReason: string | null; idempotencyKey?: string; requestHash?: string; expectedDraftVersion?: number; correctionReason?: string }): Promise<{ id: string; version: number; submittedAt: Date }>;
};

export function createDailyHandoffRepository(database: PrismaClient = prisma): DailyHandoffRepository {
  return {
    loadDispatchEvidence: async (date, userId, name, cutoff) => readDispatchEvidence(database, { ...resolveReportPeriod(date, "DAILY", await loadReportingCalendar()), userId, personName: name, cutoffAt: cutoff }),
    recordsActivity: true,
    findStaffDay: (boardDate, userId) => database.staffDay.findFirst({ where: { userId, boardDay: { date: new Date(`${boardDate}T00:00:00.000Z`) } }, select: { id: true, boardDayId: true, userId: true, startAcknowledgedAt: true, user: { select: { name: true } } } }),
    listTasks: (boardDayId, userId) => database.task.findMany({ where: { boardDayId, assignedUserId: userId, NOT: { status: "COMPLETED", activityEvents: { some: { eventType: "task.completed", metadata: { path: ["personId"], not: userId } } } } }, select: { id: true, title: true, status: true, priority: true, dueAt: true, blockerReason: true, workflowArea: true, customerReference: true, vehicleReference: true, carryoverSourceTaskId: true, checklistItems: { select: { isRequired: true, completed: true } }, comments: { select: { body: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }] }),
    listActivity: (boardDayId, userId) => database.activityEvent.findMany({ where: { boardDayId, actorUserId: userId }, select: { eventType: true, message: true, createdAt: true, taskId: true }, orderBy: { createdAt: "asc" } }),
    listRecommendations: (staffDayId) => database.workRecommendation.findMany({ where: { staffDayId }, select: { status: true, dismissalReasonCode: true, taskId: true } }),
    findLatestReport: (staffDayId) => database.staffDailyReport.findFirst({ where: { staffDayId }, select: { id: true, version: true, sourceSnapshot: true, additionalContext: true, tomorrowFollowUp: true, submittedAt: true }, orderBy: { version: "desc" } }),
    submitReport: (input) => database.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "StaffDay" WHERE id = ${input.staffDayId} FOR UPDATE`;
      const day = await transaction.staffDay.findUniqueOrThrow({ where: { id: input.staffDayId }, include: { user: { select: { name: true } }, boardDay: { select: { date: true } } } });
      const requestHash = input.requestHash ?? hashEnterpriseCommand({ staffDayId: input.staffDayId, actor: input.submittedByUserId, context: input.additionalContext, priorities: input.tomorrowFollowUp, reason: input.submittedOnBehalfReason, ...(input.correctionReason ? { correctionReason: input.correctionReason } : {}), ...(input.idempotencyKey ? {} : { sourceSnapshot: input.sourceSnapshot }) });
      const idempotencyKey = input.idempotencyKey ?? requestHash;
      const existing = await transaction.staffDailyReport.findUnique({ where: { staffDayId_idempotencyKey: { staffDayId: input.staffDayId, idempotencyKey } } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new Error("Submission key was reused with different content.");
        return { id: existing.id, version: existing.version, submittedAt: existing.submittedAt };
      }
      const latest = await transaction.staffDailyReport.aggregate({ where: { staffDayId: input.staffDayId }, _max: { version: true } });
      const period = resolveReportPeriod(day.boardDay.date.toISOString().slice(0, 10), "DAILY", await loadReportingCalendar());
      const identity = { organizationId: INITIAL_ORGANIZATION.id, subjectUserId: day.userId, cadence: "DAILY", periodStart: period.startDate };
      const series = await transaction.reportingSeries.upsert({ where: { organizationId_subjectUserId_cadence_periodStart: identity }, create: { ...identity, subjectName: day.user.name, periodEnd: period.endDate, timezone: period.timezone, calendarVersion: period.calendarVersion }, update: {} });
      const changed = await transaction.reportingSeries.updateMany({ where: { id: series.id, ...(input.expectedDraftVersion !== undefined ? { version: input.expectedDraftVersion } : {}) }, data: { version: { increment: 1 }, draft: Prisma.DbNull } });
      if (changed.count !== 1) throw new Error("Report draft changed. Reload before submitting.");
      if (latest._max.version && !input.correctionReason?.trim()) throw new Error("A correction requires a short reason.");
      const { expectedDraftVersion: _expectedDraftVersion, correctionReason: _correctionReason, ...reportInput } = input;
      void _expectedDraftVersion; void _correctionReason;
      const dispatchEvidence = await readDispatchEvidence(transaction, { userId: day.userId, personName: day.user.name, ...period, cutoffAt: input.submittedAt });
      const source = input.sourceSnapshot && typeof input.sourceSnapshot === "object" && !Array.isArray(input.sourceSnapshot) ? input.sourceSnapshot as Record<string, unknown> : {};
      const observed = reconcileReportTasks(dispatchEvidence.observations);
      const sourceSnapshot = JSON.parse(JSON.stringify({ ...source, plannedFocus: dispatchEvidence.plannedFocus, handoffs: dispatchEvidence.handoffs,
        recordedActivity: dispatchEvidence.activity, dispatchCompleted: [...observed.completed, ...dispatchEvidence.manualCompleted], dispatchOpen: observed.carryover,
        sourceQuality: dispatchEvidence.sourceQuality, sourceCoverage: dispatchEvidence.sourceCoverage, cutoffAt: dispatchEvidence.cutoffAt }));
      const report = await transaction.staffDailyReport.create({ data: { ...reportInput, sourceSnapshot, idempotencyKey, requestHash, version: (latest._max.version ?? 0) + 1 }, select: { id: true, version: true, submittedAt: true } });
      await transaction.reportingRevision.create({ data: { seriesId: series.id, version: report.version, submittedByUserId: input.submittedByUserId, submittedAt: input.submittedAt, idempotencyKey, requestHash, correctionReason: input.correctionReason?.trim() || null, legacyDailyId: report.id } });
      await transaction.staffDay.update({ where: { id: input.staffDayId }, data: { status: StaffDayStatus.CLOSED, closedAt: input.submittedAt } });
      await transaction.activityEvent.create({ data: { actorUserId: input.submittedByUserId, boardDayId: day.boardDayId, eventType: "staff_day.handoff_submitted", message: `End-of-day handoff version ${report.version} submitted.`, metadata: { reportId: report.id, version: report.version } } });
      await recordReportingCommand(transaction, { actorUserId: input.submittedByUserId, subjectId: report.id, action: "DAILY_SUBMITTED", version: report.version, key: `${day.id}:${idempotencyKey}`, hash: requestHash, reason: input.submittedOnBehalfReason ?? "Staff confirmed the daily report.", result: { reportId: report.id, version: report.version } });
      return report;
    }, { timeout: 15000 })
  };
}
