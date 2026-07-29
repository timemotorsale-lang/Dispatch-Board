import { describe, expect, it } from "vitest";

import {
  salesConsoleM19ServiceActivation,
  salesConsoleM19ServiceKeepsOtherWorkflowsBlocked,
  salesConsoleM19ServiceRequiresAuthentication,
  salesConsoleM19ServiceReturnsCreatedOrDuplicate
} from "@/features/sales/sales-console-m19-service-activation";

describe("Sales Console M19 service activation", () => {
  it("requires authentication", () => {
    expect(salesConsoleM19ServiceRequiresAuthentication()).toBe(true);
  });

  it("returns created or duplicate statuses", () => {
    expect(salesConsoleM19ServiceReturnsCreatedOrDuplicate()).toBe(true);
    expect(salesConsoleM19ServiceActivation.activeStatuses).toEqual(["created", "duplicate"]);
  });

  it("keeps non-manager-review workflows blocked", () => {
    expect(salesConsoleM19ServiceKeepsOtherWorkflowsBlocked()).toBe(true);
  });
});
