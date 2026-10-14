import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmSecurityVerification } from "@/server/services/unified-crm-security-verification-service";
import {
  UNIFIED_CRM_SECURITY_VERIFICATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmSecurityVerificationError,
  type UnifiedCrmSecurityVerificationFailureCode
} from "@/server/unified-crm/security-verification-contract";

const TYPED_CODES = new Set<UnifiedCrmSecurityVerificationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "SECURITY_VERIFICATION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "SECURITY_VERIFICATION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmSecurityVerification(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmSecurityVerificationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_SECURITY_VERIFICATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM security verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmSecurityVerificationError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
