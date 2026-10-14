import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmInternalReleaseDecision } from "@/server/services/unified-crm-internal-release-decision-service";
import {
  UNIFIED_CRM_INTERNAL_RELEASE_DECISION_ERROR_CONTRACT_VERSION,
  UnifiedCrmInternalReleaseDecisionError,
  type UnifiedCrmInternalReleaseDecisionFailureCode
} from "@/server/unified-crm/internal-release-decision-contract";

const TYPED_CODES = new Set<UnifiedCrmInternalReleaseDecisionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmInternalReleaseDecision(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmInternalReleaseDecisionFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_INTERNAL_RELEASE_DECISION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM internal release decision is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmInternalReleaseDecisionError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
