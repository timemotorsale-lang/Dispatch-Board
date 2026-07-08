import {
  BoardGenerationStatus,
  GenerationRunStatus,
  GenerationTriggerType,
  type GenerationRun,
  type SchedulerFailureStage,
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
  recommendationExplanation: string | null;
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
  failureCode: GenerationFailureCode;
  failureStage: GenerationFailureStage;
  failureDiagnostic: GenerationFailureDiagnostic;
  safeErrorMessage: string;
};

export type GenerationFailureCode =
  | "INPUT_LOADING_FAILED"
  | "BOARD_DAY_PREPARATION_FAILED"
  | "CANDIDATE_BUILD_FAILED"
  | "EXISTING_TASK_LOOKUP_FAILED"
  | "TASK_CREATION_FAILED"
  | "BOARD_FINALIZATION_FAILED"
  | "UNKNOWN_INTERNAL_FAILURE";

export type GenerationFailureStage = SchedulerFailureStage;

const SCHEDULER_FAILURE_STAGE = {
  PREFLIGHT: "PREFLIGHT",
  GENERATION_RUN: "GENERATION_RUN",
  POST_RUN_FINALIZE: "POST_RUN_FINALIZE"
} as const satisfies Record<string, GenerationFailureStage>;

export type GenerationFailureDiagnostic = {
  failureCode: GenerationFailureCode;
  failureStage: GenerationFailureStage;
  phase: string;
  safeErrorMessage: string;
  errorName: string;
  durationMs: number;
  boardDayId: string | null;
  usersConsidered: number;
  templatesConsidered: number;
  tasksCreated: number;
  tasksSkippedAsDuplicates: number;
  tasksAlreadyExisting: number;
  manualTasksPreserved: number | null;
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

type RecommendationDetails = {
  reasonCode: string | null;
  explanation: string | null;
};

type NormalizedTriggerMetadata = {
  triggeredBy: GenerationTriggerType;
  triggeredByUserId: string | null;
};

type GenerationFailureSummary = {
  boardDate: string;
  triggeredBy: "manual" | "scheduled";
  triggeredByUserId: string | null;
  failureCode: GenerationFailureCode;
  failureStage: GenerationFailureStage;
  phase: string;
  safeErrorMessage: string;
  durationMs: number;
  errorName: string;
  boardDayId: string | null;
  usersConsidered: number;
  templatesConsidered: number;
  tasksCreated: number;
  tasksSkippedAsDuplicates: number;
  tasksAlreadyExisting: number;
  manualTasksPreserved: number | null;
  failureDiagnostic: GenerationFailureDiagnostic;
};

function buildGeneratedTaskIdentityKey(boardDayId: string, sourceTemplateId: string, assignedUserId: string) {
  return `${boardDayId}:${sourceTemplateId}:${assignedUserId}`;
}

function buildTemplateSnapshot(template: GenerationInput["users"][number]["templates"][number]) {
  return {
    templateId: template.templateId,
    title: template.title,
    description: template.description,
    templateCategory: template.templateCategory,
    workflowArea: template.workflowArea,
    priority: template.priority,
    defaultDueTime: template.defaultDueTime,
    requiresManagerApproval: template.requiresManagerApproval,
    requiredUpdateFields: template.requiredUpdateFields,
    checklistItems: template.checklistItems,
    completionCriteria: template.completionCriteria,
    defaultStatusRules: template.defaultStatusRules,
    approvalRules: template.approvalRules,
    intelligenceSignalType: template.intelligenceSignalType,
    taskCardDisplayHints: template.taskCardDisplayHints,
    roleId: template.roleId,
    roleName: template.roleName,
    dutyId: template.dutyId,
    dutyName: template.dutyName
  };
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

function buildRecommendationDetails(
  user: GenerationInput["users"][number],
  template: GenerationInput["users"][number]["templates"][number]
) {
  if (template.matchedByDuty && template.dutyId && template.dutyName) {
    if (user.dutySource === "role_default" && template.roleId && template.roleName) {
      return {
        reasonCode: "ROLE_DEFAULT_DUTY_MATCH",
        explanation: `Recommended because this task matches the ${template.dutyName} duty provided by the ${template.roleName} role.`
      } satisfies RecommendationDetails;
    }

    return {
      reasonCode: "DIRECT_DUTY_MATCH",
      explanation: `Recommended because this task matches the direct duty ${template.dutyName}.`
    } satisfies RecommendationDetails;
  }

  if (template.matchedByRole && template.roleName) {
    return {
      reasonCode: "ROLE_MATCH",
      explanation: `Recommended because this task template is tied to the ${template.roleName} role.`
    } satisfies RecommendationDetails;
  }

  return {
    reasonCode: null,
    explanation: null
  } satisfies RecommendationDetails;
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
  failureCode: GenerationFailureCode,
  failureStage: GenerationFailureStage,
  failureDiagnostic: GenerationFailureDiagnostic,
  safeErrorMessage: string
): GenerationRunFailureContext {
  return {
    generationRunId,
    generationRunStatus: GenerationRunStatus.FAILED,
    failureCode,
    failureStage,
    failureDiagnostic,
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
    typeof candidate.failureCode !== "string" ||
    typeof candidate.failureStage !== "string" ||
    !candidate.failureDiagnostic ||
    typeof candidate.failureDiagnostic !== "object" ||
    typeof candidate.safeErrorMessage !== "string"
  ) {
    return null;
  }

  return {
    generationRunId: candidate.generationRunId,
    generationRunStatus: candidate.generationRunStatus,
    failureCode: candidate.failureCode as GenerationFailureCode,
    failureStage: candidate.failureStage as GenerationFailureStage,
    failureDiagnostic: candidate.failureDiagnostic as GenerationFailureDiagnostic,
    safeErrorMessage: candidate.safeErrorMessage
  };
}

function classifyFailurePhase(phase: string): {
  failureCode: GenerationFailureCode;
  failureStage: GenerationFailureStage;
} {
  switch (phase) {
    case "loading_inputs":
      return {
        failureCode: "INPUT_LOADING_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
    case "ensuring_board_day":
    case "marking_board_day_in_progress":
      return {
        failureCode: "BOARD_DAY_PREPARATION_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
    case "building_candidates":
      return {
        failureCode: "CANDIDATE_BUILD_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
    case "loading_existing_tasks":
      return {
        failureCode: "EXISTING_TASK_LOOKUP_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
    case "creating_tasks":
      return {
        failureCode: "TASK_CREATION_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
    case "marking_board_day_generated":
      return {
        failureCode: "BOARD_FINALIZATION_FAILED",
        failureStage: SCHEDULER_FAILURE_STAGE.POST_RUN_FINALIZE
      };
    default:
      return {
        failureCode: "UNKNOWN_INTERNAL_FAILURE",
        failureStage: SCHEDULER_FAILURE_STAGE.GENERATION_RUN
      };
  }
}

function buildFailureDiagnostic(input: {
  failureCode: GenerationFailureCode;
  failureStage: GenerationFailureStage;
  phase: string;
  safeErrorMessage: string;
  errorName: string;
  durationMs: number;
  boardDayId: string | null;
  usersConsidered: number;
  templatesConsidered: number;
  tasksCreated: number;
  tasksSkippedAsDuplicates: number;
  tasksAlreadyExisting: number;
  manualTasksPreserved: number | null;
}): GenerationFailureDiagnostic {
  return {
    failureCode: input.failureCode,
    failureStage: input.failureStage,
    phase: input.phase,
    safeErrorMessage: input.safeErrorMessage,
    errorName: input.errorName,
    durationMs: input.durationMs,
    boardDayId: input.boardDayId,
    usersConsidered: input.usersConsidered,
    templatesConsidered: input.templatesConsidered,
    tasksCreated: input.tasksCreated,
    tasksSkippedAsDuplicates: input.tasksSkippedAsDuplicates,
    tasksAlreadyExisting: input.tasksAlreadyExisting,
    manualTasksPreserved: input.manualTasksPreserved
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
      const recommendation = buildRecommendationDetails(user, template);

      return {
        identityKey: buildGeneratedTaskIdentityKey(boardDayId, template.templateId, user.userId),
        boardDayId,
        title: template.title,
        description: template.description ?? "",
        assignedUserId: user.userId,
        recommendedUserId: user.userId,
        recommendationReasonCode: recommendation.reasonCode,
        recommendationExplanation: recommendation.explanation,
        dueAt: toDueAt(boardDate, template.defaultDueTime),
        createdByUserId,
        requiresManagerApproval: template.requiresManagerApproval,
        sourceTemplateId: template.templateId,
        templateSnapshot: buildTemplateSnapshot(template),
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
    recommendationExplanation: task.recommendationExplanation,
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
  let boardWasGeneratedBeforeAttempt = false;
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
    boardWasGeneratedBeforeAttempt =
      boardDay.generationStatus === BoardGenerationStatus.GENERATED || boardDay.generatedAt !== null;

    if (!boardWasGeneratedBeforeAttempt) {
      phase = "marking_board_day_in_progress";
      await repository.markBoardDayGenerationStarted(boardDay.id);
    }

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

    phase = "marking_board_day_generated";
    await repository.markBoardDayGenerationSucceeded({
      boardDayId: boardDay.id,
      generatedAt: finishedAt,
      generatedByUserId: triggerMetadata.triggeredByUserId
    });

    await repository.completeGenerationRun({
      id: generationRun.id,
      finishedAt,
      summary: completedSummary
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
    const { failureCode, failureStage } = classifyFailurePhase(phase);
    const failureDiagnostic = buildFailureDiagnostic({
      failureCode,
      failureStage,
      phase,
      safeErrorMessage,
      errorName: getErrorName(error),
      durationMs,
      boardDayId,
      usersConsidered,
      templatesConsidered,
      tasksCreated,
      tasksSkippedAsDuplicates,
      tasksAlreadyExisting,
      manualTasksPreserved
    });
    const failureSummary: GenerationFailureSummary = {
      boardDate: normalizedBoardDate,
      triggeredBy: toSummaryTrigger(triggerMetadata.triggeredBy),
      triggeredByUserId: triggerMetadata.triggeredByUserId,
      failureCode,
      failureStage,
      phase,
      safeErrorMessage,
      durationMs,
      errorName: failureDiagnostic.errorName,
      boardDayId,
      usersConsidered,
      templatesConsidered,
      tasksCreated,
      tasksSkippedAsDuplicates,
      tasksAlreadyExisting,
      manualTasksPreserved,
      failureDiagnostic
    };

    if (boardDayId && !boardWasGeneratedBeforeAttempt) {
      try {
        await repository.markBoardDayGenerationFailed(boardDayId);
      } catch {
        // Preserve the original failure while making a best effort to reflect board state.
      }
    }

    await repository.failGenerationRun({
      id: generationRun.id,
      finishedAt,
      summary: failureSummary,
      errorMessage: safeErrorMessage
    });

    throw attachGenerationRunFailureContext(
      error,
      buildFailureContext(
        generationRun.id,
        failureCode,
        failureStage,
        failureDiagnostic,
        safeErrorMessage
      )
    );
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
