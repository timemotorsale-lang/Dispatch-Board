import { describe, expect, it } from "vitest";
import { validateRequest } from "../src/lib/domain";
import { emptyServiceConcern, readServiceConcerns, serviceHandoff, serviceStepError, serviceToday, validateService } from "../src/lib/service-intake";
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
    expect(() => validateService({ ...details(), serviceVersion: "3" })).toThrow("version");
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

const structuredDetails = () => ({ ...details(), serviceVersion: "2", concerns: JSON.stringify([{ ...emptyServiceConcern(true), category: "Brakes", description: "Grinding only when stopping" }]), mileageUnit: "miles", visitType: "Discuss with an advisor", requesterRole: "Owner / personal vehicle", coverage: "Not sure", transport: "No assistance requested", accommodations: "", alternateDate: "" });

describe("structured service intake", () => {
  it("preserves legacy receipts and validates a separate versioned concern list", () => {
    expect(() => validateService(details())).not.toThrow();
    expect(() => validateService(structuredDetails())).not.toThrow();
    const concerns = readServiceConcerns(structuredDetails().concerns);
    expect(concerns[0].description).toBe("Grinding only when stopping");
    expect(concerns[0].onset).toBe("Not sure");
  });
  it("rejects malformed, empty and oversized lists, missing fields and unsupported choices", () => {
    const concern = { ...emptyServiceConcern(true), category: "Brakes" };
    for (const value of ["bad", "{}", "[]", JSON.stringify(Array(6).fill(concern)), JSON.stringify([{}]), JSON.stringify([{ ...concern, frequency: "Diagnosed" }]), JSON.stringify([{ ...concern, description: "x".repeat(601) }])]) expect(() => readServiceConcerns(value)).toThrow();
  });
  it("requires exactly one customer-selected main concern", () => {
    const concern = { ...emptyServiceConcern(true), category: "Brakes" };
    expect(() => readServiceConcerns(JSON.stringify([{ ...concern, primary: false }]))).toThrow("exactly one");
    expect(() => readServiceConcerns(JSON.stringify([concern, concern]))).toThrow("exactly one");
    expect(readServiceConcerns(JSON.stringify([concern, { ...concern, primary: false, category: "Electrical / battery" }]))).toHaveLength(2);
  });
  it("strips nested diagnosis and approval claims and derives the legacy summary on the server", () => {
    const concern = { ...emptyServiceConcern(true), category: "Brakes", description: "Customer's exact words", diagnosis: "approved", repairAuthorized: true, ownerId: "someone-else" };
    const result = validateRequest({ ...request(), details: { ...structuredDetails(), concerns: JSON.stringify([concern]), categories: "Electrical / battery", service: "Spoofed summary", appointmentConfirmed: "yes", priority: "URGENT" } });
    expect(result.details.categories).toBe("Brakes");
    expect(result.details.service).toBe("Customer's exact words");
    expect(JSON.parse(result.details.concerns)[0]).not.toHaveProperty("diagnosis");
    expect(JSON.parse(result.details.concerns)[0]).not.toHaveProperty("ownerId");
    expect(result.details).not.toHaveProperty("appointmentConfirmed");
    expect(result.details).not.toHaveProperty("priority");
  });
  it("requires advisor driving review for uncertainty and prevents a waiting-visit bypass", () => {
    for (const drivability of ["Not sure", "Not drivable", "Concerned about driving"]) {
      expect(serviceStepError({ ...structuredDetails(), drivability, visitType: "Wait if available" }, 2)).toContain("advisor");
    }
    expect(serviceStepError({ ...structuredDetails(), drivability: "No known driving concern", visitType: "Wait if available" }, 2)).toBe("");
    expect(serviceHandoff({ ...structuredDetails(), drivability: "No known driving concern" }).drivingReview).toContain("safety not assessed");
  });
  it("validates odometer units, visit choices and alternate dates", () => {
    const now = new Date("2026-10-25T01:00:00Z");
    expect(serviceStepError({ ...structuredDetails(), mileageUnit: "kilometers" }, 0, now)).toBe("");
    expect(serviceStepError({ ...structuredDetails(), mileageUnit: "hours" }, 0, now)).toContain("units");
    expect(serviceStepError({ ...structuredDetails(), visitType: "Guaranteed loaner" }, 2, now)).not.toBe("");
    expect(serviceStepError({ ...structuredDetails(), flexible: "no", date: "2026-10-25", alternateDate: "2027-02-30" }, 2, now)).toContain("alternate date");
    expect(serviceStepError({ ...structuredDetails(), alternateDate: "2026-10-25" }, 2, now)).toContain("Clear date");
    expect(serviceStepError({ ...structuredDetails(), accommodations: "x".repeat(301) }, 2, now)).toContain("300");
  });
  it("requires clearing hidden previous-work answers", () => {
    expect(() => readServiceConcerns(JSON.stringify([{ ...emptyServiceConcern(true), category: "Brakes", previousWork: "Old work" }]))).toThrow("Clear previous repair");
  });
  it("saves a server-derived handoff without creating a booking, authorization or staff owner", () => {
    const database = openStore(":memory:");
    try {
      const owner = session(database, undefined);
      const other = session(database, undefined);
      const concern = { ...emptyServiceConcern(true), category: "Brakes", previousRepair: "Yes", previousWork: "Related sample work" };
      const value = { ...request(), serviceHandoff: { delivery: "DELIVERED", repairAuthorization: "GRANTED" }, details: { ...structuredDetails(), requesterRole: "Fleet / company contact", coverage: "Warranty / service contract review requested", concerns: JSON.stringify([concern]) } };
      const command = { operation: "REQUEST" as const, key: "abcdef00-0000-4000-8000-000000000002", value };
      expect(execute(database, owner.identifier, command)).toEqual(execute(database, owner.identifier, command));
      expect(records(database, owner.identifier)).toHaveLength(1);
      expect(records(database, owner.identifier)[0].data.serviceHandoff).toMatchObject({ relatedRepairReview: true, coverageReview: true, authorityReview: true, delivery: "NOT_CONNECTED", appointment: "NOT_BOOKED", repairAuthorization: "NOT_GRANTED" });
      expect(records(database, other.identifier)).toEqual([]);
    } finally { database.close(); }
  });
});
