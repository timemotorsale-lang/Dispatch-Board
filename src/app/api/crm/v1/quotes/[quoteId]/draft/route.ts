import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { saveUnifiedCrmQuoteDraft } from "@/server/services/unified-crm-quote-draft-service";
import {
  UNIFIED_CRM_QUOTE_DRAFT_ERROR_CONTRACT_VERSION,
  UnifiedCrmQuoteDraftError,
  type UnifiedCrmQuoteDraftFailureCode
} from "@/server/unified-crm/quote-draft-command";

const TYPED_CODES = new Set<UnifiedCrmQuoteDraftFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_QUOTE_COMMAND",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "QUOTE_DRAFT_OFF",
  "QUOTE_MUTATION_HELD",
  "QUOTE_NOT_AUTHORIZED",
  "QUOTE_NOT_AVAILABLE",
  "QUOTE_OFF",
  "QUOTE_SOURCE_UNAVAILABLE",
  "QUOTE_VERSION_CONFLICT"
]);

function statusFor(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_QUOTE_COMMAND") return 400;
  if (code === "QUOTE_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "QUOTE_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "QUOTE_VERSION_CONFLICT" || code === "ORGANIZATION_SCOPE_AMBIGUOUS" || code === "QUOTE_MUTATION_HELD") return 409;
  if (code === "QUOTE_DRAFT_OFF" || code === "QUOTE_OFF" || code === "QUOTE_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

type Props = {
  params: Promise<{ quoteId: string }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const route = await params;
    const body = await request.json().catch(() => ({}));
    const result = await saveUnifiedCrmQuoteDraft(user, {
      ...(body && typeof body === "object" ? body : {}),
      quoteId: route.quoteId
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmQuoteDraftFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Quote draft could not be saved right now.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_QUOTE_DRAFT_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmQuoteDraftError
        ? error.retryable
        : code === "QUOTE_SOURCE_UNAVAILABLE" || code === "QUOTE_OFF" || code === "QUOTE_DRAFT_OFF"
    }, { status: statusFor(code) });
  }
}
