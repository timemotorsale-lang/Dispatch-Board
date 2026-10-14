import { describe, expect, it } from "vitest";

import {
  salesConsoleM15OperatingPolishCoversDailySections,
  salesConsoleM15OperatingPolishExplainsStaffUse,
  salesConsoleM15OperatingPolishRemainsReadOnly,
  salesConsoleM15OperatingSectionPolish
} from "@/features/sales/sales-console-m15-operating-section-polish";

describe("Sales Console M15 operating section polish", () => {
  it("covers every daily operating section", () => {
    expect(salesConsoleM15OperatingPolishCoversDailySections()).toBe(true);
    expect(salesConsoleM15OperatingSectionPolish.items.map((item) => item.section)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Manager Command Center",
      "Deal Desk",
      "Inventory Intelligence"
    ]);
  });

  it("explains staff use and scan targets", () => {
    expect(salesConsoleM15OperatingPolishExplainsStaffUse()).toBe(true);
  });

  it("keeps operating polish read-only", () => {
    expect(salesConsoleM15OperatingPolishRemainsReadOnly()).toBe(true);
  });
});
