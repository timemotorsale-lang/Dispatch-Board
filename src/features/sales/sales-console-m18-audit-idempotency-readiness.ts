export const salesConsoleM18AuditIdempotencyReadiness = {
  activationState: "readiness-only",
  auditRequiredBeforePersistence: true,
  idempotencyRequiredBeforePersistence: true,
  livePersistenceEnabled: false,
  requirements: [
    {
      requirement: "Immutable audit event for every accepted request",
      reason: "Managers and owners need a durable trail showing who requested review, what source records were referenced, and when."
    },
    {
      requirement: "Idempotency key checked before task creation",
      reason: "Repeated clicks, retries, or network replays must not create duplicate manager review work."
    },
    {
      requirement: "Source snapshot retained with request record",
      reason: "The source systems remain the record of truth, but the review request needs the exact context that triggered it."
    },
    {
      requirement: "Blocked-write response remains active until audit storage exists",
      reason: "The route can validate safely now, but real persistence waits for an auditable store."
    }
  ],
  mergeGate: "Do not enable live manager-review persistence until audit event storage and idempotency checks are implemented and tested."
} as const;

export function salesConsoleM18AuditReadinessRequiresAuditEvent() {
  return salesConsoleM18AuditIdempotencyReadiness.requirements.some((item) => item.requirement.includes("audit event"));
}

export function salesConsoleM18AuditReadinessRequiresIdempotency() {
  return salesConsoleM18AuditIdempotencyReadiness.requirements.some((item) => item.requirement.includes("Idempotency key"));
}

export function salesConsoleM18AuditReadinessBlocksPersistence() {
  return salesConsoleM18AuditIdempotencyReadiness.livePersistenceEnabled === false;
}
