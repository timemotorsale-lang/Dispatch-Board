import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_CONTRACT_VERSION,
  UnifiedCrmWorkflowApprovalDesignerError,
  type UnifiedCrmWorkflowApprovalDesignerCheck,
  type UnifiedCrmWorkflowApprovalDesignerReadModel,
  type UnifiedCrmWorkflowSimulationPreview
} from "@/server/unified-crm/workflow-approval-designer-contract";

type Dependencies = { now?: () => Date };

const CHECKS: UnifiedCrmWorkflowApprovalDesignerCheck[] = [
  { category: "versioning", evidence: "Workflow drafts, simulations, published versions, and rollback versions must remain immutable and auditable.", holdOwner: null, status: "PASS" },
  { category: "simulation", evidence: "Simulation is allowed only as deterministic preview and cannot execute customer communications or source-domain mutations.", holdOwner: null, status: "PASS" },
  { category: "authority", evidence: "Approval rules must enforce requestor/approver separation, capability, purpose, organization, and amount/discount gates.", holdOwner: "product-owner", status: "HOLD" },
  { category: "limits", evidence: "Maximum workflow count, step count, fan-out, retry count, and run duration are not yet approved.", holdOwner: "architecture", status: "HOLD" },
  { category: "loopProtection", evidence: "Loop detection, recursion prevention, idempotency, and run cancellation must be proven before execution.", holdOwner: "quality", status: "HOLD" },
  { category: "observability", evidence: "Workflow runs require trace, status, failure, replay, and dead-letter visibility before activation.", holdOwner: "operations", status: "HOLD" },
  { category: "rollback", evidence: "Rollback disables published workflow execution and preserves manual approval fallbacks.", holdOwner: null, status: "PASS" },
  { category: "sandboxPublish", evidence: "Publishing requires sandbox proof, diff review, authorization, browser proof, and rollback rehearsal.", holdOwner: "product-owner", status: "HOLD" }
];

const SIMULATION_PREVIEWS: UnifiedCrmWorkflowSimulationPreview[] = [
  {
    id: "quote-discount-manager-review",
    name: "Quote discount manager review",
    trigger: "QUOTE_DISCOUNT_REQUESTED",
    simulatedOutcome: "ROUTE_TO_MANAGER",
    liveExecutionEnabled: false,
    steps: ["Validate quote version", "Check commercial authority", "Route to manager review"],
    blockedActions: ["No quote presentation", "No approval decision", "No customer communication"]
  },
  {
    id: "overdue-followup-review-task",
    name: "Overdue customer follow-up review task",
    trigger: "OVERDUE_CUSTOMER_FOLLOWUP",
    simulatedOutcome: "CREATE_REVIEW_TASK",
    liveExecutionEnabled: false,
    steps: ["Read Customer 360 next action", "Classify overdue state", "Preview governed task handoff"],
    blockedActions: ["No task creation", "No SMS reminder", "No email send"]
  },
  {
    id: "unassigned-opportunity-held",
    name: "Unassigned opportunity held review",
    trigger: "UNASSIGNED_OPPORTUNITY",
    simulatedOutcome: "NO_ACTION_HELD",
    liveExecutionEnabled: false,
    steps: ["Detect unassigned opportunity", "Preview owner requirement", "Surface manager queue item"],
    blockedActions: ["No owner assignment", "No stage move", "No notification"]
  }
];

export async function getUnifiedCrmWorkflowApprovalDesigner(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmWorkflowApprovalDesignerReadModel> {
  if (!actor) throw new UnifiedCrmWorkflowApprovalDesignerError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM workflow designer readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmWorkflowApprovalDesignerError("WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED", "CRM workflow designer readiness is available to the manager workspace.");
  }
  return {
    activation: { liveWorkflowExecutionEnabled: false, publishEnabled: false, simulationEnabled: true, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_WORKFLOW_APPROVAL_DESIGNER_CONTRACT_VERSION,
    simulationPreview: {
      state: "READY_REVIEW",
      liveExecutionEnabled: false,
      publishEnabled: false,
      previews: SIMULATION_PREVIEWS.map((preview) => ({
        ...preview,
        steps: [...preview.steps],
        blockedActions: [...preview.blockedActions]
      }))
    },
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "manual-approval-and-existing-source-workflows", featureControl: "crm.enterprise.workflowDesigner.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
