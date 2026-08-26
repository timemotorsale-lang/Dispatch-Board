import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { rehearseUnifiedCrmPilotDataLoad } from "@/server/services/unified-crm-pilot-data-load-rehearsal-service";
import {
  UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_ERROR_CONTRACT_VERSION,
  UnifiedCrmPilotDataLoadRehearsalError,
  type UnifiedCrmPilotDataLoadRehearsalFailureCode
} from "@/server/unified-crm/pilot-data-load-rehearsal-contract";

const TYPED_CODES = new Set<UnifiedCrmPilotDataLoadRehearsalFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "PILOT_DATA_LOAD_INVALID",
  "PILOT_DATA_LOAD_NOT_AUTHORIZED",
  "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PILOT_DATA_LOAD_INVALID") return 400;
  if (code === "PILOT_DATA_LOAD_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  try {
    return NextResponse.json(await rehearseUnifiedCrmPilotDataLoad(await getCurrentUser(), payload));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPilotDataLoadRehearsalFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM pilot data load rehearsal is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPilotDataLoadRehearsalError
        ? error.retryable
        : code === "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
