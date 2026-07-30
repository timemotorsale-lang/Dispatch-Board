import { describe, expect, it } from "vitest";

import {
  buildSalesConsoleRealReadSnapshot,
  buildSalesConsoleSourceRecord,
  salesConsoleReadServicesCoverMvpSources,
  salesConsoleReadServicesKeepWritesOutOfSources
} from "@/features/sales/sales-console-real-read-services";

describe("Sales Console real read services", () => {
  it("covers the MVP source systems", () => {
    expect(salesConsoleReadServicesCoverMvpSources()).toBe(true);
  });

  it("keeps source-system writes outside the Sales Console read layer", () => {
    expect(salesConsoleReadServicesKeepWritesOutOfSources()).toBe(true);
  });

  it("creates source-backed records with real Dispatch Board links", () => {
    expect(
      buildSalesConsoleSourceRecord({
        id: "TMS22145",
        sourceKey: "inventory",
        customerName: "John Smith",
        title: "2022 Toyota RAV4 XLE",
        subtitle: "Ready for sales review",
        lane: "Inventory Cash Sale"
      })
    ).toEqual(expect.objectContaining({ sourceHref: "/vehicles/360/TMS22145", fallback: false }));
  });

  it("builds a real-read snapshot with fallback visibility", () => {
    const snapshot = buildSalesConsoleRealReadSnapshot([
      buildSalesConsoleSourceRecord({
        id: "CUST-1",
        sourceKey: "customers",
        customerName: "Maria Garcia",
        title: "Customer 360",
        subtitle: "CRM source",
        fallback: false
      })
    ]);

    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.sources.some((source) => source.status === "fallback")).toBe(true);
  });
});
