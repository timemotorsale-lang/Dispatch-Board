import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmReleaseCandidateValidation } from "@/server/services/unified-crm-release-candidate-validation-service";
import {
  UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmReleaseCandidateValidationError,
  type UnifiedCrmReleaseCandidateValidationFailureCode
} from "@/server/unified-crm/release-candidate-validation-contract";

const TYPED_CODES = new Set<UnifiedCrmReleaseCandidateValidationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmReleaseCandidateValidation(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmReleaseCandidateValidationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM release-candidate validation is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmReleaseCandidateValidationError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
