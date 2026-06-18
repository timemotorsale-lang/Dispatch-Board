import { GenerationRunStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageBoardGeneration } from "@/server/policies/access";
import { createGenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";
import {
  createMissingGeneratedTasksForDate,
  getGenerationRunFailureContext,
  listGenerationRunsForDate,
  type CreateMissingGeneratedTasksDependencies,
  type GenerationRunSummary,
  type GenerationTasksRepository
} from "@/server/services/generation-tasks";
import { normalizeBoardDate } from "@/server/validation/board-date";

type GenerationRunSummaryObject = Record<string, unknown>;

type BoardGenerationSharedResult = {
  boardDate: string;
  generationRunId: string | null;
  createdTaskCount: number | null;
  skippedExistingTaskCount: number | null;
  alreadyExistingTaskCount: number | null;
  summary: string | null;
  errorMessage: string | null;
  latestGeneration: LatestGenerationStatus | null;
};

export type LatestGenerationStatus = {
  generationRunId: string;
  boardDate: string;
  status: "running" | "success" | "failed";
  triggeredBy: "manual" | "scheduled";
  startedAt: Date;
  finishedAt: Date | null;
  attemptedAt: Date;
  createdTaskCount: number | null;
  skippedExistingTaskCount: number | null;
  alreadyExistingTaskCount: number | null;
  manualTasksPreservedCount: number | null;
  summary: string | null;
  errorMessage: string | null;
};

export type ManualBoardGenerationResult =
  | (BoardGenerationSharedResult & {
      status: "success";
    })
  | (BoardGenerationSharedResult & {
      status: "failed";
    });

export type TriggerManualBoardGenerationDependencies = {
  repository?: GenerationTasksRepository;
  now?: () => Date;
  loadGenerationInputs?: CreateMissingGeneratedTasksDependencies["loadGenerationInputs"];
};

function readSummaryObject(summary: GenerationRunSummary["summary"]): GenerationRunSummaryObject | null {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return null;
  }

  return summary as GenerationRunSummaryObject;
}

function readSummaryNumber(summary: GenerationRunSummary["summary"], key: string) {
  const summaryObject = readSummaryObject(summary);
  const value = summaryObject?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSummaryText(summary: GenerationRunSummary["summary"], key: string) {
  const summaryObject = readSummaryObject(summary);
  const value = summaryObject?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toLatestStatusLabel(status: GenerationRunStatus) {
  if (status === GenerationRunStatus.SUCCEEDED) {
    return "success" as const;
  }

  if (status === GenerationRunStatus.FAILED) {
    return "failed" as const;
  }

  return "running" as const;
}

function buildGenerationSummary(run: GenerationRunSummary) {
  if (run.status === GenerationRunStatus.FAILED) {
    return run.errorMessage ?? readSummaryText(run.summary, "phase");
  }

  const createdTaskCount = readSummaryNumber(run.summary, "tasksCreated");
  const skippedExistingTaskCount = readSummaryNumber(run.summary, "tasksSkippedAsDuplicates");
  const manualTasksPreservedCount = readSummaryNumber(run.summary, "manualTasksPreserved");
  const summaryParts = [
    typeof createdTaskCount === "number" ? `${createdTaskCount} tasks created` : null,
    typeof skippedExistingTaskCount === "number"
      ? `${skippedExistingTaskCount} duplicates skipped`
      : null,
    typeof manualTasksPreservedCount === "number"
      ? `${manualTasksPreservedCount} manual tasks preserved`
      : null
  ].filter((value): value is string => Boolean(value));

  return summaryParts.length > 0 ? summaryParts.join(" • ") : null;
}

function toLatestGenerationStatus(run: GenerationRunSummary): LatestGenerationStatus {
  return {
    generationRunId: run.id,
    boardDate: run.boardDate,
    status: toLatestStatusLabel(run.status),
    triggeredBy: run.triggeredBy === "MANUAL" ? "manual" : "scheduled",
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    attemptedAt: run.finishedAt ?? run.startedAt,
    createdTaskCount: readSummaryNumber(run.summary, "tasksCreated"),
    skippedExistingTaskCount: readSummaryNumber(run.summary, "tasksSkippedAsDuplicates"),
    alreadyExistingTaskCount: readSummaryNumber(run.summary, "tasksAlreadyExisting"),
    manualTasksPreservedCount: readSummaryNumber(run.summary, "manualTasksPreserved"),
    summary: buildGenerationSummary(run),
    errorMessage: run.errorMessage
  };
}

function normalizeFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to generate the board right now.";
  }

  const normalizedMessage = error.message.replace(/\s+/g, " ").trim();

  return normalizedMessage || "Unable to generate the board right now.";
}

export function assertCanManageBoardGeneration(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageBoardGeneration(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

export async function getLatestGenerationStatusForDate(
  boardDate: string,
  repository: Pick<GenerationTasksRepository, "listGenerationRunsForDate"> = createGenerationTasksRepository()
): Promise<LatestGenerationStatus | null> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const [latestRun] = await listGenerationRunsForDate(normalizedBoardDate, repository);

  return latestRun ? toLatestGenerationStatus(latestRun) : null;
}

export async function triggerManualBoardGeneration(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: TriggerManualBoardGenerationDependencies = {}
): Promise<ManualBoardGenerationResult> {
  const manager = assertCanManageBoardGeneration(user);
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createGenerationTasksRepository();

  try {
    const result = await createMissingGeneratedTasksForDate(
      normalizedBoardDate,
      {
        createdByUserId: manager.id,
        triggeredBy: "manual",
        triggeredByUserId: manager.id
      },
      {
        repository,
        now: dependencies.now,
        loadGenerationInputs: dependencies.loadGenerationInputs
      }
    );
    const latestGeneration = await getLatestGenerationStatusForDate(normalizedBoardDate, repository);

    return {
      status: "success",
      boardDate: normalizedBoardDate,
      generationRunId: result.generationRunId,
      createdTaskCount: result.createdTaskCount,
      skippedExistingTaskCount: result.skippedExistingTaskCount,
      alreadyExistingTaskCount:
        latestGeneration?.alreadyExistingTaskCount ?? result.skippedExistingTaskCount,
      summary: latestGeneration?.summary ?? null,
      errorMessage: null,
      latestGeneration
    };
  } catch (error) {
    const failureContext = getGenerationRunFailureContext(error);
    const latestGeneration = await getLatestGenerationStatusForDate(normalizedBoardDate, repository);

    return {
      status: "failed",
      boardDate: normalizedBoardDate,
      generationRunId: failureContext?.generationRunId ?? latestGeneration?.generationRunId ?? null,
      createdTaskCount: latestGeneration?.createdTaskCount ?? null,
      skippedExistingTaskCount: latestGeneration?.skippedExistingTaskCount ?? null,
      alreadyExistingTaskCount: latestGeneration?.alreadyExistingTaskCount ?? null,
      summary: latestGeneration?.summary ?? null,
      errorMessage: failureContext?.safeErrorMessage ?? normalizeFailureMessage(error),
      latestGeneration
    };
  }
}
