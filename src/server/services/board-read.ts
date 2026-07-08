import { TaskSourceType, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
  createBoardReadRepository,
  type BoardReadRepository,
  type BoardReadTaskRecord
} from "@/server/repositories/board-read-repository";
import { createGenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";
import { createSchedulerAttemptsRepository } from "@/server/repositories/scheduler-attempts-repository";
import {
  getGenerationSettings,
  type AppSettingsRepository
} from "@/server/services/app-settings-service";
import {
  listLatestGenerationStatusesForDate,
  type LatestGenerationStatus
} from "@/server/services/board-generation";
import {
  listSchedulerAttemptsForDate,
  type SchedulerAttemptEvidence,
  type SchedulerFailureStageValue
} from "@/server/services/scheduler-attempts";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type BoardReadUserSummary = {
  id: string;
  name: string;
  email?: string;
};

type BoardReadRecommendation = {
  reasonCode: string;
  explanation: string;
};

export type BoardReadRequiredUpdateField = {
  key: string;
  label: string;
  type: "short_text" | "long_text" | "single_select" | "boolean";
  required: boolean;
  helpText: string | null;
  options?: string[];
};

export type BoardReadTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string;
  updatedAt: string;
  workflowArea: string;
  sourceType: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields: BoardReadRequiredUpdateField[];
  updateFieldValues: Record<string, string | boolean>;
  assignedUser: BoardReadUserSummary;
  recommendedUser: BoardReadUserSummary | null;
  recommendation: BoardReadRecommendation | null;
  vehicleReference: string | null;
  customerReference: string | null;
  blockerReason: string | null;
  readyForReviewAt: string | null;
  completedAt: string | null;
};

export type BoardReadLatestGeneration = {
  generationRunId: string;
  status: "running" | "success" | "failed";
  triggeredBy: "manual" | "scheduled";
  startedAt: string;
  finishedAt: string | null;
  attemptedAt: string;
  createdTaskCount: number | null;
  skippedExistingTaskCount: number | null;
  alreadyExistingTaskCount: number | null;
  manualTasksPreservedCount: number | null;
  summary: string | null;
  errorMessage: string | null;
  failureCode: string | null;
  failureStage: SchedulerFailureStageValue | null;
  failureDiagnostic: LatestGenerationStatus["failureDiagnostic"] | null;
};

export type BoardReadSchedulerHealthStatus = "healthy" | "waiting" | "attention";

export type BoardReadSchedulerFailure = {
  source: "scheduled_attempt" | "generation_run";
  triggeredBy: "scheduled" | "manual";
  occurredAt: string;
  generationRunId: string | null;
  schedulerAttemptId: string | null;
  managerMessage: string;
  failureCode: string | null;
  failureStage: SchedulerFailureStageValue | null;
};

export type BoardReadSchedulerSkip = {
  code: string;
  occurredAt: string;
  generationRunId: string | null;
  schedulerAttemptId: string;
  managerMessage: string;
};

export type BoardReadBoardGenerationHealth = {
  state: "not_created" | "not_started" | "in_progress" | "generated" | "failed";
  generatedAt: string | null;
  latestGenerationStatus: BoardReadLatestGeneration["status"] | "none";
};

export type BoardReadSchedulerHealth = {
  status: BoardReadSchedulerHealthStatus;
  expectedToHaveRunByNow: boolean | null;
  needsAttention: boolean;
  managerMessage: string;
  nextStepMessage: string;
  latestScheduledAttempt: SchedulerAttemptEvidence | null;
  latestManualRun: BoardReadLatestGeneration | null;
  lastSuccess: BoardReadLatestGeneration | null;
  lastFailure: BoardReadSchedulerFailure | null;
  latestSkipReason: BoardReadSchedulerSkip | null;
  boardGenerationStatus: BoardReadBoardGenerationHealth;
};

export type BoardReadModel = {
  id: string;
  date: string;
  generationStatus: string;
  generatedAt: string | null;
  latestGeneration: BoardReadLatestGeneration | null;
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
  schedulerHealth: BoardReadSchedulerHealth;
};

