import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { logUnifiedCrmCustomerNote } from "@/server/services/unified-crm-customer-note-service";
import {
  UNIFIED_CRM_CUSTOMER_NOTE_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerNoteError,
  type UnifiedCrmCustomerNoteFailureCode
} from "@/server/unified-crm/customer-note-command";

const TYPED_CODES = new Set<UnifiedCrmCustomerNoteFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_360_NOT_AUTHORIZED",
  "CUSTOMER_360_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_NOTE_COMMAND",
  "RESTRICTED_NOTE_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_NOTE_COMMAND") return 400;
  if (code === "CUSTOMER_360_NOT_AUTHORIZED" || code === "RESTRICTED_NOTE_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED") return 409;
  if (code === "CUSTOMER_360_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const { customerId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    const result = await logUnifiedCrmCustomerNote(user, customerId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerNoteFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Customer note could not be recorded right now.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_NOTE_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmCustomerNoteError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
