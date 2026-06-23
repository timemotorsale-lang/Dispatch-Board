import {
  ActivityEventType,
  GenerationRunStatus,
  GenerationTriggerType,
  type GenerationRun,
  type WorkflowArea
} from "@prisma/client";

import {
  createGenerationTasksRepository,
  type CreateGeneratedTaskInput,
  type CreatedGeneratedTaskRecord,
  type GenerationRunRecord,
  type GenerationTasksRepository
} from "@/server/repositories/generation-tasks-repository";
import {
  loadGenerationInputsForDate,
  type GenerationInput,
  type GenerationInputWarning
} from "@/server/services/generation-inputs";
import { recommendAssignment } from "@/server/services/assignment-recommendation";
import { normalizeBoardDate } from "@/server/validation/board-date";

export type { GenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";

export type CreateMissingGeneratedTasksOptions = {
  createdByUserId?: string | null;
  triggeredBy?: GenerationTriggerType | "manual" | "scheduled";
  triggeredByUserId?: string | null;
};

export type CreateMissingGeneratedTasksDependencies = {
  repository?: GenerationTasksRepository;
  loadGenerationInputs?: (boardDate: string) => Promise<GenerationInput>;
  now?: () => Date;
};

export type CreatedGeneratedTaskReference = {
  id: string;
  title: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  recommendationReasonCode: string | null;
  recommendationReasonText: string | null;
  recommendationReviewNeeded: boolean;
  dueAt: Date;
  sourceTemplateId: string | null;
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
};

export type CreateMissingGeneratedTasksSummary = {
  generationRunId: string;
  generationRunStatus: GenerationRunStatus;
  boardDate: string;
  boardDayId: string;
  totalCandidatesConsidered: number;
  createdTaskCount: number;
  skippedExistingTaskCount: number;
  createdTasks: CreatedGeneratedTaskReference[];
  warnings: GenerationInputWarning[];
};

export type GenerationRunFailureContext = {
  generationRunId: string;
  generationRunStatus: GenerationRunStatus;
  safeErrorMessage: string;
};

export type GenerationRunSummary = Pick<
  GenerationRun,
  "id" | "startedAt" | "finishedAt" | "status" | "triggeredBy" | "triggeredByUserId" | "summary" | "errorMessage"
> & {
  boardDate: string;
};

type GeneratedTaskCandidate = CreateGeneratedTaskInput & {
  identityKey: string;
};

type NormalizedTriggerMetadata = {
  triggeredBy: GenerationTriggerType;
  triggeredByUserId: string | null;
};

type GenerationFailureSummary = {
  boardDate: string;
  triggeredBy: "manual" | "scheduled";
  triggeredByUserId: string | null;
  phase: string;
  durationMs: number;
  errorName: string;
  boardDayId: string | null;
  usersConsidered: number;
  templatesConsidered: number;
  tasksCreated: number;
  tasksSkippedAsDuplicates: number;
  tasksAlreadyExisting: number;
  manualTasksPreserved: number | null;
};

function buildGeneratedTaskIdentityKey(boardDayId: string, sourceTemplateId: string, assignedUserId: string) {
  return `${boardDayId}:${sourceTemplateId}:${assignedUserId}`;
}

function toDueAt(boardDate: string, defaultDueTime: string) {
  if (!/^\d{2}:\d{2}$/.test(defaultDueTime)) {
    throw new Error("Task template defaultDueTime must use HH:mm format.");
  }

  const dueAt = new Date(`${boardDate}T${defaultDueTime}:00.000Z`);

  if (Number.isNaN(dueAt.getTime())) {
    throw new Error("Task template defaultDueTime must produce a valid due time.");
  }

  return dueAt;
}

function normalizeCreatedByUserId(createdByUserId: string | null | undefined) {
  if (!createdByUserId) {
    return null;
  }

  const normalizedCreatedByUserId = createdByUserId.trim();

  return normalizedCreatedByUserId || null;
}

function normalizeTriggeredBy(triggeredBy: CreateMissingGeneratedTasksOptions["triggeredBy"] | undefined) {
  if (!triggeredBy) {
    return null;
  }

  if (triggeredBy === GenerationTriggerType.MANUAL || triggeredBy === "manual") {
    return GenerationTriggerType.MANUAL;
  }

  if (triggeredBy === GenerationTriggerType.SCHEDULED || triggeredBy === "scheduled") {
    return GenerationTriggerType.SCHEDULED;
  }

  throw new Error("Generation trigger must be manual or scheduled.");
}

function normalizeTriggerMetadata(options: CreateMissingGeneratedTasksOptions): NormalizedTriggerMetadata {
  const normalizedCreatedByUserId = normalizeCreatedByUserId(options.createdByUserId);
  const normalizedTriggeredBy =
    normalizeTriggeredBy(options.triggeredBy) ??
    (normalizedCreatedByUserId ? GenerationTriggerType.MANUAL : GenerationTriggerType.SCHEDULED);
  const normalizedTriggeredByUserId =
    normalizedTriggeredBy === GenerationTriggerType.MANUAL
      ? normalizeCreatedByUserId(options.triggeredByUserId ?? normalizedCreatedByUserId)
      : null;

  return {
    triggeredBy: normalizedTriggeredBy,
    triggeredByUserId: normalizedTriggeredByUserId
  };
}

function toSummaryTrigger(triggeredBy: GenerationTriggerType): "manual" | "scheduled" {
  return triggeredBy === GenerationTriggerType.MANUAL ? "manual" : "scheduled";
}

function toSafeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Generation failed unexpectedly.";
  }

  const normalizedMessage = error.message.replace(/\s+/g, " ").trim();

  if (!normalizedMessage) {
    return "Generation failed unexpectedly.";
  }

  if (/(database_url|postgres(?:ql)?:\/\/|password|secret|api[_-]?key|token)/i.test(normalizedMessage)) {
    return "Generation failed due to a protected internal error.";
  }

  return normalizedMessage.slice(0, 300);
}

