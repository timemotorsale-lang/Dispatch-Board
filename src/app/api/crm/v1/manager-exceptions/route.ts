import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmManagerExceptionQueue } from "@/server/services/unified-crm-manager-exception-queue-service";
import {
  UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_ERROR_CONTRACT_VERSION,
  UnifiedCrmManagerExceptionQueueError,
  type UnifiedCrmManagerExceptionQueueFailureCode
} from "@/server/unified-crm/manager-exception-queue-contract";

const TYPED_CODES = new Set<UnifiedCrmManagerExceptionQueueFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "INVALID_MANAGER_EXCEPTION_QUERY",
  "MANAGER_EXCEPTION_NOT_AUTHORIZED",
  "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "INVALID_MANAGER_EXCEPTION_QUERY") return 400;
  if (code === "MANAGER_EXCEPTION_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "ORGANIZATION_SCOPE_AMBIGUOUS") return 409;
  if (code === "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  try {
    const result = await getUnifiedCrmManagerExceptionQueue(user, new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmManagerExceptionQueueFailureCode);
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_ERROR_CONTRACT_VERSION,
      error: isTyped && error instanceof Error ? error.message : "Manager CRM exceptions are temporarily unavailable.",
      retryable: error instanceof UnifiedCrmManagerExceptionQueueError
        ? error.retryable
        : code === "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE"
    }, { status: statusForCode(code) });
  }
}
