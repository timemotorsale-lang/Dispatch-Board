import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmConfigurationPromotion } from "@/server/services/unified-crm-configuration-promotion-service";
import { UNIFIED_CRM_CONFIGURATION_PROMOTION_ERROR_CONTRACT_VERSION, UnifiedCrmConfigurationPromotionError, type UnifiedCrmConfigurationPromotionFailureCode } from "@/server/unified-crm/configuration-promotion-contract";

const TYPED_CODES = new Set<UnifiedCrmConfigurationPromotionFailureCode>(["AUTHENTICATION_REQUIRED", "CONFIGURATION_PROMOTION_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "CONFIGURATION_PROMOTION_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmConfigurationPromotion(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmConfigurationPromotionFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_CONFIGURATION_PROMOTION_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM configuration promotion readiness is temporarily unavailable.", retryable: error instanceof UnifiedCrmConfigurationPromotionError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
