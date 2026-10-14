import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { presentUnifiedCrmQuote } from "@/server/services/unified-crm-quote-present-service";
import {
  UNIFIED_CRM_QUOTE_PRESENT_ERROR_CONTRACT_VERSION,
  UnifiedCrmQuotePresentError,
  type UnifiedCrmQuotePresentFailureCode
} from "@/server/unified-crm/quote-present-command";

const TYPED_CODES = new Set<UnifiedCrmQuotePresentFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "QUOTE_MUTATION_HELD",
  "QUOTE_NOT_AUTHORIZED",
  "QUOTE_OFF"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "QUOTE_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "QUOTE_MUTATION_HELD" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "QUOTE_OFF") return 503;
  return 500;
}

export async function POST(_request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const user = await getCurrentUser();
  const { quoteId } = await context.params;

  try {
    const result = await presentUnifiedCrmQuote(user, quoteId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmQuotePresentFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Quote presentation is not available right now.";

    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_QUOTE_PRESENT_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmQuotePresentError ? error.retryable : code === "QUOTE_OFF"
    }, { status: statusForCode(code) });
  }
}
