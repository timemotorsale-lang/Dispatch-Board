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
  tasks: BoardReadTask[];
  attentionBuckets: ManagerAttentionBucket[];
  needsAssignmentTasks: BoardReadTask[];
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

export async function getManagerReviewViewModelForToday(
  user: AuthenticatedUser | null,
  dependencies: ManagerReviewDependencies = {}
): Promise<ManagerReviewViewModel> {
  if (!canReviewWorkflows(user)) {
    throw new Error("Manager review access required.");
  }

  const boardResult = await getBoardReadModelForToday(user, dependencies);
  const tasks = boardResult.board ? getReadyForReviewTasks(boardResult.board.tasks) : [];

  return {
    date: boardResult.date,
    boardId: boardResult.board?.id ?? null,
    boardExists: Boolean(boardResult.board),
    generationStatus: boardResult.board?.generationStatus ?? null,
    generatedAt: boardResult.board?.generatedAt ?? null,
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

  return {
    date: boardResult.date,
    boardId: boardResult.board?.id ?? null,
    boardExists: Boolean(boardResult.board),
    generationStatus: boardResult.board?.generationStatus ?? null,
    generatedAt: boardResult.board?.generatedAt ?? null,
    tasks,
    attentionBuckets: boardResult.board ? getAttentionBuckets(boardResult.board.tasks) : getAttentionBuckets([]),
    needsAssignmentTasks: boardResult.board ? boardResult.board.tasks.filter((task) => task.isClaimable && task.status === TaskStatus.NOT_STARTED) : []
  };
}
