import { describe, expect, it } from "vitest";

import {
  generateInsuranceClaimIntakeDocuments,
  INSURANCE_CLAIM_INTAKE_FORM_PACKET,
  requiredInsuranceClaimIntakeFormIds
} from "@/lib/insurance-claim-intake-form-packet";

describe("insurance claim intake form packet", () => {
  it("defines the first claim intake packet with required and conditional forms", () => {
    expect(INSURANCE_CLAIM_INTAKE_FORM_PACKET.map((form) => form.id)).toEqual([
      "insurance-claim-intake",
      "customer-authorization-direction-to-repair",
      "vehicle-damage-photo-checklist",
      "insurance-carrier-contact",
      "tow-storage-release",
      "claim-handoff-checklist"
    ]);

    expect(requiredInsuranceClaimIntakeFormIds()).toEqual([
      "insurance-claim-intake",
      "customer-authorization-direction-to-repair",
      "vehicle-damage-photo-checklist",
      "insurance-carrier-contact",
      "claim-handoff-checklist"
    ]);
  });

  it("generates reviewable HTML forms for customer, vehicle, carrier, evidence, and handoff intake", () => {
    const documents = generateInsuranceClaimIntakeDocuments({
      adjusterName: "Pat Adjuster",
      carrierName: "State Farm",
      claimNumber: "MN-48291",
      customerName: "Deqo Roble",
      generatedAt: "2026-09-17T18:00:00.000Z",
      lossDate: "2026-09-15",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleVin: "4T1B11HK9JU128441",
      vehicleYear: "2018"
    });

    expect(documents).toHaveLength(6);
    expect(documents.every((document) => document.contentType === "text/html")).toBe(true);
    expect(documents[0]).toMatchObject({
      category: "Required",
      downloadFileName: "insurance-claim-intake.html",
      formId: "insurance-claim-intake",
      label: "Insurance claim intake form",
      version: 1
    });

    const combinedHtml = documents.map((document) => document.html).join("\n");
    expect(combinedHtml).toContain("Deqo Roble");
    expect(combinedHtml).toContain("2018 Toyota Camry");
    expect(combinedHtml).toContain("MN-48291");
    expect(combinedHtml).toContain("Customer authorization and direction to repair");
    expect(combinedHtml).toContain("VIN, odometer, four-corner, and damage photos attached");
    expect(combinedHtml).toContain("Tow, storage, and release form");
    expect(combinedHtml).toContain("Claim handoff checklist");
  });
});
