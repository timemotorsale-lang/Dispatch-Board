import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAccountingDmsConnector } from "@/server/services/unified-crm-accounting-dms-connector-service";
import {
  UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_ERROR_CONTRACT_VERSION,
  UnifiedCrmAccountingDmsConnectorError,
  type UnifiedCrmAccountingDmsConnectorFailureCode
} from "@/server/unified-crm/accounting-dms-connector-contract";

const TYPED_CODES = new Set<UnifiedCrmAccountingDmsConnectorFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAccountingDmsConnector(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAccountingDmsConnectorFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM accounting and DMS connector readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmAccountingDmsConnectorError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
