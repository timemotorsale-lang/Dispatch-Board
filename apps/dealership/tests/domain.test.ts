import { describe, expect, it } from "vitest";
import { filterListings, mayStartPurchase, previewEnabled, projectSnapshot, validateRequest } from "../src/lib/domain";

const source = () => ({ schemaVersion: 1, listings: [{
  publication: "APPROVED", id: "vehicle-one", year: 2021, make: "Toyota", model: "RAV4", trim: "XLE", mileage: 78000, price: 19000,
  body: "SUV", drivetrain: "AWD", transmission: "Automatic", fuel: "Gasoline", availability: "AVAILABLE", photo: null,
  sourceVersion: 1, priceVersion: 1, observedAt: "2026-10-20T00:00:00Z", validUntil: "2026-10-25T00:00:00Z",
  customerName: "PRIVATE", cost: 12000, notes: "Private notes"
}] });
const now = new Date("2026-10-23T00:00:00Z");
const request = () => ({ kind: "SERVICE", vehicleId: "", name: "", email: "", phone: "612-555-0142", notes: "Sample concern", details: {} });

describe("public inventory boundary", () => {
  it("projects an exact allowlist and omits private fields", () => {
    const [listing] = projectSnapshot(source(), now);
    expect(listing).not.toHaveProperty("cost"); expect(listing).not.toHaveProperty("notes"); expect(listing).not.toHaveProperty("customerName");
    expect(JSON.stringify(listing)).not.toContain("PRIVATE");
  });
  it("omits unpublished records without affecting counts", () => {
    const input = source(); input.listings[0].publication = "UNREVIEWED";
    expect(projectSnapshot(input, now)).toEqual([]);
  });
  it("fails closed on expired, future or malformed snapshots", () => {
    const input = source(); input.listings[0].validUntil = "2026-10-22T00:00:00Z";
    expect(() => projectSnapshot(input, now)).toThrow("out of date");
    expect(() => projectSnapshot({ schemaVersion: 2, listings: [] }, now)).toThrow();
  });
  it("blocks private or remote photo paths", () => {
    const input = source(); Object.assign(input.listings[0], { photo: "/api/private/document" });
    expect(() => projectSnapshot(input, now)).toThrow("public media");
  });
  it("preserves filter intent, and hides sold units from available discovery", () => {
    const listings = projectSnapshot(source(), now);
    expect(filterListings(listings, new URLSearchParams("max=10000"))).toEqual([]);
    expect(filterListings(listings, new URLSearchParams("q=rav4&drive=AWD"))).toHaveLength(1);
    listings[0].availability = "SOLD"; expect(filterListings(listings, new URLSearchParams())).toEqual([]);
  });
  it("prevents starting purchases on reserved or stale units", () => {
    const [listing] = projectSnapshot(source(), now);
    expect(mayStartPurchase(listing, now)).toBe(true);
    listing.availability = "RESERVED"; expect(mayStartPurchase(listing, now)).toBe(false);
    listing.availability = "AVAILABLE"; expect(mayStartPurchase(listing, new Date("2026-10-26"))).toBe(false);
  });
  it("searches unordered keywords across verified vehicle facts", () => {
    const listings = projectSnapshot(source(), now);
    expect(filterListings(listings, new URLSearchParams("q=AWD Toyota automatic"))).toHaveLength(1);
    expect(filterListings(listings, new URLSearchParams("q=Toyota electric"))).toEqual([]);
    expect(filterListings(listings, new URLSearchParams("q=PRIVATE"))).toEqual([]);
  });
  it("combines model, fuel, transmission and availability without widening criteria", () => {
    const listings = projectSnapshot(source(), now);
    expect(filterListings(listings, new URLSearchParams("model=RAV4&fuel=gasoline&transmission=Automatic&available=1"))).toHaveLength(1);
    expect(filterListings(listings, new URLSearchParams("model=Camry"))).toEqual([]);
    expect(filterListings(listings, new URLSearchParams("fuel=Electric"))).toEqual([]);
    listings[0].availability = "COMING_SOON";
    expect(filterListings(listings, new URLSearchParams("available=1"))).toEqual([]);
    expect(filterListings(listings, new URLSearchParams())).toHaveLength(1);
  });
});

describe("guest and preview boundaries", () => {
  it("accepts phone-only and email-only without requiring a name or account", () => {
    expect(validateRequest(request()).phone).toBe("612-555-0142");
    expect(validateRequest({ ...request(), phone: "", email: "sample@example.com" }).email).toBe("sample@example.com");
  });
  it("rejects invalid/missing contacts and oversized notes", () => {
    expect(() => validateRequest({ ...request(), phone: "" })).toThrow("One is enough");
    expect(() => validateRequest({ ...request(), email: "bad-address" })).toThrow();
    expect(() => validateRequest({ ...request(), notes: "a".repeat(2501) })).toThrow();
  });
  it("strips undeclared detail fields and does not infer texting permission", () => {
    const result = validateRequest({ ...request(), details: { make: "Toyota", accountId: "OTHER", textingConsent: "yes" } });
    expect(result.details).toEqual({ make: "Toyota" }); expect(result).not.toHaveProperty("textingConsent");
  });
  it("never enables sample records in production", () => {
    expect(previewEnabled({ NODE_ENV: "production", DEALERSHIP_PREVIEW_DATA: "1" })).toBe(false);
    expect(previewEnabled({ NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "1" })).toBe(true);
    expect(previewEnabled({ NODE_ENV: "development" })).toBe(false);
  });
});
