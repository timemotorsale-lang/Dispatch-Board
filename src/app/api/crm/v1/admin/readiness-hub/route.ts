import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAdminReadinessHub } from "@/server/services/unified-crm-admin-readiness-hub-service";
import {
  UNIFIED_CRM_ADMIN_READINESS_HUB_ERROR_CONTRACT_VERSION,
  UnifiedCrmAdminReadinessHubError,
  type UnifiedCrmAdminReadinessHubFailureCode
} from "@/server/unified-crm/admin-readiness-hub-contract";

const TYPED_CODES = new Set<UnifiedCrmAdminReadinessHubFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ADMIN_READINESS_HUB_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "ADMIN_READINESS_HUB_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAdminReadinessHub(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAdminReadinessHubFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_ADMIN_READINESS_HUB_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM readiness hub is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmAdminReadinessHubError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
