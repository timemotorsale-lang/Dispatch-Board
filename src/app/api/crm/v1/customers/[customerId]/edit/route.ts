import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateUnifiedCrmCustomerControlledEdit } from "@/server/services/unified-crm-customer-controlled-edit-service";
import {
  UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerControlledEditError,
  type UnifiedCrmCustomerControlledEditFailureCode
} from "@/server/unified-crm/customer-controlled-edit-command";

const TYPED_CODES = new Set<UnifiedCrmCustomerControlledEditFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_360_NOT_AUTHORIZED",
  "CUSTOMER_360_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_CUSTOMER_EDIT_COMMAND",
  "STALE_CUSTOMER_VERSION"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_CUSTOMER_EDIT_COMMAND") return 400;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "STALE_CUSTOMER_VERSION") return 409;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function PATCH(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const { customerId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    const result = await updateUnifiedCrmCustomerControlledEdit(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerControlledEditFailureCode);
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_ERROR_CONTRACT_VERSION,
      error: isTyped && error instanceof Error ? error.message : "Customer edit could not be recorded right now.",
      retryable: error instanceof UnifiedCrmCustomerControlledEditError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
