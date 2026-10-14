import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmReliabilityVerification } from "@/server/services/unified-crm-reliability-verification-service";
import {
  UNIFIED_CRM_RELIABILITY_VERIFICATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmReliabilityVerificationError,
  type UnifiedCrmReliabilityVerificationFailureCode
} from "@/server/unified-crm/reliability-verification-contract";

const TYPED_CODES = new Set<UnifiedCrmReliabilityVerificationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "RELIABILITY_VERIFICATION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "RELIABILITY_VERIFICATION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmReliabilityVerification(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmReliabilityVerificationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_RELIABILITY_VERIFICATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM reliability verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmReliabilityVerificationError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
