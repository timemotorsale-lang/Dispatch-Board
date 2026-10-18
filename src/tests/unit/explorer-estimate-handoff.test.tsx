import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { explorerEstimateIssues, explorerEstimateSeed, unresolvedExplorerAllowance } from "@/lib/explorer-estimate-handoff";
import { EstimateHandoffReview } from "@/features/diagnostics/labor-guide-entry";
import { EstimateWorkflowNextStep } from "@/features/inventory/estimate-workflow-next-step";
import { LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";
import { normalizeEstimate } from "@/server/shop-planning/domain";
import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { ServiceDocument } from "@/features/inventory/service-document";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";

const catalog = LABOR_OPERATION_TAXONOMY.flatMap(system => system.groups.flatMap(group => group.operations));
const raw = (lines: unknown[], rate = 150) => JSON.stringify({ version: 1, rate, lines });
const selected = { id: "front-pads-rotors", label: "Replace front pads & rotors", hours: 2.1, parts: 120 };

describe("Explorer to official estimate handoff", () => {
  it("identifies blocked operations without converting them to custom work or dropping selections", () => {
    const draft = raw([selected, { ...selected, id: "unknown", label: "Unapproved repair" }]);
    expect(explorerEstimateIssues(draft, catalog, ["brakes"])).toEqual([{ id: "unknown", label: "Unapproved repair", message: expect.stringContaining("connected catalog audit") }]);
    expect(() => explorerEstimateSeed(draft, catalog, ["brakes"])).toThrow("connected catalog audit");
    expect(JSON.parse(draft).lines).toHaveLength(2);
    const html = renderToStaticMarkup(<EstimateHandoffReview error="Catalog review required" issues={explorerEstimateIssues(draft, catalog, ["brakes"])} repairOrder={{ id: "ro/1", repairOrderNumber: "RO-1" }} />);
    expect(html).toContain("Unapproved repair");
    expect(html).toContain("browser draft is retained");
    expect(html).toContain("has not saved an estimate or authorized repairs");
    expect(html).toContain("/vehicles/shop-planning?repairOrderId=ro%2F1");
    expect(html).toContain("Open existing guide for staff review");
  });
  it("keeps saved estimate printing and next-step review scoped to the same RO", () => {
    const html = renderToStaticMarkup(<EstimateWorkflowNextStep repairOrderId="ro/1" estimateId="est/2" />);
    expect(html).toContain("Estimate saved to this RO");
    expect(html).toContain("repairOrderId=ro%2F1&amp;estimateId=est%2F2");
    expect(html).toContain("does not authorize repairs");
  });
  it("preserves hours and allowances without converting the sample vehicle, rate or approval into live facts", () => {
    const { draft, seed } = explorerEstimateSeed(raw([selected]), catalog, ["brakes", "steering"]);
    expect(draft.rate).toBe(150);
    expect(seed.labor[0]).toMatchObject({ id: "front-brake-pads-rotors", rowId: "front-brake-pads-rotors", hours: 2.1 });
    expect(seed.parts[0]).toMatchObject({ unitPrice: 120, pricingStatus: "PRICE_PENDING", number: "", laborRowId: "front-brake-pads-rotors" });
    expect(unresolvedExplorerAllowance(seed.parts[0])).toBe(true);
    expect(unresolvedExplorerAllowance({ ...seed.parts[0], name: "Actual pad set", number: "PART-1" })).toBe(false);
    expect(seed).not.toHaveProperty("vehicle");
    expect(seed).not.toHaveProperty("authorization");
    const html = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={[]} laborAddOns={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} initialExplorerSeed={seed} />);
    expect(html).toContain("Explorer parts allowances need itemization");
    expect(html).toContain("Replace front brake pads and rotors");
    expect(html).not.toContain("2019 Ford F-150");
  });
  it("refuses invalid, unknown, unpriced and held catalog work without silently dropping lines", () => {
    expect(() => explorerEstimateSeed(raw([]), catalog, ["brakes"])).toThrow("missing or invalid");
    expect(() => explorerEstimateSeed(raw([{ ...selected, hours: null }]), catalog, ["brakes"])).toThrow("Enter labor hours");
    expect(() => explorerEstimateSeed(raw([{ ...selected, id: "unknown" }]), catalog, ["brakes"])).toThrow("connected catalog audit");
    expect(() => explorerEstimateSeed(raw([selected]), catalog, [])).toThrow("connected catalog audit");
    expect(() => explorerEstimateSeed(raw([{ ...selected, id: "front-brake-pads-rotors" }, selected]), catalog, ["brakes"])).toThrow();
  });
  it("preserves genuine custom work and keeps unpriced parts pending", () => {
    const custom = { ...selected, id: "custom-11111111-2222-4333-8444-555555555555", laborBasis: "MANUAL", parts: null };
    const { seed } = explorerEstimateSeed(raw([custom]), catalog, []);
    expect(seed.labor[0]).toMatchObject({ title: selected.label, system: "Staff-reviewed custom work", hours: 2.1 });
    expect(seed.parts[0]).toMatchObject({ pricingStatus: "PRICE_PENDING", unitPrice: 0 });
    expect(() => explorerEstimateSeed(raw([{ ...custom, laborBasis: "PLANNING" }]), catalog, [])).toThrow();
    expect(explorerEstimateSeed(raw([{ ...custom, parts: 0 }]), catalog, []).seed.parts).toEqual([]);
  });
  it("rejects placeholder parts on the server even if a client marks their price reviewed", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    const request = { presentedAt: now.toISOString(), expiresAt: "2026-10-25T12:00:00Z", lineItems: [{ key: "part-explorer-allowance-0", type: "PART", description: "Unitemized allowance: brakes", partNumber: "", quantity: 1, unitPriceCents: 12000 }], idempotencyKey: "synthetic", reason: "Synthetic review", presentationChannel: "INTERNAL", taxBoundary: "Synthetic policy" };
    expect(() => normalizeEstimate(request, now)).toThrow("Replace unitemized");
    expect(() => normalizeEstimate({ ...request, lineItems: [{ ...request.lineItems[0], description: "Actual pad set", partNumber: "P-123" }] }, now)).not.toThrow();
  });
});

describe("issued document continuation", () => {
  const content = { title: "Official estimate", number: "EST-1", issuedAt: "2026-10-18T12:00:00Z", identity: { timezone: "America/Chicago" }, lines: [], notes: [] } as unknown as ServiceDocumentContent;
  it("offers staff printing, authorization and guarded invoicing for the same RO", () => {
    const html = renderToStaticMarkup(<ServiceDocument content={content} sha256="proof" templateVersion="v1" repairOrderId="ro/1" />);
    expect(html).toContain("Print / save PDF");
    expect(html).toContain("View Documents &amp; Approvals");
    expect(html).toContain("/vehicles/shop-planning?repairOrderId=ro%2F1");
    expect(html).toContain("/vehicles/service-billing?repairOrderId=ro%2F1");
  });
  it("does not expose staff continuation links on customer portal documents", () => {
    const html = renderToStaticMarkup(<ServiceDocument content={content} sha256="proof" templateVersion="v1" />);
    expect(html).not.toContain("/vehicles/");
    expect(html).not.toContain("View Documents");
  });
});
