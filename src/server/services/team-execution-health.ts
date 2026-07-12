import { StaffDayStatus, TaskStatus } from "@prisma/client";

import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { normalizeBoardDate } from "@/server/validation/board-date";

export type ExecutionHealthCondition = "READY" | "ACTIVE" | "NEEDS_ASSIGNMENT" | "BLOCKED" | "WAITING" | "READY_FOR_REVIEW" | "HANDOFF_PENDING" | "CLOSED";

export type TeamExecutionHealthItem = {
  staffDayId: string;
  user: { id: string; name: string };
  condition: ExecutionHealthCondition;
  explanation: string;
  facts: Array<{ code: string; label: string; taskId: string | null }>;
  counts: { active: number; blocked: number; waiting: number; readyForReview: number; carryover: number };
};

export function deriveExecutionHealthCondition(input: { status: StaffDayStatus; started: boolean; hasReport: boolean; active: number; blocked: number; waiting: number; readyForReview: number; claimableCount: number }): ExecutionHealthCondition {
  if (input.status === StaffDayStatus.CLOSED || input.hasReport) return "CLOSED";
  if (input.readyForReview > 0) return "READY_FOR_REVIEW";
  if (input.blocked > 0 && input.active === 0) return "BLOCKED";
  if (input.waiting > 0 && input.active === 0) return "WAITING";
  if (input.status === StaffDayStatus.HANDOFF_PENDING) return "HANDOFF_PENDING";
  if (input.active > 0) return "ACTIVE";
  if (input.started && input.claimableCount > 0) return "NEEDS_ASSIGNMENT";
  return "READY";
}

export async function getTeamExecutionHealth(actor: AuthenticatedUser | null, boardDate: string) {
  if (!actor) throw new Error("Authentication required.");
  if (!isManager(actor)) throw new Error("Manager access is required for team execution health.");
  const flags = getStaffExecutionFlags();
  const date = normalizeBoardDate(boardDate);
  if (!flags.enabled || !flags.managerHealthEnabled) return { boardDate: date, enabled: false, items: [] as TeamExecutionHealthItem[] };
  const boardDay = await prisma.boardDay.findUnique({ where: { date: new Date(`${date}T00:00:00.000Z`) }, include: { staffDays: { include: { user: { select: { id: true, name: true } }, dailyReports: { select: { id: true }, take: 1 } } }, tasks: { select: { id: true, title: true, assignedUserId: true, status: true, carryoverSourceTaskId: true, isClaimable: true } } } });
  if (!boardDay) return { boardDate: date, enabled: true, items: [] as TeamExecutionHealthItem[] };
  const claimableCount = boardDay.tasks.filter((task) => task.isClaimable && task.status === TaskStatus.NOT_STARTED).length;
  const items = boardDay.staffDays.map((staffDay): TeamExecutionHealthItem => {
    const tasks = boardDay.tasks.filter((task) => task.assignedUserId === staffDay.userId);
    const activeTasks = tasks.filter((task) => task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.IN_PROGRESS);
    const blockedTasks = tasks.filter((task) => task.status === TaskStatus.BLOCKED);
    const waitingTasks = tasks.filter((task) => task.status === TaskStatus.WAITING_ON_PARTS || task.status === TaskStatus.WAITING_ON_APPROVAL);
    const reviewTasks = tasks.filter((task) => task.status === TaskStatus.READY_FOR_REVIEW);
    const carryoverTasks = tasks.filter((task) => task.carryoverSourceTaskId);
    const condition = deriveExecutionHealthCondition({ status: staffDay.status, started: Boolean(staffDay.startAcknowledgedAt), hasReport: staffDay.dailyReports.length > 0, active: activeTasks.length, blocked: blockedTasks.length, waiting: waitingTasks.length, readyForReview: reviewTasks.length, claimableCount });
    const sourceTasks = condition === "READY_FOR_REVIEW" ? reviewTasks : condition === "BLOCKED" ? blockedTasks : condition === "WAITING" ? waitingTasks : activeTasks;
    const explanation = condition === "READY" ? "Start acknowledgement or a next assignment is the next visible step." : condition === "ACTIVE" ? `${activeTasks.length} assigned task${activeTasks.length === 1 ? " is" : "s are"} active.` : condition === "NEEDS_ASSIGNMENT" ? `${claimableCount} eligible claimable task${claimableCount === 1 ? " is" : "s are"} available.` : condition === "BLOCKED" ? "All current work is blocked and needs an operational next step." : condition === "WAITING" ? "All current work is waiting on parts or approval." : condition === "READY_FOR_REVIEW" ? `${reviewTasks.length} task${reviewTasks.length === 1 ? " is" : "s are"} ready for manager review.` : condition === "HANDOFF_PENDING" ? "End-of-day handoff is awaiting confirmation." : "The staff day and handoff are closed.";
    return { staffDayId: staffDay.id, user: staffDay.user, condition, explanation, facts: sourceTasks.map((task) => ({ code: task.status, label: task.title, taskId: task.id })), counts: { active: activeTasks.length, blocked: blockedTasks.length, waiting: waitingTasks.length, readyForReview: reviewTasks.length, carryover: carryoverTasks.length } };
  });
  return { boardDate: date, enabled: true, items };
}
