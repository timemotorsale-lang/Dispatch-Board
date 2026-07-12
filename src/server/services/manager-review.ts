import { TaskStatus } from "@prisma/client";

import type { BoardReadTask } from "@/server/services/board-read";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canReviewWorkflows } from "@/server/policies/access";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { AppSettingsRepository } from "@/server/services/app-settings-service";
import { getBoardReadModelForDate, getBoardReadModelForToday } from "@/server/services/board-read";

export type ManagerReviewViewModel = {
  date: string;
  boardId: string | null;
  boardExists: boolean;
  generationStatus: string | null;
  generatedAt: string | null;
  commandItems: ManagerReviewCommandItem[];
  tasks: BoardReadTask[];
  attentionBuckets: ManagerAttentionBucket[];
  needsAssignmentTasks: BoardReadTask[];
};

export type ManagerReviewCommandQueue =
  | "READY_FOR_REVIEW"
  | "BLOCKED"
  | "WAITING_ON_PARTS"
  | "WAITING_ON_APPROVAL"
  | "NEEDS_ASSIGNMENT";

export type ManagerReviewCommandItem = {
  task: BoardReadTask;
  queue: ManagerReviewCommandQueue;
  attentionReason: string;
  isPastTaskDue: boolean;
  requiredUpdateCount: number;
  completedRequiredUpdateCount: number;
  missingRequiredUpdateCount: number;
};

export type ManagerReviewFocus =
  | ""
  | "READY_FOR_REVIEW"
  | "BLOCKED"
  | "WAITING_ON_PARTS"
  | "WAITING_ON_APPROVAL"
  | "NEEDS_ASSIGNMENT";

export type ManagerAttentionBucket = {
  description: string;
  label: string;
  status: "BLOCKED" | "WAITING_ON_APPROVAL" | "WAITING_ON_PARTS";
  tasks: BoardReadTask[];
};

