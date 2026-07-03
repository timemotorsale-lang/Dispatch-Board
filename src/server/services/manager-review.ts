import { TaskStatus } from "@prisma/client";

import type { BoardReadTask } from "@/server/services/board-read";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canReviewWorkflows } from "@/server/policies/access";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { AppSettingsRepository } from "@/server/services/app-settings-service";
import { getBoardReadModelForToday } from "@/server/services/board-read";

export type ManagerReviewViewModel = {
  date: string;
  boardId: string | null;
  boardExists: boolean;
  generationStatus: string | null;
  generatedAt: string | null;
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
    tasks
  };
}
