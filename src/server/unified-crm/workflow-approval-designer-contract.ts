export const UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_CONTRACT_VERSION = "ucrm.workflow-approval-designer/v1" as const;
export const UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_ERROR_CONTRACT_VERSION = "ucrm.workflow-approval-designer-error/v1" as const;

export type UnifiedCrmWorkflowApprovalDesignerStatus = "PASS" | "HOLD";

export type UnifiedCrmWorkflowApprovalDesignerCheck = {
  category: "versioning" | "simulation" | "authority" | "limits" | "loopProtection" | "observability" | "rollback" | "sandboxPublish";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmWorkflowApprovalDesignerStatus;
};

export type UnifiedCrmWorkflowSimulationPreview = {
  id: string;
  name: string;
  trigger: "QUOTE_DISCOUNT_REQUESTED" | "OVERDUE_CUSTOMER_FOLLOWUP" | "UNASSIGNED_OPPORTUNITY";
  simulatedOutcome: "ROUTE_TO_MANAGER" | "CREATE_REVIEW_TASK" | "NO_ACTION_HELD";
  liveExecutionEnabled: false;
  steps: string[];
  blockedActions: string[];
};

export type UnifiedCrmWorkflowApprovalDesignerReadModel = {
  activation: {
    liveWorkflowExecutionEnabled: false;
    publishEnabled: false;
    simulationEnabled: true;
    state: "HELD";
  };
  checks: UnifiedCrmWorkflowApprovalDesignerCheck[];
  contractVersion: typeof UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_CONTRACT_VERSION;
  simulationPreview: {
    state: "READY_REVIEW";
    liveExecutionEnabled: false;
    publishEnabled: false;
    previews: UnifiedCrmWorkflowSimulationPreview[];
  };
  generatedAt: string;
  rollback: { fallback: "manual-approval-and-existing-source-workflows"; featureControl: "crm.enterprise.workflowDesigner.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmWorkflowApprovalDesignerFailureCode = "AUTHENTICATION_REQUIRED" | "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmWorkflowApprovalDesignerFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED: 403
};

export class UnifiedCrmWorkflowApprovalDesignerError extends Error {
  readonly code: UnifiedCrmWorkflowApprovalDesignerFailureCode;
  readonly contractVersion = UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmWorkflowApprovalDesignerFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmWorkflowApprovalDesignerError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
