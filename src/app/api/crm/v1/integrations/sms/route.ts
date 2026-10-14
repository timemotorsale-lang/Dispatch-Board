import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmSmsDelivery } from "@/server/services/unified-crm-sms-delivery-service";
import {
  UNIFIED_CRM_SMS_DELIVERY_ERROR_CONTRACT_VERSION,
  UnifiedCrmSmsDeliveryError,
  type UnifiedCrmSmsDeliveryFailureCode
} from "@/server/unified-crm/sms-delivery-contract";

const TYPED_CODES = new Set<UnifiedCrmSmsDeliveryFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "SMS_DELIVERY_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "SMS_DELIVERY_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmSmsDelivery(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmSmsDeliveryFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_SMS_DELIVERY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM SMS delivery readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmSmsDeliveryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
