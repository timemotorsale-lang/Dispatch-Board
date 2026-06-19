import type { BoardReadTask } from "@/server/services/board-read";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getTasksAssignedToUser } from "@/features/tasks/my-tasks-helpers";
import type { BoardReadRepository } from "@/server/repositories/board-read-repository";
import type { AppSettingsRepository } from "@/server/services/app-settings-service";
import { getBoardReadModelForToday } from "@/server/services/board-read";

export type MyTasksViewModel = {
  date: string;
  boardId: string | null;
  boardExists: boolean;
  generationStatus: string | null;
  generatedAt: string | null;
  tasks: BoardReadTask[];
};

type MyTasksDependencies = {
  repository?: BoardReadRepository;
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

export async function getMyTasksViewModelForToday(
  user: AuthenticatedUser | null,
  dependencies: MyTasksDependencies = {}
): Promise<MyTasksViewModel> {
  const boardResult = await getBoardReadModelForToday(user, dependencies);
  const tasks = boardResult.board ? getTasksAssignedToUser(boardResult.board.tasks, user?.id ?? "") : [];

  return {
    date: boardResult.date,
    boardId: boardResult.board?.id ?? null,
    boardExists: Boolean(boardResult.board),
    generationStatus: boardResult.board?.generationStatus ?? null,
    generatedAt: boardResult.board?.generatedAt ?? null,
    tasks
  };
}
