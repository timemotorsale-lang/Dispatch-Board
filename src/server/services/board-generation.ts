import { BusinessDay, GenerationRunStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageBoardGeneration } from "@/server/policies/access";
import { createGenerationTasksRepository } from "@/server/repositories/generation-tasks-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { generateStaffDayPlansForBoardDate } from "@/server/services/staff-day";
import { generateDailyCarryoverForBoardDate } from "@/server/services/daily-carryover";
import {
  getGenerationSettings,
  type GenerationSettings
} from "@/server/services/app-settings-service";
import {
  createMissingGeneratedTasksForDate,
  type GenerationFailureCode,
  type GenerationFailureDiagnostic,
  type GenerationFailureStage,
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
  skipReasonCode: ScheduledSkipReasonCode | null;
  summary: string | null;
  errorMessage: string | null;
  failureCode: GenerationFailureCode | null;
  failureStage: GenerationFailureStage | null;
  failureDiagnostic: GenerationFailureDiagnostic | null;
  latestGeneration: LatestGenerationStatus | null;
};

export type ScheduledSkipReasonCode =
  | "NON_BUSINESS_DAY"
  | "BEFORE_GENERATION_TIME"
  | "ALREADY_GENERATED"
  | "CONFIGURATION_MISSING"
  | "CONFIGURATION_INVALID";

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
  failureCode: GenerationFailureCode | null;
  failureStage: GenerationFailureStage | null;
  failureDiagnostic: GenerationFailureDiagnostic | null;
};

export type ManualBoardGenerationResult =
  | (BoardGenerationSharedResult & {
      status: "success";
    })
  | (BoardGenerationSharedResult & {
      status: "failed";
    });

export type ScheduledBoardGenerationResult =
  | ManualBoardGenerationResult
  | (BoardGenerationSharedResult & {
      status: "skipped";
    });

export type TriggerManualBoardGenerationDependencies = {
  repository?: GenerationTasksRepository;
  now?: () => Date;
  loadGenerationInputs?: CreateMissingGeneratedTasksDependencies["loadGenerationInputs"];
  generateStaffDayPlans?: typeof generateStaffDayPlansForBoardDate;
  generateDailyCarryover?: typeof generateDailyCarryoverForBoardDate;
};

export type TriggerScheduledBoardGenerationDependencies = TriggerManualBoardGenerationDependencies & {
  getGenerationSettings?: () => Promise<GenerationSettings>;
};

type TriggerBoardGenerationOptions = {
  boardDate: string;
  createdByUserId: string | null;
  triggeredBy: "manual" | "scheduled";
  triggeredByUserId: string | null;
};

const weekdayByIndex = [
  BusinessDay.SUNDAY,
  BusinessDay.MONDAY,
  BusinessDay.TUESDAY,
  BusinessDay.WEDNESDAY,
  BusinessDay.THURSDAY,
  BusinessDay.FRIDAY,
  BusinessDay.SATURDAY
] as const;

const configurationMissingPattern =
  /(not configured|require(?:s|d)?\s+(?:a|at least one|valid)?\s*(?:timezone|daily generation time|business day)|missing)/i;
const configurationInvalidPattern =
  /(invalid|must use HH:mm|must be valid|unable to resolve local time|invalid time zone specified)/i;

