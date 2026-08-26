import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { prepareUnifiedCrmQuoteOperationalHandoff } from "@/server/services/unified-crm-quote-operational-handoff-service";
import {
  UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION,
  UnifiedCrmQuoteOperationalHandoffError,
  statusForUnifiedCrmQuoteOperationalHandoffError,
  type UnifiedCrmQuoteOperationalHandoffFailureCode
} from "@/server/unified-crm/quote-operational-handoff-contract";

const TYPED_CODES = new Set<UnifiedCrmQuoteOperationalHandoffFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "HANDOFF_APPROVAL_REQUIRED",
  "HANDOFF_OFF",
  "HANDOFF_SOURCE_UNAVAILABLE",
  "QUOTE_NOT_AVAILABLE",
  "UNAUTHORIZED_HANDOFF"
]);

type Props = {
  params: Promise<{ quoteId: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const route = await params;
    return NextResponse.json(await prepareUnifiedCrmQuoteOperationalHandoff(user, route.quoteId), { status: 200 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmQuoteOperationalHandoffFailureCode);
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION,
      error: isTyped && error instanceof Error ? error.message : "Quote handoff review could not be prepared right now.",
      retryable: error instanceof UnifiedCrmQuoteOperationalHandoffError
        ? error.retryable
        : code === "HANDOFF_OFF" || code === "HANDOFF_SOURCE_UNAVAILABLE"
    }, { status: statusForUnifiedCrmQuoteOperationalHandoffError(code) });
  }
}
