import { TaskSourceType, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import { createAppSettingsRepository } from "@/server/repositories/app-settings-repository";
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
import { normalizeAppSettings } from "@/server/validation/app-settings";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type BoardReadUserSummary = {
  id: string;
  name: string;
  email?: string;
};

type BoardReadCollaboratorSummary = BoardReadUserSummary & {
  collaborationScope: string;
  capacityRequested: string | null;
  addedAt: string;
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
  priority: string;
  dueAt: string;
  updatedAt: string;
  workflowArea: string;
  sourceType: string;
  requiresManagerApproval: boolean;
  isClaimable?: boolean;
  requiredUpdateFields: BoardReadRequiredUpdateField[];
  updateFieldValues: Record<string, string | boolean>;
  assignedUser: BoardReadUserSummary;
  ownerUser?: BoardReadUserSummary;
  collaborators?: BoardReadCollaboratorSummary[];
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

export type BoardReadSchedulerGuidanceCode =
  | "healthy"
  | "settings_invalid"
  | "no_scheduled_evidence"
  | "unauthorized_scheduled_request"
  | "scheduled_failed"
  | "scheduled_skipped_before_generation_time"
  | "scheduled_skipped_non_business_day"
  | "scheduled_skipped_already_generated"
  | "scheduled_skipped_configuration"
  | "generation_running"
  | "scheduled_request_in_progress"
  | "unknown";

export type BoardReadSchedulerGuidance = {
  code: BoardReadSchedulerGuidanceCode;
  title: string;
  message: string;
  nextStep: string;
  actionRequired: boolean;
  safeToRetry: boolean;
  retryLabel: string | null;
};

export type BoardReadUnauthorizedSchedulerSummary = {
  count: number;
  latestAttemptId: string;
  latestOccurredAt: string;
  latestReasonCode: string | null;
  repeated: boolean;
  managerMessage: string;
  nextStepMessage: string;
};

export type BoardReadSchedulerReadinessCheckStatus = "ready" | "attention" | "unknown";

export type BoardReadSchedulerReadinessCheck = {
  code:
    | "cron_secret"
    | "generation_timezone"
    | "generation_time"
    | "business_days"
    | "scheduled_evidence";
  label: string;
  status: BoardReadSchedulerReadinessCheckStatus;
  detail: string;
};

export type BoardReadSchedulerReadiness = {
  status: BoardReadSchedulerReadinessCheckStatus;
  summary: string;
  checks: BoardReadSchedulerReadinessCheck[];
};

export type BoardReadSchedulerHealth = {
  status: BoardReadSchedulerHealthStatus;
  expectedToHaveRunByNow: boolean | null;
  needsAttention: boolean;
  managerMessage: string;
  nextStepMessage: string;
  guidance: BoardReadSchedulerGuidance;
  latestScheduledAttempt: SchedulerAttemptEvidence | null;
  latestManualRun: BoardReadLatestGeneration | null;
  lastSuccess: BoardReadLatestGeneration | null;
  lastFailure: BoardReadSchedulerFailure | null;
  latestSkipReason: BoardReadSchedulerSkip | null;
  unauthorizedSummary: BoardReadUnauthorizedSchedulerSummary | null;
  readiness: BoardReadSchedulerReadiness;
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

type BoardReadSettingsSnapshot = {
  dailyGenerationTime: string;
  timezone: string;
  businessDays: string[];
};

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
    priority: task.priority,
    dueAt: task.dueAt.toISOString(),
    updatedAt: (updatedAt ?? task.dueAt).toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    isClaimable: task.isClaimable,
    requiredUpdateFields: normalizeRequiredUpdateFields(snapshot),
    updateFieldValues: normalizeUpdateFieldValues(updateFieldValues),
    assignedUser: {
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email || undefined
    },
    ownerUser: toUserSummary(task.ownerUser ?? task.assignedUser)!,
    collaborators: (task.collaborators ?? []).map((collaborator) => ({
      id: collaborator.user.id,
      name: collaborator.user.name,
      email: collaborator.user.email || undefined,
      collaborationScope: collaborator.collaborationScope,
      capacityRequested: collaborator.capacityRequested,
      addedAt: collaborator.createdAt.toISOString()
    })),
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

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
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

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function buildUnauthorizedSummary(
  unauthorizedAttempts: SchedulerAttemptEvidence[]
): BoardReadUnauthorizedSchedulerSummary | null {
  const latestUnauthorizedAttempt = unauthorizedAttempts[0] ?? null;

  if (!latestUnauthorizedAttempt) {
    return null;
  }

  const repeated = unauthorizedAttempts.length > 1;

  return {
    count: unauthorizedAttempts.length,
    latestAttemptId: latestUnauthorizedAttempt.id,
    latestOccurredAt:
      latestUnauthorizedAttempt.completedAt ?? latestUnauthorizedAttempt.receivedAt,
    latestReasonCode: latestUnauthorizedAttempt.unauthorizedReasonCode,
    repeated,
    managerMessage: repeated
      ? `${unauthorizedAttempts.length} unauthorized scheduled requests were blocked for this board date.`
      : latestUnauthorizedAttempt.managerMessage,
    nextStepMessage: repeated
      ? "Confirm the deployed cron secret matches the scheduler configuration and review whether the repeated blocked hits are expected."
      : "Check the production cron secret and scheduler configuration for this scheduled route."
  };
}

function createReadinessCheck(
  code: BoardReadSchedulerReadinessCheck["code"],
  label: string,
  status: BoardReadSchedulerReadinessCheckStatus,
  detail: string
): BoardReadSchedulerReadinessCheck {
  return {
    code,
    label,
    status,
    detail
  };
}

function buildSchedulerReadiness(input: {
  rawSettings: BoardReadSettingsSnapshot | null;
  latestScheduledAttempt: SchedulerAttemptEvidence | null;
  expectedToHaveRunByNow: boolean | null;
}): BoardReadSchedulerReadiness {
  const checks: BoardReadSchedulerReadinessCheck[] = [];
  const cronSecret = process.env.CRON_SECRET?.trim();

  checks.push(
    createReadinessCheck(
      "cron_secret",
      "CRON_SECRET",
      cronSecret ? "ready" : "attention",
      cronSecret
        ? "The app runtime has a cron secret configured."
        : "The app runtime does not currently have a cron secret configured."
    )
  );

  if (!input.rawSettings) {
    checks.push(
      createReadinessCheck(
        "generation_timezone",
        "Generation timezone",
        "unknown",
        "Generation settings were not loaded in this read path."
      ),
      createReadinessCheck(
        "generation_time",
        "Generation time",
        "unknown",
        "Generation settings were not loaded in this read path."
      ),
      createReadinessCheck(
        "business_days",
        "Business days",
        "unknown",
        "Generation settings were not loaded in this read path."
      )
    );
  } else {
    const timezone = input.rawSettings.timezone.trim();
    const dailyGenerationTime = input.rawSettings.dailyGenerationTime.trim();

    checks.push(
      createReadinessCheck(
        "generation_timezone",
        "Generation timezone",
        timezone && isValidTimeZone(timezone) ? "ready" : "attention",
        timezone
          ? isValidTimeZone(timezone)
            ? `Generation timezone is set to ${timezone}.`
            : `Generation timezone "${input.rawSettings.timezone}" is not valid.`
          : "Generation timezone is blank."
      )
    );
    checks.push(
      createReadinessCheck(
        "generation_time",
        "Generation time",
        (() => {
          try {
            parseGenerationTimeToMinutes(dailyGenerationTime);
            return "ready" as const;
          } catch {
            return "attention" as const;
          }
        })(),
        (() => {
          try {
            parseGenerationTimeToMinutes(dailyGenerationTime);
            return `Generation time is set to ${dailyGenerationTime}.`;
          } catch {
            return `Generation time "${input.rawSettings.dailyGenerationTime}" is not valid HH:mm format.`;
          }
        })()
      )
    );
    checks.push(
      createReadinessCheck(
        "business_days",
        "Business days",
        input.rawSettings.businessDays.length > 0 ? "ready" : "attention",
        input.rawSettings.businessDays.length > 0
          ? `${input.rawSettings.businessDays.length} business day${input.rawSettings.businessDays.length === 1 ? "" : "s"} configured.`
          : "No business days are configured for automatic generation."
      )
    );
  }

  checks.push(
    createReadinessCheck(
      "scheduled_evidence",
      "Scheduled evidence",
      (() => {
        if (input.latestScheduledAttempt) {
          return "ready" as const;
        }

        if (input.expectedToHaveRunByNow === true) {
          return "attention" as const;
        }

        if (input.expectedToHaveRunByNow === false) {
          return "ready" as const;
        }

        return "unknown" as const;
      })(),
      (() => {
        if (input.latestScheduledAttempt) {
          return `Scheduled evidence was recorded at ${input.latestScheduledAttempt.completedAt ?? input.latestScheduledAttempt.receivedAt}.`;
        }

        if (input.expectedToHaveRunByNow === true) {
          return "The app expected scheduled traffic by now, but no scheduled evidence has been recorded for this board date.";
        }

        if (input.expectedToHaveRunByNow === false) {
          return "The expected run window has not arrived yet, so missing scheduled evidence is normal.";
        }

        return "The app cannot tell from this view whether scheduled evidence should already exist.";
      })()
    )
  );

  const hasAttention = checks.some((check) => check.status === "attention");
  const hasUnknown = checks.some((check) => check.status === "unknown");
  const scheduledEvidenceCheck = checks.find((check) => check.code === "scheduled_evidence");
  const configurationAttention = checks.some(
    (check) =>
      check.status === "attention" &&
      check.code !== "scheduled_evidence"
  );

  return {
    status: hasAttention ? "attention" : hasUnknown ? "unknown" : "ready",
    summary: hasAttention
      ? configurationAttention
        ? "App-known readiness checks found setup gaps that can stop automatic board generation."
        : scheduledEvidenceCheck?.status === "attention"
          ? "The app looks ready to receive scheduler traffic, but it has not recorded a scheduled request for this board date yet."
          : "App-known readiness checks need attention."
      : hasUnknown
        ? "The app can only partially evaluate scheduler readiness from this view."
        : "App-known readiness checks look ready from inside the app.",
    checks
  };
}

function buildSchedulerGuidance(input: {
  boardDate: string;
  expectedToHaveRunByNow: boolean | null;
  settingsErrorMessage: string | null;
  latestScheduledAttempt: SchedulerAttemptEvidence | null;
  latestGeneration: LatestGenerationStatus | null;
}): BoardReadSchedulerGuidance {
  if (input.settingsErrorMessage) {
    return {
      code: "settings_invalid",
      title: "Automatic generation settings need attention",
      message:
        "Scheduler health could not verify the expected run window because generation settings are invalid.",
      nextStep: "Review generation timezone, daily generation time, and business days before relying on the automatic run.",
      actionRequired: true,
      safeToRetry: false,
      retryLabel: null
    };
  }

  if (input.latestGeneration?.status === "running") {
    return {
      code: "generation_running",
      title: "A generation run is currently in progress",
      message:
        "The board generation engine is still running for this board date.",
      nextStep: "Wait for the run to finish and refresh the board health in a moment.",
      actionRequired: false,
      safeToRetry: false,
      retryLabel: null
    };
  }

  if (!input.latestScheduledAttempt) {
    return {
      code: "no_scheduled_evidence",
      title: "No scheduled generation evidence has been recorded yet",
      message: `No scheduled generation evidence has been recorded for ${input.boardDate} yet.`,
      nextStep:
        input.expectedToHaveRunByNow
          ? "Verify the production scheduler is enabled and that cron requests are reaching the app."
          : "Wait for the configured generation window or generate the board manually if the team needs it sooner.",
      actionRequired: input.expectedToHaveRunByNow === true,
      safeToRetry: input.expectedToHaveRunByNow === true,
      retryLabel: input.expectedToHaveRunByNow === true ? "Generate Board Manually" : null
    };
  }

  if (input.latestScheduledAttempt.attemptState === "unauthorized") {
    return {
      code: "unauthorized_scheduled_request",
      title: "Scheduled request was blocked by authorization",
      message: input.latestScheduledAttempt.managerMessage,
      nextStep:
        "Check the production cron secret and scheduler authorization headers, then generate the board manually if the team needs it now.",
      actionRequired: true,
      safeToRetry: true,
      retryLabel: "Generate Board Manually"
    };
  }

  if (input.latestScheduledAttempt.attemptState === "failed") {
    return {
      code: "scheduled_failed",
      title: "Automatic generation failed",
      message: input.latestScheduledAttempt.managerMessage,
      nextStep:
        "Review the failed run details and retry manually if the board still needs to be generated.",
      actionRequired: true,
      safeToRetry: true,
      retryLabel: "Retry Board Generation"
    };
  }

  if (input.latestScheduledAttempt.attemptState === "skipped") {
    if (
      input.latestScheduledAttempt.skipReasonCode === "CONFIGURATION_MISSING" ||
      input.latestScheduledAttempt.skipReasonCode === "CONFIGURATION_INVALID"
    ) {
      return {
        code: "scheduled_skipped_configuration",
        title: "Automatic generation was skipped because configuration is not ready",
        message: input.latestScheduledAttempt.managerMessage,
        nextStep:
          "Fix the scheduler or generation configuration before relying on the next automatic run.",
        actionRequired: true,
        safeToRetry: false,
        retryLabel: null
      };
    }

    if (input.latestScheduledAttempt.skipReasonCode === "BEFORE_GENERATION_TIME") {
      return {
        code: "scheduled_skipped_before_generation_time",
        title: "Automatic generation has not reached its scheduled time yet",
        message: input.latestScheduledAttempt.managerMessage,
        nextStep:
          input.expectedToHaveRunByNow === true
            ? "Verify the scheduler runs again after the configured time, or generate the board manually if the team needs it now."
            : "Wait for the configured generation time, or generate the board manually if you want the board early.",
        actionRequired: input.expectedToHaveRunByNow === true,
        safeToRetry: true,
        retryLabel: "Generate Board Early"
      };
    }

    if (input.latestScheduledAttempt.skipReasonCode === "NON_BUSINESS_DAY") {
      return {
        code: "scheduled_skipped_non_business_day",
        title: "Automatic generation skipped this non-business day",
        message: input.latestScheduledAttempt.managerMessage,
        nextStep:
          "No action is needed unless this day should be treated as an exception and you want to generate the board manually.",
        actionRequired: false,
        safeToRetry: false,
        retryLabel: null
      };
    }

    if (input.latestScheduledAttempt.skipReasonCode === "ALREADY_GENERATED") {
      return {
        code: "scheduled_skipped_already_generated",
        title: "Automatic generation skipped because the board already exists",
        message: input.latestScheduledAttempt.managerMessage,
        nextStep: "No action is needed unless you want to review the existing board or trigger an intentional manual rerun.",
        actionRequired: false,
        safeToRetry: false,
        retryLabel: null
      };
    }
  }

  if (input.latestScheduledAttempt.attemptState === "succeeded") {
    return {
      code: "healthy",
      title: "Automatic generation completed successfully",
      message: input.latestScheduledAttempt.managerMessage,
      nextStep: "No action is needed unless you want to review or retry the board manually.",
      actionRequired: false,
      safeToRetry: false,
      retryLabel: null
    };
  }

  if (
    input.latestScheduledAttempt.attemptState === "received" ||
    input.latestScheduledAttempt.attemptState === "started"
  ) {
    return {
      code: "scheduled_request_in_progress",
      title: "Scheduled request is still in progress",
      message: input.latestScheduledAttempt.managerMessage,
      nextStep:
        "Wait for the scheduled request to finish, then refresh this board health view.",
      actionRequired: false,
      safeToRetry: false,
      retryLabel: null
    };
  }

  return {
    code: "unknown",
    title: "Scheduler health needs another look",
    message: input.latestScheduledAttempt.managerMessage,
    nextStep:
      input.expectedToHaveRunByNow
        ? "Confirm the scheduled request completed and generate the board manually if needed."
        : "Wait for the scheduled request to finish or check again after the run window.",
    actionRequired: input.expectedToHaveRunByNow === true,
    safeToRetry: input.expectedToHaveRunByNow === true,
    retryLabel: input.expectedToHaveRunByNow === true ? "Generate Board Manually" : null
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
  rawSettings: BoardReadSettingsSnapshot | null;
}): BoardReadSchedulerHealth {
  const latestScheduledAttempt = input.schedulerAttempts[0] ?? null;
  const latestGeneration = input.generationStatuses[0] ?? null;
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
  const unauthorizedAttempts = input.schedulerAttempts.filter(
    (attempt) => attempt.attemptState === "unauthorized"
  );
  const unauthorizedSummary = buildUnauthorizedSummary(unauthorizedAttempts);
  const readiness = buildSchedulerReadiness({
    rawSettings: input.rawSettings,
    latestScheduledAttempt,
    expectedToHaveRunByNow: input.expectedToHaveRunByNow
  });
  const schedulerFailure = toFailureSummary(
    toBoardReadLatestGeneration(lastFailureGeneration),
    latestFailedAttempt
  );
  const latestManualRunRead = toBoardReadLatestGeneration(latestManualRun);
  const lastSuccessRead = toBoardReadLatestGeneration(lastSuccess);
  const guidance = buildSchedulerGuidance({
    boardDate: input.boardDate,
    expectedToHaveRunByNow: input.expectedToHaveRunByNow,
    settingsErrorMessage: input.settingsErrorMessage,
    latestScheduledAttempt,
    latestGeneration
  });

  const status: BoardReadSchedulerHealthStatus =
    guidance.code === "healthy" ||
    guidance.code === "scheduled_skipped_non_business_day" ||
    guidance.code === "scheduled_skipped_already_generated"
      ? "healthy"
      : guidance.code === "generation_running" ||
          guidance.code === "scheduled_request_in_progress" ||
          (guidance.code === "scheduled_skipped_before_generation_time" &&
            guidance.actionRequired === false) ||
          (guidance.code === "no_scheduled_evidence" && guidance.actionRequired === false)
        ? "waiting"
        : "attention";

  return {
    status,
    expectedToHaveRunByNow:
      guidance.code === "settings_invalid" ? null : input.expectedToHaveRunByNow,
    needsAttention: guidance.actionRequired,
    managerMessage: guidance.message,
    nextStepMessage: guidance.nextStep,
    guidance,
    latestScheduledAttempt,
    latestManualRun: latestManualRunRead,
    lastSuccess: lastSuccessRead,
    lastFailure: schedulerFailure,
    latestSkipReason,
    unauthorizedSummary,
    readiness,
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
      } else if (task.sourceType === TaskSourceType.MANAGER || task.sourceType === TaskSourceType.CONCERN) {
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
  const appSettingsRepository =
    dependencies.appSettingsRepository ?? (dependencies.repository ? null : createAppSettingsRepository());
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
  let rawSettings: BoardReadSettingsSnapshot | null = null;

  if (appSettingsRepository) {
    try {
      const settings = await appSettingsRepository.getOrCreateAppSettings();

      rawSettings = {
        dailyGenerationTime: settings.dailyGenerationTime,
        timezone: settings.timezone,
        businessDays: [...settings.businessDays]
      };
      const normalizedSettings = normalizeAppSettings(rawSettings);

      expectedToHaveRunByNow = deriveExpectedToHaveRunByNow({
        boardDate: normalizedBoardDate,
        now: now(),
        timezone: normalizedSettings.timezone,
        dailyGenerationTime: normalizedSettings.dailyGenerationTime,
        businessDays: normalizedSettings.businessDays
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
    settingsErrorMessage,
    rawSettings
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

/**
 * Loads the Tasks operations ledger. Active work is intentionally cross-date;
 * only completed work remains scoped to the selected board date. The daily
 * board continues to use getBoardReadModelForDate and remains date-specific.
 */
export async function getTaskOperationsReadModelForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: BoardReadDependencies = {}
): Promise<BoardReadLookupResult> {
  assertCanViewBoard(user);

  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createBoardReadRepository();
  const boardResult = await getBoardReadModelForDate(user, normalizedBoardDate, {
    ...dependencies,
    repository
  });

  const records = repository.listTasksForOperationsConsole
    ? await repository.listTasksForOperationsConsole(boardResult.board?.id ?? null)
    : boardResult.board ? await repository.listTasksForBoardDay(boardResult.board.id) : [];
  const tasks = records.map(toTaskSummary);
  // A missing daily board must not hide carry-over assignments. This is a
  // read-only console envelope, not a newly generated daily board.
  const board = boardResult.board ?? toBoardReadModel(
    { id: `operations:${normalizedBoardDate}`, generationStatus: "NOT_GENERATED", generatedAt: null },
    normalizedBoardDate,
    [],
    null
  );

  return {
    ...boardResult,
    board: { ...board, taskCount: tasks.length, statusCounts: createStatusCounts(tasks), sourceCounts: createSourceCounts(tasks), tasks }
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
