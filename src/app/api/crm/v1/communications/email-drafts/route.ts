import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmEmailDraftSurface } from "@/server/services/unified-crm-email-draft-surface-service";
import { UNIFIED_CRM_EMAIL_DRAFT_SURFACE_ERROR_CONTRACT_VERSION, UnifiedCrmEmailDraftSurfaceError, type UnifiedCrmEmailDraftSurfaceFailureCode } from "@/server/unified-crm/email-draft-surface-contract";

const TYPED_CODES = new Set<UnifiedCrmEmailDraftSurfaceFailureCode>(["AUTHENTICATION_REQUIRED", "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED" ? 403 : 500;
export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmEmailDraftSurface(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmEmailDraftSurfaceFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_EMAIL_DRAFT_SURFACE_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM email draft readiness is temporarily unavailable.", retryable: error instanceof UnifiedCrmEmailDraftSurfaceError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
