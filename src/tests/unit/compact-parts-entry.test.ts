import { describe, expect, it, vi } from "vitest";
import { compactReceiptRemaining, runCompactPartsEntry, type CompactPartsEntryInput, type CompactPartsEntryModel, type CompactPartsEntryProgress } from "@/lib/compact-parts-entry";
const input: CompactPartsEntryInput = { mode: "PURCHASED", repairOrderId: "ro", locationId: "store", description: "Brake pads", quantity: 2, vendorId: "vendor", unitPriceCents: 2500, purchasedAt: "2026-01-01T12:00:00Z", received: true, receivedAt: "2026-01-02T12:00:00Z", stockLocationId: "bin", packingSource: "Slip 1", note: "Verified synthetic purchase" };
const model: CompactPartsEntryModel = { repairOrders: [{ id: "ro", locationId: "store" }], demands: [], requisitions: [], catalog: [{ id: "part", partNumber: "PAD" }], vendors: [{ id: "vendor", name: "Vendor" }], stockLocations: [{ id: "bin", locationId: "store", isActive: true }], purchaseOrders: [], receipts: [] };
function harness(status = "ISSUED") {
  let saved: CompactPartsEntryProgress | undefined;
  const request = vi.fn(async (path: string, body: Record<string, unknown>) => ({ result: { id: body.action === "CREATE_PURCHASE_ORDER" ? "exact-po" : body.action === "RECEIVE_PURCHASE_ORDER" ? "exact-receipt" : `${body.action ?? path}-id`, ...(body.action === "CREATE_PURCHASE_ORDER" ? { status } : {}) } }));
  return { request, onProgress: (progress: CompactPartsEntryProgress) => { saved = progress; }, saved: () => saved };
}
describe("compact parts orchestration", () => {
  it("records a need without procurement or receipt", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, mode: "NEEDED", received: false }, model, h);
    expect(result.status).toBe("COMPLETE"); expect(h.request).toHaveBeenCalledTimes(2);
  });
  it("reuses one exact active description match, ignoring case and whitespace", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, mode: "NEEDED", received: false }, { ...model, catalog: [{ id: "matched", partNumber: "PAD-1", description: "  BRAKE   pads ", status: "ACTIVE" }] }, h);
    expect(result).toMatchObject({ status: "COMPLETE", partId: "matched" });
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.request.mock.calls[0][1]).toMatchObject({ partId: "matched" });
  });
  it("blocks ambiguous descriptions before any write and allows explicit selection", async () => {
    const h = harness(); const catalog = ["one", "two"].map(id => ({ id, partNumber: id, description: "Brake pads" }));
    expect((await runCompactPartsEntry(input, { ...model, catalog }, h)).status).toBe("BLOCKED");
    expect(h.request).not.toHaveBeenCalled();
    const selected = await runCompactPartsEntry({ ...input, partId: "two" }, { ...model, catalog }, h);
    expect(selected).toMatchObject({ status: "COMPLETE", partId: "two" });
  });
  it("does not match inactive or merely similar catalog descriptions", async () => {
    const h = harness(); await runCompactPartsEntry({ ...input, mode: "NEEDED", received: false }, { ...model, catalog: [{ id: "inactive", partNumber: "OLD", description: "Brake pads", status: "INACTIVE" }, { id: "similar", partNumber: "OTHER", description: "Rear brake pads" }] }, h);
    expect(h.request.mock.calls[0][0]).toBe("/api/parts");
  });
  it("freezes matched identity across retries even when catalog results change", async () => {
    const h = harness(); h.request.mockRejectedValueOnce(new Error("Lost demand response"));
    const value = { ...input, mode: "NEEDED" as const, received: false };
    const first = await runCompactPartsEntry(value, { ...model, catalog: [{ id: "original", partNumber: "PAD", description: "Brake pads" }] }, h);
    expect(first.status).toBe("RETRY");
    const retry = await runCompactPartsEntry(value, { ...model, catalog: [{ id: "new-match", partNumber: "OTHER", description: "Brake pads" }] }, { ...h, progress: first.progress });
    expect(retry).toMatchObject({ status: "COMPLETE", partId: "original" });
    expect(h.request.mock.calls[0][1]).toEqual(h.request.mock.calls[1][1]);
  });
  it("converts a saved need into purchase and receipt without creating another demand", async () => {
    const h = harness(); const savedNeed = { ...model, demands: [{ id: "needed", repairOrderId: "ro", partId: "part", quantityRequired: 3, quantityReserved: 1, status: "PARTIALLY_RESERVED" }] };
    const result = await runCompactPartsEntry({ ...input, demandId: "needed", partId: "part" }, savedNeed, h);
    expect(result).toMatchObject({ status: "COMPLETE", demandId: "needed", purchaseOrderId: "exact-po", receiptId: "exact-receipt" });
    expect(h.request.mock.calls.some(([path]) => path.includes("/repair-orders/"))).toBe(false);
    expect(h.request.mock.calls.find(([, body]) => body.action === "CREATE_REQUISITION")?.[1]).toMatchObject({ demandId: "needed", quantity: 2 });
  });
  it.each(["quantity", "requisition", "purchase"])("refuses conflicting saved-need conversion: %s", async conflict => {
    const h = harness(); const context: CompactPartsEntryModel = { ...model, demands: [{ id: "needed", repairOrderId: "ro", partId: "part", quantityRequired: conflict === "quantity" ? 3 : 2, quantityReserved: 0, status: "OPEN" }], requisitions: conflict === "requisition" ? [{ id: "req", demandId: "needed", status: "SOURCING" }] : [], purchaseOrders: conflict === "purchase" ? [{ id: "po", repairOrderId: "ro", locationId: "store", status: "DRAFT", lines: [{ partId: "part", quantity: 2, unitCostCents: 1 }] }] : [] };
    expect((await runCompactPartsEntry({ ...input, partId: "part", demandId: "needed" }, context, h)).status).toBe("BLOCKED");
    expect(h.request).not.toHaveBeenCalled();
  });
  it("rejects a mismatched RO location before creating catalog or demand records", async () => {
    const h = harness(); expect((await runCompactPartsEntry({ ...input, locationId: "wrong" }, model, h)).status).toBe("BLOCKED"); expect(h.request).not.toHaveBeenCalled();
  });
  it("returns exact existing PO choices before any journal checkpoint or write", async () => {
    const h = harness(); const onProgress = vi.fn(h.onProgress);
    const result = await runCompactPartsEntry({ ...input, partId: "part" }, { ...model, purchaseOrders: [{ id: "first", repairOrderId: "ro", locationId: "store", status: "ISSUED", lines: [{ partId: "part", quantity: 2, unitCostCents: 1 }] }, { id: "second", repairOrderId: "ro", locationId: "store", status: "DRAFT", lines: [{ partId: "part", quantity: 2, unitCostCents: 1 }] }] }, { ...h, onProgress });
    expect(result).toMatchObject({ status: "BLOCKED", existingPurchaseOrderIds: ["first", "second"] });
    expect(result.purchaseOrderId).toBeUndefined(); expect(result.progress.steps).toEqual({});
    expect(onProgress).not.toHaveBeenCalled(); expect(h.request).not.toHaveBeenCalled();
  });
  it("matches an explicit part number before description and preserves a provided new number", async () => {
    const h = harness();
    const existing = await runCompactPartsEntry({ ...input, mode: "NEEDED", received: false, partNumber: " pad " }, model, h);
    expect(existing.partId).toBe("part"); expect(h.request.mock.calls[0][0]).not.toBe("/api/parts");
    const fresh = harness(); await runCompactPartsEntry({ ...input, mode: "NEEDED", received: false, partNumber: " custom-123 " }, model, fresh);
    expect(fresh.request.mock.calls[0][1]).toMatchObject({ partNumber: "CUSTOM-123" });
  });
  it("creates a named physical bin at the actual store, then receives using its exact ID", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, stockLocationId: undefined, stockLocationName: "Rear shelf B" }, model, h);
    expect(result.status).toBe("COMPLETE");
    const location = h.request.mock.calls.find(([path]) => path === "/api/parts/locations")!;
    expect(location[1]).toMatchObject({ locationId: "store", name: "Rear shelf B", type: "BIN", code: expect.stringMatching(/^BIN-/) });
    expect(h.request.mock.calls.at(-1)?.[1]).toMatchObject({ stockLocationId: "/api/parts/locations-id" });
  });
  it("reuses an existing physical bin by name at the same store", async () => {
    const h = harness(); await runCompactPartsEntry({ ...input, stockLocationId: undefined, stockLocationName: "Rear shelf B" }, { ...model, stockLocations: [{ id: "wrong-store", locationId: "other", name: "Rear shelf B" }, { id: "right-bin", locationId: "store", name: "Rear shelf B" }] }, h);
    expect(h.request.mock.calls.some(([path]) => path === "/api/parts/locations")).toBe(false);
    expect(h.request.mock.calls.at(-1)?.[1]).toMatchObject({ stockLocationId: "right-bin" });
  });
  it("records atomic use after new receipt and resumes only the lost outcome request", async () => {
    const h = harness(); const base = h.request.getMockImplementation()!; let fail = true;
    h.request.mockImplementation(async (path, body) => { if (body.action === "RECORD_RECEIVED_PART_OUTCOME" && fail) { fail = false; throw new Error("Lost outcome response"); } return base(path, body); });
    const value = { ...input, usage: "USED" as const, usageOccurredAt: "2026-01-03T12:00:00Z", repairJobId: "job", evidence: ["Verified installed pads"] };
    const context = { ...model, repairJobs: [{ id: "job", repairOrderId: "ro", status: "IN_PROGRESS" }] };
    const first = await runCompactPartsEntry(value, context, h); expect(first.status).toBe("RETRY");
    const second = await runCompactPartsEntry(value, context, { ...h, progress: first.progress }); expect(second).toMatchObject({ status: "COMPLETE", outcome: "USED" });
    const outcomes = h.request.mock.calls.filter(([, body]) => body.action === "RECORD_RECEIVED_PART_OUTCOME");
    expect(outcomes).toHaveLength(2); expect(outcomes[0][1]).toEqual(outcomes[1][1]);
    expect(outcomes[0][1]).toMatchObject({ receiptId: "exact-receipt", lineIndex: 0, repairJobId: "job", evidence: ["Verified installed pads"] });
    expect(h.request.mock.calls.filter(([, body]) => body.action === "CREATE_PURCHASE_ORDER")).toHaveLength(1);
    expect(h.request.mock.calls.filter(([, body]) => body.action === "RECEIVE_PURCHASE_ORDER")).toHaveLength(1);
  });
  const receivedModel: CompactPartsEntryModel = { ...model, purchaseOrders: [{ id: "saved-po", repairOrderId: "ro", locationId: "store", status: "RECEIVED", lines: [{ partId: "part", quantity: 2, unitCostCents: 1 }] }], receipts: [{ id: "saved-receipt", purchaseOrderId: "saved-po", receivedAt: "2026-01-02T12:00:00Z", stockLocationId: "bin", lines: [{ partId: "part", quantity: 2 }] }] };
  it("opens return follow-up against exact saved receipt without procurement or stock return commands", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, receiptId: "saved-receipt", lineIndex: 0, usage: "RETURN", usageOccurredAt: "2026-01-03T12:00:00Z", returnReason: "Unused pads no longer needed", deadlineAt: "2026-01-04T12:00:00Z" }, receivedModel, h);
    expect(result).toMatchObject({ status: "COMPLETE", outcome: "RETURN" }); expect(result.nextAction).toContain("not yet recorded");
    expect(h.request).toHaveBeenCalledTimes(1); expect(h.request.mock.calls[0][1]).toMatchObject({ action: "RECORD_RECEIVED_PART_OUTCOME", receiptId: "saved-receipt", lineIndex: 0, outcome: "RETURN" });
  });
  it("counts both legacy and RO-scoped recovery references without matching another RO", () => {
    const context = { ...receivedModel, recoveries: [{ id: "return1", sourceReference: "saved-receipt:0:old", partId: "part", quantity: 1, status: "OPEN" }, { id: "return2", sourceReference: "RO:ro|RECEIPT:saved-receipt:0|new", partId: "part", quantity: 1, status: "OPEN" }, { id: "other", sourceReference: "RO:other|RECEIPT:saved-receipt:0|wrong", partId: "part", quantity: 10, status: "OPEN" }] };
    expect(compactReceiptRemaining(context, "saved-receipt", 0)).toBe(0);
    expect(compactReceiptRemaining(context, "saved-receipt", 1)).toBeNull();
  });
  it("not-yet-used saved receipt makes no request", async () => {
    const h = harness(); expect((await runCompactPartsEntry({ ...input, receiptId: "saved-receipt", lineIndex: 0, usage: "NOT_YET" }, receivedModel, h)).status).toBe("COMPLETE"); expect(h.request).not.toHaveBeenCalled();
  });
  it("blocks unknown job status before procurement", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, usage: "USED", repairJobId: "job", evidence: ["Evidence"], usageOccurredAt: "2026-01-03T12:00:00Z" }, { ...model, repairJobs: [{ id: "job", repairOrderId: "ro", status: "UNKNOWN" }] }, h);
    expect(result.status).toBe("BLOCKED"); expect(h.request).not.toHaveBeenCalled();
  });
  it("blocks already-disposed saved receipt quantity", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, receiptId: "saved-receipt", lineIndex: 0, usage: "RETURN", usageOccurredAt: "2026-01-03T12:00:00Z", returnReason: "Unused pads not needed", deadlineAt: "2026-01-04T12:00:00Z" }, { ...receivedModel, custodyEvents: [{ sourceId: "saved-receipt:0:event", partId: "part", quantity: 1, type: "INSTALL" }] }, h);
    expect(result.status).toBe("BLOCKED"); expect(h.request).not.toHaveBeenCalled();
  });
  it("receives only the newly created PO, never an unrelated first PO", async () => {
    const h = harness(); const result = await runCompactPartsEntry(input, { ...model, purchaseOrders: [{ id: "unrelated", repairOrderId: "other", locationId: "store", status: "ISSUED", lines: [] }] }, h);
    expect(result).toMatchObject({ status: "COMPLETE", purchaseOrderId: "exact-po", receiptId: "exact-receipt" });
    expect(h.request.mock.calls.at(-1)?.[1]).toMatchObject({ action: "RECEIVE_PURCHASE_ORDER", strictRemaining: true, subjectId: "exact-po" });
    expect(h.request.mock.calls.some(([, body]) => /APPROVE|INSTALL|CLOSE/.test(String(body.action)))).toBe(false);
  });
  it("stops a draft for approval without receiving or approving", async () => {
    const h = harness("DRAFT"); const result = await runCompactPartsEntry(input, model, h);
    expect(result).toMatchObject({ status: "AWAITING_APPROVAL", purchaseOrderId: "exact-po" });
    expect(h.request.mock.calls.some(([, body]) => body.action === "RECEIVE_PURCHASE_ORDER")).toBe(false);
  });
  it("persists the pending request and reuses its key after a lost purchase response", async () => {
    const h = harness(); const base = h.request.getMockImplementation()!; let lost = true;
    h.request.mockImplementation(async (path, body) => { if (body.action === "CREATE_PURCHASE_ORDER" && lost) { lost = false; throw new Error("Lost response"); } return base(path, body); });
    const first = await runCompactPartsEntry(input, model, h); expect(first.status).toBe("RETRY");
    const pending = h.saved()!.steps.purchase;
    const second = await runCompactPartsEntry(input, model, { ...h, progress: h.saved() }); expect(second.status).toBe("COMPLETE");
    const purchases = h.request.mock.calls.filter(([, body]) => body.action === "CREATE_PURCHASE_ORDER");
    expect(purchases).toHaveLength(2); expect(purchases[0][1]).toEqual(purchases[1][1]); expect(purchases[1][1]).toEqual(pending.body);
    expect(h.request.mock.calls.filter(([path]) => path === "/api/parts")).toHaveLength(1);
    const changed = await runCompactPartsEntry({ ...input, quantity: 3 }, model, { ...h, progress: second.progress }); expect(changed.status).toBe("BLOCKED");
  });
  const existing = { ...model, purchaseOrders: [{ id: "selected", repairOrderId: "ro", locationId: "store", status: "ISSUED", lines: [{ partId: "part", quantity: 5, unitCostCents: 1200 }] }], receipts: [{ purchaseOrderId: "selected", lines: [{ partId: "part", quantity: 3 }] }] };
  it("receives an existing exact PO using its price, without creating anything else", async () => {
    const h = harness(); const result = await runCompactPartsEntry({ ...input, purchaseOrderId: "selected", partId: "part" }, existing, h);
    expect(result.status).toBe("COMPLETE"); expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.request.mock.calls[0][1]).toMatchObject({ subjectId: "selected", lines: [{ partId: "part", quantity: 2, unitCostCents: 1200 }] });
  });
  it.each(["wrong-ro", "wrong-location", "over", "draft"])("blocks unsafe existing receipt: %s", async kind => {
    const h = harness(); const current = structuredClone(existing);
    if (kind === "wrong-ro") current.purchaseOrders[0].repairOrderId = "elsewhere";
    if (kind === "wrong-location") current.purchaseOrders[0].locationId = "elsewhere";
    if (kind === "draft") current.purchaseOrders[0].status = "DRAFT";
    const result = await runCompactPartsEntry({ ...input, purchaseOrderId: "selected", partId: "part", quantity: kind === "over" ? 3 : 2 }, current, h);
    expect(result.status).toBe(kind === "draft" ? "AWAITING_APPROVAL" : "BLOCKED"); expect(h.request).not.toHaveBeenCalled();
  });
  it("reports receiving discrepancy review on a partial receipt and completed replay", async () => {
    const h = harness();
    h.request.mockImplementation(async () => ({ result: { id: "partial-receipt", discrepancyReviewRequired: true } }));
    const value = { ...input, purchaseOrderId: "selected", partId: "part", quantity: 1 };
    const first = await runCompactPartsEntry(value, existing, h);
    expect(first).toMatchObject({ status: "COMPLETE", receiptId: "partial-receipt", receiptNeedsReview: true });
    expect(first.nextAction).toContain("Review the receiving discrepancy");
    const replay = await runCompactPartsEntry(value, existing, { ...h, progress: first.progress });
    expect(replay.receiptNeedsReview).toBe(true);
    expect(replay.nextAction).toBe(first.nextAction);
    expect(h.request).toHaveBeenCalledTimes(1);
  });
  it("recovers a lost receipt response even when refreshed PO is fully received", async () => {
    const h = harness(); h.request.mockRejectedValueOnce(new Error("Lost receipt response"));
    const value = { ...input, purchaseOrderId: "selected", partId: "part" };
    const first = await runCompactPartsEntry(value, existing, h); expect(first.status).toBe("RETRY");
    const current = structuredClone(existing); current.purchaseOrders[0].status = "RECEIVED";
    const second = await runCompactPartsEntry(value, current, { ...h, progress: first.progress });
    expect(second.status).toBe("COMPLETE"); expect(h.request.mock.calls[0][1]).toEqual(h.request.mock.calls[1][1]);
  });
});
