import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { deleteUnifiedCrmSavedView } from "@/server/services/unified-crm-saved-view-service";
import {
  UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION,
  UnifiedCrmSavedViewError,
  type UnifiedCrmSavedViewFailureCode
} from "@/server/unified-crm/saved-view-contract";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TYPED_CODES = new Set<UnifiedCrmSavedViewFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "SAVED_VIEW_FORBIDDEN",
  "SAVED_VIEW_INVALID",
  "SAVED_VIEW_NOT_FOUND",
  "SAVED_VIEW_UNAVAILABLE"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "SAVED_VIEW_INVALID") return 400;
  if (code === "SAVED_VIEW_FORBIDDEN") return 403;
  if (code === "SAVED_VIEW_NOT_FOUND") return 404;
  return 500;
}

function failure(error: unknown) {
  const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
  const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmSavedViewFailureCode);
  const message = typed && error instanceof Error ? error.message : "CRM saved view is unavailable right now.";
  return NextResponse.json({
    code: typed ? code : "SAVED_VIEW_UNAVAILABLE",
    contractVersion: UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION,
    error: message,
    retryable: error instanceof UnifiedCrmSavedViewError ? error.retryable : code === "SAVED_VIEW_UNAVAILABLE"
  }, { status: statusForCode(code) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteUnifiedCrmSavedView(await getCurrentUser(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
