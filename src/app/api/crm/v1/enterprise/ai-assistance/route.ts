import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmGovernedAiAssistance } from "@/server/services/unified-crm-governed-ai-assistance-service";
import { UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_ERROR_CONTRACT_VERSION, UnifiedCrmGovernedAiAssistanceError, type UnifiedCrmGovernedAiAssistanceFailureCode } from "@/server/unified-crm/governed-ai-assistance-contract";

const TYPED_CODES = new Set<UnifiedCrmGovernedAiAssistanceFailureCode>(["AUTHENTICATION_REQUIRED", "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED" ? 403 : 500;
export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmGovernedAiAssistance(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmGovernedAiAssistanceFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM AI assistance readiness is temporarily unavailable.", retryable: error instanceof UnifiedCrmGovernedAiAssistanceError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
