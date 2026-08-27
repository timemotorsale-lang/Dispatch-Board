import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAiReceptionistSimulator } from "@/server/services/unified-crm-ai-receptionist-simulator-service";
import {
  UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_ERROR_CONTRACT_VERSION,
  UnifiedCrmAiReceptionistSimulatorError,
  type UnifiedCrmAiReceptionistSimulatorFailureCode
} from "@/server/unified-crm/ai-receptionist-simulator-contract";

const TYPED_CODES = new Set<UnifiedCrmAiReceptionistSimulatorFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAiReceptionistSimulator(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAiReceptionistSimulatorFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM AI receptionist simulator is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmAiReceptionistSimulatorError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
