import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmWorkflowApprovalDesigner } from "@/server/services/unified-crm-workflow-approval-designer-service";
import { UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_ERROR_CONTRACT_VERSION, UnifiedCrmWorkflowApprovalDesignerError, type UnifiedCrmWorkflowApprovalDesignerFailureCode } from "@/server/unified-crm/workflow-approval-designer-contract";

const TYPED_CODES = new Set<UnifiedCrmWorkflowApprovalDesignerFailureCode>(["AUTHENTICATION_REQUIRED", "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED"]);
const statusForCode = (code: string | undefined) => code === "AUTHENTICATION_REQUIRED" ? 401 : code === "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED" ? 403 : 500;

export async function GET() {
  try {
    return NextResponse.json(await getUnifiedCrmWorkflowApprovalDesigner(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmWorkflowApprovalDesignerFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "CRM workflow designer readiness is temporarily unavailable.",
      retryable: error instanceof UnifiedCrmWorkflowApprovalDesignerError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
