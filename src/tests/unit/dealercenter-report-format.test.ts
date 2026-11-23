import { describe, expect, it } from "vitest";
import { parseDealerCenterReport, suggestDealerCenterMapping } from "@/features/dealercenter-reporting/import-format";

describe("DealerCenter report mapping", () => {
  it("maps inventory columns and keeps optional costs distinct from zero", () => {
    const csv = " VIN,Stock #,Vehicle Status,Total Cost,Retail Price,Currency\n1HGCM82633A004352,0095,In Stock,\"$7,900.25\",10000,USD\n1M8GDM9AXKP042788,0100,Reserved,0,,USD";
    const mapping = suggestDealerCenterMapping("INVENTORY", ["VIN", "Stock #", "Vehicle Status", "Total Cost", "Retail Price", "Currency"]);
    expect(parseDealerCenterReport("INVENTORY", csv, mapping)).toEqual({
      totalRows: 2, issues: [], records: [
        { vin: "1HGCM82633A004352", stock: "0095", status: "IN STOCK", costCents: 790025, priceCents: 1000000 },
        { vin: "1M8GDM9AXKP042788", stock: "0100", status: "RESERVED", costCents: 0, priceCents: null },
      ],
    });
  });

  it("requires manual mapping for competing candidate headers", () => {
    const headers = ["Deal #", "Deal Date", "Sold date", "Selling Price"];
    const mapping = suggestDealerCenterMapping("SALES", headers);
    expect(mapping.date).toBeUndefined();
    expect(() => parseDealerCenterReport("SALES", headers.join(",") + "\n0007,11/12/2026,11/13/2026,7500", mapping)).toThrow("Sold date");
  });

  it("requires the supplied sale status or an explicit completed-only export", () => {
    const mapping = { deal: "Deal #", date: "Sold date", amount: "Selling Price" };
    const csv = "Deal #,Sold date,Selling Price\n0007,11/12/2026,7500";
    expect(() => parseDealerCenterReport("SALES", csv, mapping)).toThrow("only completed sales");
    expect(parseDealerCenterReport("SALES", csv, mapping, true).records).toHaveLength(1);
    expect(() => parseDealerCenterReport("SALES", "Deal #,Sold date,Selling Price,Status\n0007,11/12/2026,7500,Pending", mapping, true)).toThrow("Map the deal status");
    expect(() => parseDealerCenterReport("SALES", "Deal #,Sold date,Selling Price,Deal Status,Title Status\n0007,11/12/2026,7500,Pending,Closed", { ...mapping, status: "Title Status" }, true)).toThrow("Map the deal status");
  });

  it("keeps deal numbers stable and reports duplicates, incomplete sales and malformed prices", () => {
    const csv = "Deal #,Sold date,Selling Price,Deal status\n0007,11/12/2026,7500,Delivered\n0007,11/12/2026,7500,Completed\n8,11/12/2026,3000,Pending\n9,11/12/2026,3-00,Sold";
    const mapping = suggestDealerCenterMapping("SALES", ["Deal #", "Sold date", "Selling Price", "Deal status"]);
    const result = parseDealerCenterReport("SALES", csv, mapping);
    expect(result.records).toEqual([{ deal: "0007", date: "2026-11-12", amountCents: 750000, vin: "", stock: "" }]);
    expect(result.issues.map(issue => issue.row)).toEqual([3, 4, 5]);
  });
});
