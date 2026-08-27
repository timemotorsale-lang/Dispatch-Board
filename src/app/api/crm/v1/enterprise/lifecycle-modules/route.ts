import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmLifecycleModules } from "@/server/services/unified-crm-lifecycle-modules-service";
import { UNIFIED_CRM_LIFECYCLE_MODULES_ERROR_CONTRACT_VERSION, UnifiedCrmLifecycleModulesError, type UnifiedCrmLifecycleModulesFailureCode } from "@/server/unified-crm/lifecycle-modules-contract";

const TYPED_CODES = new Set<UnifiedCrmLifecycleModulesFailureCode>(["AUTHENTICATION_REQUIRED", "LIFECYCLE_MODULES_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "LIFECYCLE_MODULES_NOT_AUTHORIZED" ? 403 : 500;
export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmLifecycleModules(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmLifecycleModulesFailureCode);
    return NextResponse.json({ code: typed ? code : undefined, contractVersion: UNIFIED_CRM_LIFECYCLE_MODULES_ERROR_CONTRACT_VERSION, error: typed && error instanceof Error ? error.message : "CRM lifecycle module readiness is temporarily unavailable.", retryable: error instanceof UnifiedCrmLifecycleModulesError ? error.retryable : false }, { status: statusForCode(code) });
  }
}
