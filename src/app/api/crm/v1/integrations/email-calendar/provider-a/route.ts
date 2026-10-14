import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmEmailCalendarProviderA } from "@/server/services/unified-crm-email-calendar-provider-a-service";
import {
  UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_ERROR_CONTRACT_VERSION,
  UnifiedCrmEmailCalendarProviderAError,
  type UnifiedCrmEmailCalendarProviderAFailureCode
} from "@/server/unified-crm/email-calendar-provider-a-contract";

const TYPED_CODES = new Set<UnifiedCrmEmailCalendarProviderAFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmEmailCalendarProviderA(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmEmailCalendarProviderAFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM email and calendar provider readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmEmailCalendarProviderAError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
