import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCustomerDuplicateCandidates } from "@/server/services/unified-crm-customer-duplicate-candidate-service";
import {
  UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_ERROR_CONTRACT_VERSION,
  UnifiedCrmCustomerDuplicateCandidateError,
  type UnifiedCrmCustomerDuplicateCandidateFailureCode
} from "@/server/unified-crm/customer-duplicate-candidate-contract";

const TYPED_CODES = new Set<UnifiedCrmCustomerDuplicateCandidateFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED",
  "CUSTOMER_DUPLICATE_WARNING_OFF",
  "CUSTOMER_NOT_AVAILABLE",
  "CUSTOMER_SOURCE_UNAVAILABLE",
  "INVALID_DUPLICATE_WARNING_QUERY"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_DUPLICATE_WARNING_QUERY") return 400;
  if (code === "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED") return 403;
  if (code === "CUSTOMER_NOT_AVAILABLE") return 404;
  if (code === "CUSTOMER_DUPLICATE_WARNING_OFF" || code === "CUSTOMER_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function GET(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const { customerId } = await context.params;
  const url = new URL(request.url);

  try {
    return NextResponse.json(await getUnifiedCrmCustomerDuplicateCandidates(user, customerId, {
      displayName: url.searchParams.get("displayName"),
      email: url.searchParams.get("email"),
      phoneNumber: url.searchParams.get("phoneNumber")
    }));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmCustomerDuplicateCandidateFailureCode);
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_ERROR_CONTRACT_VERSION,
      error: isTyped && error instanceof Error ? error.message : "Customer duplicate warning could not be loaded right now.",
      retryable: error instanceof UnifiedCrmCustomerDuplicateCandidateError
        ? error.retryable
        : code === "CUSTOMER_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
