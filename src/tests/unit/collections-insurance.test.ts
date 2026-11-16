import { describe, expect, it } from "vitest";

import { findDates, parseInsuranceText } from "@/features/collections/domain/insurance";
import { isTwilioMediaUrl } from "@/features/collections/server/insurance-service";

const card = `PROGRESSIVE
Minnesota Insurance Identification Card
Policy Number: 98765432-1
Effective Date 10/01/2026   Expiration Date 04/01/2027
Insured: SAMPLE, ALEX
Lienholder / Loss Payee: Time Motor Sales`;

describe("reading an insurance card (suggestions only)", () => {
  it("finds the carrier, policy, dates and the dealership as lienholder", () => {
    expect(parseInsuranceText(card, "Time Motor Sales")).toMatchObject({
      carrier: "Progressive", policyNumber: "98765432-1", effectiveDate: "2026-10-01", expirationDate: "2027-04-01", lienholderListed: true, confidence: "MEDIUM"
    });
  });
  it("doesn't claim the lienholder is listed when another name is there", () => {
    const result = parseInsuranceText(card.replace("Time Motor Sales", "Some Bank"), "Time Motor Sales");
    expect(result.lienholderListed).toBeNull();
    expect(result.notes.join(" ")).toMatch(/not your dealership/);
  });
  it("guesses dates by order when unlabeled, and says so", () => {
    const result = parseInsuranceText("GEICO 11/01/2026 - 05/01/2027", "Time Motor Sales");
    expect(result).toMatchObject({ carrier: "GEICO", effectiveDate: "2026-11-01", expirationDate: "2027-05-01" });
    expect(result.notes.join(" ")).toMatch(/guessed/);
  });
  it("leaves fields empty when unsure", () => {
    expect(parseInsuranceText("blurry text", "Time Motor Sales")).toMatchObject({ carrier: null, policyNumber: null, effectiveDate: null, expirationDate: null, confidence: "LOW" });
  });
  it("reads common date formats", () => {
    expect(findDates("a 11/16/26 b 2026-12-01 c Jan 5, 2027").map(d => d.value)).toEqual(["2026-11-16", "2026-12-01", "2027-01-05"]);
  });
});

describe("texted photo links", () => {
  it("only downloads from Twilio's API", () => {
    expect(isTwilioMediaUrl("https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1")).toBe(true);
    expect(isTwilioMediaUrl("http://api.twilio.com/2010-04-01/Accounts/AC1/Media/ME1")).toBe(false);
    expect(isTwilioMediaUrl("https://evil.example.test/2010-04-01/Accounts/x")).toBe(false);
    expect(isTwilioMediaUrl("https://api.twilio.com.evil.test/2010-04-01/Accounts/x")).toBe(false);
    expect(isTwilioMediaUrl("not a url")).toBe(false);
  });
});