type BoardReadDependencies = {
  repository?: BoardReadRepository;
  generationTasksRepository?: Pick<
    ReturnType<typeof createGenerationTasksRepository>,
    "listGenerationRunsForDate"
  >;
  schedulerAttemptsRepository?: ReturnType<typeof createSchedulerAttemptsRepository>;
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

type BoardReadTodayDependencies = BoardReadDependencies;

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRequiredUpdateFields(snapshot: unknown): BoardReadRequiredUpdateField[] {
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.requiredUpdateFields)) {
    return [];
  }

  return snapshot.requiredUpdateFields.flatMap((entry) => {
    if (!isPlainObject(entry) || typeof entry.key !== "string" || typeof entry.label !== "string") {
      return [];
    }

    if (
      entry.type !== "short_text" &&
      entry.type !== "long_text" &&
      entry.type !== "single_select" &&
      entry.type !== "boolean"
    ) {
      return [];
    }

    return [
      {
        key: entry.key,
        label: entry.label,
        type: entry.type,
        required: entry.required !== false,
        helpText: typeof entry.helpText === "string" ? entry.helpText : null,
        ...(Array.isArray(entry.options) &&
        entry.options.every((option) => typeof option === "string" && option.trim())
          ? { options: entry.options.map((option) => option.trim()) }
          : {})
      } satisfies BoardReadRequiredUpdateField
    ];
  });
}

function normalizeUpdateFieldValues(value: unknown) {
  if (!isPlainObject(value)) {
    return {} as Record<string, string | boolean>;
  }

  const normalizedEntries: Array<[string, string | boolean]> = [];

  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue === "boolean") {
      normalizedEntries.push([key, fieldValue]);
      continue;
    }

    if (typeof fieldValue === "string") {
      const normalizedValue = fieldValue.trim();

      if (normalizedValue) {
        normalizedEntries.push([key, normalizedValue]);
      }
    }
  }

  return Object.fromEntries(normalizedEntries);
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
  const snapshot = (task as { templateSnapshot?: unknown }).templateSnapshot;
  const updateFieldValues = (task as { updateFieldValues?: unknown }).updateFieldValues;
  const updatedAt = (task as { updatedAt?: Date }).updatedAt;
  const recommendation =
    task.recommendationReasonCode && task.recommendationExplanation
      ? {
          reasonCode: task.recommendationReasonCode,
          explanation: task.recommendationExplanation
        }
      : null;

  return {
    id: task.id,
    title: task.title,
    description: normalizeOptionalText(task.description),
    status: task.status,
    dueAt: task.dueAt.toISOString(),
    updatedAt: (updatedAt ?? task.dueAt).toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    requiredUpdateFields: normalizeRequiredUpdateFields(snapshot),
    updateFieldValues: normalizeUpdateFieldValues(updateFieldValues),
    assignedUser: {
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email || undefined
    },
    recommendedUser: toUserSummary(task.recommendedUser),
    recommendation,
    vehicleReference: normalizeOptionalText(task.vehicleReference),
    customerReference: normalizeOptionalText(task.customerReference),
    blockerReason: normalizeOptionalText(task.blockerReason),
    readyForReviewAt: task.readyForReviewAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null
  };
}

function toBoardReadLatestGeneration(
  latestGeneration: LatestGenerationStatus | null
): BoardReadLatestGeneration | null {
  if (!latestGeneration) {
    return null;
  }

  return {
    generationRunId: latestGeneration.generationRunId,
    status: latestGeneration.status,
    triggeredBy: latestGeneration.triggeredBy,
    startedAt: latestGeneration.startedAt.toISOString(),
    finishedAt: latestGeneration.finishedAt?.toISOString() ?? null,
    attemptedAt: latestGeneration.attemptedAt.toISOString(),
    createdTaskCount: latestGeneration.createdTaskCount,
    skippedExistingTaskCount: latestGeneration.skippedExistingTaskCount,
    alreadyExistingTaskCount: latestGeneration.alreadyExistingTaskCount,
    manualTasksPreservedCount: latestGeneration.manualTasksPreservedCount,
    summary: latestGeneration.summary,
    errorMessage: latestGeneration.errorMessage,
    failureCode: latestGeneration.failureCode,
    failureStage: latestGeneration.failureStage,
    failureDiagnostic: latestGeneration.failureDiagnostic
  };
}

