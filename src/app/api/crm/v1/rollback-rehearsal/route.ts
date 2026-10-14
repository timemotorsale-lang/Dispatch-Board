import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmRollbackRehearsal } from "@/server/services/unified-crm-rollback-rehearsal-service";
import {
  UNIFIED_CRM_ROLLBACK_REHEARSAL_ERROR_CONTRACT_VERSION,
  UnifiedCrmRollbackRehearsalError,
  type UnifiedCrmRollbackRehearsalFailureCode
} from "@/server/unified-crm/rollback-rehearsal-contract";

const TYPED_CODES = new Set<UnifiedCrmRollbackRehearsalFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ROLLBACK_REHEARSAL_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "ROLLBACK_REHEARSAL_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmRollbackRehearsal(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmRollbackRehearsalFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_ROLLBACK_REHEARSAL_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM rollback rehearsal is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmRollbackRehearsalError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
