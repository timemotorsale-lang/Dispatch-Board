import { describe, expect, it } from "vitest";

import {
  salesConsoleSearchIsReadOnly,
  searchSalesConsoleRecords
} from "@/features/sales/sales-console-operational-search";

describe("Sales Console M40 search and record open", () => {
  it("searches customer, stock, lane, and manager review records", () => {
    expect(searchSalesConsoleRecords("John Smith")[0]?.workspace).toBe("Revenue Desk");
    expect(searchSalesConsoleRecords("TMS22145").some((result) => result.workspace === "Inventory Intelligence")).toBe(true);
    expect(searchSalesConsoleRecords("BHPH").some((result) => result.lane === "Inventory BHPH Sale")).toBe(true);
    expect(searchSalesConsoleRecords("review queue")[0]?.workspace).toBe("Manager Command");
  });

  it("returns an empty result set for unknown terms without creating writes", () => {
    expect(searchSalesConsoleRecords("not-a-real-sales-record")).toEqual([]);
    expect(salesConsoleSearchIsReadOnly()).toBe(true);
  });
});
