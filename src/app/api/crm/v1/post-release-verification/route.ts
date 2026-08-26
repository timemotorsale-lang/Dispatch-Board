import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmPostReleaseVerification } from "@/server/services/unified-crm-post-release-verification-service";
import {
  UNIFIED_CRM_POST_RELEASE_VERIFICATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmPostReleaseVerificationError,
  type UnifiedCrmPostReleaseVerificationFailureCode
} from "@/server/unified-crm/post-release-verification-contract";

const TYPED_CODES = new Set<UnifiedCrmPostReleaseVerificationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmPostReleaseVerification(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmPostReleaseVerificationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_POST_RELEASE_VERIFICATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM post-release verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmPostReleaseVerificationError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
