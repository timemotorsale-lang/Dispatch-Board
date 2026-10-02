import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { GET } from "@/app/api/crm/v1/contract-packets/[packetId]/route";
import { POST } from "@/app/api/crm/v1/contract-packets/route";

describe("Unified CRM contract packet route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("generates and reads an archived Minnesota sale packet", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Alex Buyer",
        feeTotal: "$22.25",
        preparedFormIds: ["sales-agreement", "odometer-disclosure", "power-of-attorney", "personal-references"],
        salePrice: "$12,500.00",
        vehicle: {
          color: "Black",
          make: "Toyota",
          model: "Corolla",
          stockNumber: "123456",
          trim: "LE",
          vin: "1NXBR32E85Z123456",
          year: "2005"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.status).toBe("ARCHIVED");
    expect(packet.documents).toHaveLength(4);
    expect(packet.documents[0].html).toContain("Alex Buyer");
    expect(packet.documents[0].html).toContain("Black");
    expect(packet.documents[0]).toMatchObject({
      contentType: "application/pdf",
      downloadFileName: expect.stringMatching(/^sales-agreement-.*\.pdf$/),
      fieldValues: expect.objectContaining({
        customer_name: "Alex Buyer",
        sale_price: "$12,500.00",
        vin: "1NXBR32E85Z123456"
      }),
      templatePath: "/forms/minnesota-retail-sale/sales-agreement.pdf"
    });
    expect(packet.documents[0].contentBase64).toMatch(/^JVBER/);
    const referenceForm = packet.documents.find((document: { formId: string }) => document.formId === "personal-references");
    expect(referenceForm).toMatchObject({
      contentType: "application/pdf",
      downloadFileName: expect.stringMatching(/^personal-references-.*\.pdf$/),
      label: "Personal references and verification form"
    });
    expect(referenceForm.contentBase64).toMatch(/^JVBER/);
    expect(referenceForm.html).toContain("Reference 1");
    expect(referenceForm.html).toContain("Reference 3");
    expect(referenceForm.html).toContain("Reference 5");
    expect(referenceForm.html).toContain("at least five");
    expect(referenceForm.html).not.toContain("<label>Address");
    const referencePdf = await PDFDocument.load(Buffer.from(referenceForm.contentBase64, "base64"));
    expect(referencePdf.getPageCount()).toBe(1);
    for (const index of [1, 2, 3, 4, 5]) {
      expect(referencePdf.getForm().getTextField(`ref_${index}_name`)).toBeDefined();
      expect(referencePdf.getForm().getTextField(`ref_${index}_phone`)).toBeDefined();
      expect(referencePdf.getForm().getTextField(`ref_${index}_name`).isRequired()).toBe(true);
      expect(referencePdf.getForm().getTextField(`ref_${index}_phone`).isRequired()).toBe(true);
      expect(referencePdf.getForm().getFields().some((field) => field.getName() === `ref_${index}_address`)).toBe(false);
    }
    expect(packet.delivery).toMatchObject({ downloadReady: true, emailReady: true, printReady: true, textReady: true });
    expect(packet.auditTrail[0].action).toBe("CONTRACT_PACKET_GENERATED");

    const archived = await GET(new Request("http://crm.local/api/crm/v1/contract-packets/packet-1"), {
      params: Promise.resolve({ packetId: packet.packetId })
    });
    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({ packetId: packet.packetId, status: "ARCHIVED" });
  });

  it("requires authentication before packet generation", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const response = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", { body: "{}", method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      error: "Sign in before generating a contract packet."
    });
  });

  it("generates a lease-to-own packet with calculator-driven lease disclosures", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Sam Lease",
        dealType: "Lease-to-Own",
        leaseCalculator: {
          additionalItemsCents: 0,
          capitalizedCostReductionCents: 1619193,
          contractLength: 72,
          documentPreparationFeeCents: 37500,
          gpsCostCents: 0,
          multiplierBasisPoints: 20000,
          originationFeeCents: 0,
          otherRoadWorthyCostCents: 0,
          paymentFrequency: "Monthly",
          registrationFeeCents: 51600,
          salesTaxRateBasisPoints: 650,
          titleFeeCents: 10280,
          warrantyCostCents: 0,
          wholesaleCostCents: 1900000
        },
        packetType: "LEASE_TO_OWN",
        leaseFacts: { agreementDate: "2026-09-16", firstPaymentDate: "2026-10-16", coLesseeName: "Jordan Lease", lesseeAddress: "123 Lake St", lesseePhone: "612-555-0123", insuranceCompany: "Progressive", lesseeEmail: "sam@example.com" },
        preparedFormIds: ["w2-lease", "insurance-binder", "exhibit-a-addenda"],
        vehicle: {
          color: "Silver",
          make: "Honda",
          model: "CR-V",
          stockNumber: "654321",
          trim: "EX",
          vin: "5J6RM4H58FL654321",
          year: "2015"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    const agreement = packet.documents.find((document: { formId: string }) => document.formId === "w2-lease");
    expect(packet.documents).toHaveLength(4);
    expect(agreement.label).toBe("W2 lease agreement");
    const summary = packet.documents[0];
    expect(summary.formId).toBe("lease-summary");
    expect(summary.contentType).toBe("application/pdf");
    expect(summary.html).toContain("Sam Lease / Jordan Lease");
    for (const value of ["$19,680.22", "$249.58", "$249.89", "$3,838.00", "$39,980.71", "10/16/2026"]) {
      expect(summary.html).toContain(value);
    }
    expect(summary.html).toContain("separate from the lease total");
    expect(summary.html).not.toMatch(/wholesale|multiplier|profit/i);
    const summaryPdf = await PDFDocument.load(Buffer.from(summary.contentBase64, "base64"));
    expect(summaryPdf.getPageCount()).toBe(1);
    expect(summaryPdf.getForm().getTextField("lessee_summary_signature")).toBeDefined();
    expect(agreement.contentType).toBe("application/pdf");
    expect(agreement.contentBase64).toMatch(/^JVBER/);
    expect(agreement.templatePath).toBe("/forms/lease-to-own/w2-lease.pdf");
    expect(agreement.fieldValues["Name-Address Lessee"]).toBe("Sam Lease, 123 Lake St");
    expect(agreement.fieldValues["Total Amount Due at Lease Signing or Delivery"]).toBe("19680.22");
    expect(agreement.fieldValues["The total of all your periodic payments is"]).toBe("17970.07");
    expect(agreement.fieldValues["Gross capitalized cost The agreed upon value of the vehicle of"]).toBe("38000.00");
    expect(agreement.fieldValues["undefined_29"]).toBe("21808.07");
    expect(agreement.fieldValues["undefined_5"]).toBe("39980.71");
    expect(agreement.fieldValues["undefined_36"]).toBe("0.00");
    expect(agreement.fieldValues.Text2).toBe("monthly");
    expect(agreement.fieldValues.Pay1).toBe("249.58");
    expect(agreement.fieldValues["DELIVERY, followed by 1"]).toBe("70");
    expect(agreement.fieldValues["DELIVERY, followed by 3"]).toBe("Final: $249.89");
    expect(agreement.fieldValues["payments of"]).toBe("249.58");
    expect(agreement.fieldValues["of each"]).toBe("month");
    expect(agreement.fieldValues["due on the"]).toBe("16");
    expect(agreement.fieldValues.starting).toBe("10/16/2026");
    const pdf = await PDFDocument.load(Buffer.from(agreement.contentBase64, "base64"));
    const form = pdf.getForm();
    expect(form.getTextField("Res Ph").getText() ?? "").toBe("");
    expect(form.getTextField("PRINT NAME_2").getText() ?? "").toBe("");
    for (const [name, value] of Object.entries({ undefined_34: "72", undefined_35: "249.58", undefined_39: "249.58", undefined_12: "102.80", undefined_18: "2244.91", undefined_21: "19680.22", "Ins Co": "Progressive", "Name-Address Co-Lessee": "Jordan Lease" })) {
      expect(form.getTextField(name).getText()).toBe(value);
      expect(form.getTextField(name).acroField.getWidgets()[0].getNormalAppearance()).toBeDefined();
    }
    expect(packet.auditTrail[0].detail).toContain("lease-to-own form");
  });

  it("fills W2 signing amount from down payment and derives the capitalized cost reduction", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Down Payment Lessee",
        leaseCalculator: {
          additionalItemsCents: 0,
          capitalizedCostReductionCents: 0,
          contractLength: 72,
          documentPreparationFeeCents: 37500,
          downPaymentCents: 1968064,
          gpsCostCents: 0,
          multiplierBasisPoints: 20000,
          originationFeeCents: 0,
          otherRoadWorthyCostCents: 0,
          paymentFrequency: "Monthly",
          registrationFeeCents: 51600,
          salesTaxRateBasisPoints: 650,
          titleFeeCents: 10280,
          warrantyCostCents: 0,
          wholesaleCostCents: 1900000
        },
        packetType: "LEASE_TO_OWN",
        preparedFormIds: ["w2-lease"],
        vehicle: {
          make: "Ford",
          model: "Escape",
          stockNumber: "B93182",
          vin: "1FMCU9G66LUB93182",
          year: "2020"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    const agreement = packet.documents.find((document: { formId: string }) => document.formId === "w2-lease");
    expect(agreement.fieldValues["Total Amount Due at Lease Signing or Delivery"]).toBe("19680.64");
    expect(agreement.fieldValues.Pay1).toBe("249.58");
    expect(agreement.fieldValues["undefined_7"]).toBe("16192.35");
    expect(agreement.fieldValues.Text2).toBe("monthly");
  });

  it.each(["CAPITALIZED_REDUCTION", "DOWN_PAYMENT"])("uses the calculated payment-amount term with %s in both documents", async (signingPaymentMode) => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST",
      body: JSON.stringify({
        packetType: "LEASE_TO_OWN", preparedFormIds: ["w2-lease"],
        leaseCalculator: {
          calculationMode: "PAYMENT_AMOUNT", targetPaymentCents: 25000, contractLength: 36,
          wholesaleCostCents: 1900000, multiplierBasisPoints: 20000,
          capitalizedCostReductionCents: 1619193, documentPreparationFeeCents: 37500,
          signingPaymentMode, downPaymentCents: 1968064,
          registrationFeeCents: 51600, titleFeeCents: 10280, salesTaxRateBasisPoints: 650,
          paymentFrequency: "Monthly"
        },
        leaseFacts: { agreementDate: "2026-09-16" }
      })
    }));
    expect(created.status).toBe(201);
    const packet = await created.json();
    const agreement = packet.documents.find((document: { formId: string }) => document.formId === "w2-lease");
    expect(agreement.fieldValues.undefined_34).toBe("72");
    expect(agreement.fieldValues.undefined_35).toBe("249.58");
    const finalPayment = signingPaymentMode === "DOWN_PAYMENT" ? "249.47" : "249.89";
    expect(agreement.fieldValues["DELIVERY, followed by 3"]).toBe(`Final: $${finalPayment}`);
    expect(packet.documents[0].html).toContain("<td>72</td>");
    expect(packet.documents[0].html).toContain("$249.58");
    expect(packet.documents[0].html).toContain(`$${finalPayment}`);
  });

  it.each([0, -100])("rejects target payment %s during packet generation", async (targetPaymentCents) => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST", body: JSON.stringify({
        packetType: "LEASE_TO_OWN", preparedFormIds: ["w2-lease"],
        leaseCalculator: { calculationMode: "PAYMENT_AMOUNT", targetPaymentCents, wholesaleCostCents: 1000000 }
      })
    }));
    expect(created.status).toBe(400);
    expect((await created.json()).error).toContain("positive target");
  });

  it.each([
    ["Monthly", 12, "02/28/2026"],
    ["Weekly", 12, "02/07/2026"],
    ["BiWeekly", 12, "02/14/2026"],
    ["Monthly", 1, "None"]
  ])("includes the summary for %s leases with %s payments", async (paymentFrequency, contractLength, nextDate) => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST",
      body: JSON.stringify({
        packetType: "LEASE_TO_OWN",
        preparedFormIds: ["w2-lease"],
        leaseFacts: { agreementDate: "2026-01-31" },
        leaseCalculator: { paymentFrequency, contractLength, wholesaleCostCents: 1000000, multiplierBasisPoints: 20000 }
      })
    }));
    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents.map((document: { formId: string }) => document.formId)).toEqual(["lease-summary", "w2-lease"]);
    expect(packet.documents[0].html).toContain(nextDate);
    expect(packet.documents[0].html).toContain("timemotorsale@gmail.com");
    expect(packet.documents[0].html).toContain("20 cents per mile");
    expect(packet.documents[0].html).toContain("$10 after 5 business days");
  });

  it.each([
    { calculator: { contractLength: 71.88 }, facts: {}, message: "whole number" },
    { calculator: { signingPaymentMode: "DOWN_PAYMENT", downPaymentCents: 0 }, facts: {}, message: "cover fees" },
    { calculator: {}, facts: { agreementDate: "2026-02-30" }, message: "valid lease" },
    { calculator: {}, facts: { agreementDate: "2026-09-16", firstPaymentDate: "2026-09-15" }, message: "follow the lease" }
  ])("rejects invalid lease terms and dates: $message", async ({ calculator, facts, message }) => {
    const response = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      method: "POST", body: JSON.stringify({ packetType: "LEASE_TO_OWN", preparedFormIds: ["w2-lease"],
        leaseCalculator: { contractLength: 36, wholesaleCostCents: 1200000, multiplierBasisPoints: 20000, ...calculator },
        leaseFacts: facts
      })
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(message);
  });

  it("defaults lease-to-own generation to the full uploaded lease packet", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Full Packet Lessee",
        leaseCalculator: {
          contractLength: 36,
          documentPreparationFeeCents: 37500,
          multiplierBasisPoints: 20000,
          paymentFrequency: "Monthly",
          registrationFeeCents: 51600,
          salesTaxRateBasisPoints: 688,
          titleFeeCents: 10280,
          wholesaleCostCents: 1200000
        },
        packetType: "LEASE_TO_OWN",
        vehicle: {
          color: "Black",
          make: "Ford",
          model: "Escape",
          stockNumber: "B93182",
          vin: "1FMCU9G66LUB93182",
          year: "2020"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents.map((document: { formId: string }) => document.formId)).toEqual([
      "lease-summary",
      "w2-lease",
      "insurance-binder",
      "exhibit-a-addenda",
      "binding-arbitration",
      "excluded-driver",
      "vehicle-inspection",
      "power-of-attorney",
      "personal-references",
      "gps-disclosure",
      "kap-warranty"
    ]);
    expect(packet.documents.find((document: { formId: string }) => document.formId === "power-of-attorney")).toMatchObject({
      contentType: "text/html",
      label: "Power of attorney / title authority"
    });
    expect(packet.documents.find((document: { formId: string }) => document.formId === "personal-references")).toMatchObject({
      contentType: "application/pdf",
      label: "Personal references and verification form"
    });
  });

  it("generates a daily rental signing packet with rental agreement controls", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Rental Customer",
        dailyRental: {
          cardLast4: "4242",
          depositHold: "$300.00",
          dropoffDate: "2026-09-16",
          dropoffTime: "10:00",
          estimatedAuthorization: "$349.00",
          estimatedRentalCharges: "$49.00",
          fuelOut: "Full",
          insuranceCarrier: "State Farm",
          insurancePolicy: "POL-123",
          licenseNumber: "D123456789",
          licenseState: "MN",
          licenseStatus: "Valid",
          mileageOut: "104,210",
          mileagePlan: "Local use / daily mileage cap",
          paymentMethod: "Credit card",
          pickupDate: "2026-09-15",
          pickupTime: "10:00",
          protectionPlan: "Customer insurance on file",
          ratePerDay: "$49.00",
          rentalDays: "1",
          returnFuel: "Return full",
          secondaryId: "Not needed",
          useRestriction: "Minnesota local use"
        },
        dealNumber: "B93182",
        dealType: "Daily Rental",
        packetType: "DAILY_RENTAL",
        vehicle: {
          color: "White",
          make: "Ford",
          model: "Escape",
          stockNumber: "B93182",
          vin: "1FMCU9G66LUB93182",
          year: "2020"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents.map((document: { formId: string }) => document.formId)).toEqual([
      "daily-rental-agreement",
      "rental-terms-conditions",
      "damage-loss-responsibility",
      "protection-election",
      "insurance-payment-authorization",
      "vehicle-condition-report",
      "incident-reporting-instructions"
    ]);
    expect(packet.documents[0].contentType).toBe("text/html");
    expect(packet.documents[0].html).toContain("Rental Customer");
    expect(packet.documents[0].html).toContain("Estimated authorization");
    expect(packet.documents[0].html).toContain("Daily vehicle rental agreement");
    expect(packet.documents[0].html).toContain("Time Motor Sales, Inc.");
    expect(packet.documents[0].html).toContain("1101 E. Lake Street, Minneapolis, MN 55407");
    expect(packet.documents[0].html).toContain("timemotorsale@gmail.com");
    expect(packet.documents[0].html).toContain("timemotors.net");
    expect(packet.documents[0].html).toContain("Minnesota rental vehicle insurance notice");
    expect(packet.documents[0].html).toContain("Default and vehicle recovery");
    expect(packet.documents[0].html).toContain("Indemnity, no agency, and liability allocation");
    expect(packet.documents[2].html).toContain("Damage and loss responsibility");
    expect(packet.documents[3].html).toContain("Minnesota insurance notice and protection election");
    expect(packet.documents[4].html).toContain("Card last 4");
    expect(packet.delivery).toMatchObject({ downloadReady: true, emailReady: true, printReady: true, textReady: true });
    expect(packet.auditTrail[0].detail).toContain("daily rental form");
  });

  it("generates a vehicle loaner signing packet from the enterprise courtesy loaner agreement", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Loaner Customer",
        dailyRental: {
          depositHold: "$100.00",
          dropoffDate: "2026-09-16",
          dropoffTime: "17:00",
          estimatedRentalCharges: "$0.00",
          fuelOut: "Full",
          insuranceCarrier: "Progressive",
          insurancePolicy: "LOAN-123",
          licenseNumber: "L123456789",
          licenseState: "MN",
          licenseStatus: "Valid",
          mileageOut: "88,210",
          pickupDate: "2026-09-15",
          pickupTime: "09:00",
          ratePerDay: "$0.00",
          returnFuel: "Return full"
        },
        dealNumber: "LOANER-1",
        dealType: "Vehicle loaner",
        packetType: "VEHICLE_LOANER",
        vehicle: {
          color: "Gray",
          make: "Honda",
          model: "Accord",
          stockNumber: "P1234",
          vin: "1HGCM82633A004352",
          year: "2006"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents.map((document: { formId: string }) => document.formId)).toEqual([
      "courtesy-loaner-agreement",
      "courtesy-loaner-condition-return-record",
      "courtesy-loaner-minnesota-insurance-notice"
    ]);
    expect(packet.documents[0].html).toContain("Courtesy vehicle loaner agreement");
    expect(packet.documents[0].html).toContain("Time Motor Sales, Inc.");
    expect(packet.documents[0].html).toContain("1101 E. Lake Street, Minneapolis, MN 55407");
    expect(packet.documents[0].html).toContain("timemotorsale@gmail.com");
    expect(packet.documents[0].html).toContain("timemotors.net");
    expect(packet.documents[0].html).toContain("Temporary customer mobility");
    expect(packet.documents[0].html).toContain("Authorized drivers only");
    expect(packet.documents[0].html).toContain("Customer financial responsibility");
    expect(packet.documents[1].html).toContain("Vehicle condition, custody, and return record");
    expect(packet.documents[2].html).toContain("Minnesota rental vehicle insurance notice");
    expect(packet.auditTrail[0].detail).toContain("vehicle loaner form");
  });

  it("generates a BHPH account packet with installment support controls", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        bhph: {
          amountFinanced: "$8,500.00",
          apr: "24.00%",
          approvalTriggers: "0",
          coBuyer: "None",
          downPayment: "$1,500.00",
          employer: "Warehouse Co.",
          evidenceCount: "6/6",
          firstPaymentDate: "2026-10-15",
          handoffCount: "4/4",
          income: "Paystub verified",
          insuranceStatus: "Verified",
          lateFee: "$10.00",
          paperworkCount: "6/6",
          paymentAmount: "$125.00",
          paymentFrequency: "Weekly",
          references: "5 provided / pending verification",
          residence: "Utility bill verified",
          salePrice: "$10,000.00",
          stipulations: "None",
          termMonths: "24",
          titleStatus: "Ready",
          warrantyPosture: "As-is disclosure required"
        },
        customerName: "BHPH Buyer",
        dealNumber: "BHPH-1001",
        dealType: "BHPH",
        packetType: "BHPH",
        vehicle: {
          color: "Blue",
          make: "Toyota",
          model: "Camry",
          stockNumber: "B1001",
          vin: "4T1BF1FK0HU123456",
          year: "2017"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.documents.map((document: { formId: string }) => document.formId)).toEqual([
      "bhph-installment-contract",
      "bhph-payment-schedule-servicing",
      "bhph-insurance-maintenance",
      "bhph-default-cure-recovery",
      "bhph-gps-starter-disclosure",
      "bhph-references-contact-authorization",
      "bhph-delivery-condition",
      "bhph-privacy-communications",
      "bhph-deal-jacket-checklist"
    ]);
    expect(packet.documents[0].contentType).toBe("text/html");
    expect(packet.documents[0].html).toContain("BHPH retail installment contract support");
    expect(packet.documents[0].html).toContain("Time Motor Sales, Inc.");
    expect(packet.documents[0].html).toContain("1101 E. Lake Street, Minneapolis, MN 55407");
    expect(packet.documents[0].html).toContain("timemotorsale@gmail.com");
    expect(packet.documents[0].html).toContain("timemotors.net");
    expect(packet.documents[0].html).toContain("final approved retail installment sale contract");
    expect(packet.documents[1].html).toContain("Payment schedule");
    expect(packet.documents[3].html).toContain("Default events");
    expect(packet.documents[4].html).toContain("GPS, telematics, and starter-interrupt controls");
    expect(packet.documents[5].html).toContain("at least five");
    expect(packet.documents[5].html).toContain("Reference 5");
    expect(packet.documents[5].html).not.toContain("street address / city / state / ZIP");
    expect(packet.documents[5].contentType).toBe("application/pdf");
    const bhphReferencesPdf = await PDFDocument.load(Buffer.from(packet.documents[5].contentBase64, "base64"));
    expect(bhphReferencesPdf.getPageCount()).toBe(1);
    expect(bhphReferencesPdf.getForm().getTextField("ref_5_name")).toBeDefined();
    expect(bhphReferencesPdf.getForm().getTextField("sale_price").getText()).toBe("$10,000.00");
    expect(bhphReferencesPdf.getForm().getFields().some((field) => /^ref_\d_address$/.test(field.getName()))).toBe(false);
    expect(packet.documents[5].html).toContain("not fabricated");
    expect(packet.documents[7].html).toContain("Privacy and communications acknowledgement");
    expect(packet.delivery).toMatchObject({ downloadReady: true, emailReady: true, printReady: true, textReady: true });
    expect(packet.auditTrail[0].detail).toContain("BHPH form");
  });
});
