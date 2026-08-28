import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmSmsTemplateCatalog } from "@/server/services/unified-crm-sms-template-catalog-service";
import {
  UNIFIED_CRM_SMS_TEMPLATE_CATALOG_ERROR_CONTRACT_VERSION,
  UnifiedCrmSmsTemplateCatalogError,
  type UnifiedCrmSmsTemplateCatalogFailureCode
} from "@/server/unified-crm/sms-template-catalog-contract";

const TYPED_CODES = new Set<UnifiedCrmSmsTemplateCatalogFailureCode>(["AUTHENTICATION_REQUIRED", "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmSmsTemplateCatalog(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmSmsTemplateCatalogFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_SMS_TEMPLATE_CATALOG_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM SMS template catalog is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmSmsTemplateCatalogError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
