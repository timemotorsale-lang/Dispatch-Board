import { describe, expect, it } from "vitest";
import { verifyPurchaseOcr } from "@/server/inventory-transfer/purchase-ocr-health";

describe.runIf(process.env.RUN_OCR_INTEGRATION === "1")("purchase OCR runtime", () => {
  it("reads VIN and price from an image-only PDF through the installed renderer and OCR engine", async () => {
    expect(await verifyPurchaseOcr()).toMatchObject({ ready: true, method: "OCR_TEXT", vinRead: true, amountRead: true });
  }, 180_000);
});
