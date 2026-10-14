import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmProviderHealthDashboard } from "@/server/services/unified-crm-provider-health-dashboard-service";
import {
  UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_ERROR_CONTRACT_VERSION,
  UnifiedCrmProviderHealthDashboardError,
  type UnifiedCrmProviderHealthDashboardFailureCode
} from "@/server/unified-crm/provider-health-dashboard-contract";

const TYPED_CODES = new Set<UnifiedCrmProviderHealthDashboardFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmProviderHealthDashboard(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmProviderHealthDashboardFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM provider health is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmProviderHealthDashboardError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
