import { salesConsoleM16ManagerReviewContract } from "./sales-console-m16-manager-review-contract";
import { salesConsoleM17ValidationPermissions } from "./sales-console-m17-validation-permissions";

export const salesConsoleM17AuditSafeSubmitPlaceholder = {
  backendDestination: "missing-dedicated-sales-manager-review-endpoint",
  intendedAuditFields: salesConsoleM16ManagerReviewContract.auditShape,
  placeholderResult: "No request submitted. No task created. No source system mutated.",
  submitActionEnabled: false,
  submitBlockers: [
    "Dedicated Sales Console manager-review endpoint missing",
    "Audit sink not connected to this workflow",
    "Server-side idempotency key not defined for sales review request",
    "Manager assignment resolver not connected",
    "Source snapshot persistence not implemented"
  ] as const,
  validationGateCount: salesConsoleM17ValidationPermissions.validationGates.length
} as const;

export function salesConsoleM17SubmitPlaceholderBlocksWrites() {
  return salesConsoleM17AuditSafeSubmitPlaceholder.submitActionEnabled === false &&
    salesConsoleM17AuditSafeSubmitPlaceholder.placeholderResult.includes("No task created");
}

export function salesConsoleM17SubmitPlaceholderNamesMissingBackend() {
  return salesConsoleM17AuditSafeSubmitPlaceholder.backendDestination === "missing-dedicated-sales-manager-review-endpoint" &&
    salesConsoleM17AuditSafeSubmitPlaceholder.submitBlockers.includes("Dedicated Sales Console manager-review endpoint missing");
}

export function salesConsoleM17SubmitPlaceholderIncludesAuditFields() {
  return salesConsoleM17AuditSafeSubmitPlaceholder.intendedAuditFields.includes("requestId") &&
    salesConsoleM17AuditSafeSubmitPlaceholder.intendedAuditFields.includes("sourceSnapshot");
}
