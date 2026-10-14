import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCommunicationConsentFoundation } from "@/server/services/unified-crm-communication-consent-foundation-service";
import {
  UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmCommunicationConsentFoundationError,
  type UnifiedCrmCommunicationConsentFoundationFailureCode
} from "@/server/unified-crm/communication-consent-foundation-contract";

const TYPED_CODES = new Set<UnifiedCrmCommunicationConsentFoundationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmCommunicationConsentFoundation(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCommunicationConsentFoundationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM communication consent readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmCommunicationConsentFoundationError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
