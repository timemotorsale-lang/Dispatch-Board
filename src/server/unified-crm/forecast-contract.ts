export const UNIFIED_CRM_FORECAST_CONTRACT_VERSION = "ucrm.forecast/v1" as const;
export const UNIFIED_CRM_FORECAST_ERROR_CONTRACT_VERSION = "ucrm.forecast-error/v1" as const;

export type UnifiedCrmForecastSource = "BASELINE" | "SELLER_JUDGMENT" | "MANAGER_JUDGMENT";
export type UnifiedCrmForecastCategory = "WATCH" | "PIPELINE" | "BEST_CASE" | "COMMIT" | "CLOSED";

export type UnifiedCrmForecastSnapshot = {
  id: string;
  opportunityId: string;
  source: UnifiedCrmForecastSource;
  category: UnifiedCrmForecastCategory;
  amountCents: number;
  probabilityBasisPts: number;
  reason: string;
  inputSummary: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
};

export type UnifiedCrmForecastReadModel = {
  contractVersion: typeof UNIFIED_CRM_FORECAST_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: "organization" | "owned";
  generatedAt: string;
  opportunity: {
    id: string;
    opportunityNumber: string;
    title: string;
    stage: string;
    estimatedValueCents: number;
    ownerName: string;
    updatedAt: string;
  };
  baseline: UnifiedCrmForecastSnapshot;
  latestSellerJudgment: UnifiedCrmForecastSnapshot | null;
  latestManagerJudgment: UnifiedCrmForecastSnapshot | null;
  history: UnifiedCrmForecastSnapshot[];
};

export type UnifiedCrmForecastSubmissionInput = {
  amountCents?: unknown;
  category?: unknown;
  expectedVersion?: unknown;
  idempotencyKey?: unknown;
  probabilityBasisPts?: unknown;
  reason?: unknown;
  source?: unknown;
};

export type UnifiedCrmForecastSubmission = {
  amountCents: number;
  category: UnifiedCrmForecastCategory;
  expectedVersion: number;
  idempotencyKey: string;
  probabilityBasisPts: number;
  reason: string;
  source: Exclude<UnifiedCrmForecastSource, "BASELINE">;
};

export type UnifiedCrmForecastFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORECAST_NOT_AUTHORIZED"
  | "FORECAST_SOURCE_UNAVAILABLE"
  | "FORECAST_VERSION_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_FORECAST_SUBMISSION"
  | "OPPORTUNITY_NOT_AVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmForecastFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  FORECAST_NOT_AUTHORIZED: 403,
  FORECAST_SOURCE_UNAVAILABLE: 503,
  FORECAST_VERSION_CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_FORECAST_SUBMISSION: 400,
  OPPORTUNITY_NOT_AVAILABLE: 404,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmForecastError extends Error {
  readonly code: UnifiedCrmForecastFailureCode;
  readonly contractVersion = UNIFIED_CRM_FORECAST_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmForecastFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmForecastError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "FORECAST_SOURCE_UNAVAILABLE";
  }
}

const CATEGORIES: UnifiedCrmForecastCategory[] = ["WATCH", "PIPELINE", "BEST_CASE", "COMMIT", "CLOSED"];
const HUMAN_SOURCES = ["SELLER_JUDGMENT", "MANAGER_JUDGMENT"] as const;

export function normalizeUnifiedCrmForecastSubmission(input: UnifiedCrmForecastSubmissionInput): UnifiedCrmForecastSubmission {
  const amountCents = Number(input.amountCents);
  const probabilityBasisPts = Number(input.probabilityBasisPts);
  const expectedVersion = Number(input.expectedVersion);
  const category = String(input.category ?? "").trim().toUpperCase() as UnifiedCrmForecastCategory;
  const source = String(input.source ?? "").trim().toUpperCase() as UnifiedCrmForecastSubmission["source"];
  const reason = String(input.reason ?? "").trim().replace(/\s+/g, " ");
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();

  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast amount must be a non-negative whole-cent value.");
  }
  if (!Number.isInteger(probabilityBasisPts) || probabilityBasisPts < 0 || probabilityBasisPts > 10_000) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast probability must be between 0 and 10000 basis points.");
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast submission needs the current opportunity version.");
  }
  if (!CATEGORIES.includes(category)) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast category is invalid.");
  }
  if (!HUMAN_SOURCES.includes(source)) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast source must be seller or manager judgment.");
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast overrides require a reason between 8 and 500 characters.");
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    throw new UnifiedCrmForecastError("INVALID_FORECAST_SUBMISSION", "Forecast submission needs a stable idempotency key.");
  }
  return { amountCents, category, expectedVersion, idempotencyKey, probabilityBasisPts, reason, source };
}