function parseGenerationTimeToMinutes(dailyGenerationTime: string) {
  const [hoursText, minutesText] = dailyGenerationTime.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error("Daily generation time must use HH:mm format.");
  }

  return hours * 60 + minutes;
}

function getMinutesSinceMidnightInTimeZone(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(now);
  const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "", 10);
  const minute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "", 10);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Unable to resolve local time in ${timeZone}.`);
  }

  return hour * 60 + minute;
}

function getBoardGenerationState(board: BoardReadModel | null): BoardReadBoardGenerationHealth["state"] {
  if (!board) {
    return "not_created";
  }

  if (board.generationStatus === "NOT_STARTED") {
    return "not_started";
  }

  if (board.generationStatus === "IN_PROGRESS") {
    return "in_progress";
  }

  if (board.generationStatus === "FAILED") {
    return "failed";
  }

  return "generated";
}

function buildBoardGenerationStatus(board: BoardReadModel | null): BoardReadBoardGenerationHealth {
  return {
    state: getBoardGenerationState(board),
    generatedAt: board?.generatedAt ?? null,
    latestGenerationStatus: board?.latestGeneration?.status ?? "none"
  };
}

function toFailureSummary(
  latestFailureGeneration: BoardReadLatestGeneration | null,
  latestFailedAttempt: SchedulerAttemptEvidence | null
): BoardReadSchedulerFailure | null {
  const generationFailure = latestFailureGeneration
    ? {
        source: "generation_run" as const,
        triggeredBy: latestFailureGeneration.triggeredBy,
        occurredAt: latestFailureGeneration.attemptedAt,
        generationRunId: latestFailureGeneration.generationRunId,
        schedulerAttemptId: null,
        managerMessage:
          latestFailureGeneration.errorMessage ??
          latestFailureGeneration.summary ??
          "Generation failed.",
        failureCode: latestFailureGeneration.failureCode,
        failureStage: latestFailureGeneration.failureStage
      }
    : null;
  const scheduledAttemptFailure = latestFailedAttempt
    ? {
        source: "scheduled_attempt" as const,
        triggeredBy: "scheduled" as const,
        occurredAt: latestFailedAttempt.completedAt ?? latestFailedAttempt.receivedAt,
        generationRunId: latestFailedAttempt.generationRunId,
        schedulerAttemptId: latestFailedAttempt.id,
        managerMessage:
          latestFailedAttempt.safeErrorMessage ??
          latestFailedAttempt.managerMessage ??
          "Scheduled attempt failed.",
        failureCode: latestFailedAttempt.failureCode,
        failureStage: latestFailedAttempt.failureStage
      }
    : null;

  if (!generationFailure) {
    return scheduledAttemptFailure;
  }

  if (!scheduledAttemptFailure) {
    return generationFailure;
  }

  return new Date(generationFailure.occurredAt).getTime() >=
    new Date(scheduledAttemptFailure.occurredAt).getTime()
    ? generationFailure
    : scheduledAttemptFailure;
}

function toLatestSkipReason(latestScheduledAttempt: SchedulerAttemptEvidence | null): BoardReadSchedulerSkip | null {
  if (!latestScheduledAttempt?.skipReasonCode) {
    return null;
  }

  return {
    code: latestScheduledAttempt.skipReasonCode,
    occurredAt: latestScheduledAttempt.completedAt ?? latestScheduledAttempt.receivedAt,
    generationRunId: latestScheduledAttempt.generationRunId,
    schedulerAttemptId: latestScheduledAttempt.id,
    managerMessage: latestScheduledAttempt.managerMessage
  };
}

function deriveExpectedToHaveRunByNow(input: {
  boardDate: string;
  now: Date;
  timezone: string;
  dailyGenerationTime: string;
  businessDays: string[];
}): boolean {
  const todayBoardDate = getBoardDateInTimeZone(input.now, input.timezone);

  if (input.boardDate < todayBoardDate) {
    return true;
  }

  if (input.boardDate > todayBoardDate) {
    return false;
  }

  const boardDayDate = new Date(`${input.boardDate}T00:00:00.000Z`);
  const businessDay = boardDayDate
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    .toUpperCase();

  if (!input.businessDays.includes(businessDay)) {
    return false;
  }

  return getMinutesSinceMidnightInTimeZone(input.now, input.timezone) >=
    parseGenerationTimeToMinutes(input.dailyGenerationTime);
}

function buildSchedulerHealth(input: {
  boardDate: string;
  board: BoardReadModel | null;
  generationStatuses: LatestGenerationStatus[];
  schedulerAttempts: SchedulerAttemptEvidence[];
  expectedToHaveRunByNow: boolean | null;
  settingsErrorMessage: string | null;
}): BoardReadSchedulerHealth {
  const latestScheduledAttempt = input.schedulerAttempts[0] ?? null;
  const latestManualRun =
    input.generationStatuses.find((generation) => generation.triggeredBy === "manual") ?? null;
  const lastSuccess =
    input.generationStatuses.find((generation) => generation.status === "success") ?? null;
  const lastFailureGeneration =
    input.generationStatuses.find((generation) => generation.status === "failed") ?? null;
  const latestFailedAttempt =
    input.schedulerAttempts.find((attempt) => attempt.attemptState === "failed") ?? null;
  const latestSkipReason = toLatestSkipReason(latestScheduledAttempt);
  const boardGenerationStatus = buildBoardGenerationStatus(input.board);
  const schedulerFailure = toFailureSummary(
    toBoardReadLatestGeneration(lastFailureGeneration),
    latestFailedAttempt
  );
  const latestManualRunRead = toBoardReadLatestGeneration(latestManualRun);
  const lastSuccessRead = toBoardReadLatestGeneration(lastSuccess);

  if (input.settingsErrorMessage) {
    return {
      status: "attention",
      expectedToHaveRunByNow: null,
      needsAttention: true,
      managerMessage:
        "Scheduler health could not verify the expected run window because generation settings are invalid.",
      nextStepMessage: "Review generation timezone, daily generation time, and business days.",
      latestScheduledAttempt,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason,
      boardGenerationStatus
    };
  }

  if (!latestScheduledAttempt) {
    return {
      status: input.expectedToHaveRunByNow ? "attention" : "waiting",
      expectedToHaveRunByNow: input.expectedToHaveRunByNow,
      needsAttention: Boolean(input.expectedToHaveRunByNow),
      managerMessage: `No scheduled generation evidence has been recorded for ${input.boardDate} yet.`,
      nextStepMessage: input.expectedToHaveRunByNow
        ? "Verify the production scheduler is enabled and that cron requests are reaching the app."
        : "Wait for the configured generation window or trigger a manual generation if needed.",
      latestScheduledAttempt: null,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason: null,
      boardGenerationStatus
    };
  }

  if (latestScheduledAttempt.attemptState === "unauthorized") {
    return {
      status: "attention",
      expectedToHaveRunByNow: input.expectedToHaveRunByNow,
      needsAttention: true,
      managerMessage: latestScheduledAttempt.managerMessage,
      nextStepMessage: "Check the production cron secret and scheduler authorization headers.",
      latestScheduledAttempt,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason,
      boardGenerationStatus
    };
  }

  if (latestScheduledAttempt.attemptState === "failed") {
    return {
      status: "attention",
      expectedToHaveRunByNow: input.expectedToHaveRunByNow,
      needsAttention: true,
      managerMessage: latestScheduledAttempt.managerMessage,
      nextStepMessage: "Review the failed run details and retry manually if the board still needs to be generated.",
      latestScheduledAttempt,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason,
      boardGenerationStatus
    };
  }

  if (latestScheduledAttempt.attemptState === "skipped") {
    const needsAttention =
      latestScheduledAttempt.skipReasonCode === "CONFIGURATION_MISSING" ||
      latestScheduledAttempt.skipReasonCode === "CONFIGURATION_INVALID" ||
      (latestScheduledAttempt.skipReasonCode === "BEFORE_GENERATION_TIME" &&
        input.expectedToHaveRunByNow === true);

    return {
      status: needsAttention ? "attention" : "waiting",
      expectedToHaveRunByNow: input.expectedToHaveRunByNow,
      needsAttention,
      managerMessage: latestScheduledAttempt.managerMessage,
      nextStepMessage: needsAttention
        ? "Fix the scheduler configuration or verify another scheduled run will still occur."
        : "No action is needed unless the board should already exist.",
      latestScheduledAttempt,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason,
      boardGenerationStatus
    };
  }

  if (latestScheduledAttempt.attemptState === "succeeded") {
    return {
      status: "healthy",
      expectedToHaveRunByNow: input.expectedToHaveRunByNow,
      needsAttention: false,
      managerMessage: latestScheduledAttempt.managerMessage,
      nextStepMessage: "No action is needed unless you want to review or retry the board manually.",
      latestScheduledAttempt,
      latestManualRun: latestManualRunRead,
      lastSuccess: lastSuccessRead,
      lastFailure: schedulerFailure,
      latestSkipReason,
      boardGenerationStatus
    };
  }

  return {
    status: input.expectedToHaveRunByNow ? "attention" : "waiting",
    expectedToHaveRunByNow: input.expectedToHaveRunByNow,
    needsAttention: Boolean(input.expectedToHaveRunByNow),
    managerMessage: latestScheduledAttempt.managerMessage,
    nextStepMessage: input.expectedToHaveRunByNow
      ? "Confirm the scheduled request completed and generate the board manually if needed."
      : "Wait for the scheduled request to finish.",
    latestScheduledAttempt,
    latestManualRun: latestManualRunRead,
    lastSuccess: lastSuccessRead,
    lastFailure: schedulerFailure,
    latestSkipReason,
    boardGenerationStatus
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
  tasks: BoardReadTask[],
  latestGeneration: LatestGenerationStatus | null
): BoardReadModel {
  return {
    id: boardDay.id,
    date: boardDate,
    generationStatus: boardDay.generationStatus,
    generatedAt: boardDay.generatedAt?.toISOString() ?? null,
    latestGeneration: toBoardReadLatestGeneration(latestGeneration),
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
  const generationTasksRepository =
    dependencies.generationTasksRepository ??
    (dependencies.repository ? null : createGenerationTasksRepository());
  const schedulerAttemptsRepository =
    dependencies.schedulerAttemptsRepository ??
    (dependencies.repository ? null : createSchedulerAttemptsRepository());
  const now = dependencies.now ?? (() => new Date());
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);
  const generationStatuses = generationTasksRepository
    ? await listLatestGenerationStatusesForDate(normalizedBoardDate, generationTasksRepository)
    : [];
  const latestGeneration = generationStatuses[0] ?? null;
  const schedulerAttempts = schedulerAttemptsRepository
    ? await listSchedulerAttemptsForDate(normalizedBoardDate, schedulerAttemptsRepository)
    : [];
  let expectedToHaveRunByNow: boolean | null = null;
  let settingsErrorMessage: string | null = null;

  if (dependencies.appSettingsRepository || !dependencies.repository) {
    try {
      const settings = await getGenerationSettings(dependencies.appSettingsRepository);

      expectedToHaveRunByNow = deriveExpectedToHaveRunByNow({
        boardDate: normalizedBoardDate,
        now: now(),
        timezone: settings.timezone,
        dailyGenerationTime: settings.dailyGenerationTime,
        businessDays: settings.businessDays
      });
    } catch (error) {
      settingsErrorMessage =
        error instanceof Error
          ? error.message
          : "Unable to validate the configured scheduler run window.";
    }
  }

  const tasks = boardDay ? (await repository.listTasksForBoardDay(boardDay.id)).map(toTaskSummary) : [];
  const board = boardDay ? toBoardReadModel(boardDay, normalizedBoardDate, tasks, latestGeneration) : null;
  const schedulerHealth = buildSchedulerHealth({
    boardDate: normalizedBoardDate,
    board,
    generationStatuses,
    schedulerAttempts,
    expectedToHaveRunByNow,
    settingsErrorMessage
  });

  if (!boardDay) {
    return {
      date: normalizedBoardDate,
      board: null,
      schedulerHealth
    };
  }

  return {
    date: normalizedBoardDate,
    board,
    schedulerHealth
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
