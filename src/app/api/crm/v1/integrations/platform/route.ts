import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmIntegrationPlatform } from "@/server/services/unified-crm-integration-platform-service";
import {
  UNIFIED_CRM_INTEGRATION_PLATFORM_ERROR_CONTRACT_VERSION,
  UnifiedCrmIntegrationPlatformError,
  type UnifiedCrmIntegrationPlatformFailureCode
} from "@/server/unified-crm/integration-platform-contract";

const TYPED_CODES = new Set<UnifiedCrmIntegrationPlatformFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "INTEGRATION_PLATFORM_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INTEGRATION_PLATFORM_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmIntegrationPlatform(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmIntegrationPlatformFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_INTEGRATION_PLATFORM_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM integration platform readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmIntegrationPlatformError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
