import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmProviderDecisionIntake } from "@/server/services/unified-crm-provider-decision-intake-service";
import {
  UNIFIED_CRM_PROVIDER_DECISION_INTAKE_ERROR_CONTRACT_VERSION,
  UnifiedCrmProviderDecisionIntakeError,
  type UnifiedCrmProviderDecisionIntakeFailureCode
} from "@/server/unified-crm/provider-decision-intake-contract";

const TYPED_CODES = new Set<UnifiedCrmProviderDecisionIntakeFailureCode>(["AUTHENTICATION_REQUIRED", "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmProviderDecisionIntake(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmProviderDecisionIntakeFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_PROVIDER_DECISION_INTAKE_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM provider decision intake is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmProviderDecisionIntakeError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
