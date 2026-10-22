import { afterEach, describe, expect, it, vi } from "vitest";
import { customerDate, customerFieldsFromBarcode, intakeRequest } from "@/features/mobile-capture/mobile-intake-utils";

afterEach(() => vi.unstubAllGlobals());

describe("mobile reviewed customer draft", () => {
  it.each([["01021990", "1990-01-02"], ["1/2/1990", "1990-01-02"], ["1990-01-02", "1990-01-02"], ["02/29/2023", ""], ["not read", ""], ["", ""]])("normalizes only valid, unambiguous dates: %s", (input, expected) => {
    expect(customerDate(input)).toBe(expected);
  });
  it("maps reviewed AAMVA fields without retaining the raw barcode", () => {
    const result = customerFieldsFromBarcode("@\nANSI 636038\nDLDAQTEST123456\nDACSYNTHETIC\nDCSPERSON\nDAJMN\nDBB01021990\nDBA01022030\nDAG123 TEST ST\nDAITEST CITY\nDAK55401\n");
    expect(result).toEqual({ fullName: "SYNTHETIC PERSON", licenseNumber: "TEST123456", issuingState: "MN", dateOfBirth: "1990-01-02", expirationDate: "2030-01-02", address: "123 TEST ST, TEST CITY, MN, 55401" });
    expect(JSON.stringify(result)).not.toContain("ANSI");
  });
  it.each(["https://untrusted.example", "DAQ123456\nDACNAME", "@\nANSI " + "X".repeat(20001)])("rejects non-ID or oversized data", (input) => {
    expect(customerFieldsFromBarcode(input)).toBeNull();
  });
  it("keeps unread or invalid barcode dates blank", () => {
    expect(customerFieldsFromBarcode("@\nANSI 636038\nDLDAQ123456\nDACNAME\nDCSHERE\nDBB02301990")?.dateOfBirth).toBe("");
  });
});

describe("mobile intake requests", () => {
  it("does not cache sensitive responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ locations: [] })));
    vi.stubGlobal("fetch", fetcher);
    await intakeRequest("/api/service-intake/customers/options");
    expect(fetcher).toHaveBeenCalledWith("/api/service-intake/customers/options", { cache: "no-store" });
  });
  it("surfaces server denials without pretending a save succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Access denied" }), { status: 403 })));
    await expect(intakeRequest("/save")).rejects.toThrow("Access denied");
  });
  it("handles interrupted/non-JSON responses with a safe retry message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(intakeRequest("/save")).rejects.toThrow("Your entries are still here");
  });
});
