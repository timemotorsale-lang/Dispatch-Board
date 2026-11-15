import { describe, expect, it } from "vitest";
import { repairExplorerHandoffHref, repairExplorerStorageKey, safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { assertExplorerDraftTarget } from "@/lib/explorer-estimate-handoff";
import { parsePreviewDraft, type PreviewDraft } from "@/features/prototype/repair-explorer/estimate";

describe("canonical repair explorer context", () => {
  const draft: PreviewDraft = { version: 1, rate: 135, lines: [], repairOrderId: "ro-1", vehicleId: "vehicle-1" };

  it("isolates each user's RO drafts from the sample and other ROs", () => {
    const keys = [repairExplorerStorageKey("user"), repairExplorerStorageKey("user", "ro-1"), repairExplorerStorageKey("user", "ro-2"), repairExplorerStorageKey("other", "ro-1")];
    expect(new Set(keys).size).toBe(4);
    expect(repairExplorerStorageKey("user")).toBe("dispatch-board.repair-explorer-preview.v1.user");
    expect(repairExplorerHandoffHref("ro/1")).toBe("/prototype/repair-explorer?importExplorer=1&repairOrderId=ro%2F1");
  });

  it("accepts only the draft's verified RO and vehicle pair", () => {
    expect(() => assertExplorerDraftTarget(draft, { id: "ro-1", vehicle: { id: "vehicle-1" } })).not.toThrow();
    expect(() => assertExplorerDraftTarget(draft, { id: "ro-2", vehicle: { id: "vehicle-1" } })).toThrow("different repair order");
    expect(() => assertExplorerDraftTarget(draft, { id: "ro-1", vehicle: { id: "vehicle-2" } })).toThrow("different repair order");
    expect(() => assertExplorerDraftTarget(draft, null)).toThrow();
    expect(() => assertExplorerDraftTarget({ version: 1, rate: 150, lines: [] }, null)).not.toThrow();
    expect(() => assertExplorerDraftTarget({ version: 1, rate: 150, lines: [] }, { id: "ro-1", vehicle: { id: "vehicle-1" } })).toThrow();
  });

  it("rejects partial or malformed identity on stored drafts", () => {
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parsePreviewDraft(JSON.stringify({ ...draft, vehicleId: undefined }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, repairOrderId: 42 }))).toBeNull();
  });
});

describe("Labor Guide source return", () => {
  it("preserves an internal destination and its exact query/hash", () => {
    expect(safeLaborGuideReturnTo("/crm-next/deals?customerId=abc#history")).toBe("/crm-next/deals?customerId=abc#history");
  });
  it.each([undefined, "https://example.org", "//example.org", "/\\example.org", "/\t/example.org", "/\n/example.org", "javascript:alert(1)"])("rejects an external or malformed destination: %s", value => {
    expect(safeLaborGuideReturnTo(value)).toBeUndefined();
  });
});