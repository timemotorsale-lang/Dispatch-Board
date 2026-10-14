export const salesConsoleM19PersistenceContract = {
  milestone: "Milestone 19 — Audited Manager Review persistence",
  workflow: "Manager Review Request",
  activationBoundary: "Only Manager Review Request can create a live task; all other Sales Console write workflows remain blocked.",
  persistenceTargets: [
    {
      target: "EnterpriseCommandLedger",
      purpose: "Stores idempotency key, request hash, actor, command status, correlation ID, and result snapshot."
    },
    {
      target: "EnterpriseAuditEvent",
      purpose: "Stores who requested manager review, why, source snapshot, and the resulting task reference."
    },
    {
      target: "Task",
      purpose: "Creates one Sales task assigned to the selected manager for human review."
    }
  ],
  requiredGuardrails: [
    "Authenticate requester",
    "Validate payload",
    "Check idempotency before creating task",
    "Record audit event",
    "Return duplicate result without creating another task",
    "Keep quote, hold, finance, discount, and messaging workflows blocked"
  ],
  responseStatuses: ["created", "duplicate"] as const
} as const;

export function salesConsoleM19PersistenceContractDefinesTargets() {
  return salesConsoleM19PersistenceContract.persistenceTargets.length === 3;
}

export function salesConsoleM19PersistenceContractRequiresIdempotency() {
  return salesConsoleM19PersistenceContract.requiredGuardrails.includes("Check idempotency before creating task");
}

export function salesConsoleM19PersistenceContractKeepsOtherWorkflowsBlocked() {
  return salesConsoleM19PersistenceContract.requiredGuardrails.some((guardrail) =>
    guardrail.includes("quote, hold, finance, discount, and messaging")
  );
}