function getTimePart(parts: Intl.DateTimeFormatPart[], type: "hour" | "minute") {
  return parts.find((part) => part.type === type)?.value ?? "";
}

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readFailureDiagnostic(summary: GenerationRunSummary["summary"]): GenerationFailureDiagnostic | null {
  const summaryObject = readSummaryObject(summary);
  const value = summaryObject?.failureDiagnostic;

  if (!isPlainObject(value)) {
    return null;
  }

  const failureCode = typeof value.failureCode === "string" ? value.failureCode.trim() : "";
  const failureStage = typeof value.failureStage === "string" ? value.failureStage.trim() : "";
  const phase = typeof value.phase === "string" ? value.phase.trim() : "";
  const safeErrorMessage =
    typeof value.safeErrorMessage === "string" ? value.safeErrorMessage.trim() : "";
  const errorName = typeof value.errorName === "string" ? value.errorName.trim() : "";
  const durationMs = value.durationMs;
  const boardDayId = typeof value.boardDayId === "string" && value.boardDayId.trim() ? value.boardDayId : null;
  const usersConsidered = value.usersConsidered;
  const templatesConsidered = value.templatesConsidered;
  const tasksCreated = value.tasksCreated;
  const tasksSkippedAsDuplicates = value.tasksSkippedAsDuplicates;
  const tasksAlreadyExisting = value.tasksAlreadyExisting;
  const manualTasksPreserved = value.manualTasksPreserved;

  if (
    !failureCode ||
    !failureStage ||
    !phase ||
    !safeErrorMessage ||
    !errorName ||
    typeof durationMs !== "number" ||
    !Number.isFinite(durationMs) ||
    typeof usersConsidered !== "number" ||
    !Number.isFinite(usersConsidered) ||
    typeof templatesConsidered !== "number" ||
    !Number.isFinite(templatesConsidered) ||
    typeof tasksCreated !== "number" ||
    !Number.isFinite(tasksCreated) ||
    typeof tasksSkippedAsDuplicates !== "number" ||
    !Number.isFinite(tasksSkippedAsDuplicates) ||
    typeof tasksAlreadyExisting !== "number" ||
    !Number.isFinite(tasksAlreadyExisting) ||
    (manualTasksPreserved !== null &&
      (typeof manualTasksPreserved !== "number" || !Number.isFinite(manualTasksPreserved)))
  ) {
    return null;
  }

  return {
    failureCode: failureCode as GenerationFailureCode,
    failureStage: failureStage as GenerationFailureStage,
    phase,
    safeErrorMessage,
    errorName,
    durationMs,
    boardDayId,
    usersConsidered,
    templatesConsidered,
    tasksCreated,
    tasksSkippedAsDuplicates,
    tasksAlreadyExisting,
    manualTasksPreserved
  };
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

function readFailureCode(summary: GenerationRunSummary["summary"]) {
  const failureDiagnostic = readFailureDiagnostic(summary);

  if (failureDiagnostic) {
    return failureDiagnostic.failureCode;
  }

  const value = readSummaryText(summary, "failureCode");

  return value ? (value as GenerationFailureCode) : null;
}

function readFailureStage(summary: GenerationRunSummary["summary"]) {
  const failureDiagnostic = readFailureDiagnostic(summary);

  if (failureDiagnostic) {
    return failureDiagnostic.failureStage;
  }

  const value = readSummaryText(summary, "failureStage");

  return value ? (value as GenerationFailureStage) : null;
}

function toLatestGenerationStatus(run: GenerationRunSummary): LatestGenerationStatus {
  const failureDiagnostic = readFailureDiagnostic(run.summary);

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
    errorMessage: run.errorMessage,
    failureCode: readFailureCode(run.summary),
    failureStage: readFailureStage(run.summary),
    failureDiagnostic
  };
}

function normalizeFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to generate the board right now.";
  }

  const normalizedMessage = error.message.replace(/\s+/g, " ").trim();

  return normalizedMessage || "Unable to generate the board right now.";
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day") {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getBoardDateInTimeZone(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(now);

  return `${getDatePart(parts, "year")}-${getDatePart(parts, "month")}-${getDatePart(parts, "day")}`;
}

function getMinutesSinceMidnightInTimeZone(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(now);
  const hours = Number.parseInt(getTimePart(parts, "hour"), 10);
  const minutes = Number.parseInt(getTimePart(parts, "minute"), 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Unable to resolve local time in ${timeZone}.`);
  }

  return hours * 60 + minutes;
}

function parseDailyGenerationTime(dailyGenerationTime: string) {
  const [hoursText, minutesText] = dailyGenerationTime.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid daily generation time "${dailyGenerationTime}".`);
  }

  return hours * 60 + minutes;
}

function getFallbackBoardDate(now: Date) {
  return getBoardDateInTimeZone(now, "America/Chicago");
}

function classifyScheduledConfigurationSkipReason(error: unknown): ScheduledSkipReasonCode | null {
  const message = error instanceof Error ? error.message.replace(/\s+/g, " ").trim() : "";

  if (!message) {
    return null;
  }

  if (configurationMissingPattern.test(message)) {
    return "CONFIGURATION_MISSING";
  }

  if (configurationInvalidPattern.test(message)) {
    return "CONFIGURATION_INVALID";
  }

  return null;
}

function createScheduledSkipResult(input: {
  boardDate: string;
  generationRunId?: string | null;
  createdTaskCount?: number | null;
  skippedExistingTaskCount?: number | null;
  alreadyExistingTaskCount?: number | null;
  skipReasonCode: ScheduledSkipReasonCode;
  summary: string;
  latestGeneration?: LatestGenerationStatus | null;
}): ScheduledBoardGenerationResult {
  return {
    status: "skipped",
    boardDate: input.boardDate,
    generationRunId: input.generationRunId ?? null,
    createdTaskCount: input.createdTaskCount ?? 0,
    skippedExistingTaskCount: input.skippedExistingTaskCount ?? 0,
    alreadyExistingTaskCount: input.alreadyExistingTaskCount ?? null,
    skipReasonCode: input.skipReasonCode,
    summary: input.summary,
    errorMessage: null,
    failureCode: null,
    failureStage: null,
    failureDiagnostic: null,
    latestGeneration: input.latestGeneration ?? null
  };
}

