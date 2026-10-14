import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { logUnifiedCrmCustomerInteraction } from "@/server/services/unified-crm-customer-interaction-service";
import {
  UNIFIED_CRM_CUSTOMER_INTERACTION_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerInteractionError,
  type UnifiedCrmCustomerInteractionFailureCode
} from "@/server/unified-crm/customer-interaction-command";

const TYPED_CODES = new Set<UnifiedCrmCustomerInteractionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_360_NOT_AUTHORIZED",
  "CUSTOMER_360_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_INTERACTION_COMMAND",
  "OUTBOUND_CONSENT_REQUIRED"
]);

function statusFor(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_INTERACTION_COMMAND") return 400;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "OUTBOUND_CONSENT_REQUIRED") return 409;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { customerId } = await context.params;

  try {
    const result = await logUnifiedCrmCustomerInteraction(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerInteractionFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Unable to record the customer interaction right now.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_INTERACTION_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmCustomerInteractionError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE"
    }, { status: statusFor(code) });
  }
}
