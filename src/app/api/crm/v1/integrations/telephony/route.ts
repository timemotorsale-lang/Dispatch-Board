import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmTelephonyTranscription } from "@/server/services/unified-crm-telephony-transcription-service";
import {
  UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_ERROR_CONTRACT_VERSION,
  UnifiedCrmTelephonyTranscriptionError,
  type UnifiedCrmTelephonyTranscriptionFailureCode
} from "@/server/unified-crm/telephony-transcription-contract";

const TYPED_CODES = new Set<UnifiedCrmTelephonyTranscriptionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmTelephonyTranscription(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmTelephonyTranscriptionFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM telephony and transcription readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmTelephonyTranscriptionError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
