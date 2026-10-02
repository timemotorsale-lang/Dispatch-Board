import { describe, expect, it, vi } from "vitest";

import { decodeVinWithNhtsa } from "@/server/vehicle-identification/nhtsa";

const validVin = "1HGCM82633A004352";

describe("NHTSA vehicle decode", () => {
  it("normalizes manufacturer-submitted fields into the canonical decode contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Results: [{ ErrorCode: "0", Make: "HONDA", Model: "Accord", ModelYear: "2003", Trim: "EX", BodyClass: "Sedan/Saloon", DriveType: "FWD/Front-Wheel Drive", EngineCylinders: "6", DisplacementL: "3", FuelTypePrimary: "Gasoline", TransmissionStyle: "Automatic", PlantCountry: "UNITED STATES (USA)" }] }), { status: 200 }));
    const result = await decodeVinWithNhtsa(validVin, { fetcher, now: () => new Date("2026-07-31T12:00:00.000Z") });
    expect(result).toMatchObject({ provider: "NHTSA_VPIC", vin: validVin, retrievedAt: "2026-07-31T12:00:00.000Z", decoded: { make: "HONDA", model: "Accord", modelYear: 2003, trim: "EX", engineCylinders: "6" } });
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(`/DecodeVinValues/${validVin}`), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("rejects a response that cannot establish year, make, and model", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Results: [{ ErrorCode: "0", Make: "HONDA" }] }), { status: 200 }));
    await expect(decodeVinWithNhtsa(validVin, { fetcher })).rejects.toThrow("required year, make, and model");
  });
  it("maps extended powertrain and safety values with the model-year hint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Results: [{ ErrorCode: "0", Make: "HONDA", Model: "Accord", ModelYear: "2003", EngineHP: "240", ABS: "Standard", AirBagLocFront: "1st Row", TransmissionSpeeds: "5", Seats: "5" }] })));
    const result = await decodeVinWithNhtsa(validVin, { fetcher, modelYear: 2003 });
    expect(result.decoded).toMatchObject({ horsepower: "240", abs: "Standard", airbagsFront: "1st Row", transmissionSpeeds: "5", seats: "5", trim: null });
    expect(fetcher.mock.calls[0][0]).toContain("modelyear=2003");
  });
  it("retains provider warnings for an incomplete decode", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Results: [{ ErrorCode: "0,14", ErrorText: "Incomplete", Make: "HONDA", Model: "Accord", ModelYear: "2003" }] })));
    expect((await decodeVinWithNhtsa(validVin, { fetcher })).warnings).toContain("Incomplete");
  });
  it("reports an upstream timeout with a manual-verification fallback", async () => {
    const fetcher = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(decodeVinWithNhtsa(validVin, { fetcher })).rejects.toThrow("timed out");
  });
});
