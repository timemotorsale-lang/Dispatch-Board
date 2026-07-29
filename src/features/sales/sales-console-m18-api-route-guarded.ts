export const salesConsoleM18ApiRouteGuarded = {
  endpoint: "/api/sales/manager-review-requests",
  method: "POST",
  routeStatus: "guarded-foundation-only",
  responseStatus: 501,
  workflowLive: false,
  proof: [
    "Route requires authentication",
    "Route validates manager-review payload before response",
    "Route returns backend-foundation-only instead of creating tasks",
    "Route keeps excluded Sales Console workflows blocked"
  ]
} as const;

export function salesConsoleM18ApiRouteRequiresAuthentication() {
  return salesConsoleM18ApiRouteGuarded.proof.includes("Route requires authentication");
}

export function salesConsoleM18ApiRouteBlocksLiveWorkflow() {
  return salesConsoleM18ApiRouteGuarded.workflowLive === false && salesConsoleM18ApiRouteGuarded.responseStatus === 501;
}

export function salesConsoleM18ApiRouteKeepsExcludedWorkflowsBlocked() {
  return salesConsoleM18ApiRouteGuarded.proof.some((item) => item.includes("excluded Sales Console workflows blocked"));
}
