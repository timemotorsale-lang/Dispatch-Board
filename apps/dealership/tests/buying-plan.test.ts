import { describe, expect, it } from "vitest";
import { buyingLink, paymentPaths, readBuyingPlan, tradeChoices } from "../src/lib/buying-plan";
import { mayStartPurchase, validateRequest } from "../src/lib/domain";

describe("buying-guide preparation context", () => {
  it("defaults safely and accepts only explicit non-sensitive preferences", () => {
    expect(readBuyingPlan(new URLSearchParams())).toEqual({ vehicleId: "", paymentPath: "unsure", trade: "not-now" });
    expect(readBuyingPlan(new URLSearchParams("vehicle=sample-rav4&paymentPath=cash&trade=yes&email=private@example.com&price=1&approved=true"))).toEqual({ vehicleId: "sample-rav4", paymentPath: "cash", trade: "yes" });
    expect(readBuyingPlan(new URLSearchParams("vehicle=../../private&paymentPath=approved&trade=accepted"))).toEqual({ vehicleId: "", paymentPath: "unsure", trade: "not-now" });
    expect(readBuyingPlan(new URLSearchParams("vehicle=one&vehicle=two&paymentPath=cash&paymentPath=partner&trade=yes&trade=no"))).toEqual({ vehicleId: "", paymentPath: "unsure", trade: "not-now" });
  });
  it("roundtrips every preference without a return redirect or contact data", () => {
    for (const paymentPath of paymentPaths) for (const trade of tradeChoices) {
      const plan = { vehicleId: "sample-rav4", paymentPath, trade };
      for (const target of ["/how-it-works", "/purchase", "/finance", "/budget", "/sell"] as const) {
        const url = new URL(buyingLink(target, plan), "https://dealer.example");
        expect(url.origin).toBe("https://dealer.example");
        expect(url.pathname).toBe(target);
        expect(readBuyingPlan(url.searchParams)).toEqual(plan);
        expect(url.searchParams.get("from")).toBe(target === "/how-it-works" ? null : "buying-guide");
        expect(url.searchParams.has("returnTo")).toBe(false);
      }
    }
    expect(new URL(buyingLink("/purchase", { vehicleId: "sample-rav4", paymentPath: "cash", trade: "no" }, "TEST_DRIVE"), "https://dealer.example").searchParams.get("kind")).toBe("TEST_DRIVE");
  });
  it("rejects invalid purchase preferences server-side and requires a published vehicle identity", () => {
    const request = { kind: "PURCHASE", vehicleId: "sample-rav4", email: "sample@example.com", phone: "", name: "", notes: "", details: { paymentPath: "cash", trade: "yes" } };
    expect(validateRequest(request).details).toEqual(request.details);
    expect(() => validateRequest({ ...request, vehicleId: "" })).toThrow("published vehicle");
    expect(() => validateRequest({ ...request, details: { paymentPath: "approved", trade: "yes" } })).toThrow("payment approach");
    expect(() => validateRequest({ ...request, details: { paymentPath: "cash", trade: "paid" } })).toThrow("trade preference");
    const unrelated = validateRequest({ ...request, kind: "SERVICE", vehicleId: "", details: {} });
    expect(unrelated.details).toEqual({});
  });
  it("does not confuse preparation choices with current availability", () => {
    const vehicle = { availability: "AVAILABLE", validUntil: new Date(Date.now() + 10000).toISOString() } as Parameters<typeof mayStartPurchase>[0];
    expect(mayStartPurchase(vehicle)).toBe(true);
    expect(mayStartPurchase({ ...vehicle, availability: "RESERVED" })).toBe(false);
    expect(mayStartPurchase({ ...vehicle, availability: "SOLD" })).toBe(false);
    expect(mayStartPurchase({ ...vehicle, validUntil: "2000-01-01T00:00:00Z" })).toBe(false);
  });
});
