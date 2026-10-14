import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPilotFindingClosure } from "@/server/services/unified-crm-pilot-finding-closure-service";
import {
  UNIFIED_CRM_PILOT_FINDING_CLOSURE_ERROR_CONTRACT_VERSION,
  UnifiedCrmPilotFindingClosureError,
  type UnifiedCrmPilotFindingClosureFailureCode
} from "@/server/unified-crm/pilot-finding-closure-contract";

const TYPED_CODES = new Set<UnifiedCrmPilotFindingClosureFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPilotFindingClosure(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPilotFindingClosureFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PILOT_FINDING_CLOSURE_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM pilot finding closure is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPilotFindingClosureError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
