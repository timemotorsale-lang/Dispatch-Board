import { describe, expect, it } from "vitest";

import { analyzeSmartDocumentIntake } from "@/server/document-library/smart-intake";

describe("smart document intake", () => {
  it("classifies a business card and extracts contact fields", async () => {
    const text = `Jordan Lane
Time Motor Sales LLC
Sales Manager
(612) 555-0198
jordan@example.com
www.timemotors.example
1101 Lake Street Minneapolis MN`;

    const result = await analyzeSmartDocumentIntake({
      bytes: new TextEncoder().encode(text),
      contentType: "text/plain",
      fileName: "business-card.txt"
    });

    expect(result).toMatchObject({
      classification: "BUSINESS_CARD",
      routingTarget: "CONTACT_REVIEW",
      reviewStatus: "READY_FOR_REVIEW"
    });
    expect(result.extractedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "email", value: "jordan@example.com" }),
      expect.objectContaining({ key: "phone" })
    ]));
  });

  it("classifies a government ID as sensitive review", async () => {
    const text = `MINNESOTA Driver License
Alex Rivera
DOB 04/11/1988
DL D123456789012
EXP 10/22/2029
123 Lake Street`;

    const result = await analyzeSmartDocumentIntake({
      bytes: new TextEncoder().encode(text),
      contentType: "text/plain",
      fileName: "driver-license.txt"
    });

    expect(result).toMatchObject({
      classification: "GOVERNMENT_ID",
      routingTarget: "CUSTOMER_ID_REVIEW",
      reviewStatus: "SENSITIVE_REVIEW"
    });
    expect(result.sensitiveFieldKeys).toEqual(expect.arrayContaining(["dateOfBirth", "licenseNumber"]));
    expect(result.warnings).toContain("Sensitive identity fields require staff review before use.");
  });
});
