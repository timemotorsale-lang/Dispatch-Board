import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPilotExecution } from "@/server/services/unified-crm-pilot-execution-service";
import {
  UNIFIED_CRM_PILOT_EXECUTION_ERROR_CONTRACT_VERSION,
  UnifiedCrmPilotExecutionError,
  type UnifiedCrmPilotExecutionFailureCode
} from "@/server/unified-crm/pilot-execution-contract";

const TYPED_CODES = new Set<UnifiedCrmPilotExecutionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PILOT_EXECUTION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PILOT_EXECUTION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPilotExecution(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPilotExecutionFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PILOT_EXECUTION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM pilot execution is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPilotExecutionError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
