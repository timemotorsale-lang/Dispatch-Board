import { salesConsoleM16ManagerReviewContract } from "./sales-console-m16-manager-review-contract";
import { salesConsoleM17RequestFormShell } from "./sales-console-m17-request-form-shell";

export type SalesConsoleM17PermissionDecision = {
  canRequest: boolean;
  canReview: boolean;
  reason: string;
  role: "salesperson" | "sales-manager" | "admin-owner" | "bdc-lead-coordinator" | "unknown";
};

export const salesConsoleM17ValidationPermissions = {
  decisions: [
    { canRequest: true, canReview: false, reason: "Can prepare a request once source and audit gates pass.", role: "salesperson" },
    { canRequest: false, canReview: true, reason: "Can review future requests but cannot self-approve finance, discount, quote, or hold outcomes.", role: "sales-manager" },
    { canRequest: false, canReview: true, reason: "Can review workflow health and future requests with owner visibility.", role: "admin-owner" },
    { canRequest: false, canReview: false, reason: "Lead coordinator remains visibility-only for manager review requests.", role: "bdc-lead-coordinator" },
    { canRequest: false, canReview: false, reason: "Unknown users are blocked by default.", role: "unknown" }
  ] as const satisfies readonly SalesConsoleM17PermissionDecision[],
  validationGates: [
    "customer source link present",
    "deal source link present",
    "vehicle source link present",
    "reason provided",
    "urgency selected",
    "assigned manager mapped",
    "audit destination ready",
    "dedicated backend endpoint ready"
  ] as const,
  submitEnabled: false
} as const;

export function salesConsoleM17PermissionsAllowSalespersonRequestOnly() {
  return salesConsoleM17ValidationPermissions.decisions.some((decision) => decision.role === "salesperson" && decision.canRequest) &&
    salesConsoleM17ValidationPermissions.decisions
      .filter((decision) => decision.role !== "salesperson")
      .every((decision) => !decision.canRequest);
}

export function salesConsoleM17PermissionsAllowManagerReviewOnly() {
  return salesConsoleM17ValidationPermissions.decisions.some((decision) => decision.role === "sales-manager" && decision.canReview) &&
    salesConsoleM17ValidationPermissions.decisions.some((decision) => decision.role === "admin-owner" && decision.canReview) &&
    salesConsoleM17ValidationPermissions.decisions.some((decision) => decision.role === "bdc-lead-coordinator" && !decision.canReview);
}

export function salesConsoleM17ValidationBlocksSubmitUntilBackendReady() {
  return salesConsoleM17ValidationPermissions.submitEnabled === false &&
    salesConsoleM17ValidationPermissions.validationGates.includes("dedicated backend endpoint ready") &&
    salesConsoleM17RequestFormShell.submitDisabled &&
    salesConsoleM16ManagerReviewContract.writeActivation === "disabled-until-m17";
}
