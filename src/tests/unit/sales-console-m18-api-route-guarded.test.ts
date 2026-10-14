import { describe, expect, it } from "vitest";

import {
  salesConsoleM18ApiRouteBlocksLiveWorkflow,
  salesConsoleM18ApiRouteGuarded,
  salesConsoleM18ApiRouteKeepsExcludedWorkflowsBlocked,
  salesConsoleM18ApiRouteRequiresAuthentication
} from "@/features/sales/sales-console-m18-api-route-guarded";

describe("Sales Console M18 guarded API route", () => {
  it("defines the dedicated manager review route", () => {
    expect(salesConsoleM18ApiRouteGuarded.endpoint).toBe("/api/sales/manager-review-requests");
    expect(salesConsoleM18ApiRouteGuarded.method).toBe("POST");
  });

  it("requires auth and blocks live workflow", () => {
    expect(salesConsoleM18ApiRouteRequiresAuthentication()).toBe(true);
    expect(salesConsoleM18ApiRouteBlocksLiveWorkflow()).toBe(true);
  });

  it("keeps excluded workflows blocked", () => {
    expect(salesConsoleM18ApiRouteKeepsExcludedWorkflowsBlocked()).toBe(true);
  });
});
