import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPilotGoNoGo } from "@/server/services/unified-crm-pilot-go-no-go-service";
import {
  UNIFIED_CRM_PILOT_GO_NO_GO_ERROR_CONTRACT_VERSION,
  UnifiedCrmPilotGoNoGoError,
  type UnifiedCrmPilotGoNoGoFailureCode
} from "@/server/unified-crm/pilot-go-no-go-contract";

const TYPED_CODES = new Set<UnifiedCrmPilotGoNoGoFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PILOT_GO_NO_GO_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PILOT_GO_NO_GO_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPilotGoNoGo(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPilotGoNoGoFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PILOT_GO_NO_GO_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM pilot go/no-go is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPilotGoNoGoError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
