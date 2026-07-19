import { describe, expect, it } from "vitest";
import { buildControlledVehiclePackage, normalizeKnowledgeDraft, normalizeOperationalSearch, rankOperationalSearchResults, renderControlledPrint, scoreOperationalSearchResult } from "@/server/vehicle-discovery/domain";

describe("enterprise discovery, knowledge, and controlled output domain", () => {
  it("normalizes bounded search and ranks exact identifiers above contains matches", () => {
    expect(normalizeOperationalSearch({ query: "  RO-101  ", limit: 500, types: "vehicle,repair_order,invalid" })).toEqual({ query: "RO-101", limit: 100, types: ["VEHICLE", "REPAIR_ORDER"] });
    expect(scoreOperationalSearchResult("RO-101", { repairOrderNumber: "RO-101", description: "Inspect RO-101" }).score).toBeGreaterThan(scoreOperationalSearchResult("RO-101", { description: "Inspect RO-101" }).score);
    const ranked = rankOperationalSearchResults([
      { id: "low", type: "VEHICLE", label: "Low", detail: "", status: null, href: "/", matchedFields: ["model"], score: 25 },
      { id: "high", type: "REPAIR_ORDER", label: "High", detail: "", status: null, href: "/", matchedFields: ["repairOrderNumber"], score: 120 }
    ], 1);
    expect(ranked[0].id).toBe("high");
    expect(normalizeOperationalSearch({ query: "inspection" }).types).toContain("WORK_ITEM");
  });

  it("requires reference-only knowledge to use safe HTTPS and a publisher checksum", () => {
    const base = { contentHashSha256: "a".repeat(64), idempotencyKey: "knowledge-1", reason: "Create governed bulletin revision.", revision: "2026.07", sourceOrganization: "OEM", sourceReference: "TSB-101", title: "Brake inspection", type: "BULLETIN", uri: "https://example.com/tsb-101", workTypeCode: "BRAKE" };
    expect(normalizeKnowledgeDraft(base, new Date("2026-07-14T00:00:00Z"))).toMatchObject({ type: "BULLETIN", workTypeCode: "BRAKE" });
    expect(() => normalizeKnowledgeDraft({ ...base, uri: "http://example.com/unsafe" }, new Date())).toThrow("HTTPS");
    expect(() => normalizeKnowledgeDraft({ ...base, uri: "https://user:secret@example.com/private" }, new Date())).toThrow("without embedded credentials");
    expect(() => normalizeKnowledgeDraft({ ...base, contentHashSha256: "not-a-hash" }, new Date())).toThrow("SHA-256");
  });

  it("redacts internal output and preserves a tamper-evident restricted package", () => {
    const view = { summary: { vehicle: { vehicleNumber: "V-1", vin: "1HGCM82633A004352", year: 2020, make: "Honda", model: "Accord", stockNumber: "S-1", status: "ACTIVE" } }, timeline: [{ subjectId: "restricted-doc" }], tabs: { overview: {}, audit: { items: [1] }, communications: { items: [1] }, documents: { items: [{ evidenceObjectId: "restricted-doc", downloadUrl: "/secret", evidenceObject: { accessLevel: "RESTRICTED" } }, { evidenceObjectId: "internal-doc", downloadUrl: "/internal", evidenceObject: { accessLevel: "INTERNAL" } }] } }, graph: { nodes: [{ id: "restricted-doc" }, { id: "vehicle" }], edges: [{ from: "vehicle", to: "restricted-doc" }] } };
    const internal = buildControlledVehiclePackage({ classification: "INTERNAL", generatedAt: new Date("2026-07-14T00:00:00Z"), generatedBy: { id: "user", name: "Manager" }, reason: "Authorized operating review.", view });
    const snapshot = internal.packageSnapshot as { summary: { vehicle: { vin: string } }; tabs: Record<string, unknown>; timeline: unknown[]; graph: { nodes: unknown[]; edges: unknown[] } };
    expect(snapshot.summary.vehicle.vin).toBe("***********004352");
    expect(snapshot.tabs).not.toHaveProperty("audit");
    expect((snapshot.tabs.documents as { items: unknown[] }).items).toHaveLength(1);
    expect(snapshot.timeline).toHaveLength(0); expect(snapshot.graph.nodes).toHaveLength(1); expect(snapshot.graph.edges).toHaveLength(0);
    expect(internal.checksumSha256).toMatch(/^[0-9a-f]{64}$/); expect(internal.watermark).toContain("INTERNAL");
  });

  it("escapes print content instead of injecting stored HTML", () => {
    const html = renderControlledPrint({ watermark: "INTERNAL", summary: { vehicle: { vehicleNumber: "<script>alert(1)</script>", vin: "VIN", status: "ACTIVE" } } });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