function createScheduledConfigurationSkipResult(
  scheduledAttemptedAt: Date,
  error: unknown
): ScheduledBoardGenerationResult | null {
  const skipReasonCode = classifyScheduledConfigurationSkipReason(error);

  if (!skipReasonCode) {
    return null;
  }

  const boardDate = getFallbackBoardDate(scheduledAttemptedAt);
  const summary =
    skipReasonCode === "CONFIGURATION_MISSING"
      ? "Skipped scheduled generation because required scheduler or app configuration is missing."
      : "Skipped scheduled generation because scheduler or app configuration is invalid.";

  return createScheduledSkipResult({
    boardDate,
    skipReasonCode,
    summary
  });
}

function getBusinessDayForBoardDate(boardDate: string) {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const utcDay = new Date(`${normalizedBoardDate}T00:00:00.000Z`).getUTCDay();

  return weekdayByIndex[utcDay];
}

async function runBoardGenerationForDate(
  options: TriggerBoardGenerationOptions,
  dependencies: TriggerManualBoardGenerationDependencies = {}
): Promise<ManualBoardGenerationResult> {
  const normalizedBoardDate = normalizeBoardDate(options.boardDate);
  const repository = dependencies.repository ?? createGenerationTasksRepository();

  try {
    const result = await createMissingGeneratedTasksForDate(
      normalizedBoardDate,
      {
        createdByUserId: options.createdByUserId,
        triggeredBy: options.triggeredBy,
        triggeredByUserId: options.triggeredByUserId
      },
      {
        repository,
        now: dependencies.now,
        loadGenerationInputs: dependencies.loadGenerationInputs
      }
    );
    const latestGeneration = await getLatestGenerationStatusForDate(normalizedBoardDate, repository);
    let staffDayGeneratedCount = 0;

    try {
      const staffDayResult = await (dependencies.generateStaffDayPlans ?? generateStaffDayPlansForBoardDate)(
        normalizedBoardDate
      );
      staffDayGeneratedCount = staffDayResult.generatedCount;

      if (staffDayResult.enabled && repository.supportsActivityEvents) {
        await recordBoardActivityEvent({
          boardDayId: result.boardDayId,
          actorUserId: options.triggeredByUserId,
          eventType: "staff_day.generated",
          message: `${staffDayGeneratedCount} staff-day plan${staffDayGeneratedCount === 1 ? "" : "s"} prepared for ${normalizedBoardDate}.`,
          metadata: { boardDate: normalizedBoardDate, generatedCount: staffDayGeneratedCount }
        });
      }
    } catch {
      // Staff execution is feature-flagged foundation work and must not invalidate a generated board.
    }
    try {
      await (dependencies.generateDailyCarryover ?? generateDailyCarryoverForBoardDate)(normalizedBoardDate, result.boardDayId);
    } catch {
      // Carryover is feature-flagged and cannot invalidate normal board generation.
    }

    if (repository.supportsActivityEvents) {
      await recordBoardActivityEvent({
        boardDayId: result.boardDayId,
        actorUserId: options.triggeredByUserId,
        eventType: "board.generated",
        message:
          options.triggeredBy === "manual"
            ? `Board generated manually for ${normalizedBoardDate}.`
            : `Board generated automatically for ${normalizedBoardDate}.`,
        metadata: {
          createdTaskCount: result.createdTaskCount,
          staffDayGeneratedCount,
          skippedExistingTaskCount: result.skippedExistingTaskCount,
          triggeredBy: options.triggeredBy
        }
      });
    }

    return {
      status: "success",
      boardDate: normalizedBoardDate,
      generationRunId: result.generationRunId,
      createdTaskCount: result.createdTaskCount,
      skippedExistingTaskCount: result.skippedExistingTaskCount,
      alreadyExistingTaskCount:
        latestGeneration?.alreadyExistingTaskCount ?? result.skippedExistingTaskCount,
      skipReasonCode: null,
      summary: latestGeneration?.summary ?? null,
      errorMessage: null,
      failureCode: null,
      failureStage: null,
      failureDiagnostic: null,
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
      skipReasonCode: null,
      summary: latestGeneration?.summary ?? null,
      errorMessage: failureContext?.safeErrorMessage ?? normalizeFailureMessage(error),
      failureCode: failureContext?.failureCode ?? latestGeneration?.failureCode ?? null,
      failureStage: failureContext?.failureStage ?? latestGeneration?.failureStage ?? null,
      failureDiagnostic:
        failureContext?.failureDiagnostic ?? latestGeneration?.failureDiagnostic ?? null,
      latestGeneration
    };
  }
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

export async function listLatestGenerationStatusesForDate(
  boardDate: string,
  repository: Pick<GenerationTasksRepository, "listGenerationRunsForDate"> = createGenerationTasksRepository()
): Promise<LatestGenerationStatus[]> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const runs = await listGenerationRunsForDate(normalizedBoardDate, repository);

  return runs.map(toLatestGenerationStatus);
}

