import { describe, expect, it } from "vitest";
import { driveLocalTime, driveInstant, driveReadiness, driveAgreementContent, driveReturnFacts, driveDueState } from "@/lib/test-drive-workflow";
import { vehicleUseOverlaps } from "@/lib/deal-continuity";

export const guidedFacts = { salesperson: "Pat Employee", driveMode: "UNACCOMPANIED", accompanyingEmployee: "", driverLicense: "D123456", driverPhone: "6125550100", licenseState: "MN", licenseExpiration: "2030-01-01", licenseVerified: true,
  insuranceBasis: "DEALER_REVIEW", insuranceVerified: true, testDriveDate: "2026-11-04", startTime: "12:00", durationMinutes: "30", mileageAllowance: "20", departureMileage: "45000", fuelOut: "Full", departureCondition: "Good", approvedRoute: "Local route" };
describe("guided test-drive rules", () => {
  it("uses business time even when the device timezone differs", () => {
    expect(driveInstant("2026-11-04T12:00")).toBe("2026-11-04T18:00:00.000Z");
    expect(driveLocalTime("2026-11-04T18:00:00Z")).toBe("2026-11-04T12:00");
    expect(driveInstant("2026-07-04T12:00")).toBe("2026-07-04T17:00:00.000Z");
  });
  it.each(["2026-03-08T02:30", "2026-11-01T01:30", "2026-02-30T12:00", "", "2026-11-04T25:00"])("rejects nonexistent, ambiguous or invalid wall time: %s", value => {
    expect(driveInstant(value)).toBe("");
  });
  it("supports solo release but requires an accompanying employee for supervised drives", () => {
    expect(driveReadiness(guidedFacts, true, "1NXBR32E85Z123456").verified).toBe(true);
    expect(driveReadiness({ ...guidedFacts, driveMode: "SUPERVISED" }, true, "1NXBR32E85Z123456").issue?.field).toBe("Accompanying employee");
  });
  it("separates recorded facts from verified facts", () => {
    const result = driveReadiness({ ...guidedFacts, licenseVerified: false }, true, "1NXBR32E85Z123456");
    expect(result.identity).toBe(true); expect(result.verified).toBe(false);
    expect(result.issue?.field).toBe("Valid license verified");
  });
  it("names the missing details blocking verification and clears them when supplied", () => {
    expect(driveReadiness({ ...guidedFacts, driverPhone: "" }, false, "").missing).toEqual([
      "Customer", "Vehicle with a valid 17-character VIN", "Driver phone"
    ]);
    expect(driveReadiness(guidedFacts, true, "1NXBR32E85Z123456").missing).toEqual([]);
  });
  it.each([ { driverLicense: "different" }, { startTime: "12:10" }, { departureMileage: "45001" }, { insuranceBasis: "DRIVER_POLICY" }, { driveMode: "SUPERVISED" } ])("invalidates agreements on material changes: %j", change => {
    expect(driveAgreementContent({ ...guidedFacts, ...change }, "customer", "VIN")).not.toBe(driveAgreementContent(guidedFacts, "customer", "VIN"));
  });
  it("keeps return entries out of the signed departure agreement", () => {
    expect(driveAgreementContent({ ...guidedFacts, returnAt: "2026-11-04T12:25", returnMileage: "45010" }, "c", "VIN")).toBe(driveAgreementContent(guidedFacts, "c", "VIN"));
  });
  const returned = { returnAt: "2026-11-04T12:25", returnMileage: "45010", fuelIn: "Full", returnCondition: "Good", receivedBy: "Pat", keysReturned: true };
  it("accepts an ordinary return and an explicitly documented missing-key exception", () => {
    expect(driveReturnFacts(returned, 45000, new Date("2026-11-04T18:00:00Z")).exception).toBe(false);
    expect(driveReturnFacts({ ...returned, keysReturned: false, returnException: true, exceptionNote: "Missing spare key. Staff will follow up today." }, 45000, new Date("2026-11-04T18:00:00Z"))).toMatchObject({ exception: true, keysReturned: false });
  });
  it.each([{ returnMileage: "44999" }, { returnAt: "2026-11-04T11:59" }, { keysReturned: false }, { returnException: true, exceptionNote: "" }, { returnMileage: "" }])("rejects invalid receiving facts: %j", change => {
    expect(() => driveReturnFacts({ ...returned, ...change }, 45000, new Date("2026-11-04T18:00:00Z"))).toThrow();
  });
  it("shows actionable due-soon and overdue states", () => {
    expect(driveDueState("2026-11-04T18:30:00Z", new Date("2026-11-04T18:00:00Z"))).toBe("Test drive active");
    expect(driveDueState("2026-11-04T18:30:00Z", new Date("2026-11-04T18:20:00Z"))).toBe("Due within 15 minutes");
    expect(driveDueState("2026-11-04T18:30:00Z", new Date("2026-11-04T18:31:00Z"))).toBe("Return overdue");
  });
  it("keeps a returned vehicle with an unresolved exception unavailable", () => {
    expect(vehicleUseOverlaps({ status: "RETURNED_REVIEW", startsAt: new Date(0), expectedReturnAt: new Date(1) }, new Date(), new Date(Date.now() + 60000))).toBe(true);
  });
});