type ManagerReviewDependencies = {
  repository?: BoardReadRepository;
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

function getReadyForReviewTasks(tasks: BoardReadTask[]) {
  return tasks.filter(
    (task) => task.status === TaskStatus.READY_FOR_REVIEW && task.requiresManagerApproval
  );
}

function getAttentionBuckets(tasks: BoardReadTask[]): ManagerAttentionBucket[] {
  return [
    {
      label: "Blocked",
      description: "Work is stalled and needs a next decision.",
      status: TaskStatus.BLOCKED,
      tasks: tasks.filter((task) => task.status === TaskStatus.BLOCKED)
    },
    {
      label: "Waiting on Parts",
      description: "Track ETAs and unblock repair or recon work.",
      status: TaskStatus.WAITING_ON_PARTS,
      tasks: tasks.filter((task) => task.status === TaskStatus.WAITING_ON_PARTS)
    },
    {
      label: "Waiting on Approval",
      description: "Manager action is holding the next step.",
      status: TaskStatus.WAITING_ON_APPROVAL,
      tasks: tasks.filter((task) => task.status === TaskStatus.WAITING_ON_APPROVAL)
    }
  ];
}

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

const QUEUE_ORDER: Record<ManagerReviewCommandQueue, number> = {
  WAITING_ON_APPROVAL: 5,
  BLOCKED: 4,
  WAITING_ON_PARTS: 3,
  READY_FOR_REVIEW: 2,
  NEEDS_ASSIGNMENT: 1
};

function isRequiredUpdateComplete(
  field: BoardReadTask["requiredUpdateFields"][number],
  value: string | boolean | undefined
) {
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  return typeof value === "string" && Boolean(value.trim());
}

function getCommandQueue(task: BoardReadTask): ManagerReviewCommandQueue | null {
  if (task.status === TaskStatus.READY_FOR_REVIEW && task.requiresManagerApproval) {
    return "READY_FOR_REVIEW";
  }

  if (task.status === TaskStatus.BLOCKED) {
    return "BLOCKED";
  }

  if (task.status === TaskStatus.WAITING_ON_PARTS) {
    return "WAITING_ON_PARTS";
  }

  if (task.status === TaskStatus.WAITING_ON_APPROVAL) {
    return "WAITING_ON_APPROVAL";
  }

  if (task.status === TaskStatus.NOT_STARTED && task.isClaimable) {
    return "NEEDS_ASSIGNMENT";
  }

  return null;
}

function createAttentionReason(
  task: BoardReadTask,
  queue: ManagerReviewCommandQueue,
  isPastTaskDue: boolean,
  missingRequiredUpdateCount: number
) {
  const reasons: string[] = [];

  if (task.priority === "CRITICAL") {
    reasons.push("Critical task priority");
  }

  if (isPastTaskDue) {
    reasons.push("past the task due time");
  }

  if (queue === "READY_FOR_REVIEW") {
    reasons.push(
      missingRequiredUpdateCount > 0
        ? `${missingRequiredUpdateCount} required submission update${missingRequiredUpdateCount === 1 ? " is" : "s are"} missing`
        : "ready for a manager completion decision"
    );
  } else if (queue === "BLOCKED") {
    reasons.push(task.blockerReason ? `blocked: ${task.blockerReason}` : "blocked without a recorded next action");
  } else if (queue === "WAITING_ON_PARTS") {
    reasons.push("waiting on parts; confirm the ETA and next accountable action");
  } else if (queue === "WAITING_ON_APPROVAL") {
    reasons.push("manager approval is holding the next step");
  } else {
    reasons.push("claimable work needs an accountable assignment");
  }

  return `${reasons.join("; ")}.`;
}

export function createManagerReviewCommandItems(tasks: BoardReadTask[], now: Date) {
  return tasks
    .flatMap<ManagerReviewCommandItem>((task) => {
      const queue = getCommandQueue(task);

      if (!queue) {
        return [];
      }

      const requiredFields = task.requiredUpdateFields.filter((field) => field.required);
      const completedRequiredUpdateCount = requiredFields.filter((field) =>
        isRequiredUpdateComplete(field, task.updateFieldValues[field.key])
      ).length;
      const missingRequiredUpdateCount = requiredFields.length - completedRequiredUpdateCount;
      const isPastTaskDue = new Date(task.dueAt).getTime() < now.getTime();

      return [
        {
          task,
          queue,
          attentionReason: createAttentionReason(
            task,
            queue,
            isPastTaskDue,
            missingRequiredUpdateCount
          ),
          isPastTaskDue,
          requiredUpdateCount: requiredFields.length,
          completedRequiredUpdateCount,
          missingRequiredUpdateCount
        }
      ];
    })
    .sort((left, right) => {
      const priorityDifference =
        (PRIORITY_ORDER[right.task.priority] ?? 0) - (PRIORITY_ORDER[left.task.priority] ?? 0);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (left.isPastTaskDue !== right.isPastTaskDue) {
        return left.isPastTaskDue ? -1 : 1;
      }

      const queueDifference = QUEUE_ORDER[right.queue] - QUEUE_ORDER[left.queue];

      if (queueDifference !== 0) {
        return queueDifference;
      }

      const dueTimeDifference =
        new Date(left.task.dueAt).getTime() - new Date(right.task.dueAt).getTime();

      if (dueTimeDifference !== 0) {
        return dueTimeDifference;
      }

      return left.task.id.localeCompare(right.task.id);
    });
}

export async function getManagerReviewViewModelForToday(
  user: AuthenticatedUser | null,
  dependencies: ManagerReviewDependencies = {}
): Promise<ManagerReviewViewModel> {
  if (!canReviewWorkflows(user)) {
    throw new Error("Manager review access required.");
  }

  const boardResult = await getBoardReadModelForToday(user, dependencies);
  const tasks = boardResult.board ? getReadyForReviewTasks(boardResult.board.tasks) : [];
  const commandItems = boardResult.board
    ? createManagerReviewCommandItems(boardResult.board.tasks, dependencies.now?.() ?? new Date())
    : [];

  return {
    date: boardResult.date,
    boardId: boardResult.board?.id ?? null,
    boardExists: Boolean(boardResult.board),
    generationStatus: boardResult.board?.generationStatus ?? null,
    generatedAt: boardResult.board?.generatedAt ?? null,
    commandItems,
    tasks,
    attentionBuckets: boardResult.board ? getAttentionBuckets(boardResult.board.tasks) : getAttentionBuckets([]),
    needsAssignmentTasks: boardResult.board ? boardResult.board.tasks.filter((task) => task.isClaimable && task.status === TaskStatus.NOT_STARTED) : []
  };
}

export async function getManagerReviewViewModelForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: ManagerReviewDependencies = {}
): Promise<ManagerReviewViewModel> {
  if (!canReviewWorkflows(user)) {
    throw new Error("Manager review access required.");
  }

  const boardResult = await getBoardReadModelForDate(user, boardDate, dependencies);
  const tasks = boardResult.board ? getReadyForReviewTasks(boardResult.board.tasks) : [];
  const commandItems = boardResult.board
    ? createManagerReviewCommandItems(boardResult.board.tasks, dependencies.now?.() ?? new Date())
    : [];

  return {
    date: boardResult.date,
    boardId: boardResult.board?.id ?? null,
    boardExists: Boolean(boardResult.board),
    generationStatus: boardResult.board?.generationStatus ?? null,
    generatedAt: boardResult.board?.generatedAt ?? null,
    commandItems,
    tasks,
    attentionBuckets: boardResult.board ? getAttentionBuckets(boardResult.board.tasks) : getAttentionBuckets([]),
    needsAssignmentTasks: boardResult.board ? boardResult.board.tasks.filter((task) => task.isClaimable && task.status === TaskStatus.NOT_STARTED) : []
  };
}
