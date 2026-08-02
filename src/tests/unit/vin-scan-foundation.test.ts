import { describe, expect, it } from "vitest";

import {
  deriveStockNumberFromVin,
  normalizeVinScanText,
  parseVinScanEvidence,
  vinMatchesExpected,
} from "@/features/prototype/vin-scan-foundation";

describe("vin-scan-foundation", () => {
  it("normalizes VIN text and derives the last-six stock number", () => {
    expect(normalizeVinScanText("2t3w1rfvxrw-333586")).toBe("2T3W1RFVXRW333586");
    expect(deriveStockNumberFromVin("2T3W1RFVXRW333586")).toBe("333586");
  });

  it("parses Manheim windshield evidence with VIN, run, and lot details", () => {
    const result = parseVinScanEvidence("Manheim Minneapolis Maple Grove Run 214 Lot A18 VIN 2T3W1RFVXRW333586");

    expect(result.mode).toBe("Auction windshield");
    expect(result.auctionSource).toBe("Manheim");
    expect(result.auctionLocation).toBe("Manheim Minneapolis / Maple Grove");
    expect(result.runNumber).toBe("214");
    expect(result.lotNumber).toBe("A18");
    expect(result.vin).toBe("2T3W1RFVXRW333586");
    expect(result.stockNumber).toBe("333586");
    expect(result.confidence).toBe("High");
  });

  it("parses ADESA windshield evidence and matches the expected unit", () => {
    const result = parseVinScanEvidence("ADESA Dayton lot B7 vin 2T3W1RFVXRW333586");

    expect(result.auctionSource).toBe("ADESA");
    expect(result.auctionLocation).toBe("ADESA Dayton");
    expect(vinMatchesExpected(result.vin, "2T3W1RFVXRW333586")).toBe(true);
  });
});
