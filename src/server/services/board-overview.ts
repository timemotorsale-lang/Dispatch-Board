import type { TaskStatus, TaskSourceType, WorkflowArea } from "@prisma/client";

import {
  createBoardOverviewRepository,
  type BoardOverviewRepository
} from "@/server/repositories/board-overview-repository";
import { normalizeBoardDate } from "@/server/validation/board-date";

export type BoardTaskPreview = {
  id: string;
  title: string;
  dueAt: Date;
  status: TaskStatus;
  sourceType: TaskSourceType;
  workflowArea: WorkflowArea;
  assignedUser: {
    id: string;
    name: string;
  };
};

export type BoardOverview = {
  boardDate: string;
  boardDayId: string | null;
  taskCounts: {
    total: number;
    generated: number;
    manual: number;
  };
  tasks: BoardTaskPreview[];
};

const DEFAULT_TASK_PREVIEW_LIMIT = 8;

export async function getBoardOverviewForDate(
  boardDate: string,
  repository: BoardOverviewRepository = createBoardOverviewRepository()
): Promise<BoardOverview> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);

  if (!boardDay) {
    return {
      boardDate: normalizedBoardDate,
      boardDayId: null,
      taskCounts: {
        total: 0,
        generated: 0,
        manual: 0
      },
      tasks: []
    };
  }

  const [taskCounts, tasks] = await Promise.all([
    repository.getTaskCounts(boardDay.id),
    repository.listTaskPreviews(boardDay.id, DEFAULT_TASK_PREVIEW_LIMIT)
  ]);

  return {
    boardDate: normalizedBoardDate,
    boardDayId: boardDay.id,
    taskCounts,
    tasks
  };
}
