import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { logUnifiedCrmCustomerInteraction } from "@/server/services/unified-crm-customer-interaction-service";

function statusFor(message: string, code?: string) {
  if (message === "Authentication required." || code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "OUTBOUND_CONSENT_REQUIRED") return 409;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  return 400;
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { customerId } = await context.params;

  try {
    const result = await logUnifiedCrmCustomerInteraction(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record the customer interaction right now.";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : undefined;
    return NextResponse.json({ error: message, code }, { status: statusFor(message, code) });
  }
}
