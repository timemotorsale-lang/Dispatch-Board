import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmAccessibilityResponsiveGate } from "@/server/services/unified-crm-accessibility-responsive-service";
import {
  UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_ERROR_CONTRACT_VERSION,
  UnifiedCrmAccessibilityResponsiveError,
  type UnifiedCrmAccessibilityResponsiveFailureCode
} from "@/server/unified-crm/accessibility-responsive-contract";

const TYPED_CODES = new Set<UnifiedCrmAccessibilityResponsiveFailureCode>([
  "ACCESSIBILITY_GATE_NOT_AUTHORIZED",
  "AUTHENTICATION_REQUIRED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "ACCESSIBILITY_GATE_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmAccessibilityResponsiveGate(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmAccessibilityResponsiveFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM accessibility and responsive verification is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmAccessibilityResponsiveError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
