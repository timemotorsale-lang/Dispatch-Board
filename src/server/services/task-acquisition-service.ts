import type { TaskAssignmentRequestStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import {
  createTaskAcquisitionRepository,
  type TaskAcquisitionRepository,
  type TaskAcquisitionTaskRecord,
  type TaskAssignmentRequestRecord
} from "@/server/repositories/task-acquisition-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { decideWorkAcquisition } from "@/server/services/work-acquisition-decision";
import { normalizeBoardDate } from "@/server/validation/board-date";

type Dependencies = {
  now?: () => Date;
  recordActivity?: typeof recordBoardActivityEvent;
  repository?: TaskAcquisitionRepository;
};

function requireActor(actor: AuthenticatedUser | null) {
  if (!actor) throw new Error("Authentication required.");
  if (!actor.isActive) throw new Error("Your staff account is not active.");
  return actor;
}

function normalizeReason(value: unknown, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== "string") throw new Error(required ? "A reason is required." : "Reason must be text.");
  const reason = value.trim();
  if (required && !reason) throw new Error("A reason is required.");
  if (reason.length > 500) throw new Error("Reason must be 500 characters or fewer.");
  return reason || null;
}

async function getDecision(
  actor: AuthenticatedUser,
  task: TaskAcquisitionTaskRecord,
  dependencies: Dependencies
) {
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const profile = await repository.findActorProfile(actor.id, task.boardDayId);
  if (!profile) throw new Error("Staff profile not found.");
  return decideWorkAcquisition({
    actor: {
      ...profile,
      dutyIds: new Set(profile.dutyIds),
      isManager: isManager(actor),
      userId: actor.id,
      workflowAreas: new Set(profile.workflowAreas)
    },
    candidate: task,
    now: (dependencies.now ?? (() => new Date()))()
  });
}

function toTaskSummary(task: TaskAcquisitionTaskRecord) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt.toISOString(),
    workflowArea: task.workflowArea,
    assignedUser: task.assignedUser
  };
}

function toRequestModel(request: TaskAssignmentRequestRecord) {
  return {
    id: request.id,
    status: request.status,
    requestReason: request.requestReason,
    decisionReason: request.decisionReason,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    requester: request.requesterUser,
    decidedBy: request.decidedByUser,
    task: toTaskSummary(request.task)
  };
}

export async function getTaskAcquisitionOverview(
  actor: AuthenticatedUser | null,
  boardDate: string,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const date = normalizeBoardDate(boardDate);
  const [tasks, requests] = await Promise.all([
    repository.listClaimableTasks(date),
    repository.listRequestsForUser(user.id)
  ]);
  const available = await Promise.all(tasks.map(async (task) => ({
    decision: await getDecision(user, task, { ...dependencies, repository }),
    task: toTaskSummary(task)
  })));
  return {
    boardDate: date,
    available: available
      .filter((item) => item.decision.policy !== "UNAVAILABLE")
      .sort((left, right) => right.decision.score - left.decision.score || left.task.dueAt.localeCompare(right.task.dueAt)),
    requests: requests.map(toRequestModel),
    counts: {
      available: available.filter((item) => item.decision.eligible).length,
      pendingRequests: requests.filter((request) => request.status === "PENDING").length
    }
  };
}

export async function claimTask(
  actor: AuthenticatedUser | null,
  taskId: string,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  const decision = await getDecision(user, task, { ...dependencies, repository });
  if (decision.policy !== "DIRECT_CLAIM") throw new Error(decision.explanation);
  const claimedAt = (dependencies.now ?? (() => new Date()))();
  const claimed = await repository.claimTask(task, user.id, claimedAt);
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: task.boardDayId,
    eventType: "task.claimed",
    message: `${user.name} claimed ${task.title}.`,
    metadata: { acquisitionPolicy: decision.policy, score: decision.score },
    taskId: task.id
  });
  return { decision, task: toTaskSummary(claimed) };
}

