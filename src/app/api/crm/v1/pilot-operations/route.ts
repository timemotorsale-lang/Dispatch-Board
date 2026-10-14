import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPilotOperationsPackage } from "@/server/services/unified-crm-pilot-operations-service";
import {
  UNIFIED_CRM_PILOT_OPERATIONS_ERROR_CONTRACT_VERSION,
  UnifiedCrmPilotOperationsError,
  type UnifiedCrmPilotOperationsFailureCode
} from "@/server/unified-crm/pilot-operations-contract";

const TYPED_CODES = new Set<UnifiedCrmPilotOperationsFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PILOT_OPERATIONS_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PILOT_OPERATIONS_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPilotOperationsPackage(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPilotOperationsFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PILOT_OPERATIONS_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM pilot operations package is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPilotOperationsError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
