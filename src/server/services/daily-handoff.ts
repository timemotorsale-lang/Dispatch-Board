import { TaskStatus } from "@prisma/client";

import { getStaffExecutionFlags, type StaffExecutionFlags } from "@/lib/staff-execution-flags";
import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { createDailyHandoffRepository, type DailyHandoffRepository } from "@/server/repositories/daily-handoff-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { normalizeBoardDate } from "@/server/validation/board-date";

type Dependencies = { flags?: StaffExecutionFlags; now?: () => Date; recordActivity?: typeof recordBoardActivityEvent; repository?: DailyHandoffRepository };

function requireEnabled(actor: AuthenticatedUser | null, dependencies: Dependencies) {
  if (!actor) throw new Error("Authentication required.");
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled || !flags.endOfDayReportEnabled) throw new Error("End-of-day handoff is not enabled.");
  return actor;
}

export async function buildDailyHandoffDraft(actor: AuthenticatedUser | null, boardDate: string, subjectUserId?: string, dependencies: Dependencies = {}) {
  const user = requireEnabled(actor, dependencies);
  const targetUserId = subjectUserId?.trim() || user.id;
  if (targetUserId !== user.id && !isManager(user)) throw new Error("You do not have permission to view this handoff.");
  const date = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createDailyHandoffRepository();
  const staffDay = await repository.findStaffDay(date, targetUserId);
  if (!staffDay?.startAcknowledgedAt) throw new Error("Start Day must be completed before end-of-day handoff.");
  const [tasks, activity, recommendations, latestReport] = await Promise.all([repository.listTasks(staffDay.boardDayId, targetUserId), repository.listActivity(staffDay.boardDayId, targetUserId), repository.listRecommendations(staffDay.id), repository.findLatestReport(staffDay.id)]);
  const completed = tasks.filter((task) => task.status === TaskStatus.COMPLETED);
  const unfinished = tasks.filter((task) => task.status !== TaskStatus.COMPLETED);
  const snapshot = {
    boardDate: date,
    totals: {
      assigned: tasks.length,
      completed: completed.length,
      active: tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
      blocked: tasks.filter((task) => task.status === TaskStatus.BLOCKED).length,
      waiting: tasks.filter((task) => task.status === TaskStatus.WAITING_ON_PARTS || task.status === TaskStatus.WAITING_ON_APPROVAL).length,
      overdue: tasks.filter((task) => task.status !== TaskStatus.COMPLETED && task.dueAt.getTime() < (dependencies.now ?? (() => new Date()))().getTime()).length
    },
    completedTasks: completed.map((task) => ({ id: task.id, title: task.title })),
    carryover: unfinished.map((task) => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, workflowArea: task.workflowArea, customerReference: task.customerReference, vehicleReference: task.vehicleReference, ownerUserId: targetUserId, blockerReason: task.blockerReason, nextStep: task.comments[0]?.body ?? null, dueAt: task.dueAt.toISOString() })),
    activityCount: activity.length,
    recommendations: { claimed: recommendations.filter((item) => item.status === "CLAIMED").length, dismissed: recommendations.filter((item) => item.status === "DISMISSED").length }
  };
  return { boardDate: date, staffDayId: staffDay.id, snapshot, latestReport: latestReport ? { ...latestReport, submittedAt: latestReport.submittedAt.toISOString() } : null };
}

export async function submitDailyHandoff(actor: AuthenticatedUser | null, boardDate: string, input: unknown, subjectUserId?: string, dependencies: Dependencies = {}) {
  const user = requireEnabled(actor, dependencies);
  const targetUserId = subjectUserId?.trim() || user.id;
  const onBehalf = targetUserId !== user.id;
  if (onBehalf && !isManager(user)) throw new Error("Manager access is required for on-behalf handoff submission.");
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (candidate.accuracyConfirmed !== true) throw new Error("Confirm the handoff is accurate before submitting.");
  if (candidate.idempotencyKey !== undefined && (typeof candidate.idempotencyKey !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(candidate.idempotencyKey))) throw new Error("Report submission key is invalid.");
  if (candidate.expectedDraftVersion !== undefined && (!Number.isInteger(candidate.expectedDraftVersion) || Number(candidate.expectedDraftVersion) < 0)) throw new Error("Expected report version is invalid.");
  const onBehalfReason = onBehalf && typeof candidate.onBehalfReason === "string" ? candidate.onBehalfReason.trim() : null;
  if (onBehalf && (!onBehalfReason || onBehalfReason.length < 10)) throw new Error("On-behalf submission requires a reason of at least 10 characters.");
  const draft = await buildDailyHandoffDraft(user, boardDate, targetUserId, dependencies);
  const submittedAt = (dependencies.now ?? (() => new Date()))();
  const repository = dependencies.repository ?? createDailyHandoffRepository();
  const report = await repository.submitReport({ staffDayId: draft.staffDayId, sourceSnapshot: draft.snapshot, accuracyConfirmed: true, additionalContext: typeof candidate.additionalContext === "string" && candidate.additionalContext.trim() ? candidate.additionalContext.trim() : null, tomorrowFollowUp: typeof candidate.tomorrowFollowUp === "string" && candidate.tomorrowFollowUp.trim() ? candidate.tomorrowFollowUp.trim() : null, submittedAt, submittedByUserId: user.id, submittedOnBehalfReason: onBehalfReason, ...(typeof candidate.idempotencyKey === "string" ? { idempotencyKey: candidate.idempotencyKey } : {}), ...(typeof candidate.expectedDraftVersion === "number" ? { expectedDraftVersion: candidate.expectedDraftVersion } : {}) });
  if (!repository.recordsActivity) await (dependencies.recordActivity ?? recordBoardActivityEvent)({ actorUserId: user.id, boardDayId: (await repository.findStaffDay(draft.boardDate, targetUserId))!.boardDayId, eventType: "staff_day.handoff_submitted", message: `${user.name} submitted end-of-day handoff version ${report.version}.`, metadata: { reportId: report.id, version: report.version, onBehalf }, taskId: null });
  return { ...report, submittedAt: report.submittedAt.toISOString() };
}
