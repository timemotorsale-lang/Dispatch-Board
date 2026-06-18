import type { WorkflowArea } from "@prisma/client";

import {
  createGenerationTasksRepository,
  type CreateGeneratedTaskInput,
  type CreatedGeneratedTaskRecord,
  type GenerationTasksRepository
} from "@/server/repositories/generation-tasks-repository";
import {
  loadGenerationInputsForDate,
  type GenerationInput,
  type GenerationInputWarning
} from "@/server/services/generation-inputs";

export type { GenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";

export type CreateMissingGeneratedTasksOptions = {
  createdByUserId?: string | null;
};

export type CreateMissingGeneratedTasksDependencies = {
  repository?: GenerationTasksRepository;
  loadGenerationInputs?: (boardDate: string) => Promise<GenerationInput>;
};

export type CreatedGeneratedTaskReference = {
  id: string;
  title: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  dueAt: Date;
  sourceTemplateId: string | null;
  sourceDutyId: string | null;
  workflowArea: WorkflowArea;
};

export type CreateMissingGeneratedTasksSummary = {
  boardDate: string;
  boardDayId: string;
  totalCandidatesConsidered: number;
  createdTaskCount: number;
  skippedExistingTaskCount: number;
  createdTasks: CreatedGeneratedTaskReference[];
  warnings: GenerationInputWarning[];
};

type GeneratedTaskCandidate = CreateGeneratedTaskInput & {
  identityKey: string;
};

function normalizeBoardDate(boardDate: string) {
  const normalizedBoardDate = boardDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBoardDate)) {
    throw new Error("Board date must use YYYY-MM-DD format.");
  }

  const parsedBoardDate = new Date(`${normalizedBoardDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedBoardDate.getTime()) ||
    parsedBoardDate.toISOString().slice(0, 10) !== normalizedBoardDate
  ) {
    throw new Error("Board date must be a valid calendar date.");
  }

  return normalizedBoardDate;
}

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

function buildGeneratedTaskCandidates(
  boardDate: string,
  boardDayId: string,
  generationInput: GenerationInput,
  options: CreateMissingGeneratedTasksOptions
) {
  const createdByUserId = normalizeCreatedByUserId(options.createdByUserId);

  return generationInput.users.flatMap<GeneratedTaskCandidate>((user) =>
    user.templates.map((template) => ({
      identityKey: buildGeneratedTaskIdentityKey(boardDayId, template.templateId, user.userId),
      boardDayId,
      title: template.title,
      description: template.description ?? "",
      assignedUserId: user.userId,
      recommendedUserId: user.userId,
      dueAt: toDueAt(boardDate, template.defaultDueTime),
      createdByUserId,
      requiresManagerApproval: template.requiresManagerApproval,
      sourceTemplateId: template.templateId,
      sourceDutyId: template.dutyId,
      workflowArea: template.workflowArea
    }))
  );
}

function toCreatedTaskReference(task: CreatedGeneratedTaskRecord): CreatedGeneratedTaskReference {
  return {
    id: task.id,
    title: task.title,
    assignedUserId: task.assignedUserId,
    recommendedUserId: task.recommendedUserId,
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
  const generationInput = await loadGenerationInputs(normalizedBoardDate);
  const boardDay = await repository.getOrCreateBoardDay(normalizedBoardDate);
  const taskCandidates = buildGeneratedTaskCandidates(
    normalizedBoardDate,
    boardDay.id,
    generationInput,
    options
  );
  const existingTaskKeys = new Set(
    (await repository.listExistingGeneratedTasks(boardDay.id))
      .filter((task) => Boolean(task.sourceTemplateId))
      .map((task) => buildGeneratedTaskIdentityKey(boardDay.id, task.sourceTemplateId!, task.assignedUserId))
  );

  const createdTasks: CreatedGeneratedTaskReference[] = [];
  let skippedExistingTaskCount = 0;

  for (const candidate of taskCandidates) {
    if (existingTaskKeys.has(candidate.identityKey)) {
      skippedExistingTaskCount += 1;
      continue;
    }

    const createdTask = await repository.createGeneratedTask(candidate);

    if (!createdTask) {
      existingTaskKeys.add(candidate.identityKey);
      skippedExistingTaskCount += 1;
      continue;
    }

    existingTaskKeys.add(candidate.identityKey);
    createdTasks.push(toCreatedTaskReference(createdTask));
  }

  return {
    boardDate: normalizedBoardDate,
    boardDayId: boardDay.id,
    totalCandidatesConsidered: taskCandidates.length,
    createdTaskCount: createdTasks.length,
    skippedExistingTaskCount,
    createdTasks,
    warnings: generationInput.warnings
  };
}
