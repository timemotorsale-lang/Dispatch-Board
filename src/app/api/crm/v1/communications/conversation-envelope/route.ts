import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmConversationEnvelope } from "@/server/services/unified-crm-conversation-envelope-service";
import {
  UNIFIED_CRM_CONVERSATION_ENVELOPE_ERROR_CONTRACT_VERSION,
  UnifiedCrmConversationEnvelopeError,
  type UnifiedCrmConversationEnvelopeFailureCode
} from "@/server/unified-crm/conversation-envelope-contract";

const TYPED_CODES = new Set<UnifiedCrmConversationEnvelopeFailureCode>(["AUTHENTICATION_REQUIRED", "CONVERSATION_ENVELOPE_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "CONVERSATION_ENVELOPE_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmConversationEnvelope(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmConversationEnvelopeFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_CONVERSATION_ENVELOPE_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM conversation envelope readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmConversationEnvelopeError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
