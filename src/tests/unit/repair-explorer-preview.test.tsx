import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { REPAIR_SYSTEMS, searchRepairs } from "@/features/prototype/repair-explorer/catalog";
import { estimateTotals, parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn().mockResolvedValue({ id: "reviewer" }) }));

describe("Repair Explorer preview", () => {
  it("requires authentication and scopes browser drafts to the reviewer", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/repair-explorer/page");
    const { requireCurrentUser } = await import("@/server/auth/current-user");
    const page = await Page();
    expect(requireCurrentUser).toHaveBeenCalledWith("/prototype/repair-explorer");
    expect(page.props.storageKey).toBe("dispatch-board.repair-explorer-preview.v1.reviewer");
  });

  it("renders a clearly isolated sample with an empty estimate and a return link", () => {
    const html = renderToStaticMarkup(<RepairExplorer storageKey="test-preview" />);
    expect(html).toContain("Prototype · sample data");
    expect(html).toContain("Your estimate starts here");
    expect(html).toContain('href="/diagnostics/labor-guide"');
    expect(html).toContain("no live repair orders, customer records or approvals are changed");
  });

  it("finds work across systems by symptom, component and DTC", () => {
    expect(searchRepairs("grinding").some(({ repair }) => repair.id === "brake-noise")).toBe(true);
    expect(searchRepairs("P0300")[0].repair.id).toBe("engine-misfire");
    expect(searchRepairs("no start")[0].repair.id).toBe("no-start");
    expect(searchRepairs("rear caliper")).toHaveLength(2);
    expect(searchRepairs("not-a-sample-repair")).toEqual([]);
    expect(REPAIR_SYSTEMS).toHaveLength(12);
  });

  it("adds rounded line costs in cents and respects changed rates", () => {
    const lines = [{ id: "front", label: "Front pads & rotors", hours: 2, parts: 220 }];
    expect(estimateTotals(lines, 150)).toEqual({ hours: 2, labor: 300, parts: 220, subtotal: 520 });
    expect(estimateTotals(lines, 175).subtotal).toBe(570);
    expect(estimateTotals([], 150).subtotal).toBe(0);
    expect(estimateTotals([{ id: "fraction", label: "Fraction", hours: 0.1, parts: 0.1 }], 150).subtotal).toBe(15.1);
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
