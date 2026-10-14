import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createUnifiedCrmOpportunity } from "@/server/services/unified-crm-opportunity-create-command-service";
import {
  UNIFIED_CRM_OPPORTUNITY_CREATE_ERROR_CONTRACT_VERSION,
  UnifiedCrmOpportunityCreateError,
  type UnifiedCrmOpportunityCreateFailureCode
} from "@/server/unified-crm/opportunity-create-command";

const TYPED_CODES = new Set<UnifiedCrmOpportunityCreateFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_NOT_AVAILABLE",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_OPPORTUNITY_COMMAND",
  "OPPORTUNITY_CREATE_NOT_AUTHORIZED",
  "OPPORTUNITY_NOT_AUTHORIZED",
  "OPPORTUNITY_OFF",
  "OPPORTUNITY_SOURCE_UNAVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "OWNER_NOT_AVAILABLE",
  "SOURCE_LEAD_NOT_AVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_OPPORTUNITY_COMMAND") return 400;
  if (code === "OPPORTUNITY_CREATE_NOT_AUTHORIZED" || code === "OPPORTUNITY_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE" || code === "OWNER_NOT_AVAILABLE" || code === "SOURCE_LEAD_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const result = await createUnifiedCrmOpportunity(user, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmOpportunityCreateFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Opportunity could not be created right now.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_OPPORTUNITY_CREATE_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmOpportunityCreateError
        ? error.retryable
        : code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}

