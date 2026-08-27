import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmEmailCalendarProviderB } from "@/server/services/unified-crm-email-calendar-provider-b-service";
import {
  UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_ERROR_CONTRACT_VERSION,
  UnifiedCrmEmailCalendarProviderBError,
  type UnifiedCrmEmailCalendarProviderBFailureCode
} from "@/server/unified-crm/email-calendar-provider-b-contract";

const TYPED_CODES = new Set<UnifiedCrmEmailCalendarProviderBFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmEmailCalendarProviderB(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmEmailCalendarProviderBFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM second email and calendar provider readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmEmailCalendarProviderBError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
