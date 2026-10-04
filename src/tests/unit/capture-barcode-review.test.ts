import { describe, expect, it } from "vitest";
import { idFromBarcode, vinFromBarcode } from "@/features/mobile-capture/barcode-review";

describe("capture barcode review", () => {
  it("extracts a VIN while leaving server identity confirmation to intake", () => {
    expect(vinFromBarcode("vin 1HGCM82633A004352")).toBe("1HGCM82633A004352");
    expect(vinFromBarcode("1HGCM82633A00435I")).toBeNull();
  });

  it("reads common AAMVA identity fields without retaining the raw payload", () => {
    const id = idFromBarcode("@\nANSI 636000080002DLDAQD1234567\nDCSPARKER\nDACJAMIE\nDAJMN\n");
    expect(id).toEqual({ name: "JAMIE PARKER", number: "D1234567", state: "MN" });
  });
});
