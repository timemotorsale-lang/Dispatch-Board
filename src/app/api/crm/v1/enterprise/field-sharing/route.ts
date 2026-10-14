import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmEnterpriseFieldSharing } from "@/server/services/unified-crm-enterprise-field-sharing-service";
import {
  UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_ERROR_CONTRACT_VERSION,
  UnifiedCrmEnterpriseFieldSharingError,
  type UnifiedCrmEnterpriseFieldSharingFailureCode
} from "@/server/unified-crm/enterprise-field-sharing-contract";

const TYPED_CODES = new Set<UnifiedCrmEnterpriseFieldSharingFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmEnterpriseFieldSharing(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmEnterpriseFieldSharingFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM enterprise sharing readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmEnterpriseFieldSharingError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
