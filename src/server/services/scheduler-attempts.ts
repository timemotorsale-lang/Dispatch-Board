import {
  SchedulerAttemptState,
  SchedulerAuthorizationOutcome,
  SchedulerTriggerSource
} from "@prisma/client";

import {
  createSchedulerAttemptsRepository,
  type SchedulerAttemptRecord,
  type SchedulerAttemptsRepository
} from "@/server/repositories/scheduler-attempts-repository";
import {
  getGenerationSettings,
  type GenerationSettings
} from "@/server/services/app-settings-service";
import type { ScheduledBoardGenerationResult } from "@/server/services/board-generation";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";
import { DEFAULT_APP_SETTINGS } from "@/server/validation/app-settings";

export type SchedulerAttemptStateValue =
  | "received"
  | "unauthorized"
  | "started"
  | "skipped"
  | "succeeded"
  | "failed";

export type SchedulerAuthorizationOutcomeValue =
  | "pending"
  | "authorized"
  | "unauthorized"
  | "system_misconfigured";

export type SchedulerTriggerSourceValue =
  | "platform_cron"
  | "external_scheduler"
  | "manual_http_test"
  | "unknown";

export type UnauthorizedSchedulerAttemptReasonCode = "MISSING_CREDENTIAL" | "SECRET_MISMATCH";

export type SchedulerAttemptEvidence = {
  id: string;
  boardDate: string;
  triggerType: "scheduled";
  triggerSource: SchedulerTriggerSourceValue;
  routePath: string;
  requestMethod: string;
  receivedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  attemptState: SchedulerAttemptStateValue;
  authorizationOutcome: SchedulerAuthorizationOutcomeValue;
  generationRunId: string | null;
  managerMessage: string;
  unauthorizedReasonCode: string | null;
  failureCode: string | null;
  safeErrorMessage: string | null;
};

type SchedulerAttemptsDependencies = {
  repository?: SchedulerAttemptsRepository;
  now?: () => Date;
  getGenerationSettings?: () => Promise<GenerationSettings>;
};

type RecordFailedSchedulerAttemptInput = {
  attemptId: string;
  authorizationOutcome: Exclude<SchedulerAuthorizationOutcomeValue, "unauthorized">;
  failureCode?: string;
  error: unknown;
};

const triggerSourceByHint = new Map<string, SchedulerTriggerSource>([
  ["platform_cron", SchedulerTriggerSource.PLATFORM_CRON],
  ["external_scheduler", SchedulerTriggerSource.EXTERNAL_SCHEDULER],
  ["manual_http_test", SchedulerTriggerSource.MANUAL_HTTP_TEST],
  ["unknown", SchedulerTriggerSource.UNKNOWN]
]);

