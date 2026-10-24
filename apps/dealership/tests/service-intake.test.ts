import { describe, expect, it } from "vitest";
import { validateRequest } from "../src/lib/domain";
import { serviceStepError, serviceToday, validateService } from "../src/lib/service-intake";
import { execute, openStore, records, session } from "../src/server/preview-store";

const details = () => ({ serviceVersion: "1", year: "2021", make: "Example", model: "Test vehicle", vin: "", mileage: "0", categories: "Brakes", drivability: "Not sure", service: "Sample concern", flexible: "yes", date: "", window: "", contactMethod: "Either" });
const request = () => ({ kind: "SERVICE", vehicleId: "", name: "", email: "", phone: "612-555-0142", notes: "", details: details() });

describe("service intake", () => {
  it("accepts manual entry and unknown driving status without claiming a diagnosis", () => {
    expect(() => validateService(details())).not.toThrow();
    expect(() => validateService({ ...details(), categories: "", service: "A sound I cannot identify" })).not.toThrow();
    expect(serviceStepError({ ...details(), service: "", categories: "" }, 1)).toContain("Select a concern");
  });
  it("rejects invalid vehicle, concerns and driving answers", () => {
    for (const patch of [{ year: "1700" }, { vin: "bad" }, { mileage: "1.2" }, { mileage: "-1" }]) expect(serviceStepError({ ...details(), ...patch }, 0)).not.toBe("");
    for (const patch of [{ categories: "Brakes|Brakes" }, { categories: "Guaranteed inspection" }, { drivability: "Safe to drive" }]) expect(serviceStepError({ ...details(), ...patch }, 1)).not.toBe("");
    expect(() => validateService({ ...details(), serviceVersion: "2" })).toThrow("version");
  });
  it("validates real dates using Minnesota calendar days and rejects hidden stale preferences", () => {
    const now = new Date("2026-10-25T01:00:00Z");
    expect(serviceToday(now)).toBe("2026-10-24");
    expect(serviceStepError({ ...details(), flexible: "no", date: "2026-10-24" }, 2, now)).toBe("");
    for (const date of ["2026-10-23", "2027-02-30", "bad"]) expect(serviceStepError({ ...details(), flexible: "no", date }, 2, now)).not.toBe("");
    expect(serviceStepError({ ...details(), date: "2026-10-26" }, 2, now)).toContain("Clear date");
    expect(serviceStepError({ ...details(), contactMethod: "Text me" }, 2)).not.toBe("");
  });
  it("validates contact preference and strips authorization/finance/slot claims", () => {
    expect(() => validateRequest({ ...request(), details: { ...details(), contactMethod: "Email" } })).toThrow("preferred response");
    const result = validateRequest({ ...request(), details: { ...details(), paymentPath: "partner", trade: "yes", repairAuthorized: "yes", appointmentConfirmed: "yes", diagnosis: "approved", price: "1" } });
    expect(result.details).toEqual(details());
    expect(() => validateRequest({ ...request(), details: { ...details(), categories: "unapproved" } })).toThrow("supported service");
  });
  it("persists one isolated preview receipt, not an appointment or repair order", () => {
    const database = openStore(":memory:");
    try {
      const owner = session(database, undefined);
      const other = session(database, undefined);
      const command = { operation: "REQUEST" as const, key: "abcdef00-0000-4000-8000-000000000001", value: request() };
      expect(execute(database, owner.identifier, command)).toEqual(execute(database, owner.identifier, command));
      const saved = records(database, owner.identifier);
      expect(saved).toHaveLength(1);
      expect(saved[0].data).toMatchObject({ status: "PREVIEW_RECEIVED", team: "SERVICE", details: details() });
      expect(saved[0].data).not.toHaveProperty("appointment");
      expect(records(database, other.identifier)).toEqual([]);
    } finally { database.close(); }
  });
});
