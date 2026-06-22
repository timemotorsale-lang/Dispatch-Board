import { TaskSourceType, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
  createBoardReadRepository,
  type BoardReadRepository,
  type BoardReadTaskRecord
} from "@/server/repositories/board-read-repository";
import {
  getGenerationSettings,
  type AppSettingsRepository
} from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type BoardReadUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type BoardReadTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string;
  workflowArea: string;
  sourceType: string;
  requiresManagerApproval: boolean;
  assignedUser: BoardReadUserSummary;
  recommendedUser: BoardReadUserSummary | null;
  recommendationReasonCode: string | null;
  recommendationReasonText: string | null;
  recommendationReviewNeeded: boolean;
  vehicleReference: string | null;
  customerReference: string | null;
  blockerReason: string | null;
  readyForReviewAt: string | null;
  completedAt: string | null;
};

export type BoardReadModel = {
  id: string;
  date: string;
  generationStatus: string;
  generatedAt: string | null;
  taskCount: number;
  statusCounts: Record<string, number>;
  sourceCounts: {
    template: number;
    manager: number;
    staff: number;
  };
  tasks: BoardReadTask[];
};

export type BoardReadLookupResult = {
  date: string;
  board: BoardReadModel | null;
};

type BoardReadDependencies = {
  repository?: BoardReadRepository;
};

type BoardReadTodayDependencies = BoardReadDependencies & {
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function toUserSummary(
  user: {
    id: string;
    name: string;
    email: string;
  } | null
): BoardReadUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

function toTaskSummary(task: BoardReadTaskRecord): BoardReadTask {
  return {
    id: task.id,
    title: task.title,
    description: normalizeOptionalText(task.description),
    status: task.status,
    dueAt: task.dueAt.toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    assignedUser: {
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email || undefined
    },
    recommendedUser: toUserSummary(task.recommendedUser),
    recommendationReasonCode: task.recommendationReasonCode,
    recommendationReasonText: normalizeOptionalText(task.recommendationReasonText),
    recommendationReviewNeeded: task.recommendationReviewNeeded,
    vehicleReference: normalizeOptionalText(task.vehicleReference),
    customerReference: normalizeOptionalText(task.customerReference),
    blockerReason: normalizeOptionalText(task.blockerReason),
    readyForReviewAt: task.readyForReviewAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null
  };
}

function createStatusCounts(tasks: BoardReadTask[]) {
  const counts = Object.fromEntries(Object.values(TaskStatus).map((status) => [status, 0])) as Record<
    string,
    number
  >;

  for (const task of tasks) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }

  return counts;
}

function createSourceCounts(tasks: BoardReadTask[]) {
  return tasks.reduce(
    (counts, task) => {
      if (task.sourceType === TaskSourceType.TEMPLATE) {
        counts.template += 1;
      } else if (task.sourceType === TaskSourceType.MANAGER) {
        counts.manager += 1;
      } else if (task.sourceType === TaskSourceType.STAFF) {
        counts.staff += 1;
      }

      return counts;
    },
    {
      template: 0,
      manager: 0,
      staff: 0
    }
  );
}

function toBoardReadModel(
  boardDay: {
    id: string;
    generationStatus: string;
    generatedAt: Date | null;
  },
  boardDate: string,
  tasks: BoardReadTask[]
): BoardReadModel {
  return {
    id: boardDay.id,
    date: boardDate,
    generationStatus: boardDay.generationStatus,
    generatedAt: boardDay.generatedAt?.toISOString() ?? null,
    taskCount: tasks.length,
    statusCounts: createStatusCounts(tasks),
    sourceCounts: createSourceCounts(tasks),
    tasks
  };
}

export function assertCanViewBoard(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canViewFullBoard(user)) {
    throw new Error("Board access required.");
  }

  return user;
}

export async function getBoardReadModelForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: BoardReadDependencies = {}
): Promise<BoardReadLookupResult> {
  assertCanViewBoard(user);

  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createBoardReadRepository();
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);

  if (!boardDay) {
    return {
      date: normalizedBoardDate,
      board: null
    };
  }

  const tasks = (await repository.listTasksForBoardDay(boardDay.id)).map(toTaskSummary);

  return {
    date: normalizedBoardDate,
    board: toBoardReadModel(boardDay, normalizedBoardDate, tasks)
  };
}

export async function getBoardReadModelForToday(
  user: AuthenticatedUser | null,
  dependencies: BoardReadTodayDependencies = {}
): Promise<BoardReadLookupResult> {
  assertCanViewBoard(user);

  const settings = await getGenerationSettings(dependencies.appSettingsRepository);
  const now = dependencies.now ?? (() => new Date());
  const boardDate = getBoardDateInTimeZone(now(), settings.timezone);

  return getBoardReadModelForDate(user, boardDate, dependencies);
}