export async function requestTaskAssignment(
  actor: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  const decision = await getDecision(user, task, { ...dependencies, repository });
  if (decision.policy !== "APPROVAL_REQUIRED" && decision.policy !== "MANAGER_ASSIGN_ONLY") {
    throw new Error(decision.policy === "DIRECT_CLAIM" ? "This task can be claimed directly." : decision.explanation);
  }
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const request = await repository.createRequest(task.id, user.id, normalizeReason(candidate.reason));
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: task.boardDayId,
    eventType: "task.assignment_requested",
    message: `${user.name} requested assignment to ${task.title}.`,
    metadata: { assignmentRequestId: request.id, acquisitionPolicy: decision.policy, score: decision.score },
    taskId: task.id
  });
  return toRequestModel(request);
}

export async function cancelTaskAssignmentRequest(
  actor: AuthenticatedUser | null,
  requestId: string,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const request = await repository.cancelRequest(requestId.trim(), user.id, (dependencies.now ?? (() => new Date()))());
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: request.task.boardDayId,
    eventType: "task.assignment_request_cancelled",
    message: `${user.name} cancelled an assignment request for ${request.task.title}.`,
    metadata: { assignmentRequestId: request.id },
    taskId: request.task.id
  });
  return toRequestModel(request);
}

export async function getPendingTaskAssignmentRequests(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  if (!isManager(user)) throw new Error("Manager access required.");
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  return (await repository.listPendingRequests()).map(toRequestModel);
}

export async function decideTaskAssignmentRequest(
  actor: AuthenticatedUser | null,
  requestId: string,
  input: unknown,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  if (!isManager(user)) throw new Error("Manager access required.");
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (candidate.decision !== "APPROVED" && candidate.decision !== "DECLINED" && candidate.decision !== "ASSIGNED_OTHER") throw new Error("Select approve, decline, or assign another owner.");
  const decision = candidate.decision;
  const decisionReason = normalizeReason(candidate.reason, decision === "DECLINED");
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const request = await repository.decideRequest({
    requestId: requestId.trim(),
    decision,
    decisionReason,
    decidedAt: (dependencies.now ?? (() => new Date()))(),
    decidedByUserId: user.id,
    ...(decision === "ASSIGNED_OTHER" && typeof candidate.targetUserId === "string"
      ? { targetUserId: candidate.targetUserId.trim() }
      : {})
  });
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: request.task.boardDayId,
    eventType: decision === "APPROVED" ? "task.assignment_request_approved" : decision === "ASSIGNED_OTHER" ? "task.assignment_request_assigned_other" : "task.assignment_request_declined",
    message: `${user.name} ${decision === "APPROVED" ? "approved" : decision === "ASSIGNED_OTHER" ? "assigned another owner instead of approving" : "declined"} ${request.requesterUser.name}'s request for ${request.task.title}.`,
    metadata: { assignmentRequestId: request.id, decisionReason, requesterUserId: request.requesterUser.id },
    taskId: request.task.id
  });
  return toRequestModel(request);
}

export async function startAcquiredTask(
  actor: AuthenticatedUser | null,
  taskId: string,
  dependencies: Dependencies = {}
) {
  const user = requireActor(actor);
  const repository = dependencies.repository ?? createTaskAcquisitionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  if (task.assignedUserId !== user.id && !isManager(user)) throw new Error("Only the assigned owner can start this task.");
  if (task.blockerReason) throw new Error("Resolve the task blocker before starting work.");
  const started = await repository.startTask(task.id, user.id, (dependencies.now ?? (() => new Date()))());
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: task.boardDayId,
    eventType: "task.work_started",
    message: `${user.name} started work on ${task.title}.`,
    metadata: { workbenchHref: `/tasks/${task.id}` },
    taskId: task.id
  });
  return { task: toTaskSummary(started), workbenchHref: `/tasks/${task.id}` };
}

export type TaskAssignmentRequestStatusValue = TaskAssignmentRequestStatus;
