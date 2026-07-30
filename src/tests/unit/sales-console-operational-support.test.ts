import { describe, expect, it } from "vitest";

import {
  salesConsoleAppointments,
  salesConsoleDeliveryReadiness,
  salesConsoleSupportViewsHaveActionableRecords,
  salesConsoleSupportWritesRemainControlled,
  salesConsoleTasksAndPromises
} from "@/features/sales/sales-console-operational-support";

describe("Sales Console M46 appointments tasks promises delivery", () => {
  it("defines appointment, task/promise, and delivery readiness records", () => {
    expect(salesConsoleSupportViewsHaveActionableRecords()).toBe(true);
    expect(salesConsoleAppointments.some((item) => item.state === "no-show")).toBe(true);
    expect(salesConsoleTasksAndPromises.some((item) => item.type === "customer promise")).toBe(true);
    expect(salesConsoleDeliveryReadiness.some((item) => item.financeCleared === "blocked")).toBe(true);
  });

  it("keeps operational support writes controlled or source-system owned", () => {
    expect(salesConsoleSupportWritesRemainControlled()).toBe(true);
  });
});
