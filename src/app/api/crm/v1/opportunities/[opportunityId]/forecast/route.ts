import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  getUnifiedCrmForecast,
  submitUnifiedCrmForecastJudgment
} from "@/server/services/unified-crm-forecast-service";
import {
  UNIFIED_CRM_FORECAST_ERROR_CONTRACT_VERSION,
  UnifiedCrmForecastError,
  type UnifiedCrmForecastFailureCode
} from "@/server/unified-crm/forecast-contract";

type RouteContext = {
  params: Promise<{ opportunityId: string }>;
};

const TYPED_CODES = new Set<UnifiedCrmForecastFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "FORECAST_NOT_AUTHORIZED",
  "FORECAST_SOURCE_UNAVAILABLE",
  "FORECAST_VERSION_CONFLICT",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_FORECAST_SUBMISSION",
  "OPPORTUNITY_NOT_AVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_FORECAST_SUBMISSION") return 400;
  if (code === "FORECAST_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "OPPORTUNITY_NOT_AVAILABLE") return 404;
  if (code === "FORECAST_VERSION_CONFLICT" || code === "IDEMPOTENCY_KEY_REUSED" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "FORECAST_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

function errorResponse(error: unknown) {
  const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
  const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmForecastFailureCode);
  return NextResponse.json({
    code: isTyped ? code : undefined,
    contractVersion: UNIFIED_CRM_FORECAST_ERROR_CONTRACT_VERSION,
    error: isTyped && error instanceof Error ? error.message : "Forecast records are temporarily unavailable.",
    retryable: error instanceof UnifiedCrmForecastError ? error.retryable : code === "FORECAST_SOURCE_UNAVAILABLE"
  }, { status: statusForCode(code) });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const [user, params] = await Promise.all([getCurrentUser(), context.params]);
    return NextResponse.json(await getUnifiedCrmForecast(user, params.opportunityId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [user, params, body] = await Promise.all([
      getCurrentUser(),
      context.params,
      request.json().catch(() => ({}))
    ]);
    const result = await submitUnifiedCrmForecastJudgment(user, params.opportunityId, body);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