function getErrorName(error: unknown) {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

function buildFailureContext(
  generationRunId: string,
  safeErrorMessage: string
): GenerationRunFailureContext {
  return {
    generationRunId,
    generationRunStatus: GenerationRunStatus.FAILED,
    safeErrorMessage
  };
}

function attachGenerationRunFailureContext(
  error: unknown,
  context: GenerationRunFailureContext
): unknown {
  if (error && (typeof error === "object" || typeof error === "function")) {
    Object.assign(error, context);
    return error;
  }

  const wrappedError = new Error(context.safeErrorMessage);
  Object.assign(wrappedError, context, { cause: error });

  return wrappedError;
}

export function getGenerationRunFailureContext(error: unknown): GenerationRunFailureContext | null {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return null;
  }

  const candidate = error as Partial<GenerationRunFailureContext>;

  if (
    typeof candidate.generationRunId !== "string" ||
    candidate.generationRunStatus !== GenerationRunStatus.FAILED ||
    typeof candidate.safeErrorMessage !== "string"
  ) {
    return null;
  }

  return {
    generationRunId: candidate.generationRunId,
    generationRunStatus: candidate.generationRunStatus,
    safeErrorMessage: candidate.safeErrorMessage
  };
}

function toGenerationRunSummary(run: GenerationRunRecord): GenerationRunSummary {
  return {
    id: run.id,
    boardDate: run.boardDate.toISOString().slice(0, 10),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    status: run.status,
    triggeredBy: run.triggeredBy,
    triggeredByUserId: run.triggeredByUserId,
    summary: run.summary,
    errorMessage: run.errorMessage
  };
}

