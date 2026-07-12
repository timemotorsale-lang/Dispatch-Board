import type { TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

export type WorkAcquisitionPolicy =
  | "DIRECT_CLAIM"
  | "APPROVAL_REQUIRED"
  | "MANAGER_ASSIGN_ONLY"
  | "UNAVAILABLE";

export type WorkAcquisitionCandidate = {
  assignedUserId: string;
  blockerReason: string | null;
  dueAt: Date;
  id: string;
  isClaimable: boolean;
  priority: TaskTemplatePriority;
  recommendedUserId?: string | null;
  requiresManagerApproval: boolean;
  sourceDutyId: string | null;
  status: TaskStatus;
  workflowArea: WorkflowArea;
};

export type WorkAcquisitionActor = {
  activeWorkCount: number;
  activeWorkMinutes?: number;
  dutyIds: Set<string>;
  isActive: boolean;
  isManager: boolean;
  maxActiveTasks?: number;
  maxActiveWorkMinutes?: number;
  userId: string;
  workflowAreas: Set<string>;
};

export type WorkAcquisitionDecision = {
  eligible: boolean;
  explanation: string;
  policy: WorkAcquisitionPolicy;
  reasons: string[];
  score: number;
  scoreBreakdown: {
    availability: number;
    continuity: number;
    dutyMatch: number;
    priorityUrgency: number;
    workloadCapacity: number;
    workflowMatch: number;
    penalties: number;
  };
};

const activeStatuses = new Set<TaskStatus>([
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING_ON_PARTS",
  "WAITING_ON_APPROVAL",
  "READY_FOR_REVIEW"
]);

const priorityScore: Record<TaskTemplatePriority, number> = {
  CRITICAL: 15,
  HIGH: 12,
  MEDIUM: 8,
  LOW: 4
};

function normalizedWorkflowArea(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function decideWorkAcquisition(input: {
  actor: WorkAcquisitionActor;
  candidate: WorkAcquisitionCandidate;
  now: Date;
}): WorkAcquisitionDecision {
  const { actor, candidate, now } = input;
  const reasons: string[] = [];
  const maxActiveTasks = actor.maxActiveTasks ?? 8;
  const maxActiveWorkMinutes = actor.maxActiveWorkMinutes ?? 480;
  const workflowMatch = actor.workflowAreas.has(normalizedWorkflowArea(candidate.workflowArea));
  const dutyMatch = Boolean(candidate.sourceDutyId && actor.dutyIds.has(candidate.sourceDutyId));
  const dueMinutes = Math.round((candidate.dueAt.getTime() - now.getTime()) / 60_000);
  const capacityAvailable =
    actor.activeWorkCount < maxActiveTasks &&
    (actor.activeWorkMinutes ?? 0) < maxActiveWorkMinutes;

  if (!actor.isActive) reasons.push("Your staff account is not active.");
  if (!activeStatuses.has(candidate.status)) reasons.push("This task is already completed.");
  if (candidate.status !== "NOT_STARTED") reasons.push("Only work that has not started can be acquired.");
  if (candidate.blockerReason) reasons.push("This task has an active blocker.");
  if (!candidate.isClaimable) reasons.push("This task is not open for staff acquisition.");
  if (!workflowMatch && !dutyMatch && !actor.isManager) reasons.push("This work is outside your assigned responsibilities.");
  if (!capacityAvailable && !actor.isManager) reasons.push("Your active workload is at its configured limit.");

  const managerOnly = candidate.workflowArea === "GENERAL_MANAGER";
  const baseEligible =
    actor.isActive &&
    activeStatuses.has(candidate.status) &&
    candidate.status === "NOT_STARTED" &&
    !candidate.blockerReason &&
    candidate.isClaimable &&
    (workflowMatch || dutyMatch || actor.isManager) &&
    (capacityAvailable || actor.isManager);

  const scoreBreakdown = {
    workflowMatch: workflowMatch ? 25 : 0,
    dutyMatch: dutyMatch ? 25 : 0,
    availability: capacityAvailable ? 15 : 0,
    priorityUrgency: priorityScore[candidate.priority] + (dueMinutes < 0 ? 8 : dueMinutes <= 120 ? 5 : 0),
    workloadCapacity: Math.max(0, 10 - actor.activeWorkCount),
    continuity: candidate.recommendedUserId === actor.userId ? 5 : 0,
    penalties: candidate.blockerReason ? -25 : !capacityAvailable ? -20 : 0
  };
  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);

  let policy: WorkAcquisitionPolicy = "UNAVAILABLE";
  if (managerOnly && !actor.isManager) policy = "MANAGER_ASSIGN_ONLY";
  else if (baseEligible && candidate.requiresManagerApproval && !actor.isManager) policy = "APPROVAL_REQUIRED";
  else if (baseEligible) policy = "DIRECT_CLAIM";

  if (workflowMatch) reasons.push(`Strong ${candidate.workflowArea.toLowerCase().replaceAll("_", " ")} responsibility match.`);
  if (dutyMatch) reasons.push("Matches a directly assigned duty.");
  if (dueMinutes < 0) reasons.push("Task is overdue.");
  else if (dueMinutes <= 120) reasons.push("Task is due within two hours.");
  if (candidate.recommendedUserId === actor.userId) reasons.push("You are the recommended owner.");

  const eligible = policy === "DIRECT_CLAIM" || policy === "APPROVAL_REQUIRED";
  const action =
    policy === "DIRECT_CLAIM"
      ? "You may claim this task now."
      : policy === "APPROVAL_REQUIRED"
        ? "You may request manager approval for this task."
        : policy === "MANAGER_ASSIGN_ONLY"
          ? "A manager must assign this task."
          : reasons[0] ?? "This task is not currently available.";

  return {
    eligible,
    explanation: `${action}${reasons.length ? ` ${reasons.join(" ")}` : ""}`,
    policy,
    reasons,
    score,
    scoreBreakdown
  };
}
