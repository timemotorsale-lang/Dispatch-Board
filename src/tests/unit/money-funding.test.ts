import { describe, expect, it } from "vitest";
import { cardFundingException, fundingSnapshot, readFundingException, UNIDENTIFIED_CARD_FLAG } from "@/lib/money-funding";
import { savedPurchasingFlags } from "@/lib/money-purchasing";
describe("recording a purchase with unidentified card funding", () => {
  it("records actual card spending without requiring an assignment, confirmation or explanation", () => {
    const exception = cardFundingException("CARD", null, {});
    expect(exception).toMatchObject({ type: "UNIDENTIFIED_COMPANY_CARD", alreadyPaid: true });
    expect(savedPurchasingFlags(fundingSnapshot({ flags: ["Missing prior approval"] }, exception))).toEqual(["Missing prior approval", UNIDENTIFIED_CARD_FLAG]);
  });
  it("leaves normal assigned-card, cash, bank and personal records unchanged", () => {
    expect(cardFundingException("CARD", "known-card", {})).toBeNull();
    for (const method of ["CASH", "BANK", "PERSONAL"]) expect(cardFundingException(method, null, {})).toBeNull();
    expect(fundingSnapshot({ flags: [] }, null)).toEqual({ flags: [] });
  });
  it("preserves a funding exception through an unresolved correction", () => {
    const exception = cardFundingException("CARD", null, { fundingNote: "Paid by colleague; receipt attached." });
    expect(readFundingException(fundingSnapshot({ flags: [] }, exception))).toEqual(exception);
    expect(readFundingException({ flags: [UNIDENTIFIED_CARD_FLAG] })).toBeNull();
  });
  it("does not accept a full card number in an optional identification note", () => {
    expect(() => cardFundingException("CARD", null, { fundingNote: "4111 1111 1111 1111" })).toThrow("full card number");
    expect(cardFundingException("CARD", null, { fundingNote: "Company card ending 1234" })?.note).toContain("1234");
  });
});