function readBearerToken(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function toServiceState(state: SchedulerAttemptState): SchedulerAttemptStateValue {
  return state.toLowerCase() as SchedulerAttemptStateValue;
}

function toServiceAuthorizationOutcome(
  outcome: SchedulerAuthorizationOutcome
): SchedulerAuthorizationOutcomeValue {
  return outcome.toLowerCase() as SchedulerAuthorizationOutcomeValue;
}

function toServiceTriggerSource(source: SchedulerTriggerSource): SchedulerTriggerSourceValue {
  return source.toLowerCase() as SchedulerTriggerSourceValue;
}

function toRepositoryAuthorizationOutcome(
  outcome: SchedulerAuthorizationOutcomeValue
): SchedulerAuthorizationOutcome {
  if (outcome === "pending") {
    return SchedulerAuthorizationOutcome.PENDING;
  }

  if (outcome === "authorized") {
    return SchedulerAuthorizationOutcome.AUTHORIZED;
  }

  if (outcome === "unauthorized") {
    return SchedulerAuthorizationOutcome.UNAUTHORIZED;
  }

  return SchedulerAuthorizationOutcome.SYSTEM_MISCONFIGURED;
}

function toEvidence(record: SchedulerAttemptRecord): SchedulerAttemptEvidence {
  return {
    id: record.id,
    boardDate: record.boardDate.toISOString().slice(0, 10),
    triggerType: "scheduled",
    triggerSource: toServiceTriggerSource(record.triggerSource),
    routePath: record.routePath,
    requestMethod: record.requestMethod,
    receivedAt: record.receivedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    attemptState: toServiceState(record.attemptState),
    authorizationOutcome: toServiceAuthorizationOutcome(record.authorizationOutcome),
    generationRunId: record.generationRunId ?? null,
    managerMessage: record.managerMessage,
    unauthorizedReasonCode: record.unauthorizedReasonCode ?? null,
    failureCode: record.failureCode ?? null,
    safeErrorMessage: record.safeErrorMessage ?? null
  };
}

function inferTriggerSource(request: Request) {
  const explicitHint = request.headers.get("x-scheduler-trigger-source")?.trim().toLowerCase();
  const explicitSource = explicitHint ? triggerSourceByHint.get(explicitHint) : null;

  if (explicitSource) {
    return explicitSource;
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";

  if (userAgent.includes("vercel") || userAgent.includes("cron")) {
    return SchedulerTriggerSource.PLATFORM_CRON;
  }

  if (request.headers.get("origin") || request.headers.get("referer")) {
    return SchedulerTriggerSource.MANUAL_HTTP_TEST;
  }

  return SchedulerTriggerSource.UNKNOWN;
}

function toSafeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Scheduled generation failed unexpectedly.";
  }

  const normalizedMessage = error.message.replace(/\s+/g, " ").trim();

  if (!normalizedMessage) {
    return "Scheduled generation failed unexpectedly.";
  }

  if (/(database_url|postgres(?:ql)?:\/\/|password|secret|api[_-]?key|token)/i.test(normalizedMessage)) {
    return "Scheduled generation failed due to a protected internal error.";
  }

  return normalizedMessage.slice(0, 300);
}

async function resolveBoardDateForReceivedAttempt(
  receivedAt: Date,
  loadGenerationSettings: () => Promise<GenerationSettings>
) {
  try {
    const settings = await loadGenerationSettings();

    return getBoardDateInTimeZone(receivedAt, settings.timezone);
  } catch {
    return getBoardDateInTimeZone(receivedAt, DEFAULT_APP_SETTINGS.timezone);
  }
}

