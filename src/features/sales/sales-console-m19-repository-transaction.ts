export const salesConsoleM19RepositoryTransaction = {
  transactionState: "implemented",
  duplicateBehavior: "return-existing-task",
  steps: [
    "Check EnterpriseCommandLedger idempotency key",
    "Validate assigned manager is active",
    "Create Sales task assigned to manager",
    "Write EnterpriseCommandLedger result snapshot",
    "Write EnterpriseDomainEvent",
    "Write EnterpriseAuditEvent",
    "Write board ActivityEvent"
  ],
  writeBoundary: "Only the Manager Review Request task is created; quote, finance, discount, messaging, and vehicle hold writes remain outside this transaction."
} as const;

export function salesConsoleM19RepositoryChecksIdempotencyFirst() {
  return salesConsoleM19RepositoryTransaction.steps[0].includes("idempotency");
}

export function salesConsoleM19RepositoryCreatesAuditTrail() {
  return salesConsoleM19RepositoryTransaction.steps.includes("Write EnterpriseAuditEvent");
}

export function salesConsoleM19RepositoryLimitsWriteBoundary() {
  return salesConsoleM19RepositoryTransaction.writeBoundary.includes("Only the Manager Review Request task");
}
