import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmFullRegression } from "@/server/services/unified-crm-full-regression-service";
import {
  UNIFIED_CRM_FULL_REGRESSION_ERROR_CONTRACT_VERSION,
  UnifiedCrmFullRegressionError,
  type UnifiedCrmFullRegressionFailureCode
} from "@/server/unified-crm/full-regression-contract";

const TYPED_CODES = new Set<UnifiedCrmFullRegressionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "FULL_REGRESSION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "FULL_REGRESSION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmFullRegression(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmFullRegressionFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_FULL_REGRESSION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM full regression verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmFullRegressionError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
