import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmManualCallDisposition } from "@/server/services/unified-crm-manual-call-disposition-service";
import { UNIFIED_CRM_MANUAL_CALL_DISPOSITION_ERROR_CONTRACT_VERSION, UnifiedCrmManualCallDispositionError, type UnifiedCrmManualCallDispositionFailureCode } from "@/server/unified-crm/manual-call-disposition-contract";

const TYPED_CODES = new Set<UnifiedCrmManualCallDispositionFailureCode>(["AUTHENTICATION_REQUIRED", "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmManualCallDisposition(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmManualCallDispositionFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_MANUAL_CALL_DISPOSITION_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM manual call disposition is temporarily unavailable.", retryable: error instanceof UnifiedCrmManualCallDispositionError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
