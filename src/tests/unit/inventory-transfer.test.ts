import { describe, expect, it } from "vitest";
import { inventoryCsv, mapInventoryCsv, parseInventoryCsv, suggestMapping } from "@/lib/inventory-transfer";

describe("inventory CSV transfers", () => {
  it("parses BOMs, quoted commas, newlines and leading zero stock numbers", () => {
    const csv = '\uFEFFVIN,Stock number,Model\r\n1HGCM82633A004352,00123,"Accord, EX\nSpecial"';
    const parsed = parseInventoryCsv(csv);
    const rows = mapInventoryCsv(csv, suggestMapping(parsed.headers));
    expect(rows).toEqual([{ vin: "1HGCM82633A004352", stockNumber: "00123", model: "Accord, EX\nSpecial" }]);
  });
  it("rejects malformed, duplicate-header, ragged, empty and oversized imports", () => {
    for (const csv of ['VIN,VIN\na,b', 'VIN,Model\na', 'VIN\n', 'VIN\n"unterminated', 'VIN\n' + Array(501).fill("x").join("\n")]) expect(() => parseInventoryCsv(csv)).toThrow();
    expect(() => parseInventoryCsv("a".repeat(2 * 1024 * 1024 + 1))).toThrow("2 MB");
  });
  it("requires identity mapping and rejects reused or absent source columns", () => {
    expect(() => mapInventoryCsv("VIN,Make\na,b", {})).toThrow("Map VIN");
    expect(() => mapInventoryCsv("VIN,Make\na,b", { vin: "VIN", make: "VIN" })).toThrow("once");
    expect(() => mapInventoryCsv("VIN,Make\na,b", { vin: "missing" })).toThrow("not found");
  });
  it("ignores unrecognized privileged fields", () => {
    expect(mapInventoryCsv("VIN,release,price\na,APPROVED,100", { vin: "VIN", release: "release" } as never)).toEqual([{ vin: "a" }]);
  });
  it("escapes spreadsheet formulas and round-trips commas and quotes", () => {
    const result = inventoryCsv(["Model", "Stock"], [['=HYPERLINK("bad")', "00123"], ["+cmd", "@cmd"], ["-cmd", "\tcmd"], ['Model, "EX"', "stock"]]);
    const parsed = parseInventoryCsv(result);
    expect(parsed.rows[0]).toEqual(['\'=HYPERLINK("bad")', "00123"]);
    expect(parsed.rows[1]).toEqual(["'+cmd", "'@cmd"]);
    expect(parsed.rows[2]).toEqual(["'-cmd", "'\tcmd"]);
    expect(parsed.rows[3]).toEqual(['Model, "EX"', "stock"]);
  });
});
