import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createUnifiedCrmCustomerTaskBridge } from "@/server/services/unified-crm-customer-task-bridge-service";

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
    const message = error instanceof Error ? error.message : "CRM task handoff could not be completed safely.";
    return NextResponse.json({ code, error: message }, { status: statusFor(code) });
  }
}
