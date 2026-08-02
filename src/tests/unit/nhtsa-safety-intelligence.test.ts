import { describe, expect, it, vi } from "vitest";

import { getNhtsaSafetyIntelligence } from "@/server/vehicle-identification/nhtsa-safety";

describe("NHTSA safety intelligence", () => {
  it("keeps model campaigns advisory and ranks concern-related evidence first", async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(url.includes("recallsByVehicle") ? { results: [
      { Component: "AIR BAGS", Consequence: "Injury risk", Manufacturer: "Example Motors", NHTSACampaignNumber: "26V001000", parkIt: false, parkOutSide: false, Remedy: "Dealer inspection", Summary: "The air bag inflator may fail." },
      { Component: "VISIBILITY:WIPER", NHTSACampaignNumber: "25V002000", Summary: "The wiper motor may stop." },
    ] } : { results: [
      { components: "AIR BAGS", summary: "Driver reports the air bag warning light illuminated.", vin: "PARTIALVIN" },
      { components: "ENGINE", summary: "Driver reports an engine stall." },
    ] }), { status: 200 }));

    const result = await getNhtsaSafetyIntelligence({ concern: "Customer reports an airbag warning light.", fetcher, make: "EXAMPLE", model: "ONE", now: () => new Date("2026-08-01T12:00:00.000Z"), year: 2024 });

    expect(result.recalls[0]).toMatchObject({ campaignNumber: "26V001000", relevance: "CONCERN_MATCH", verificationLabel: "Potentially applicable—verify by VIN" });
    expect(result.complaints[0]).toMatchObject({ component: "AIR BAGS", count: 1, relevance: "CONCERN_MATCH" });
    expect(JSON.stringify(result)).not.toContain("PARTIALVIN");
    expect(result.sourcePolicy.recalls).toContain("Never treated as an open VIN-specific recall");
    expect(result.manufacturerCommunications.label).toBe("Diagnostic guidance—not a recall");
  });

  it("returns partial intelligence with a warning when one official endpoint fails", async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("recallsByVehicle")) return new Response("Unavailable", { status: 503 });
      return new Response(JSON.stringify({ results: [{ components: "BRAKES", summary: "Brake pedal concern." }] }), { status: 200 });
    });

    const result = await getNhtsaSafetyIntelligence({ fetcher, make: "EXAMPLE", model: "ONE", year: 2024 });
    expect(result.recalls).toEqual([]);
    expect(result.complaints).toHaveLength(1);
    expect(result.warnings).toContain("Model-level recall campaigns are temporarily unavailable from NHTSA.");
  });
});
