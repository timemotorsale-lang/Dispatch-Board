import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCommunicationGuardrails } from "@/server/services/unified-crm-communication-guardrails-service";
import {
  UNIFIED_CRM_COMMUNICATION_GUARDRAILS_ERROR_CONTRACT_VERSION,
  UnifiedCrmCommunicationGuardrailsError,
  type UnifiedCrmCommunicationGuardrailsFailureCode
} from "@/server/unified-crm/communication-guardrails-contract";

const TYPED_CODES = new Set<UnifiedCrmCommunicationGuardrailsFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmCommunicationGuardrails(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCommunicationGuardrailsFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_COMMUNICATION_GUARDRAILS_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM communication guardrails are temporarily unavailable.",
      retryable: error instanceof UnifiedCrmCommunicationGuardrailsError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
