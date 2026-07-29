import {
  salesConsoleM17SubmitPlaceholderBlocksWrites,
  salesConsoleM17SubmitPlaceholderNamesMissingBackend
} from "./sales-console-m17-audit-safe-submit-placeholder";
import {
  salesConsoleM17RequestFormControlsDisabled,
  salesConsoleM17RequestFormHasRequiredFields
} from "./sales-console-m17-request-form-shell";
import {
  salesConsoleM17StateModelBlocksSubmitWithoutBackend,
  salesConsoleM17StateModelDefinesStatuses
} from "./sales-console-m17-request-state-model";
import {
  salesConsoleM17PermissionsAllowManagerReviewOnly,
  salesConsoleM17PermissionsAllowSalespersonRequestOnly,
  salesConsoleM17ValidationBlocksSubmitUntilBackendReady
} from "./sales-console-m17-validation-permissions";

export type SalesConsoleM17ReleaseGate = {
  evidence: string;
  gate: string;
  status: "ready" | "blocked";
};

export const salesConsoleM17ReleaseGate = {
  gates: [
    {
      evidence: "State model defines draft, ready, submit-disabled, submitted-placeholder, manager-reviewing, and closed path.",
      gate: "State model",
      status: salesConsoleM17StateModelDefinesStatuses() ? "ready" : "blocked"
    },
    {
      evidence: "Form shell includes customer, deal, vehicle, reason, urgency, and source links.",
      gate: "Form shell",
      status: salesConsoleM17RequestFormHasRequiredFields() ? "ready" : "blocked"
    },
    {
      evidence: "Salesperson can request later; manager/admin can review later; BDC and unknown users cannot submit.",
      gate: "Permissions",
      status: salesConsoleM17PermissionsAllowSalespersonRequestOnly() && salesConsoleM17PermissionsAllowManagerReviewOnly() ? "ready" : "blocked"
    },
    {
      evidence: "Submit remains disabled because a dedicated audited Sales Console manager-review endpoint is missing.",
      gate: "Backend activation",
      status: salesConsoleM17SubmitPlaceholderNamesMissingBackend() ? "blocked" : "ready"
    }
  ] as const satisfies readonly SalesConsoleM17ReleaseGate[],
  releaseRecommendation: "Do not activate live submit yet. Build the dedicated audited manager-review backend endpoint next.",
  workflowLive: false
} as const;

export function salesConsoleM17ReleaseGateShellReady() {
  return salesConsoleM17ReleaseGate.gates.slice(0, 3).every((gate) => gate.status === "ready");
}

export function salesConsoleM17ReleaseGateBlocksLiveSubmit() {
  return salesConsoleM17ReleaseGate.workflowLive === false &&
    salesConsoleM17RequestFormControlsDisabled() &&
    salesConsoleM17StateModelBlocksSubmitWithoutBackend() &&
    salesConsoleM17ValidationBlocksSubmitUntilBackendReady() &&
    salesConsoleM17SubmitPlaceholderBlocksWrites();
}

export function salesConsoleM17ReleaseGateNamesNextBackendStep() {
  return salesConsoleM17ReleaseGate.releaseRecommendation.includes("dedicated audited manager-review backend endpoint");
}
