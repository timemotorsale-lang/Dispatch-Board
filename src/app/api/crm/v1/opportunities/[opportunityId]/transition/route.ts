import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { transitionUnifiedCrmOpportunity } from "@/server/services/unified-crm-opportunity-transition-command-service";
import {
  UNIFIED_CRM_OPPORTUNITY_TRANSITION_ERROR_CONTRACT_VERSION,
  UnifiedCrmOpportunityTransitionError,
  type UnifiedCrmOpportunityTransitionFailureCode
} from "@/server/unified-crm/opportunity-transition-command";

type Context = {
  params: Promise<{ opportunityId: string }>;
};

const TYPED_CODES = new Set<UnifiedCrmOpportunityTransitionFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_OPPORTUNITY_TRANSITION",
  "OPPORTUNITY_NOT_AUTHORIZED",
  "OPPORTUNITY_NOT_AVAILABLE",
  "OPPORTUNITY_OFF",
  "OPPORTUNITY_SOURCE_UNAVAILABLE",
  "OPPORTUNITY_TRANSITION_NOT_ALLOWED",
  "OPPORTUNITY_TRANSITION_NOT_AUTHORIZED",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "VERSION_CONFLICT"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_OPPORTUNITY_TRANSITION") return 400;
  if (code === "OPPORTUNITY_NOT_AUTHORIZED" || code === "OPPORTUNITY_TRANSITION_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "OPPORTUNITY_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "OPPORTUNITY_TRANSITION_NOT_ALLOWED" || code === "ORGANIZATION_SCOPE_AMBIGUOUS" || code === "VERSION_CONFLICT") return 409;
  if (code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  const [payload, params] = await Promise.all([
    request.json().catch(() => null),
    context.params
  ]);

  try {
    const result = await transitionUnifiedCrmOpportunity(user, params.opportunityId, payload ?? {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmOpportunityTransitionFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "Opportunity transition could not be completed right now.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_OPPORTUNITY_TRANSITION_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmOpportunityTransitionError
        ? error.retryable
        : code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