export function evaluateCronRequestAuthorization(request: Request, cronSecret: string | null | undefined) {
  const normalizedCronSecret = cronSecret?.trim();

  if (!normalizedCronSecret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  const authorizationToken = readBearerToken(request.headers.get("authorization"));
  const headerToken = request.headers.get("x-cron-secret")?.trim() || null;
  const providedCredential = authorizationToken || headerToken;

  if (!providedCredential) {
    return {
      isAuthorized: false as const,
      reasonCode: "MISSING_CREDENTIAL" as const
    };
  }

  if (authorizationToken === normalizedCronSecret || headerToken === normalizedCronSecret) {
    return {
      isAuthorized: true as const
    };
  }

  return {
    isAuthorized: false as const,
    reasonCode: "SECRET_MISMATCH" as const
  };
}

export async function createReceivedSchedulerAttempt(
  request: Request,
  dependencies: SchedulerAttemptsDependencies = {}
) {
  const repository = dependencies.repository ?? createSchedulerAttemptsRepository();
  const now = dependencies.now ?? (() => new Date());
  const loadGenerationSettings = dependencies.getGenerationSettings ?? getGenerationSettings;
  const receivedAt = now();
  const boardDate = await resolveBoardDateForReceivedAttempt(receivedAt, loadGenerationSettings);
  const record = await repository.createSchedulerAttempt({
    boardDate,
    triggerSource: inferTriggerSource(request),
    routePath: new URL(request.url).pathname,
    requestMethod: request.method.trim().toUpperCase() || "GET",
    receivedAt,
    managerMessage: "Scheduled generation request received."
  });

  return toEvidence(record);
}

export async function recordUnauthorizedSchedulerAttempt(
  attemptId: string,
  reasonCode: UnauthorizedSchedulerAttemptReasonCode,
  dependencies: SchedulerAttemptsDependencies = {}
) {
  const repository = dependencies.repository ?? createSchedulerAttemptsRepository();
  const now = dependencies.now ?? (() => new Date());
  const managerMessage =
    reasonCode === "MISSING_CREDENTIAL"
      ? "Scheduled generation request was rejected because no cron credential was provided."
      : "Scheduled generation request was rejected because the cron credential did not match.";
  const record = await repository.updateSchedulerAttempt({
    id: attemptId,
    attemptState: SchedulerAttemptState.UNAUTHORIZED,
    authorizationOutcome: SchedulerAuthorizationOutcome.UNAUTHORIZED,
    managerMessage,
    completedAt: now(),
    generationRunId: null,
    unauthorizedReasonCode: reasonCode
  });

  return toEvidence(record);
}

export async function recordSchedulerAttemptResult(
  attemptId: string,
  result: ScheduledBoardGenerationResult,
  dependencies: SchedulerAttemptsDependencies = {}
) {
  const repository = dependencies.repository ?? createSchedulerAttemptsRepository();
  const now = dependencies.now ?? (() => new Date());

  if (result.status === "success") {
    const record = await repository.updateSchedulerAttempt({
      id: attemptId,
      attemptState: SchedulerAttemptState.SUCCEEDED,
      authorizationOutcome: SchedulerAuthorizationOutcome.AUTHORIZED,
      managerMessage:
        result.summary ?? `Scheduled generation succeeded for ${normalizeBoardDate(result.boardDate)}.`,
      completedAt: now(),
      generationRunId: result.generationRunId
    });

    return toEvidence(record);
  }

  if (result.status === "skipped") {
    const record = await repository.updateSchedulerAttempt({
      id: attemptId,
      attemptState: SchedulerAttemptState.SKIPPED,
      authorizationOutcome: SchedulerAuthorizationOutcome.AUTHORIZED,
      managerMessage:
        result.summary ?? `Scheduled generation was skipped for ${normalizeBoardDate(result.boardDate)}.`,
      completedAt: now(),
      generationRunId: result.generationRunId
    });

    return toEvidence(record);
  }

  const safeErrorMessage =
    result.errorMessage?.trim() || "Scheduled generation failed before a detailed error was recorded.";
  const record = await repository.updateSchedulerAttempt({
    id: attemptId,
    attemptState: SchedulerAttemptState.FAILED,
    authorizationOutcome: SchedulerAuthorizationOutcome.AUTHORIZED,
    managerMessage: safeErrorMessage,
    completedAt: now(),
    generationRunId: result.generationRunId,
    failureCode: "SCHEDULED_GENERATION_FAILED",
    safeErrorMessage
  });

  return toEvidence(record);
}

export async function recordFailedSchedulerAttempt(
  input: RecordFailedSchedulerAttemptInput,
  dependencies: SchedulerAttemptsDependencies = {}
) {
  const repository = dependencies.repository ?? createSchedulerAttemptsRepository();
  const now = dependencies.now ?? (() => new Date());
  const safeErrorMessage = toSafeErrorMessage(input.error);
  const record = await repository.updateSchedulerAttempt({
    id: input.attemptId,
    attemptState: SchedulerAttemptState.FAILED,
    authorizationOutcome: toRepositoryAuthorizationOutcome(input.authorizationOutcome),
    managerMessage: safeErrorMessage,
    completedAt: now(),
    failureCode: input.failureCode ?? "SCHEDULED_REQUEST_FAILED",
    safeErrorMessage
  });

  return toEvidence(record);
}

export async function listSchedulerAttemptsForDate(
  boardDate: string,
  repository: SchedulerAttemptsRepository = createSchedulerAttemptsRepository()
) {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const records = await repository.listSchedulerAttemptsForDate(normalizedBoardDate);

  return records.map(toEvidence);
}
