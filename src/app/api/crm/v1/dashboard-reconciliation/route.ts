import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmDashboardReconciliation } from "@/server/services/unified-crm-dashboard-reconciliation-service";
import {
  UNIFIED_CRM_DASHBOARD_RECONCILIATION_ERROR_CONTRACT_VERSION,
  UnifiedCrmDashboardReconciliationError,
  type UnifiedCrmDashboardReconciliationFailureCode
} from "@/server/unified-crm/dashboard-reconciliation-contract";

const TYPED_CODES = new Set<UnifiedCrmDashboardReconciliationFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED",
  "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmDashboardReconciliation(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmDashboardReconciliationFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_DASHBOARD_RECONCILIATION_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM dashboard reconciliation is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmDashboardReconciliationError
        ? error.retryable
        : code === "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