function buildGeneratedTaskCandidates(
  boardDate: string,
  boardDayId: string,
  generationInput: GenerationInput,
  options: CreateMissingGeneratedTasksOptions
) {
  const createdByUserId = normalizeCreatedByUserId(options.createdByUserId);

  return generationInput.users.flatMap<GeneratedTaskCandidate>((user) =>
    user.templates.map((template) => {
      const recommendation = recommendAssignment({
        users: generationInput.users,
        template,
        templateOwnerUserId: user.userId
      });

      return {
        identityKey: buildGeneratedTaskIdentityKey(boardDayId, template.templateId, user.userId),
        boardDayId,
        title: template.title,
        description: template.description ?? "",
        assignedUserId: user.userId,
        recommendedUserId: recommendation.recommendedUserId,
        recommendationReasonCode: recommendation.reasonCode,
        recommendationReasonText: recommendation.explanation,
        recommendationReviewNeeded: recommendation.managerReviewNeeded,
        dueAt: toDueAt(boardDate, template.defaultDueTime),
        createdByUserId,
        requiresManagerApproval: template.requiresManagerApproval,
        sourceTemplateId: template.templateId,
        sourceDutyId: template.dutyId,
        workflowArea: template.workflowArea
      };
    })
  );
}

function toCreatedTaskReference(task: CreatedGeneratedTaskRecord): CreatedGeneratedTaskReference {
  return {
    id: task.id,
    title: task.title,
    assignedUserId: task.assignedUserId,
    recommendedUserId: task.recommendedUserId,
    recommendationReasonCode: task.recommendationReasonCode,
    recommendationReasonText: task.recommendationReasonText,
    recommendationReviewNeeded: task.recommendationReviewNeeded ?? false,
    dueAt: task.dueAt,
    sourceTemplateId: task.sourceTemplateId,
    sourceDutyId: task.sourceDutyId,
    workflowArea: task.workflowArea
  };
}