export async function triggerManualBoardGeneration(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: TriggerManualBoardGenerationDependencies = {}
): Promise<ManualBoardGenerationResult> {
  const manager = assertCanManageBoardGeneration(user);

  return runBoardGenerationForDate(
    {
      boardDate,
      createdByUserId: manager.id,
      triggeredBy: "manual",
      triggeredByUserId: manager.id
    },
    dependencies
  );
}

export async function triggerScheduledBoardGeneration(
  dependencies: TriggerScheduledBoardGenerationDependencies = {}
): Promise<ScheduledBoardGenerationResult> {
  const now = dependencies.now ?? (() => new Date());
  const loadSettings = dependencies.getGenerationSettings ?? getGenerationSettings;
  const scheduledAttemptedAt = now();
  let settings: GenerationSettings;

  try {
    settings = await loadSettings();
  } catch (error) {
    const configurationSkipResult = createScheduledConfigurationSkipResult(
      scheduledAttemptedAt,
      error
    );

    if (configurationSkipResult) {
      return configurationSkipResult;
    }

    throw error;
  }

  let boardDate: string;
  let boardBusinessDay: BusinessDay;

  try {
    boardDate = getBoardDateInTimeZone(scheduledAttemptedAt, settings.timezone);
    boardBusinessDay = getBusinessDayForBoardDate(boardDate);
  } catch (error) {
    const configurationSkipResult = createScheduledConfigurationSkipResult(
      scheduledAttemptedAt,
      error
    );

    if (configurationSkipResult) {
      return configurationSkipResult;
    }

    throw error;
  }

  if (!settings.businessDays.includes(boardBusinessDay)) {
    return createScheduledSkipResult({
      boardDate,
      skipReasonCode: "NON_BUSINESS_DAY",
      summary: `Skipped scheduled generation because ${boardBusinessDay.toLowerCase()} is not configured as a business day.`
    });
  }

  const latestGeneration = await getLatestGenerationStatusForDate(
    boardDate,
    dependencies.repository ?? createGenerationTasksRepository()
  );

  if (latestGeneration?.status === "success") {
    return createScheduledSkipResult({
      boardDate,
      generationRunId: latestGeneration.generationRunId,
      createdTaskCount: latestGeneration.createdTaskCount,
      skippedExistingTaskCount: latestGeneration.skippedExistingTaskCount,
      alreadyExistingTaskCount: latestGeneration.alreadyExistingTaskCount,
      skipReasonCode: "ALREADY_GENERATED",
      summary: `Skipped scheduled generation because the board for ${boardDate} is already generated.`,
      latestGeneration
    });
  }

  let currentLocalMinutes: number;

  try {
    currentLocalMinutes = getMinutesSinceMidnightInTimeZone(scheduledAttemptedAt, settings.timezone);
  } catch (error) {
    const configurationSkipResult = createScheduledConfigurationSkipResult(
      scheduledAttemptedAt,
      error
    );

    if (configurationSkipResult) {
      return configurationSkipResult;
    }

    throw error;
  }
  let configuredGenerationMinutes: number;

  try {
    configuredGenerationMinutes = parseDailyGenerationTime(settings.dailyGenerationTime);
  } catch (error) {
    const configurationSkipResult = createScheduledConfigurationSkipResult(
      scheduledAttemptedAt,
      error
    );

    if (configurationSkipResult) {
      return configurationSkipResult;
    }

    throw error;
  }

  if (currentLocalMinutes < configuredGenerationMinutes) {
    return createScheduledSkipResult({
      boardDate,
      generationRunId: latestGeneration?.generationRunId ?? null,
      createdTaskCount: latestGeneration?.createdTaskCount ?? 0,
      skippedExistingTaskCount: latestGeneration?.skippedExistingTaskCount ?? 0,
      alreadyExistingTaskCount: latestGeneration?.alreadyExistingTaskCount ?? null,
      skipReasonCode: "BEFORE_GENERATION_TIME",
      summary: `Skipped scheduled generation because ${settings.timezone} has not reached the configured daily generation time of ${settings.dailyGenerationTime}.`,
      latestGeneration
    });
  }

  return runBoardGenerationForDate(
    {
      boardDate,
      createdByUserId: null,
      triggeredBy: "scheduled",
      triggeredByUserId: null
    },
    dependencies
  );
}
