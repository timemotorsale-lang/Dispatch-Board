import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createUnifiedCrmCustomerTaskBridge } from "@/server/services/unified-crm-customer-task-bridge-service";
import {
  UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerTaskBridgeError,
  type UnifiedCrmCustomerTaskBridgeFailureCode
} from "@/server/unified-crm/customer-task-bridge-command";

const TYPED_CODES = new Set<UnifiedCrmCustomerTaskBridgeFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED",
  "CUSTOMER_TASK_BRIDGE_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "INVALID_TASK_BRIDGE_COMMAND",
  "IDEMPOTENCY_KEY_REUSED",
  "TASK_SOURCE_UNAVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusFor(code: string | undefined, duplicate = false) {
  if (duplicate) return 200;
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "INVALID_TASK_BRIDGE_COMMAND") return 400;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "CUSTOMER_TASK_BRIDGE_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE" || code === "TASK_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { customerId } = await params;

  try {
    const result = await createUnifiedCrmCustomerTaskBridge(user, customerId, payload);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerTaskBridgeFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "CRM task handoff could not be completed safely.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmCustomerTaskBridgeError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE" || code === "TASK_SOURCE_UNAVAILABLE"
    }, { status: statusFor(code) });
  }
}
