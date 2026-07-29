export type SalesConsoleM17ManagerReviewStatus =
  | "draft"
  | "ready"
  | "submit-disabled"
  | "submitted-placeholder"
  | "manager-reviewing"
  | "closed";

export type SalesConsoleM17ManagerReviewTransition = {
  from: SalesConsoleM17ManagerReviewStatus;
  reason: string;
  to: SalesConsoleM17ManagerReviewStatus;
};

export const salesConsoleM17RequestStateModel = {
  allowedTransitions: [
    { from: "draft", reason: "All required fields and source links are present.", to: "ready" },
    { from: "ready", reason: "No dedicated audited backend destination exists yet.", to: "submit-disabled" },
    { from: "submit-disabled", reason: "Future M17/M18 backend endpoint accepts audited internal request.", to: "submitted-placeholder" },
    { from: "submitted-placeholder", reason: "Manager opens request from internal review queue.", to: "manager-reviewing" },
    { from: "manager-reviewing", reason: "Manager closes the review without finance, quote, hold, or discount decision.", to: "closed" }
  ] as const satisfies readonly SalesConsoleM17ManagerReviewTransition[],
  currentStatus: "submit-disabled" as SalesConsoleM17ManagerReviewStatus,
  workflowLive: false
} as const;

export function salesConsoleM17StateModelDefinesStatuses() {
  return salesConsoleM17RequestStateModel.allowedTransitions.length === 5;
}

export function salesConsoleM17StateModelBlocksSubmitWithoutBackend() {
  return salesConsoleM17RequestStateModel.currentStatus === "submit-disabled" &&
    salesConsoleM17RequestStateModel.allowedTransitions.some((transition) =>
      transition.from === "ready" && transition.to === "submit-disabled"
    );
}

export function salesConsoleM17StateModelKeepsWorkflowInternal() {
  return salesConsoleM17RequestStateModel.workflowLive === false &&
    salesConsoleM17RequestStateModel.allowedTransitions.every((transition) =>
      !transition.reason.includes("customer") && !transition.reason.includes("quote submission")
    );
}
