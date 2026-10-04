import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { testDriveFacts, testDriveDeadline, testDriveAgreementError } from "@/lib/test-drive-form-packet";
import { testDriveAgreementPdfBase64 } from "@/server/services/test-drive-agreement-document";

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => ({ id: "manager-1", isActive: true, roles: ["Manager"] })) }));
import { POST } from "@/app/api/crm/v1/contract-packets/route";
import { GET } from "@/app/api/crm/v1/contract-packets/[packetId]/route";

const valid = {
  salesperson: "Pat Employee", accompanyingEmployee: "Pat Employee", driverLicense: "D123456",
  licenseState: "MN", licenseExpiration: "2028-01-01", licenseVerified: true, driverPhone: "612-555-0100",
  insuranceCarrier: "Example insurer", insurancePolicy: "POL123", insuranceVerified: true,
  departureAt: "2026-10-01T23:50:00-05:00", departureMileage: 45000,
  fuelOut: "3/4", departureCondition: "Existing scratch on rear bumper; otherwise good", approvedRoute: "Lake Street local loop"
};
describe("Test-drive agreement", () => {
  it("defaults to editable 30-minute and 20-mile limits across midnight", () => {
    const facts = testDriveFacts(valid);
    expect(facts.durationMinutes).toBe(30);
    expect(facts.mileageAllowance).toBe(20);
    expect(testDriveDeadline(facts)).toBe("2026-10-02T05:20:00.000Z");
    expect(testDriveAgreementError(facts)).toBeNull();
  });
  it("supports unaccompanied drives with staff-reviewed dealership coverage", () => {
    expect(testDriveAgreementError(testDriveFacts({ ...valid, driveMode: "UNACCOMPANIED", accompanyingEmployee: "",
      insuranceBasis: "DEALER_REVIEW", insuranceCarrier: "", insurancePolicy: "" }))).toBeNull();
  });
  it.each([
    { accompanyingEmployee: "" }, { licenseVerified: false }, { insuranceVerified: false },
    { licenseExpiration: "2026-02-30" }, { licenseExpiration: "2026-09-30" },
    { departureAt: "2026-02-30T12:00:00Z" }, { departureAt: "2026-10-01T12:00:00" },
    { durationMinutes: -1 }, { durationMinutes: 1.5 }, { mileageAllowance: 0 },
    { departureMileage: -1 }, { departureMileage: 1.5 }, { approvedRoute: "" },
    { insurancePolicy: "" }, { driveMode: "INVALID" }, { returnMileage: 45001 }
  ])("rejects incomplete or invalid release/return facts: %j", (change) => {
    expect(testDriveAgreementError(testDriveFacts({ ...valid, ...change }))).not.toBeNull();
  });
  it("accepts a complete return record but rejects backwards mileage", () => {
    const returned = { ...valid, returnAt: "2026-10-02T05:10:00Z", returnMileage: 45012,
      returnCondition: "Unchanged", fuelIn: "3/4", keysReturned: true, receivedBy: "Pat Employee" };
    expect(testDriveAgreementError(testDriveFacts(returned))).toBeNull();
    expect(testDriveAgreementError(testDriveFacts({ ...returned, returnMileage: 44999 }))).not.toBeNull();
  });
  it("measures elapsed time through the Central daylight-saving transition", () => {
    expect(testDriveDeadline(testDriveFacts({ ...valid, departureAt: "2026-11-01T01:50:00-05:00" }))).toBe("2026-11-01T07:20:00.000Z");
  });
  it("prefills the receiving fields without pre-signing either authorization", async () => {
    const base64 = await testDriveAgreementPdfBase64({ customerName: "Alex Driver", dealNumber: "123456", vehicle: "2005 Toyota Corolla",
      vin: "1NXBR32E85Z123456", stockNumber: "123456", facts: testDriveFacts({ ...valid,
        returnAt: "2026-10-02T05:10:00Z", returnMileage: 45012, returnCondition: "Unchanged", fuelIn: "3/4", keysReturned: true, receivedBy: "Pat Employee" }) });
    const form = (await PDFDocument.load(Buffer.from(base64, "base64"))).getForm();
    expect(form.getTextField("return_odometer").getText()).toBe("45012");
    expect(form.getTextField("received_by").getText()).toBe("Pat Employee");
    expect(form.getTextField("keys_returned").getText()).toBe("Yes");
    expect(form.getTextField("authorizing_employee_signature").getText() || "").toBe("");
  });
  it("generates and retrieves a single-page fillable PDF with matching HTML", async () => {
    await testDriveAgreementPdfBase64({ customerName: "Alex Driver", dealNumber: "123456", vehicle: "2005 Toyota Corolla", vin: "1NXBR32E85Z123456", stockNumber: "123456", facts: testDriveFacts(valid) });
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST", body: JSON.stringify({ packetType: "TEST_DRIVE", customerName: "Alex Driver",
        testDrive: valid, vehicle: { vin: "1NXBR32E85Z123456", stockNumber: "123456", year: "2005", make: "Toyota", model: "Corolla" } })
    }));
    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents).toHaveLength(1);
    const document = packet.documents[0];
    expect(document.html).toContain("Alex Driver");
    expect(document.html).toContain("45,020");
    expect(document.html).toContain("automatically primary");
    expect(document.html).toContain("timemotorsale@gmail.com");
    const pdf = await PDFDocument.load(Buffer.from(document.contentBase64, "base64"));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getForm().getFields()).toHaveLength(9);
    expect(pdf.getForm().getTextField("driver_signature").getText() || "").toBe("");
    const archived = await GET(new Request("http://crm.local/api/crm/v1/contract-packets/record"), {
      params: Promise.resolve({ packetId: packet.packetId })
    });
    expect(archived.status).toBe(200);
  });
  it("returns a validation error rather than generating for an invalid VIN", async () => {
    const response = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST", body: JSON.stringify({ packetType: "TEST_DRIVE", customerName: "Alex Driver", testDrive: valid, vehicle: { vin: "invalid" } })
    }));
    expect(response.status).toBe(400);
  });
});
