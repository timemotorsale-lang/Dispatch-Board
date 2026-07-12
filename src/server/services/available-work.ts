import type { TaskTemplatePriority } from "@prisma/client";

import { getStaffExecutionFlags, type StaffExecutionFlags } from "@/lib/staff-execution-flags";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createAvailableWorkRepository,
  type AvailableWorkCandidate,
  type AvailableWorkRepository
} from "@/server/repositories/available-work-repository";
import { normalizeBoardDate } from "@/server/validation/board-date";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";

type Dependencies = {
  flags?: StaffExecutionFlags;
  now?: () => Date;
  repository?: AvailableWorkRepository;
  recordActivity?: typeof recordBoardActivityEvent;
};

const priorityWeight: Record<TaskTemplatePriority, number> = { CRITICAL: 60, HIGH: 40, MEDIUM: 20, LOW: 10 };

export function normalizeAvailableWorkWorkflowArea(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const aliases: Record<string, string> = {
    SERVICE_RECON: "SHOP",
    REPAIR_SHOP: "SHOP",
    MARKETING_ADVERTISING: "MARKETING",
    OFFICE_ADMIN: "ADMIN"
  };
  return aliases[normalized] ?? normalized;
}

export function scoreAvailableWorkCandidate(input: {
  candidate: AvailableWorkCandidate;
  dutyIds: Set<string>;
  workflowAreas: Set<string>;
  activeWorkCount: number;
  now: Date;
}) {
  const dueMinutes = Math.round((input.candidate.dueAt.getTime() - input.now.getTime()) / 60_000);
  const breakdown = {
    priority: priorityWeight[input.candidate.priority],
    overdue: dueMinutes < 0 ? 30 : 0,
    dueSoon: dueMinutes >= 0 && dueMinutes <= 120 ? 20 : 0,
    workflowMatch: input.workflowAreas.has(normalizeAvailableWorkWorkflowArea(input.candidate.workflowArea)) ? 25 : 0,
    dutyMatch: input.candidate.sourceDutyId && input.dutyIds.has(input.candidate.sourceDutyId) ? 15 : 0,
    workloadPenalty: -Math.min(input.activeWorkCount * 5, 25)
  };
  const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
  const reasons = [
    input.candidate.priority === "CRITICAL" ? "critical priority" : input.candidate.priority === "HIGH" ? "high priority" : null,
    breakdown.overdue ? "overdue" : null,
    breakdown.dueSoon ? "due within two hours" : null,
    breakdown.workflowMatch ? `matches ${input.candidate.workflowArea.toLowerCase().replaceAll("_", " ")} responsibilities` : null,
    breakdown.dutyMatch ? "matches a directly assigned duty" : null
  ].filter(Boolean);
  return {
    breakdown,
    explanation: `Recommended because it is ${reasons.length ? reasons.join(", ") : "eligible claimable work"}.`,
    score
  };
}

function requireAvailableWork(actor: AuthenticatedUser | null, dependencies: Dependencies) {
  if (!actor) throw new Error("Authentication required.");
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled || !flags.availableWorkEnabled) throw new Error("Available work is not enabled.");
  return actor;
}

export async function claimAvailableWork(actor: AuthenticatedUser | null, recommendationId: string, dependencies: Dependencies = {}) {
  const user = requireAvailableWork(actor, dependencies);
  const repository = dependencies.repository ?? createAvailableWorkRepository();
  const result = await repository.claimRecommendation(recommendationId.trim(), user.id, (dependencies.now ?? (() => new Date()))());
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: result.boardDayId,
    eventType: "work_recommendation.claimed",
    message: `${user.name} claimed recommended work: ${result.taskTitle}.`,
    metadata: { recommendationId: result.recommendationId },
    taskId: result.taskId
  });
  return result;
}

const dismissalReasons = new Set(["NEED_MANAGER_DIRECTION", "LACK_CONTEXT", "NOT_AVAILABLE", "OTHER"]);

export async function dismissAvailableWork(actor: AuthenticatedUser | null, recommendationId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = requireAvailableWork(actor, dependencies);
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const reasonCode = typeof candidate.reasonCode === "string" ? candidate.reasonCode.trim() : "";
  if (!dismissalReasons.has(reasonCode)) throw new Error("Select a valid dismissal reason.");
  const repository = dependencies.repository ?? createAvailableWorkRepository();
  const result = await repository.dismissRecommendation(recommendationId.trim(), user.id, reasonCode);
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: result.boardDayId,
    eventType: "work_recommendation.dismissed",
    message: `${user.name} declined recommended work and requested a better fit or direction.`,
    metadata: { reasonCode, recommendationId: result.recommendationId },
    taskId: result.taskId
  });
  return result;
}

export async function getAvailableWork(actor: AuthenticatedUser | null, boardDate: string, dependencies: Dependencies = {}) {
  if (!actor) throw new Error("Authentication required.");
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled || !flags.availableWorkEnabled) return { boardDate: normalizeBoardDate(boardDate), enabled: false, recommendations: [] };
  const date = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createAvailableWorkRepository();
  const staffDay = await repository.findStaffDay(date, actor.id);
  if (!staffDay?.startAcknowledgedAt) throw new Error("Start Day must be completed before requesting available work.");
  const activeWorkCount = await repository.countActiveAssignedTasks(staffDay.boardDayId, actor.id);
  const candidates = await repository.listClaimableTasks(staffDay.boardDayId, actor.id);
  const workflowAreas = new Set(staffDay.dutyItems.map((item) => normalizeAvailableWorkWorkflowArea(item.workflowArea)));
  const dutyIds = new Set(staffDay.dutyItems.flatMap((item) => item.sourceDutyId ? [item.sourceDutyId] : []));
  const ranked = candidates
    .map((candidate) => ({ candidate, ...scoreAvailableWorkCandidate({ candidate, dutyIds, workflowAreas, activeWorkCount, now: (dependencies.now ?? (() => new Date()))() }) }))
    .filter((item) => item.breakdown.workflowMatch > 0)
    .sort((left, right) => right.score - left.score || left.candidate.dueAt.getTime() - right.candidate.dueAt.getTime() || left.candidate.id.localeCompare(right.candidate.id))
    .slice(0, 5);
  const records = await repository.replaceShownRecommendations(staffDay.id, ranked.map((item, index) => ({
    taskId: item.candidate.id,
    rank: index + 1,
    score: item.score,
    scoreBreakdown: item.breakdown,
    explanation: item.explanation
  })));
  return {
    boardDate: date,
    enabled: true,
    recommendations: records.map((record) => ({
      id: record.id,
      rank: record.rank,
      score: record.score,
      explanation: record.explanation,
      status: record.status,
      task: { ...record.task, dueAt: record.task.dueAt.toISOString() }
    }))
  };
}
