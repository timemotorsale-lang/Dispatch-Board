import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmReleaseReadinessCleanup } from "@/server/services/unified-crm-release-readiness-cleanup-service";
import {
  UNIFIED_CRM_RELEASE_READINESS_CLEANUP_ERROR_CONTRACT_VERSION,
  UnifiedCrmReleaseReadinessCleanupError,
  type UnifiedCrmReleaseReadinessCleanupFailureCode
} from "@/server/unified-crm/release-readiness-cleanup-contract";

const TYPED_CODES = new Set<UnifiedCrmReleaseReadinessCleanupFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmReleaseReadinessCleanup(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmReleaseReadinessCleanupFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_RELEASE_READINESS_CLEANUP_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM release-readiness cleanup is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmReleaseReadinessCleanupError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
