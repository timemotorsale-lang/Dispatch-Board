import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmOperationalHandoff } from "@/server/services/unified-crm-operational-handoff-service";
import {
  UNIFIED_CRM_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION,
  UnifiedCrmOperationalHandoffError,
  type UnifiedCrmOperationalHandoffFailureCode
} from "@/server/unified-crm/operational-handoff-contract";

const TYPED_CODES = new Set<UnifiedCrmOperationalHandoffFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "OPERATIONAL_HANDOFF_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "OPERATIONAL_HANDOFF_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmOperationalHandoff(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmOperationalHandoffFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM operational handoff is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmOperationalHandoffError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
