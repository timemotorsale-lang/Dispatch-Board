import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { appraisalImage, conditionGroups, toggleCondition, validateAppraisal, validateAppraisalStep } from "../src/lib/appraisal";
import { validateRequest } from "../src/lib/domain";
import { decodeVin, normalizeVin, projectDecodedVehicle } from "../src/server/vin-decoder";
import { execute, openStore, records, session } from "../src/server/preview-store";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
const details = () => ({ appraisalVersion: "1", year: "2003", make: "Honda", model: "Accord", vin: "1HGCM82633A004352", mileage: "170000", windshield: "Not sure", modifications: "Not sure", drivable: "Not sure", condition: "Not sure", accidents: "Not sure", smoked: "Not sure", tires: "Not sure", keys: "0", zip: "55407", loan: "Neither", intent: "Not sure", contactMethod: "Email", ...Object.fromEntries(conditionGroups.map(group => [group.key, "None known"])) });
const input = () => ({ kind: "SELL", vehicleId: "", name: "Sample", email: "sample@example.com", phone: "", notes: "", details: details() });
const decoded = () => ({ Results: [{ ModelYear: "2003", Make: "HONDA", Model: "Accord", Trim: "EX", TransmissionStyle: "Automatic", DriveType: "FWD", DisplacementL: "2.4", EngineCylinders: "4", ErrorCode: "0", VIN: "PRIVATE", Color: "Invented", Price: "12345" }] });

describe("guided appraisal validation and imagery", () => {
  it("accepts honest unknown answers and zero keys without requiring an ownership upload", () => {
    expect(() => validateAppraisal(details())).not.toThrow();
    expect(validateRequest(input()).details.keys).toBe("0");
  });
  it("makes None known and Not sure mutually exclusive with specific issues", () => {
    expect(toggleCondition("Rust|Hail damage", "None known")).toBe("None known");
    expect(toggleCondition("None known", "Rust")).toBe("Rust");
    expect(toggleCondition("Rust", "Not sure")).toBe("Not sure");
    expect(toggleCondition("Not sure", "Not sure")).toBe("");
    expect(() => validateAppraisal({ ...details(), exterior: "Rust|None known" })).toThrow("exterior");
    expect(() => validateAppraisal({ ...details(), exterior: "Rust|Rust" })).toThrow("exterior");
    expect(() => validateAppraisal({ ...details(), engine: "Made up" })).toThrow("engine");
  });
  it("rejects incomplete or invalid vehicle, mileage, ZIP and versioned details", () => {
    for (const change of [{ year: "1800" }, { make: "" }, { vin: "INVALID" }, { mileage: "-1" }, { mileage: "1.5" }, { zip: "123" }, { keys: "100" }, { appraisalVersion: "2" }]) expect(() => validateAppraisal({ ...details(), ...change })).toThrow();
    expect(validateAppraisalStep({ ...details(), exterior: "" }, 1)).toContain("exterior");
    expect(() => validateRequest({ ...input(), details: { ...details(), contactMethod: "Phone call" } })).toThrow("preferred response");
  });
  it("uses a customer photo first, otherwise only a licensed exact-match catalog image, then a silhouette", () => {
    const vehicle = { year: "2003", make: "Honda", model: "Accord", trim: "EX" };
    const catalog = { ...vehicle, src: "/appraisal-media/honda-accord.png", licensed: true };
    expect(appraisalImage(vehicle, "blob:local", catalog).label).toContain("this tab only");
    expect(appraisalImage(vehicle, undefined, catalog).label).toContain("Representative");
    for (const change of [{ year: "2004" }, { model: "Civic" }, { trim: "LX" }, { licensed: false }, { src: "https://untrusted.example/image.png" }]) expect(appraisalImage(vehicle, undefined, { ...catalog, ...change }).src).toBeNull();
    expect(appraisalImage(vehicle).src).toBeNull();
    expect(appraisalImage(vehicle, "data:image/svg+xml,untrusted").src).toBeNull();
  });
  it("stores appraisal answers idempotently in the isolated preview, never the photo or an offer", () => {
    const database = openStore(":memory:");
    try {
      const first = session(database, undefined);
      const second = session(database, undefined);
      const key = randomUUID();
      const value = { ...input(), details: { ...details(), customerPhoto: "blob:local", offerAmount: "500" } };
      const result = execute(database, first.identifier, { operation: "REQUEST", key, value });
      expect(execute(database, first.identifier, { operation: "REQUEST", key, value })).toEqual(result);
      expect(records(database, first.identifier)).toHaveLength(1);
      expect(records(database, second.identifier)).toEqual([]);
      const saved = records(database, first.identifier)[0];
      expect(saved.data).toMatchObject({ team: "SALES", status: "PREVIEW_RECEIVED" });
      expect(JSON.stringify(saved)).not.toContain("blob:");
      expect(JSON.stringify(saved)).not.toContain("offerAmount");
    } finally { database.close(); }
  });
});

describe("fixed-origin VIN lookup", () => {
  it("validates VINs, projects only known specifications and marks partial results", async () => {
    expect(normalizeVin(" 1hgcm82633a004352 ")).toBe("1HGCM82633A004352");
    for (const value of ["short", "1HGCM82633A00435I", "../private", null]) expect(() => normalizeVin(value)).toThrow();
    const output = projectDecodedVehicle(decoded());
    expect(output.vehicle).toMatchObject({ year: "2003", make: "HONDA", model: "Accord" });
    expect(output.vehicle).not.toHaveProperty("color");
    expect(output.image).toBeNull();
    expect(output.partial).toBe(false);
    expect(projectDecodedVehicle({ Results: [{ ...decoded().Results[0], ErrorCode: "1,14" }] }).partial).toBe(true);
    expect(() => projectDecodedVehicle({ Results: [{ Make: "HONDA" }] })).toThrow();
    const fetcher = vi.fn(async () => Response.json(decoded()));
    vi.stubGlobal("fetch", fetcher);
    await decodeVin("1HGCM82633A004352");
    expect(fetcher).toHaveBeenCalledWith("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1HGCM82633A004352?format=json", expect.objectContaining({ cache: "no-store", redirect: "error" }));
  });
  it("fails honestly on service failure, malformed and oversized output", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    await expect(decodeVin("1HGCM82633A004352")).rejects.toThrow("unavailable");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid")));
    await expect(decodeVin("1HGCM82633A004352")).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(1000001))));
    await expect(decodeVin("1HGCM82633A004352")).rejects.toThrow("too large");
  });
  it("protects the route against public and cross-origin use and applies bounded throttling", async () => {
    const fetcher = vi.fn(async () => Response.json(decoded()));
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("DEALERSHIP_ENVIRONMENT", "public-production");
    vi.stubEnv("DEALERSHIP_PREVIEW_DATA", "0");
    const { POST } = await import("../src/app/api/vin-decode/route");
    const request = (origin = "http://127.0.0.1:3115", vin = "1HGCM82633A004352") => new Request("http://127.0.0.1:3115/api/vin-decode", { method: "POST", headers: { host: "127.0.0.1:3115", origin, "content-type": "application/json" }, body: JSON.stringify({ vin }) });
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("DEALERSHIP_ENVIRONMENT", "development");
    vi.stubEnv("DEALERSHIP_PREVIEW_DATA", "1");
    expect((await POST(request("https://other.example"))).status).toBe(403);
    expect((await POST(request(undefined, "bad"))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    for (let index = 0; index < 29; index += 1) expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(429);
  });
});
