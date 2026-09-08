import { describe, expect, it } from "vitest";

import { CAPTURE_HUB_WORKFLOWS, buildMobileIdCaptureReview, getCaptureHubWorkflow } from "@/server/unified-crm/mobile-id-capture-contract";

describe("mobile ID capture review contract", () => {
  it("keeps license images and full license numbers out of customer creation", () => {
    const review = buildMobileIdCaptureReview({
      address: " 123 Main St   Minneapolis MN ",
      displayName: " Eli Aswan ",
      email: "eli@example.test",
      licenseNumber: "MN D123-456-789-012",
      licenseState: "mn",
      phoneNumber: "612 342 5656",
      photoProvided: true,
      reviewedWithCustomer: true
    });

    expect(review.canCreateCustomer).toBe(true);
    expect(review.customerPatch).toEqual(expect.objectContaining({
      address: "123 Main St Minneapolis MN",
      displayName: "Eli Aswan",
      email: "eli@example.test",
      licenseLast4: "9012",
      licenseState: "MN",
      phoneNumber: "612 342 5656"
    }));
    expect(review.privacy.storeIdPhoto).toBe(false);
    expect(review.privacy.retainFullLicenseNumber).toBe(false);
    expect(JSON.stringify(review)).not.toContain("D123");
  });

  it("blocks creation guidance until the staff confirms identity and contact", () => {
    const review = buildMobileIdCaptureReview({
      displayName: "Jordan Lee",
      reviewedWithCustomer: false
    });

    expect(review.canCreateCustomer).toBe(false);
    expect(review.requirements).toContainEqual(expect.objectContaining({ key: "CONTACT", state: "NEEDS_REVIEW" }));
    expect(review.requirements).toContainEqual(expect.objectContaining({ key: "HUMAN_REVIEW", state: "NEEDS_REVIEW" }));
    expect(review.requirements).toContainEqual(expect.objectContaining({ key: "IMAGE_RETENTION", state: "READY" }));
  });

  it("defines enterprise capture routes without enabling automatic writes", () => {
    expect(CAPTURE_HUB_WORKFLOWS.map((workflow) => workflow.purpose)).toEqual([
      "CUSTOMER_ID",
      "VEHICLE_IDENTITY",
      "ODOMETER",
      "CONDITION",
      "REPAIR_PROOF",
      "PARTS",
      "DOCUMENT",
      "SIGNATURE"
    ]);

    expect(getCaptureHubWorkflow("PARTS")).toEqual(expect.objectContaining({
      attachTargets: expect.arrayContaining(["Parts request", "Warranty claim"]),
      nextActions: expect.arrayContaining(["Order part", "Receive part"]),
      privacyMode: "STANDARD_EVIDENCE"
    }));
    expect(getCaptureHubWorkflow("DOCUMENT").privacyMode).toBe("MASK_SENSITIVE");
    expect(getCaptureHubWorkflow("SIGNATURE").privacyMode).toBe("APPROVAL_REVIEW");
  });
});
