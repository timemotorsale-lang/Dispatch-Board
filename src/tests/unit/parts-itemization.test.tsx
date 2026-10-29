import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { itemizedPartsTotal, parsePreviewDraft, estimateTotals, type EstimatePartItem } from "@/features/prototype/repair-explorer/estimate";
import { PartsBreakdown } from "@/features/prototype/repair-explorer/parts-breakdown";
import { prepareExplorerQuote, replaceExplorerPartsAllowance } from "@/lib/explorer-estimate-handoff";

const items: EstimatePartItem[] = [{ id: "pads", name: "Front brake pads", number: "PAD-1", quantity: 1, unitPrice: 50 }, { id: "rotors", name: "Front brake rotor", number: "ROTOR-1", quantity: 2, unitPrice: 60 }];
const work = { id: "custom-11111111-2222-4333-8444-555555555555", label: "Replace front pads and rotors", hours: 2, laborBasis: "MANUAL" as const, parts: 170, partItems: items };
const draft = (line = work) => JSON.stringify({ version: 1, rate: 125, lines: [line] });
describe("itemized estimate parts", () => {
  it("replaces only the related generic allowance when staff add an actual part", () => {
    const actual = { id: "pads", laborRowId: "brakes", name: "Brake pads", unitPrice: 50 };
    const rotor = { id: "rotor", laborRowId: "brakes", name: "Rotor", unitPrice: 60 };
    const other = { id: "explorer-quote-2", laborRowId: "starter", name: "Parts for starter", unitPrice: 100 };
    const parts = [{ id: "explorer-quote-1", laborRowId: "brakes", name: "Parts for brakes", unitPrice: 170 }, actual, other];
    expect(replaceExplorerPartsAllowance(parts, rotor)).toEqual([actual, other, rotor]);
    expect(parts).toHaveLength(3);
  });
  it("persists the breakdown and charges its quantities once, replacing the generic amount", () => {
    const parsed = parsePreviewDraft(draft())!;
    expect(parsed.lines[0].partItems).toEqual(items);
    expect(estimateTotals(parsed.lines, 125)).toMatchObject({ labor: 250, parts: 170, subtotal: 420 });
    const { seed } = prepareExplorerQuote(draft(), [], [], () => "unused");
    expect(seed.parts).toHaveLength(2);
    expect(seed.parts.map(part => [part.name, part.number, part.quantity, part.unitPrice])).toEqual([["Front brake pads", "PAD-1", 1, 50], ["Front brake rotor", "ROTOR-1", 2, 60]]);
    expect(seed.parts.every(part => !part.name.startsWith("Parts for") && part.pricingStatus === "ESTIMATED")).toBe(true);
    expect(seed.parts.every(part => part.laborRowId === seed.labor[0].rowId)).toBe(true);
  });
  it("does not silently retain an old lump sum alongside the detailed parts", () => {
    expect(parsePreviewDraft(draft({ ...work, parts: 500 }))).toBeNull();
    expect(itemizedPartsTotal([])).toBe(0);
    expect(prepareExplorerQuote(draft({ ...work, parts: 0, partItems: [] }), [], [], () => "unused").seed.parts).toEqual([]);
  });
  it("keeps pending input recoverable in a browser draft and rejects missing descriptions at handoff", () => {
    const pending = { ...work, parts: null, partItems: [{ ...items[0], name: "", unitPrice: null }] };
    expect(parsePreviewDraft(JSON.stringify({ version: 1, rate: 125, lines: [pending] }))).not.toBeNull();
    expect(() => prepareExplorerQuote(JSON.stringify({ version: 1, rate: 125, lines: [pending] }), [], [], () => "unused")).toThrow("description");
    expect(itemizedPartsTotal(pending.partItems)).toBeNull();
  });
  it("rounds unit prices in cents before applying quantity", () => {
    expect(itemizedPartsTotal([{ ...items[0], quantity: 3, unitPrice: 1.005 }])).toBe(3);
    expect(itemizedPartsTotal([{ ...items[0], quantity: 2, unitPrice: 0 }])).toBe(0);
  });
  it("preserves itemization when held catalog work becomes a staff quote and does not disturb other allowances", () => {
    const raw = JSON.stringify({ version: 1, rate: 125, lines: [{ ...work, id: "door-glass", label: "Replace door glass" }, { ...work, id: "custom-22222222-2222-4333-8444-555555555555", label: "Other work", partItems: undefined, parts: 30 }] });
    const result = prepareExplorerQuote(raw, [], [], () => "33333333-2222-4333-8444-555555555555");
    expect(result.seed.parts.map(part => part.name)).toEqual(["Front brake pads", "Front brake rotor", "Parts for Other work"]);
    expect(result.seed.parts.map(part => part.unitPrice)).toEqual([50, 60, 30]);
  });
  it("rejects invalid quantities and duplicate item identifiers", () => {
    expect(parsePreviewDraft(draft({ ...work, partItems: [items[0], items[0]] }))).toBeNull();
    expect(parsePreviewDraft(draft({ ...work, partItems: [{ ...items[0], quantity: -1 }] }))).toBeNull();
  });
  it("shows description, part number, quantity and unit price together", () => {
    const html = renderToStaticMarkup(<PartsBreakdown items={items} onChange={() => {}} />);
    for (const field of ["Part 1 description", "Part 1 number", "Part 2 quantity", "Part 2 unit price", "Front brake pads", "Front brake rotor", "Parts total: "]) expect(html).toContain(field);
    expect(html).not.toContain("Parts total ($)");
  });
});
