import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAiReceptionistRequirements } from "@/server/services/unified-crm-ai-receptionist-requirements-service";
import {
  UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_ERROR_CONTRACT_VERSION,
  UnifiedCrmAiReceptionistRequirementsError,
  type UnifiedCrmAiReceptionistRequirementsFailureCode
} from "@/server/unified-crm/ai-receptionist-requirements-contract";

const TYPED_CODES = new Set<UnifiedCrmAiReceptionistRequirementsFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAiReceptionistRequirements(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAiReceptionistRequirementsFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM AI receptionist requirements are temporarily unavailable.",
      retryable: error instanceof UnifiedCrmAiReceptionistRequirementsError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
