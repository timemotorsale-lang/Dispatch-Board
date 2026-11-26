import { describe, expect, it } from "vitest";
import { quotePurchaseNumber, quotePurchaseState, readPartsQuote, readQuotePurchaseDate } from "@/server/repair-parts-quotes/domain";

const quote = { id: "64565a5d-1ec1-4aa2-8b8e-a604ddab7069", part: " Mirror ", partNumber: " abc-123 ", supplier: " Yard ", quantity: "2", price: "19.9", supplierPhone: "(612) 555-0100", supplierContact: "Alex", supplierLink: "https://vendor.example/quote", reference: "In stock" };

describe("parts quote workbook", () => {
  it("keeps vendor details and calculates cents without rounding", () => {
    expect(readPartsQuote(quote)).toMatchObject({ part: "Mirror", partNumber: "ABC-123", supplier: "Yard", quantity: 2, unitPriceCents: 1990, supplierPhone: quote.supplierPhone, supplierContact: "Alex", supplierLink: quote.supplierLink, reference: "In stock" });
    expect(readPartsQuote({ ...quote, supplierPhone: "", partNumber: "", price: "0" })).toMatchObject({ partNumber: null, supplierPhone: null, unitPriceCents: 0 });
  });
  it("rejects unsafe links, invalid money, and quantities that would overflow the purchase total", () => {
    for (const input of [{ supplierLink: "javascript:alert(1)" }, { supplierLink: "https://user:password@example.com" }, { quantity: "1.5" }, { quantity: "99999", price: "99999.99" }, { price: "0.001" }]) {
      expect(() => readPartsQuote({ ...quote, ...input })).toThrow();
    }
  });
  it("requires a real, non-future order date", () => {
    const today = new Date("2026-11-25T22:00:00.000Z");
    expect(readQuotePurchaseDate("2026-11-25", today)).toBe("2026-11-25T00:00:00.000Z");
    for (const date of ["2026-02-30", "2026-11-26", "", null]) expect(() => readQuotePurchaseDate(date, today)).toThrow();
  });
  it("looks up the normalized purchase order reference", () => {
    expect(quotePurchaseNumber(quote.id)).toBe("ENTRY-64565A5D-1EC1-4AA2-8B8E-A604DDAB7069");
  });
  it("does not confuse a quote, pending checkout, approval, or cancellation with a purchase", () => {
    expect(quotePurchaseState(undefined, false)).toBe("Not ordered");
    expect(quotePurchaseState(undefined, true)).toBe("Checkout unfinished");
    expect(quotePurchaseState("DRAFT", true)).toBe("Awaiting approval");
    expect(quotePurchaseState("ISSUED", true)).toBe("Purchase recorded");
    expect(quotePurchaseState("CANCELLED", true)).toBe("Cancelled");
  });
});
