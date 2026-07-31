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
});
