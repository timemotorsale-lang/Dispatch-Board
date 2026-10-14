import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmESignature } from "@/server/services/unified-crm-e-signature-service";
import {
  UNIFIED_CRM_E_SIGNATURE_ERROR_CONTRACT_VERSION,
  UnifiedCrmESignatureError,
  type UnifiedCrmESignatureFailureCode
} from "@/server/unified-crm/e-signature-contract";

const TYPED_CODES = new Set<UnifiedCrmESignatureFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "E_SIGNATURE_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "E_SIGNATURE_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmESignature(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmESignatureFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_E_SIGNATURE_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM e-signature readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmESignatureError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
