import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createUnifiedCrmSavedView, listUnifiedCrmSavedViews } from "@/server/services/unified-crm-saved-view-service";
import {
  UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION,
  UnifiedCrmSavedViewError,
  type UnifiedCrmSavedViewFailureCode
} from "@/server/unified-crm/saved-view-contract";

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
  const message = typed && error instanceof Error ? error.message : "CRM saved views are unavailable right now.";
  return NextResponse.json({
    code: typed ? code : "SAVED_VIEW_UNAVAILABLE",
    contractVersion: UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION,
    error: message,
    retryable: error instanceof UnifiedCrmSavedViewError ? error.retryable : code === "SAVED_VIEW_UNAVAILABLE"
  }, { status: statusForCode(code) });
}

export async function GET() {
  try {
    return NextResponse.json(await listUnifiedCrmSavedViews(await getCurrentUser()));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  try {
    return NextResponse.json({ savedView: await createUnifiedCrmSavedView(await getCurrentUser(), payload) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
