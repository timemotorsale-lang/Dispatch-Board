import { describe, expect, it } from "vitest";

import {
  multiStoreReportingIsReadOnly,
  reportingExportsRemainDisabled,
  reportingRowsHaveAggregationAndFreshness,
  salesConsoleMultiStoreReportingReadModel,
  unauthorizedStoreVisibilityIsBlocked
} from "@/features/sales/sales-console-m9-multi-store-reporting";

describe("Sales Console multi-store reporting foundation", () => {
  it("keeps reporting read-only and exports disabled", () => {
    expect(multiStoreReportingIsReadOnly()).toBe(true);
    expect(reportingExportsRemainDisabled()).toBe(true);
  });

  it("requires aggregation rules and freshness labels", () => {
    expect(reportingRowsHaveAggregationAndFreshness()).toBe(true);
  });

  it("blocks unauthorized visibility into restricted or all-store reporting", () => {
    expect(unauthorizedStoreVisibilityIsBlocked()).toBe(true);
  });

  it("includes store, team, inventory, lead, deal, and unit reporting signals", () => {
    expect(salesConsoleMultiStoreReportingReadModel.rows.map((row) => row.metric)).toEqual(
      expect.arrayContaining(["leads", "deals", "inventory-risk", "units"])
    );
  });
});
