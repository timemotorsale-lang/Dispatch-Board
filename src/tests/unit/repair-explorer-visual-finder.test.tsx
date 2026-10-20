import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CATALOG_ENTRIES, REPAIR_SYSTEMS } from "@/features/prototype/repair-explorer/catalog";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import { VISUAL_AREAS, visualAreaForSystem, visualEntries, visualEstimateRepair, visualPartForOperation } from "@/features/prototype/repair-explorer/visual-catalog";
import { VisualRepairFinder } from "@/features/prototype/repair-explorer/visual-repair-finder";

describe("visual repair finder", () => {
  it("maps every illustrated component and action to an existing catalog operation", () => {
    expect(VISUAL_AREAS).toHaveLength(12);
    expect(new Set(VISUAL_AREAS.map((area) => area.id)).size).toBe(12);
    expect(new Set(VISUAL_AREAS.map((area) => area.systemId))).toEqual(new Set(REPAIR_SYSTEMS.map((system) => system.id)));
    expect(CATALOG_ENTRIES.length).toBeGreaterThan(879);
    for (const area of VISUAL_AREAS) {
      expect(new Set(area.parts.map((part) => part.id)).size).toBe(area.parts.length);
      for (const part of area.parts) {
        for (const label of part.operations) expect(CATALOG_ENTRIES.some(({ repair }) => repair.label === label), `${part.id}: ${label}`).toBe(true);
        expect(visualEntries(part, null).some(({ repair }) => repair.kind === "repair"), part.id).toBe(true);
        expect(visualEntries(part, null).some(({ repair }) => repair.kind === "diagnosis"), part.id).toBe(true);
      }
    }
  });

  it("requires a side for wheel-specific repairs and filters opposite-side operations", () => {
    const caliper = VISUAL_AREAS[0].parts.find((part) => part.id === "caliper")!;
    const left = visualEntries(caliper, "left").find(({ repair }) => repair.kind === "repair")!.repair;
    expect(left.label).toBe("Replace front left brake caliper");
    expect(visualEntries(caliper, "left").some(({ repair }) => repair.label.includes("right"))).toBe(false);
    expect(visualEstimateRepair(left, caliper, null)).toBeNull();
    expect(visualEstimateRepair(left, caliper, "right")).toBeNull();
    expect(visualEstimateRepair(left, caliper, "left")).toBe(left);
    const diagnosis = visualEntries(caliper, null).find(({ repair }) => repair.kind === "diagnosis")!.repair;
    expect(visualEstimateRepair(diagnosis, caliper, null)).toBe(diagnosis);
  });

  it("retains canonical catalog identity when a generic operation is scoped to a front corner", () => {
    const arm = VISUAL_AREAS[1].parts.find((part) => part.id === "control-arm")!;
    const repair = visualEntries(arm, "left").find(({ repair }) => repair.label === "Replace lower control arm")!.repair;
    const left = visualEstimateRepair(repair, arm, "left")!;
    const right = visualEstimateRepair(repair, arm, "right")!;
    expect(left.id).not.toBe(right.id);
    expect(left.catalogOperationId).toBe(repair.id);
    expect(left.position).toBe("front-left");
    expect(left.hours).toBe(repair.hours);
    expect(left.label).toBe("Replace lower control arm · front left");
    expect(repair.catalogOperationId).toBeUndefined();
    const draft = { version: 1, rate: 150, lines: [{ id: left.id, label: left.label, hours: left.hours, parts: left.parts, catalogOperationId: left.catalogOperationId, position: left.position }] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...draft.lines[0], position: undefined }] }))).toBeNull();
  });

  it("keeps axle-service quantities and catalog-to-diagram highlighting intact", () => {
    const part = visualPartForOperation("brakes", "front-pads-rotors")!;
    expect(part.id).toBe("rotor");
    const repair = visualEntries(part, null).find(({ repair }) => repair.id === "front-pads-rotors")!.repair;
    expect(visualEstimateRepair(repair, part, null)).toBe(repair);
    expect(part.scope).toContain("both sides");
    expect(visualPartForOperation("brakes", "rear-pads-rotors")).toBeUndefined();
    expect(visualPartForOperation("front-suspension", "control-arm")?.id).toBe("control-arm");
  });

  it("provides keyboard-operable diagrams, equivalent part lists and explicit applicability labels", () => {
    const html = renderToStaticMarkup(<VisualRepairFinder initialArea="brakes" initialOperationId="front-pads-rotors" addedIds={[]} onAdd={() => undefined} onView={() => undefined} onBrowseSystem={() => undefined} onClose={() => undefined} />);
    expect(html).toContain("Front brakes component diagram");
    expect(html).toContain('aria-label="Select Brake caliper"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Diagram part list"');
    expect(html).toContain("not to scale or vehicle-specific");
    expect(html).toContain("Replace front pads &amp; rotors");
  });

  it("opens the correct diagram for every catalog system without falling back to suspension geometry", () => {
    for (const system of REPAIR_SYSTEMS) {
      const areaId = visualAreaForSystem(system.id);
      const area = VISUAL_AREAS.find((item) => item.id === areaId)!;
      expect(area).toBeDefined();
      const html = renderToStaticMarkup(<VisualRepairFinder initialArea={areaId} initialOperationId="" addedIds={[]} onAdd={() => undefined} onView={() => undefined} onBrowseSystem={() => undefined} onClose={() => undefined} />);
      expect(html).toContain(`${area.label.replace(/&/g, "&amp;")} component diagram`);
      expect(html).toContain("Part not shown? Browse full system catalog");
      expect(area.parts.length).toBeGreaterThanOrEqual(5);
      if (!["brakes", "front-suspension"].includes(area.id)) {
        expect(area.parts.every((part) => part.drawing && part.drawing.length > 0)).toBe(true);
        expect(html).not.toContain('cx="411" cy="284" rx="65"');
      }
    }
    expect(visualAreaForSystem("unknown")).toBeNull();
  });

  it("keeps diagram targets, callouts and zoom boxes inside the illustration bounds", () => {
    for (const area of VISUAL_AREAS) for (const part of area.parts) {
      for (const [x, y] of [part.target, part.callout]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(600);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(400);
      }
      const [x, y, width, height] = part.zoom.split(" ").map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(600);
      expect(y + height).toBeLessThanOrEqual(400);
    }
  });
});
