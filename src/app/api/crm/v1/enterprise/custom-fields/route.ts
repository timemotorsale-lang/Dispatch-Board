import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmGovernedCustomFields } from "@/server/services/unified-crm-governed-custom-fields-service";
import {
  UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_ERROR_CONTRACT_VERSION,
  UnifiedCrmGovernedCustomFieldsError,
  type UnifiedCrmGovernedCustomFieldsFailureCode
} from "@/server/unified-crm/governed-custom-fields-contract";

const TYPED_CODES = new Set<UnifiedCrmGovernedCustomFieldsFailureCode>(["AUTHENTICATION_REQUIRED", "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED"]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmGovernedCustomFields(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmGovernedCustomFieldsFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM custom field readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmGovernedCustomFieldsError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
