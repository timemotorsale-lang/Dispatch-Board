import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateUnifiedCrmCustomerNextAction } from "@/server/services/unified-crm-customer-next-action-service";

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  if (code === "STALE_NEXT_ACTION" || code === "CUSTOMER_OWNER_REQUIRED" || code === "NO_ACTIVE_NEXT_ACTION" || code === "IDEMPOTENCY_KEY_REUSED") return 409;
  return 400;
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const { customerId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    const result = await updateUnifiedCrmCustomerNextAction(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Customer next action could not be updated right now.";
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    return NextResponse.json({ error: message }, { status: statusForCode(code) });
  }
}
