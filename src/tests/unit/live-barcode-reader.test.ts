import { afterEach, describe, expect, it, vi } from "vitest";
import { createNativeBarcodeReader, normalizeScan } from "@/features/mobile-capture/live-barcode-reader";

afterEach(() => vi.unstubAllGlobals());

describe("live barcode modes", () => {
  const sample = "@\nANSI 636000080002DLDAQSYNTH1234\nDCSEXAMPLE\nDACTAYLOR\nDAJMN\n";

  it("only offers a complete VIN or recognized PDF417 ID in the corresponding review", () => {
    expect(normalizeScan("vin", "code_39", "VIN 1HGCM82633A004352")).toEqual({ format: "CODE_39", value: "1HGCM82633A004352" });
    expect(normalizeScan("vin", "qr_code", "not a VIN")).toBeNull();
    expect(normalizeScan("id", "pdf417", sample)).toEqual({ format: "PDF_417", value: sample.trim() });
    expect(normalizeScan("id", "qr_code", sample)).toBeNull();
    expect(normalizeScan("id", "pdf417", "unrelated barcode")).toBeNull();
  });

  it("only requests native formats that the current browser supports", async () => {
    const options = vi.fn();
    vi.stubGlobal("BarcodeDetector", class {
      static async getSupportedFormats() { return ["code_39"]; }
      constructor(config: unknown) { options(config); }
      async detect() { return []; }
    });
    expect(await createNativeBarcodeReader("vin")).not.toBeNull();
    expect(options).toHaveBeenCalledExactlyOnceWith({ formats: ["code_39"] });
    expect(await createNativeBarcodeReader("id")).toBeNull();
  });

  it("finds no native reader when the browser does not expose one", async () => {
    vi.stubGlobal("BarcodeDetector", undefined);
    expect(await createNativeBarcodeReader("all")).toBeNull();
  });
});
