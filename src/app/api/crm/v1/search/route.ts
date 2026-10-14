import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { searchUnifiedCrm } from "@/server/services/unified-crm-global-search-service";
import {
  UNIFIED_CRM_GLOBAL_SEARCH_ERROR_CONTRACT_VERSION,
  UnifiedCrmGlobalSearchError,
  type UnifiedCrmGlobalSearchFailureCode
} from "@/server/unified-crm/global-search-contract";

const TYPED_CODES = new Set<UnifiedCrmGlobalSearchFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "GLOBAL_SEARCH_NOT_AUTHORIZED",
  "GLOBAL_SEARCH_OFF",
  "GLOBAL_SEARCH_SOURCE_UNAVAILABLE",
  "INVALID_GLOBAL_SEARCH_QUERY",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_GLOBAL_SEARCH_QUERY") return 400;
  if (code === "GLOBAL_SEARCH_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "GLOBAL_SEARCH_OFF" || code === "GLOBAL_SEARCH_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  try {
    const result = await searchUnifiedCrm(user, new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmGlobalSearchFailureCode);
    const message = isTyped && error instanceof Error ? error.message : "CRM search is temporarily unavailable.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_GLOBAL_SEARCH_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmGlobalSearchError
        ? error.retryable
        : code === "GLOBAL_SEARCH_OFF" || code === "GLOBAL_SEARCH_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
