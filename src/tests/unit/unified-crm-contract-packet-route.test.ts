import { beforeEach, describe, expect, it, vi } from "vitest";

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
          contractLength: 71.88,
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
    expect(packet.documents).toHaveLength(3);
    expect(packet.documents[0].label).toBe("W2 lease agreement");
    expect(packet.documents[0].contentType).toBe("application/pdf");
    expect(packet.documents[0].contentBase64).toMatch(/^JVBER/);
    expect(packet.documents[0].templatePath).toBe("/forms/lease-to-own/w2-lease.pdf");
    expect(packet.documents[0].fieldValues["Name-Address Lessee"]).toBe("Sam Lease");
    expect(packet.documents[0].fieldValues["Total Amount Due at Lease Signing or Delivery"]).toBe("19680.64");
    expect(packet.documents[0].fieldValues["The total of all your periodic payments is"]).toBe("17970.00");
    expect(packet.documents[0].fieldValues["Gross capitalized cost The agreed upon value of the vehicle of"]).toBe("38000.00");
    expect(packet.documents[0].fieldValues["undefined_29"]).toBe("21808.07");
    expect(packet.documents[0].fieldValues["undefined_36"]).toBe("39980.71");
    expect(packet.documents[0].fieldValues.Text2).toBe("Amount at delivery");
    expect(packet.documents[0].fieldValues.Pay1).toBe("19680.64");
    expect(packet.documents[0].fieldValues["DELIVERY, followed by 1"]).toBe("72");
    expect(packet.documents[0].fieldValues["DELIVERY, followed by 2"]).toBe("N/A");
    expect(packet.documents[0].fieldValues["payments of"]).toBe("250.00");
    expect(packet.documents[0].fieldValues["of each"]).toBe("each");
    expect(packet.documents[0].fieldValues["due on the"]).toMatch(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/);
    expect(packet.documents[0].fieldValues.starting).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(packet.auditTrail[0].detail).toContain("lease-to-own form");
  });

  it("fills W2 signing amount from down payment and derives the capitalized cost reduction", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Down Payment Lessee",
        leaseCalculator: {
          additionalItemsCents: 0,
          capitalizedCostReductionCents: 0,
          contractLength: 71.88,
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
    expect(packet.documents[0].fieldValues["Total Amount Due at Lease Signing or Delivery"]).toBe("19680.64");
    expect(packet.documents[0].fieldValues.Pay1).toBe("19680.64");
    expect(packet.documents[0].fieldValues["undefined_20"]).toBe("16441.93");
    expect(packet.documents[0].fieldValues.Text2).toBe("Amount at delivery");
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
    expect(packet.documents[0].html).toContain("Minnesota daily rental agreement");
    expect(packet.documents[0].html).toContain("Minnesota insurance and coverage notice");
    expect(packet.documents[0].html).toContain("Default, recovery, and repossession right");
    expect(packet.documents[0].html).toContain("Indemnity and liability allocation");
    expect(packet.documents[2].html).toContain("Damage and loss responsibility");
    expect(packet.documents[3].html).toContain("Minnesota optional coverage notice");
    expect(packet.documents[4].html).toContain("Card last 4");
    expect(packet.delivery).toMatchObject({ downloadReady: true, emailReady: true, printReady: true, textReady: true });
    expect(packet.auditTrail[0].detail).toContain("daily rental form");
  });

  it("generates a vehicle loaner signing packet from the approved courtesy loaner pathway", async () => {
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
    expect(packet.documents[0].html).toContain("Courtesy / service loaner agreement");
    expect(packet.documents[0].html).toContain("Temporary customer mobility");
    expect(packet.documents[0].html).toContain("Authorized drivers - strict requirement");
    expect(packet.documents[1].html).toContain("Vehicle condition and return record");
    expect(packet.documents[2].html).toContain("Minnesota statutory rental vehicle insurance notice");
    expect(packet.auditTrail[0].detail).toContain("vehicle loaner form");
  });
});
