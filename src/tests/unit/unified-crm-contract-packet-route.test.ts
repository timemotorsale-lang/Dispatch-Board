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
        preparedFormIds: ["sales-agreement", "odometer-disclosure", "power-of-attorney"],
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
    expect(packet.documents).toHaveLength(3);
    expect(packet.documents[0].html).toContain("Alex Buyer");
    expect(packet.documents[0].html).toContain("Black");
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
      "gps-disclosure",
      "kap-warranty"
    ]);
    expect(packet.documents.every((document: { contentType: string }) => document.contentType === "application/pdf")).toBe(true);
  });
});
