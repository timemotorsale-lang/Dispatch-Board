import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateUnifiedCrmCustomerNextAction } from "@/server/services/unified-crm-customer-next-action-service";
import {
  UNIFIED_CRM_CUSTOMER_NEXT_ACTION_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerNextActionError,
  type UnifiedCrmCustomerNextActionFailureCode
} from "@/server/unified-crm/customer-next-action-command";

const TYPED_CODES = new Set<UnifiedCrmCustomerNextActionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_360_NOT_AUTHORIZED",
  "CUSTOMER_360_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "CUSTOMER_OWNER_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_NEXT_ACTION_COMMAND",
  "NO_ACTIVE_NEXT_ACTION",
  "STALE_NEXT_ACTION"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  if (code === "STALE_NEXT_ACTION" || code === "CUSTOMER_OWNER_REQUIRED" || code === "NO_ACTIVE_NEXT_ACTION" || code === "IDEMPOTENCY_KEY_REUSED") return 409;
  if (code === "INVALID_NEXT_ACTION_COMMAND") return 400;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const { customerId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    const result = await updateUnifiedCrmCustomerNextAction(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerNextActionFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Customer next action could not be updated right now.";

    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_NEXT_ACTION_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmCustomerNextActionError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
