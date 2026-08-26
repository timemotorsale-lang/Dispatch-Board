import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { decideUnifiedCrmCommercialApproval } from "@/server/services/unified-crm-commercial-approval-service";
import {
  UNIFIED_CRM_COMMERCIAL_APPROVAL_ERROR_CONTRACT_VERSION,
  UnifiedCrmCommercialApprovalError,
  statusForUnifiedCrmCommercialApprovalError,
  type UnifiedCrmCommercialApprovalFailureCode
} from "@/server/unified-crm/commercial-approval-command";

const TYPED_CODES = new Set<UnifiedCrmCommercialApprovalFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "COMMERCIAL_APPROVAL_OFF",
  "COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE",
  "COMMERCIAL_APPROVAL_VERSION_CONFLICT",
  "IDEMPOTENCY_KEY_REUSED",
  "INVALID_COMMERCIAL_APPROVAL_COMMAND",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE",
  "QUOTE_NOT_AVAILABLE",
  "REQUEST_NOT_AVAILABLE",
  "REQUEST_NOT_PENDING",
  "SELF_APPROVAL_NOT_ALLOWED",
  "UNAUTHORIZED_COMMERCIAL_APPROVAL"
]);

type Props = {
  params: Promise<{ requestId: string }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const route = await params;
    const body = await request.json().catch(() => ({}));
    const result = await decideUnifiedCrmCommercialApproval(user, route.requestId, body && typeof body === "object" ? body : {});
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCommercialApprovalFailureCode);
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_COMMERCIAL_APPROVAL_ERROR_CONTRACT_VERSION,
      error: isTyped && error instanceof Error ? error.message : "Commercial approval decision could not be recorded right now.",
      retryable: error instanceof UnifiedCrmCommercialApprovalError
        ? error.retryable
        : code === "COMMERCIAL_APPROVAL_OFF" || code === "COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE"
    }, { status: statusForUnifiedCrmCommercialApprovalError(code) });
  }
}
