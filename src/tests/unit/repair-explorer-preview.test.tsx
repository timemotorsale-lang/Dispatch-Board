import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { CATALOG_COUNTS, CATALOG_ENTRIES, REPAIR_SYSTEMS, searchRepairs } from "@/features/prototype/repair-explorer/catalog";
import { estimateTotals, parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn().mockResolvedValue({ id: "reviewer" }) }));

const { getOrder, getRate } = vi.hoisted(() => ({ getOrder: vi.fn(), getRate: vi.fn().mockResolvedValue({ laborRate: 135 }) }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: getOrder }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: getRate }));

describe("Repair Explorer preview", () => {
  it("requires authentication and scopes browser drafts to the reviewer", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/repair-explorer/page");
    const { requireCurrentUser } = await import("@/server/auth/current-user");
    const page = await Page();
    expect(requireCurrentUser).toHaveBeenCalledWith("/prototype/repair-explorer");
    expect(page.props.storageKey).toBe("dispatch-board.repair-explorer-preview.v1.reviewer");
  });

  it("renders a clearly isolated preview with an empty estimate and a return link", () => {
    const html = renderToStaticMarkup(<RepairExplorer storageKey="test-preview" />);
    expect(html).toContain("Labor Guide");
    expect(html).toContain("Your estimate starts here");
    expect(html).toContain('href="/my-tasks"');
    expect(html).toContain("Sample estimate");
    expect(html).not.toContain('aria-label="Saved documents and billing"');
  });

  it("opens the exact simplified guide with authorized RO, inventory and vehicle identity", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/repair-explorer/page");
    getOrder.mockResolvedValueOnce({ id: "ro/1", repairOrderNumber: "RO-017", closedAt: null, vehicle: { id: "vehicle-1", year: 2017, make: "FORD", model: "Fusion", vin: "3FA6P0K91HR406095", vehicleNumber: "VEH-1" }, inventoryUnit: { id: "unit-1", inventoryNumber: "INV-017" }, serviceVisit: { concernSummary: "Right fender damage" } });
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "ro/1" }) });
    expect(page.props.storageKey).toBe("dispatch-board.repair-explorer-preview.v1.reviewer.ro.ro%2F1");
    expect(page.props.context.inventoryUnitId).toBe("unit-1");
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Find the work. Build the estimate.");
    expect(html).not.toContain('href="/diagnostics/labor-guide?repairOrderId=ro%2F1"');
    expect(html).not.toContain("Legacy guide");
    expect(html).toContain("2017 FORD Fusion");
    expect(html).toContain("INV-017");
    expect(html).toContain("RO-017");
    expect(html).toContain('href="/service-documents?repairOrderId=ro%2F1&amp;workspace=1"');
    expect(html).not.toContain(">Create invoice / Record payment<");
    expect(html).toContain("Right fender damage");
    expect(html).not.toContain("Reference vehicle: 2019 Ford F-150");
    expect(html).toContain("Your estimate starts here");
  });

  it.each(["denied", "missing", "closed"])("does not substitute a sample vehicle when the requested RO is %s", async failure => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/repair-explorer/page");
    if (failure === "denied") getOrder.mockRejectedValueOnce(new Error("Access denied"));
    else getOrder.mockResolvedValueOnce(failure === "missing" ? null : { closedAt: new Date() });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ repairOrderId: "unavailable-ro" }) }));
    expect(html).toContain("Repair order could not open");
    expect(html).not.toContain("2019 Ford");
    expect(html).not.toContain("Generate / Print Estimate");
  });

  it("finds work across systems by symptom, component and DTC", () => {
    expect(searchRepairs("grinding").some(({ repair }) => repair.id === "brake-noise")).toBe(true);
    expect(searchRepairs("P0300")[0].repair.id).toBe("engine-misfire");
    expect(searchRepairs("no start").some(({ repair }) => repair.id === "no-start")).toBe(true);
    expect(searchRepairs("no-start").some(({ repair }) => repair.id === "no-start")).toBe(true);
    expect(searchRepairs("rear caliper").filter(({ repair }) => /^Replace rear (left|right) brake caliper$/.test(repair.label))).toHaveLength(2);
    expect(searchRepairs("not-a-sample-repair")).toEqual([]);
    expect(REPAIR_SYSTEMS).toHaveLength(12);
  });

  it("adds rounded line costs in cents and respects changed rates", () => {
    const lines = [{ id: "front", label: "Front pads & rotors", hours: 2, parts: 220 }];
    expect(estimateTotals(lines, 150)).toEqual({ hours: 2, unpricedLines: 0, labor: 300, parts: 220, subtotal: 520 });
    expect(estimateTotals(lines, 175).subtotal).toBe(570);
    expect(estimateTotals([], 150).subtotal).toBe(0);
    expect(estimateTotals([{ id: "fraction", label: "Fraction", hours: 0.1, parts: 0.1 }], 150).subtotal).toBe(15.1);
  });

  it("offers repair and diagnostic paths in every group with unique operation identifiers", () => {
    expect(CATALOG_COUNTS.groups).toBeGreaterThanOrEqual(70);
    expect(CATALOG_COUNTS.operations).toBeGreaterThanOrEqual(600);
    expect(new Set(CATALOG_ENTRIES.map(({ repair }) => repair.id)).size).toBe(CATALOG_ENTRIES.length);
    for (const system of REPAIR_SYSTEMS) {
      expect(system.groups.length, system.label).toBeGreaterThanOrEqual(4);
      expect(new Set(system.groups.map((group) => group.id)).size).toBe(system.groups.length);
      for (const group of system.groups) {
        expect(group.operations.some((repair) => repair.kind === "repair"), group.label).toBe(true);
        expect(group.operations.some((repair) => repair.kind === "diagnosis"), group.label).toBe(true);
      }
    }
  });

  it("includes engine assembly replacement, internal repairs and multiple diagnostic paths", () => {
    const engine = REPAIR_SYSTEMS.find((system) => system.id === "engine")!;
    expect(engine.groups.length).toBeGreaterThanOrEqual(12);
    for (const label of ["Replace engine assembly", "Replace engine long block", "Replace engine short block", "Replace cylinder head gasket", "Replace timing chain set", "Replace turbocharger assembly", "Perform cylinder leak-down test"]) {
      expect(CATALOG_ENTRIES.some(({ system, repair }) => system.id === "engine" && repair.label === label), label).toBe(true);
    }
    const replacement = searchRepairs("engine assembly").find(({ repair }) => repair.label === "Replace engine assembly")!.repair;
    expect(replacement.hours).toBe(18);
    expect(replacement.laborPlan?.confidence).toBe("UNVALIDATED");
    expect(replacement.parts).toBeNull();
    expect(replacement.conflictGroup).toBe("engine-assembly-alternatives");
  });

  it("keeps unpriced labor and parts distinct from confirmed zero-cost work", () => {
    expect(estimateTotals([{ id: "engine", label: "Replace engine assembly", hours: null, parts: null }], 150)).toEqual({ hours: 0, unpricedLines: 1, labor: 0, parts: 0, subtotal: 0 });
    expect(estimateTotals([{ id: "engine", label: "Replace engine assembly", hours: 10, parts: null }], 150)).toEqual({ hours: 10, unpricedLines: 1, labor: 1500, parts: 0, subtotal: 1500 });
    expect(estimateTotals([{ id: "check", label: "No-charge check", hours: 0, parts: 0 }], 150).unpricedLines).toBe(0);
    const draft = { version: 1, rate: 150, lines: [{ id: "engine", label: "Replace engine assembly", hours: null, parts: null }] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...draft.lines[0], hours: "unknown" }] }))).toBeNull();
  });

  it("rejects invalid, duplicate and overlapping saved drafts", () => {
    const line = { id: "front", label: "Front pads", hours: 1, parts: 90, conflictGroup: "front-friction" };
    const draft = { version: 1, rate: 150, lines: [line] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parsePreviewDraft("null")).toBeNull();
    expect(parsePreviewDraft("invalid")).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, rate: -1 }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [line, line] }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [line, { ...line, id: "other" }] }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...line, hours: 101 }] }))).toBeNull();
  });
});