export async function createMissingGeneratedTasksForDate(
  boardDate: string,
  options: CreateMissingGeneratedTasksOptions = {},
  dependencies: CreateMissingGeneratedTasksDependencies = {}
): Promise<CreateMissingGeneratedTasksSummary> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createGenerationTasksRepository();
  const loadGenerationInputs = dependencies.loadGenerationInputs ?? loadGenerationInputsForDate;
  const now = dependencies.now ?? (() => new Date());
  const triggerMetadata = normalizeTriggerMetadata(options);
  const startedAt = now();
  const generationRun = await repository.startGenerationRun({
    boardDate: normalizedBoardDate,
    startedAt,
    triggeredBy: triggerMetadata.triggeredBy,
    triggeredByUserId: triggerMetadata.triggeredByUserId,
    summary: {
      boardDate: normalizedBoardDate,
      triggeredBy: toSummaryTrigger(triggerMetadata.triggeredBy),
      triggeredByUserId: triggerMetadata.triggeredByUserId,
      phase: "started"
    }
  });

  let phase = "loading_inputs";
  let boardDayId: string | null = null;
  let usersConsidered = 0;
  let templatesConsidered = 0;
  let tasksCreated = 0;
  let tasksSkippedAsDuplicates = 0;
  let tasksAlreadyExisting = 0;
  let manualTasksPreserved: number | null = null;

  try {
    const generationInput = await loadGenerationInputs(normalizedBoardDate);

    usersConsidered = generationInput.users.length;
    phase = "ensuring_board_day";
    const boardDay = await repository.getOrCreateBoardDay(normalizedBoardDate);

    boardDayId = boardDay.id;
    phase = "building_candidates";
    const taskCandidates = buildGeneratedTaskCandidates(
      normalizedBoardDate,
      boardDay.id,
      generationInput,
      options
    );

    templatesConsidered = taskCandidates.length;
    phase = "loading_existing_tasks";
    const existingTaskKeys = new Set(
      (await repository.listExistingGeneratedTasks(boardDay.id))
        .filter((task) => Boolean(task.sourceTemplateId))
        .map((task) => buildGeneratedTaskIdentityKey(boardDay.id, task.sourceTemplateId!, task.assignedUserId))
    );

    tasksAlreadyExisting = existingTaskKeys.size;
    manualTasksPreserved = await repository.countManualTasks(boardDay.id);

    const createdTasks: CreatedGeneratedTaskReference[] = [];
    phase = "creating_tasks";

    for (const candidate of taskCandidates) {
      if (existingTaskKeys.has(candidate.identityKey)) {
        tasksSkippedAsDuplicates += 1;
        continue;
      }

      const createdTask = await repository.createGeneratedTask(candidate);

      if (!createdTask) {
        existingTaskKeys.add(candidate.identityKey);
        tasksSkippedAsDuplicates += 1;
        continue;
      }

      existingTaskKeys.add(candidate.identityKey);
      tasksCreated += 1;
      createdTasks.push(toCreatedTaskReference(createdTask));
    }

    const finishedAt = now();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const completedSummary = {
      boardDate: normalizedBoardDate,
      boardDayId: boardDay.id,
      triggeredBy: toSummaryTrigger(triggerMetadata.triggeredBy),
      triggeredByUserId: triggerMetadata.triggeredByUserId,
      usersConsidered,
      templatesConsidered,
      tasksCreated,
      tasksSkippedAsDuplicates,
      manualTasksPreserved,
      tasksAlreadyExisting,
      durationMs
    };

    await repository.completeGenerationRun({
      id: generationRun.id,
      finishedAt,
      summary: completedSummary
    });

    await repository.createActivityEvent({
      actorUserId: triggerMetadata.triggeredByUserId,
      boardDayId: boardDay.id,
      eventType: ActivityEventType.DAILY_BOARD_GENERATED,
      message: "Daily board generated",
      metadata: {
        boardDate: normalizedBoardDate,
        duplicatesSkipped: tasksSkippedAsDuplicates,
        generationRunId: generationRun.id,
        manualTasksPreserved,
        tasksAlreadyExisting,
        tasksCreated,
        templatesConsidered,
        triggeredBy: toSummaryTrigger(triggerMetadata.triggeredBy),
        usersConsidered
      },
      taskId: null
    });

    return {
      generationRunId: generationRun.id,
      generationRunStatus: GenerationRunStatus.SUCCEEDED,
      boardDate: normalizedBoardDate,
      boardDayId: boardDay.id,
      totalCandidatesConsidered: taskCandidates.length,
      createdTaskCount: createdTasks.length,
      skippedExistingTaskCount: tasksSkippedAsDuplicates,
      createdTasks,
      warnings: generationInput.warnings
    };
  } catch (error) {
    const finishedAt = now();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const safeErrorMessage = toSafeErrorMessage(error);
    const failureSummary: GenerationFailureSummary = {
      boardDate: normalizedBoardDate,
      triggeredBy: toSummaryTrigger(triggerMetadata.triggeredBy),
      triggeredByUserId: triggerMetadata.triggeredByUserId,
      phase,
      durationMs,
      errorName: getErrorName(error),
      boardDayId,
      usersConsidered,
      templatesConsidered,
      tasksCreated,
      tasksSkippedAsDuplicates,
      tasksAlreadyExisting,
      manualTasksPreserved
    };

    await repository.failGenerationRun({
      id: generationRun.id,
      finishedAt,
      summary: failureSummary,
      errorMessage: safeErrorMessage
    });

    throw attachGenerationRunFailureContext(error, buildFailureContext(generationRun.id, safeErrorMessage));
  }
}

export async function listGenerationRunsForDate(
  boardDate: string,
  repository: Pick<GenerationTasksRepository, "listGenerationRunsForDate"> = createGenerationTasksRepository()
): Promise<GenerationRunSummary[]> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const runs = await repository.listGenerationRunsForDate(normalizedBoardDate);

  return runs.map(toGenerationRunSummary);
}
