import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmIntegrationRecoveryReview } from "@/server/services/unified-crm-integration-recovery-review-service";
import {
  UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_ERROR_CONTRACT_VERSION,
  UnifiedCrmIntegrationRecoveryReviewError,
  type UnifiedCrmIntegrationRecoveryReviewFailureCode
} from "@/server/unified-crm/integration-recovery-review-contract";

const TYPED_CODES = new Set<UnifiedCrmIntegrationRecoveryReviewFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmIntegrationRecoveryReview(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmIntegrationRecoveryReviewFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM integration recovery review is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmIntegrationRecoveryReviewError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
