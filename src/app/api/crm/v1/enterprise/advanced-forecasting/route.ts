import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAdvancedForecasting } from "@/server/services/unified-crm-advanced-forecasting-service";
import { UNIFIED_CRM_ADVANCED_FORECASTING_ERROR_CONTRACT_VERSION, UnifiedCrmAdvancedForecastingError, type UnifiedCrmAdvancedForecastingFailureCode } from "@/server/unified-crm/advanced-forecasting-contract";

const TYPED_CODES = new Set<UnifiedCrmAdvancedForecastingFailureCode>(["AUTHENTICATION_REQUIRED", "ADVANCED_FORECASTING_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "ADVANCED_FORECASTING_NOT_AUTHORIZED" ? 403 : 500;
export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAdvancedForecasting(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAdvancedForecastingFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_ADVANCED_FORECASTING_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM advanced forecasting readiness is temporarily unavailable.", retryable: error instanceof UnifiedCrmAdvancedForecastingError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
