import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
import { EMPTY_CASH_SALE } from "@/lib/cash-retail-sale";
import { saleLibraryCatalog, saleLibraryDefaultIds, validateCashPrintPack } from "@/lib/cash-sale-print-library";
import { BHPH_FINANCING_VERSION, MN_BHPH_FEE_DEFAULTS, calculateBhphFinancing } from "@/lib/bhph-financing";
import { BHPH_PAYMENT_VERSION } from "@/lib/bhph-payment";
import type { AuthenticatedUser } from "@/server/auth/store";
const actor = { id: "fictional-staff" } as AuthenticatedUser;
const facts = { ...EMPTY_CASH_SALE, buyerAddress: "100 Sample Street", buyerPhone: "6125550100", buyerEmail: "buyer@example.test", saleDate: "2026-11-05", mileage: "54000", odometerStatus: "Actual", titleBrand: "None", damageDisclosure: "None known", authorizedAgent: "Demo Staff", warrantyType: "Dealer limited warranty", warrantyCoverage: "Powertrain; statutory coverage preserved", warrantyDuration: "30 days or 1,000 miles" };
const vehicle = { vin: "1NXBR32E85Z123456", stockNumber: "DEMO", year: "2005", make: "Toyota", model: "Corolla", color: "Silver" };
describe("shared vehicle sale form library", () => {
  it.each(["finance", "outside-finance-one-pay"] as const)("uses the library purchase form and preserves credit documents for %s", async pathway => {
    const packet = await generateUnifiedCrmContractPacket(actor, { packetType: "MINNESOTA_RETAIL_SALE", customerName: "Demo Buyer", salePrice: "10000", vehicle, sharedSaleLibrary: { pathway, facts, loan: { downPayment: "2000", amountFinanced: "9000" } } });
    const agreement = packet.documents.find(doc => doc.formId === "sales-agreement")!;
    const pdf = await PDFDocument.load(Buffer.from(agreement.contentBase64!, "base64"));
    expect(pdf.getForm().getTextField("noFinance").getText()).toMatch(/^Yes - /);
    expect(pdf.getForm().getTextField("paymentMethod").getText()).toMatch(/financing/i);
    expect(pdf.getForm().getTextField("balance").getText()).toBe("$10,987.50");
    expect(pdf.getForm().getTextField("paid").getText()).toBe("$0.00");
    expect(pdf.getForm().getTextField("continuation_1_0").getText()).toContain("9000");
    expect(packet.documents.some(doc => doc.formId === "retail-installment-contract")).toBe(true);
    expect(packet.documents.some(doc => doc.formId === "personal-references")).toBe(true);
    expect(packet.documents.every(doc => doc.contentType === "application/pdf" && doc.signatureStatus === "UNSIGNED")).toBe(true);
    expect(packet.documents.find(doc => doc.formId === "funding-proof")?.html).toContain("NO PAYMENT RECORDED");
  });
  it("retains BHPH supporting forms and server-calculated financing in the shared library", async () => {
    const financing = { ...MN_BHPH_FEE_DEFAULTS, saleDate: "2026-11-05", registrationFee: "417" };
    const totals = calculateBhphFinancing("28895", "15000", financing);
    const packet = await generateUnifiedCrmContractPacket(actor, { packetType: "BHPH", customerName: "Demo Buyer", vehicle, dealerWarrantyOffered: false, salePrice: "28895", preparedFormIds: ["sales-agreement"], sharedSaleLibrary: { pathway: "bhph", facts: { ...facts, warrantyType: "No dealer warranty - eligibility reviewed", warrantyExemption: "Fictional reviewed exemption basis", saleDate: "2020-01-01", docFee: "1", titleFee: "1" } }, bhph: { calculationVersion: BHPH_FINANCING_VERSION, paymentCalculationVersion: BHPH_PAYMENT_VERSION, financing, calculationMode: "TERM", apr: "0", termMonths: "24", paymentAmount: "500", paymentFrequency: "Monthly", firstPaymentDate: "2026-12-05", salePrice: "28895", downPayment: "15000", deliveryMileage: "54000", amountFinanced: "1" } });
    expect(packet.bhphFinancing?.amountsCents.amountFinanced).toBe(totals.amountFinanced);
    expect(packet.documents.some(doc => doc.formId === "bhph-payment-schedule-servicing")).toBe(true);
    expect(packet.documents.some(doc => doc.formId === "bhph-installment-contract")).toBe(true);
    expect(packet.documents.every(doc => doc.contentType === "application/pdf")).toBe(true);
    const agreement = await PDFDocument.load(Buffer.from(packet.documents.find(doc => doc.formId === "sales-agreement")!.contentBase64!, "base64"));
    expect(agreement.getForm().getTextField("noFinance").getText()).toContain("BHPH");
    expect(agreement.getForm().getTextField("docFee").getText()).toBe("$300.00");
    expect(agreement.getForm().getTextField("balance").getText()).not.toBe("1");
  });
  it("keeps cash defaults cash-only and allows reusable packs to hold financing form selections", () => {
    expect(saleLibraryDefaultIds("retail-sale", facts).some(id => id.includes("bhph") || id.includes("installment"))).toBe(false);
    expect(saleLibraryCatalog("bhph").some(form => form.id === "sales-agreement")).toBe(true);
    expect(validateCashPrintPack({ label: "BHPH signing", ids: ["sales-agreement", "bhph-installment-contract"] }).ids).toHaveLength(2);
  });
  it("rejects pathway/packet mismatch without generating misleading cash forms", async () => {
    await expect(generateUnifiedCrmContractPacket(actor, { packetType: "BHPH", sharedSaleLibrary: { pathway: "finance", facts } })).rejects.toThrow("saved sales pathway");
  });
  it("keeps wholesale originals distinct and never substitutes retail consumer agreements", async () => {
    const wholesale = { ...facts, docFee: "0", taxOverride: "0", taxReason: "Fictional verified dealer resale basis" };
    const packet = await generateUnifiedCrmContractPacket(actor, { customerName: "Demo Dealer", salePrice: "10000", vehicle, sharedSaleLibrary: { pathway: "wholesale", facts: wholesale } });
    expect(packet.documents.some(doc => ["sales-agreement", "buyers-guide", "retail-installment-contract", "wholesale-bill-of-sale", "payment-receipt"].includes(doc.formId))).toBe(false);
    expect(packet.documents.some(doc => doc.formId === "odometer-disclosure")).toBe(true);
    await expect(generateUnifiedCrmContractPacket(actor, { customerName: "Demo Dealer", salePrice: "10000", vehicle, preparedFormIds: ["wholesale-bill-of-sale"], sharedSaleLibrary: { pathway: "wholesale", facts: wholesale } })).rejects.toThrow("uploaded wholesale originals");
    await expect(generateUnifiedCrmContractPacket(actor, { customerName: "Demo Dealer", salePrice: "10000", vehicle, sharedSaleLibrary: { pathway: "wholesale", facts } })).rejects.toThrow("wholesale sales tax");
  });
});
