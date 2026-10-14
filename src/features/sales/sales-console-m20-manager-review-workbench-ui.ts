export const salesConsoleM20ManagerReviewWorkbenchUi = {
  milestone: "Milestone 20 — Manager Review Workbench + UI Submit Activation",
  submitEndpoint: "/api/sales/manager-review-requests",
  submitEnabledForRoles: ["Salesperson", "Admin / Owner"],
  workbenchVisibleForRoles: ["Sales Manager", "Admin / Owner"],
  activeWorkflow: "Manager Review Request",
  nonManagerReviewActions: [
    "Quote submission planned",
    "Discount approval planned",
    "Finance decision planned",
    "Vehicle hold planned",
    "Customer messaging planned"
  ],
  submitFields: [
    { field: "customerId", label: "Customer source ID", required: true, value: "cust-1029" },
    { field: "dealId", label: "Deal source ID", required: true, value: "deal-8841" },
    { field: "vehicleId", label: "Vehicle source ID", required: true, value: "veh-7712" },
    { field: "assignedManagerUserId", label: "Manager user ID", required: true, value: "manager-001" },
    { field: "urgency", label: "Urgency", required: true, value: "high" },
    { field: "idempotencyKey", label: "Idempotency key", required: true, value: "mgr-review-demo-001" }
  ],
  responseStates: [
    { state: "success", label: "Created", meaning: "Task ID, audit ID, command ID, correlation ID, and idempotency key are shown." },
    { state: "duplicate", label: "Duplicate", meaning: "Existing task is returned without creating another manager review request." },
    { state: "validation-error", label: "Validation error", meaning: "Missing or invalid source fields are explained before retry." },
    { state: "auth-error", label: "Auth error", meaning: "Unauthenticated or unauthorized staff cannot submit." },
    { state: "conflict", label: "Idempotency conflict", meaning: "Reused idempotency key with different payload is blocked." }
  ],
  workbenchRows: [
    {
      auditEventId: "audit-evt-demo-001",
      commandId: "cmd-demo-001",
      correlationId: "corr-demo-001",
      idempotencyKey: "mgr-review-demo-001",
      requester: "Salesperson",
      status: "open",
      taskId: "task-demo-001"
    },
    {
      auditEventId: "audit-evt-demo-002",
      commandId: "cmd-demo-002",
      correlationId: "corr-demo-002",
      idempotencyKey: "mgr-review-demo-002",
      requester: "Admin / Owner",
      status: "duplicate-safe",
      taskId: "task-demo-002"
    }
  ]
} as const;

export function salesConsoleM20SubmitIsActiveOnlyForManagerReview() {
  return salesConsoleM20ManagerReviewWorkbenchUi.activeWorkflow === "Manager Review Request";
}

export function salesConsoleM20WorkbenchShowsAuditIdentifiers() {
  return salesConsoleM20ManagerReviewWorkbenchUi.workbenchRows.every((row) =>
    Boolean(row.taskId && row.auditEventId && row.commandId && row.correlationId && row.idempotencyKey)
  );
}

export function salesConsoleM20KeepsNonManagerActionsPlanned() {
  return salesConsoleM20ManagerReviewWorkbenchUi.nonManagerReviewActions.every((action) => action.includes("planned"));
}
