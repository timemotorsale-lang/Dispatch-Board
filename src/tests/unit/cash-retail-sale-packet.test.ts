import { cashDefaultFormIds } from "@/lib/cash-sale-print-library";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { EMPTY_CASH_SALE, CASH_SALE_REQUIRED_IDS, cashCents, cashSaleError, cashSaleTotals, cashSaleFacts, cashSaleDate } from "@/lib/cash-retail-sale";
import { generateUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const facts = { ...EMPTY_CASH_SALE, buyerAddress: "100 Sample Street, Minneapolis, MN 55407", dealerLicense: "SAMPLE-DEALER", saleDate: "2026-11-01", mileage: "53421", odometerStatus: "Actual", titleBrand: "None", damageDisclosure: "None known", authorizedAgent: "Sample Title Clerk", poaExpiration: "2026-12-01", warrantyType: "Dealer limited warranty", warrantyCoverage: "Engine and transmission; statutory coverage preserved", warrantyDuration: "30 days or 1,000 miles, whichever occurs first", dealerPhone: "612-555-0100" };
const vehicle = { year: "2024", make: "Toyota", model: "RAV4", color: "Silver", vin: "2T3W1RFVXRW333586", stockNumber: "333586" };
const actor = { id: "sample-staff" } as AuthenticatedUser;

describe("Minnesota retail cash packet", () => {
  it("normalizes a restored US calendar date without timezone shifts and still rejects impossible dates", () => {
    const restored = cashSaleFacts({ ...facts, saleDate: "11/05/2026", deliveryDate: "11/05/2026" });
    expect(restored.saleDate).toBe("2026-11-05");
    expect(restored.deliveryDate).toBe("2026-11-05");
    expect(cashSaleError("Demo Buyer", vehicle.vin, "10000", restored, CASH_SALE_REQUIRED_IDS)).toBeNull();
    expect(cashSaleDate("02/29/2026")).toBe("");
    expect(cashSaleDate("2026-02-30")).toBe("");
    expect(cashSaleDate("11/05/2026 10:00" )).toBe("");
    expect(cashSaleDate("2028-02-29")).toBe("2028-02-29");
  });
  it("does not require dealer license or POA expiration in intake", () => {
    expect(cashSaleError("Sample buyer", vehicle.vin, "10000", { ...facts, dealerLicense: "", poaExpiration: "" }, cashDefaultFormIds(facts))).toBeNull();
    expect(cashSaleError("Sample buyer", vehicle.vin, "10000", { ...facts, dealerLicense: "", poaExpiration: "legacy-invalid" }, cashDefaultFormIds(facts))).toBeNull();
    expect(cashSaleError("Sample buyer", vehicle.vin, "10000", { ...facts, authorizedAgent: "" }, ["power-of-attorney"])).toContain("agent");
  });
  it("calculates 6.875% using cents and separates fees, trade allowance, payoff and payments", () => {
    expect(cashSaleTotals("10000", facts).tax).toBe(68750);
    expect(cashSaleTotals("20000", { ...facts, accessories: "500", rebate: "1000", tradeAllowance: "5000", tradePayoff: "2000", titleFee: "102.80", registrationFee: "516", paymentReceived: "2000" })).toMatchObject({ taxable: 1450000, tax: 99688, total: 1841568, balance: 1641568 });
    for (const bad of ["-1", "NaN", "100.001", "1e4"]) expect(() => cashCents(bad)).toThrow();
  });
  it("requires a named limited agent, real dates, mileage and explicit warranty terms", () => {
    expect(cashSaleError("Sample buyer", vehicle.vin, "10000", facts, cashDefaultFormIds(facts))).toBeNull();
    for (const change of [{ authorizedAgent: "" }, { saleDate: "2026-02-30" }, { mileage: "" }, { warrantyType: "" }, { warrantyType: "No dealer warranty - eligibility reviewed", warrantyExemption: "" }, { taxOverride: "0", taxReason: "" }, { paymentReceived: "100", paymentReference: "", paymentDate: "", paymentMethod: "" }]) {
      expect(cashSaleError("Sample buyer", vehicle.vin, "10000", { ...facts, ...change }, cashDefaultFormIds(facts))).toBeTruthy();
    }
  });
  it("generates actual filled PDFs, the official two-page Buyers Guide, and unsigned limited POA", async () => {
    const packet = await generateUnifiedCrmContractPacket(actor, { customerName: "SAMPLE BUYER - NOT FOR SIGNATURE", dealNumber: "CASH-SAMPLE", packetType: "MINNESOTA_RETAIL_SALE", salePrice: "10000", retailCash: facts, vehicle }, { now: () => new Date("2026-11-01T18:00:00Z") });
    expect(packet.documents.map(d => d.formId)).toEqual(cashDefaultFormIds(facts));
    for (const document of packet.documents) {
      expect(document.contentType).toBe("application/pdf"); expect(document.signatureStatus).toBe("UNSIGNED");
      const pdf = await PDFDocument.load(Buffer.from(document.contentBase64!, "base64"));
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      if (document.formId !== "buyers-guide") {
        if (!["title-registration-application", "tax-fee-receipt"].includes(document.formId)) expect(pdf.getForm().getTextField("buyer_signature").getText() || "").toBe("");
        expect(pdf.getForm().getFields().some(f => "getText" in f && (f as { getText: () => string }).getText() === vehicle.vin)).toBe(true);
      }
    }
    const guide = await PDFDocument.load(Buffer.from(packet.documents.find(d => d.formId === "buyers-guide")!.contentBase64!, "base64"));
    expect(guide.getPageCount()).toBe(2);
    expect(guide.getForm().getTextField("topmostSubform[0].BG-AsIs[0].VIN[0]").getText()).toBe(vehicle.vin);
    expect(guide.getForm().getRadioGroup("topmostSubform[0].BG-AsIs[0].Warranty[0]").getSelected()).toBe("Dealer");
    expect(guide.getForm().getFields().some(f => f.getName().includes("BG-Implied"))).toBe(false);
    const poa = packet.documents.find(d => d.formId === "power-of-attorney")!;
    const poaPdf=await PDFDocument.load(Buffer.from(poa.contentBase64!,"base64"));
    expect(poaPdf.getForm().getTextField("authorizedAgent").getText()).toBe("Sample Title Clerk"); expect(poaPdf.getForm().getTextField("poaExpiration").getText()).toBe("2026-12-01"); expect(poa.html).toContain("Customer signing form");
    expect(packet.documents.find(d => d.formId === "funding-proof")!.html).toContain("NO PAYMENT RECORDED");
    expect(packet.documents.find(d => d.formId === "title-registration-application")!.html).toContain("not a DVS application");
  });
  it("clears stale warranty coverage from an explicitly reviewed no-warranty Buyers Guide", async () => {
    const packet = await generateUnifiedCrmContractPacket(actor, { retailCash: { ...facts, mileage: "210000", warrantyType: "No dealer warranty - eligibility reviewed", warrantyExemption: "Over 200,000 miles; eligibility reviewed" }, vehicle, customerName: "Sample buyer", salePrice: "10000" });
    const guide = await PDFDocument.load(Buffer.from(packet.documents.find(d => d.formId === "buyers-guide")!.contentBase64!, "base64")), prefix = "topmostSubform[0].BG-AsIs[0].";
    expect(guide.getForm().getRadioGroup(prefix + "Warranty[0]").getSelected()).toBe("As Is");
    expect(guide.getForm().getTextField(prefix + "SystemsCovered1[0]").getText() || "").toBe("");
    expect(guide.getForm().getTextField(prefix + "Labor[0]").getText() || "").toBe("");
  });
  it("rejects omitted baseline forms on the server, and does not silently add credit documents", async () => {
    await expect(generateUnifiedCrmContractPacket(actor, { retailCash: facts, vehicle, customerName: "Sample buyer", salePrice: "10000", preparedFormIds: ["power-of-attorney"] })).rejects.toThrow("Include the purchase agreement");
    const packet = await generateUnifiedCrmContractPacket(actor, { retailCash: facts, vehicle, customerName: "Sample buyer", salePrice: "10000", preparedFormIds: ["sales-agreement", "binding-contract-disclosure", "odometer-disclosure", "tax-fee-receipt"] });
    expect(packet.documents).toHaveLength(4); expect(packet.documents.some(d => d.formId.includes("installment") || d.formId.includes("references"))).toBe(false);
  });
});
