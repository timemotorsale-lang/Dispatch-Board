import { describe, expect, it } from "vitest";
import { verifyPurchaseScanner } from "@/server/inventory-transfer/purchase-scanner";

describe.skipIf(process.env.RUN_SCANNER_INTEGRATION !== "1")("real import scanner", () => {
  it("scans clean bytes and detects the harmless EICAR test through the engine", async () => {
    expect(await verifyPurchaseScanner()).toEqual({ clean: true, detectsTest: true });
  }, 120_000);
});
