import { salesConsoleM16ManagerReviewContract } from "./sales-console-m16-manager-review-contract";

export type SalesConsoleM16AuditGuardrail = {
  evidence: string;
  guardrail: string;
  status: "blocked" | "ready-for-planning";
};

export const salesConsoleM16AuditGuardrails = {
  auditReadiness: [
    "Every future request requires sourceSnapshot.",
    "Every future request records requestedByUserId.",
    "Every future request records status changes.",
    "Every future request requires source deal/customer/vehicle identifiers."
  ] as const,
  excludedActionGuardrails: [
    {
      evidence: "Customer communication requires separate consent, template, opt-out, and audit controls.",
      guardrail: "No customer messaging automation",
      status: "blocked"
    },
    {
      evidence: "Quote submission remains outside M16 and cannot be triggered from Manager Review Request planning.",
      guardrail: "No quote submission",
      status: "blocked"
    },
    {
      evidence: "Inventory holds/reservations require expiration, conflict, source availability, and manager rules.",
      guardrail: "No vehicle holds or reservations",
      status: "blocked"
    },
    {
      evidence: "Finance decisions require lender/compliance controls and are not part of review-request planning.",
      guardrail: "No finance decisions",
      status: "blocked"
    },
    {
      evidence: "Discount approvals require manager policy and approval authority; M16 only plans review requests.",
      guardrail: "No discount approvals",
      status: "blocked"
    }
  ] as const satisfies readonly SalesConsoleM16AuditGuardrail[],
  readOnlyPlanningOnly: true
} as const;

export function salesConsoleM16AuditReadinessCoversRequestShape() {
  return salesConsoleM16AuditGuardrails.auditReadiness.length === 4 &&
    salesConsoleM16ManagerReviewContract.auditShape.includes("sourceSnapshot");
}

export function salesConsoleM16ExcludedActionsRemainBlocked() {
  return salesConsoleM16AuditGuardrails.excludedActionGuardrails.length === 5 &&
    salesConsoleM16AuditGuardrails.excludedActionGuardrails.every((guardrail) => guardrail.status === "blocked");
}

export function salesConsoleM16AuditGuardrailsRemainPlanningOnly() {
  return salesConsoleM16AuditGuardrails.readOnlyPlanningOnly &&
    salesConsoleM16ExcludedActionsRemainBlocked();
}
