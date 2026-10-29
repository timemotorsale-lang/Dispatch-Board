import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { filterListings, mayStartPurchase, projectSnapshot } from "../src/lib/domain";
import { industryOptions } from "../src/lib/industry-options";

describe("expanded development inventory", () => {
  it("provides diverse filter scenarios without production provenance or personal records", async () => {
    const fixture = JSON.parse(await readFile("fixtures/inventory.json", "utf8"));
    expect(fixture.dataMode).toBe("SAMPLE");
    expect(fixture.listings).toHaveLength(24);
    for (const row of fixture.listings) {
      expect(row.sample).toBe(true);
      expect(row.id).toMatch(/^sample-/);
      expect(row).not.toHaveProperty("vin");
      expect(row).not.toHaveProperty("customerName");
      expect(row.photo === null || row.id === "sample-rav4").toBe(true);
      row.observedAt = new Date(Date.now() - 1000).toISOString();
      row.validUntil = new Date(Date.now() + 3600000).toISOString();
    }
    const listings = projectSnapshot(fixture, new Date(), { allowSamples: true });
    expect(filterListings(listings, new URLSearchParams())).toHaveLength(23);
    for (const [field, key] of [["exteriorColor", "exterior"], ["interiorColor", "interior"]] as const) for (const color of industryOptions[field]) expect(filterListings(listings, new URLSearchParams({ [key]: color })).length).toBeGreaterThan(0);
    for (const query of ["body=Truck", "fuel=Electric", "feature=Apple+CarPlay", "priceDrop=1", "seats=7", "transmission=Manual"]) expect(filterListings(listings, new URLSearchParams(query)).length).toBeGreaterThan(0);
    for (const vehicle of listings.filter(row => row.availability !== "AVAILABLE")) expect(mayStartPurchase(vehicle)).toBe(false);
    for (const vehicle of listings.filter(row => row.fuel === "Electric")) expect(vehicle.mpgCombined).toBeUndefined();
    expect(() => projectSnapshot({ ...fixture, dataMode: "LIVE" }, new Date(), { requireLive: true })).toThrow("Sample");
  });
});
