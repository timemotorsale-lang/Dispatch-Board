import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPerformanceObservability } from "@/server/services/unified-crm-performance-observability-service";
import {
  UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_ERROR_CONTRACT_VERSION,
  UnifiedCrmPerformanceObservabilityError,
  type UnifiedCrmPerformanceObservabilityFailureCode
} from "@/server/unified-crm/performance-observability-contract";

const TYPED_CODES = new Set<UnifiedCrmPerformanceObservabilityFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPerformanceObservability(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPerformanceObservabilityFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM performance and observability verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPerformanceObservabilityError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
