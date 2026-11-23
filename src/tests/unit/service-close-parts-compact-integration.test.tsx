import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), stateIndex: 0, states: new Map<number, unknown>() }));
vi.mock("@/lib/compact-parts-entry", async original => ({ ...await original<typeof import("@/lib/compact-parts-entry")>(), runCompactPartsEntry: mocks.run }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (value: unknown) => { const index = mocks.stateIndex++; const current = mocks.states.has(index) ? mocks.states.get(index) : typeof value === "function" ? value() : value; return [current, (next: unknown) => { mocks.states.set(index, typeof next === "function" ? next(mocks.states.has(index) ? mocks.states.get(index) : current) : next); }]; }, useRef: (value: unknown) => ({ current: value }), useEffect: vi.fn() };
});
import { CompactPartsEntry, type CompactPartsEntryInput } from "@/features/inventory/compact-parts-entry";
import { ServiceClosePartsWorkspace, compactPartsModel, compactPurchaseOptions, compactEntryStorageKey, readUnfinishedPartsEntries, canResolvePartsEntry, resolvePartsEntry, partsEntryRecoveryGuidance, compactReceivedParts } from "@/features/inventory/service-close-parts-workspace";

const order = { id: "ro-1", locationId: "store-1", closedAt: null, repairOrderNumber: "RO-1", stage: "REPAIR", customer: null, vehicle: { vehicleNumber: "V-1" }, invoicePackages: [] };
const po = { id: "po-1", locationId: "store-1", status: "ISSUED", purchaseOrderNumber: "PO-1", vendorId: "vendor-1", requisition: { demand: { repairOrder: { id: "ro-1", repairOrderNumber: "RO-1" } } }, lines: [{ partId: "part-1", quantity: 5, unitCostCents: 250 }, { partId: "part-2", quantity: 3, unitCostCents: 500 }] };
const model = { repairOrders: [order], parts: [{ id: "part-1", partNumber: "P1", description: "Brake pads" }, { id: "part-2", partNumber: "P2" }], vendors: [], stockLocations: [{ id: "bin-1", locationId: "store-1", isActive: true }, { id: "bin-2", locationId: "other" }], purchaseOrders: [po], receipts: [{ id: "receipt-1", purchaseOrderId: "po-1", lines: [{ partId: "part-1", quantity: 2 }] }], demands: [], requisitions: [], custodyEvents: [], discrepancies: [], interchanges: [], locations: [], offers: [], recoveries: [], transfers: [] };
const entry: CompactPartsEntryInput = { repairOrderId: "ro-1", requestId: "request-1", part: "Brake pads", quantity: 1, purchased: false, received: false };
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children)];
}
function memoryStorage() {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, key: (index: number) => [...data.keys()][index] ?? null, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
let storage: ReturnType<typeof memoryStorage>;
beforeEach(() => { vi.resetAllMocks(); mocks.stateIndex = 0; mocks.states.clear(); storage = memoryStorage(); vi.stubGlobal("sessionStorage", storage); vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { callback(); return 1; }); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => model })); });
afterEach(() => vi.unstubAllGlobals());

describe("compact parts parent integration", () => {
  const blocked = () => ({
    entry, status: "BLOCKED", purchaseOrderId: "po-1",
    progress: { submissionId: entry.requestId, input: { mode: "NEEDED" as const, repairOrderId: "ro-1", locationId: "store-1", description: entry.part, partId: "part-1", quantity: 1, note: "Original note" }, startedAt: "2026-11-14T00:00:00Z", steps: { demand: { path: "/parts", body: { idempotencyKey: "frozen-key" }, result: { id: "demand-1" } } } },
  });
  it("describes partially received orders truthfully without asking for approval", () => {
    const guidance = partsEntryRecoveryGuidance(blocked(), { status: "PARTIALLY_RECEIVED" });
    expect(guidance).toContain("remaining part line");
    expect(guidance.toLowerCase()).not.toContain("approval");
    expect(partsEntryRecoveryGuidance(blocked(), { status: "DRAFT" })).toContain("needs approval");
    expect(partsEntryRecoveryGuidance(blocked(), { status: "RECEIVED" })).toContain("saved receipts");
  });
  it("archives only confirmed blocked entries while retaining their complete request history", () => {
    const saved = blocked();
    storage.setItem(compactEntryStorageKey(entry), JSON.stringify(saved));
    expect(canResolvePartsEntry(saved)).toBe(true);
    resolvePartsEntry(storage, saved, "Continue with existing order");
    expect(readUnfinishedPartsEntries(storage, "ro-1")).toEqual([]);
    const history = readUnfinishedPartsEntries(storage, "ro-1", true);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ progress: saved.progress, resolution: "Continue with existing order", resolvedAt: expect.any(String) });
  });
  it.each([undefined, {}, { id: "" }])("never archives an uncertain or incomplete step (%j)", result => {
    const saved = { ...blocked(), progress: { ...blocked().progress, steps: { purchase: { path: "/parts", body: {}, result } } } };
    storage.setItem(compactEntryStorageKey(entry), JSON.stringify(saved));
    expect(canResolvePartsEntry(saved)).toBe(false);
    expect(() => resolvePartsEntry(storage, saved, "Resolve")).toThrow("uncertain");
    expect(partsEntryRecoveryGuidance(saved, { status: "PARTIALLY_RECEIVED" })).toContain("not confirmed");
    expect(readUnfinishedPartsEntries(storage, "ro-1")).toHaveLength(1);
  });
  it("rechecks the stored journal before resolving so a newer pending step cannot be lost", () => {
    const old = blocked();
    const latest = { ...old, progress: { ...old.progress, steps: { ...old.progress.steps, receipt: { path: "/parts", body: { idempotencyKey: "pending" } } } } };
    storage.setItem(compactEntryStorageKey(entry), JSON.stringify(latest));
    expect(() => resolvePartsEntry(storage, old, "Continue")).toThrow("uncertain");
    expect(readUnfinishedPartsEntries(storage, "ro-1")[0].progress.steps.receipt).toBeDefined();
  });
  it("offers direct existing-order selection only when the blocked journal is fully confirmed", () => {
    mocks.states.set(2, [blocked()]);
    const tree = ServiceClosePartsWorkspace({ initial: { ...model, purchaseOrders: [{ ...po, status: "PARTIALLY_RECEIVED" }] } });
    expect(nodes(tree).some(node => node.type === "button" && node.props.children === "Use existing order")).toBe(true);
  });

  it("selects the exact existing order inline without mutation and resets only a confirmed blocked form", async () => {
    const saved = blocked();
    storage.setItem(compactEntryStorageKey(entry), JSON.stringify(saved));
    mocks.states.set(2, [saved]);
    const tree = ServiceClosePartsWorkspace({ initial: model });
    const button = nodes(tree).find(node => node.type === "button" && node.props.children === "Use existing order")!;
    (button.props.onClick as () => void)();
    for (let index = 0; index < 30; index++) await Promise.resolve();
    expect(mocks.run).not.toHaveBeenCalled();
    expect(readUnfinishedPartsEntries(storage, "ro-1")).toEqual([]);
    expect(readUnfinishedPartsEntries(storage, "ro-1", true)[0].resolvedAt).toBeDefined();
    expect([...mocks.states.values()]).toContainEqual({ purchaseOrderId: "po-1", partId: "part-1", token: expect.any(String) });
  });
  it("keeps original receipt indices, exact store and both legacy/new return references", () => {
    const receipt = { id: "receipt-1", purchaseOrderId: "po-1", stockLocationId: "bin-1", receivedAt: "2026-11-14T12:00:00Z", lines: [{}, { partId: "part-1", quantity: 8 }, { partId: "part-1", quantity: 2, damagedQuantity: 1 }] };
    const input = { ...model, receipts: [receipt], custodyEvents: [{ id: "used", sourceType: "PART_RECEIPT_LINE", sourceId: "receipt-1:1:used", partId: "part-1", quantity: 2, type: "INSTALL" }], recoveries: [{ id: "return", type: "VENDOR_RETURN", sourceReference: "RO:ro-1|RECEIPT:receipt-1:1|case", partId: "part-1", quantity: 1, actualCreditCents: null }] };
    const rows = compactReceivedParts(input, "ro-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ receiptId: "receipt-1", lineIndex: 1, partId: "part-1", quantity: 5, usedQuantity: 2, returnQuantity: 1, receivedAt: receipt.receivedAt });
    expect(compactPartsModel(input).receipts[0].lines).toHaveLength(3);
    expect(compactReceivedParts({ ...input, receipts: [{ ...receipt, stockLocationId: "bin-2" }] }, "ro-1")).toEqual([]);
  });
  it("forwards new stock fields and explicit receipt outcome fields into the frozen helper input", async () => {
    mocks.run.mockImplementation(async (_input, _model, options) => ({ status: "COMPLETE", progress: options.progress, message: "Saved", nextAction: "Review" }));
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    const input = { ...entry, partNumber: "PAD-9", stockLocationName: "Shelf A", receiptId: "receipt-1", lineIndex: 1, usage: "USED" as const, usageQuantity: 1, usageOccurredAt: "2026-11-14T14:25:00", repairJobId: "job-1", evidence: ["Technician verified install"] };
    await (compact.props.onSave as (value: CompactPartsEntryInput) => Promise<unknown>)(input);
    expect(mocks.run.mock.calls[0][0]).toMatchObject({ partNumber: "PAD-9", stockLocationName: "Shelf A", receiptId: "receipt-1", lineIndex: 1, usage: "USED", usageQuantity: 1, usageOccurredAt: new Date(input.usageOccurredAt).toISOString(), repairJobId: "job-1", evidence: input.evidence, locationId: "store-1" });
  });
  it("records no physical event or journal for Not yet used", async () => {
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    await (compact.props.onSave as (value: CompactPartsEntryInput) => Promise<unknown>)({ ...entry, receiptId: "receipt-1", lineIndex: 0, usage: "NOT_YET" });
    expect(mocks.run).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(storage.length).toBe(0);
  });
  it("lists eligible same-RO jobs only and exposes explicit receipt-row action buttons", () => {
    const initial = { ...model, repairOrders: [{ ...order, repairJobs: [{ id: "job-live", jobNumber: "J-1", status: "IN_PROGRESS" }, { id: "job-qc", jobNumber: "J-2", status: "QC_PASSED" }, { id: "job-unknown", jobNumber: "J-3" }] }], receipts: [{ ...model.receipts[0], stockLocationId: "bin-1", receivedAt: "2026-11-14T12:00:00Z" }] };
    const tree = ServiceClosePartsWorkspace({ initial });
    const compact = nodes(tree).find(node => node.type === CompactPartsEntry)!;
    expect(compact.props.jobs).toEqual([{ id: "job-live", label: "J-1" }]);
    expect(compact.props.usageEnabled).toBe(true);
    const section = nodes(tree).find(node => node.props["aria-label"] === "Received parts")!;
    expect(nodes(section).filter(node => node.type === "button").map(node => node.props.children)).toEqual(["Record use", "Start return"]);
  });
  it("maps exact IDs, receipts and store without falling back to matching RO numbers", () => {
    const mapped = compactPartsModel(model);
    expect(mapped.repairOrders).toEqual([{ id: "ro-1", locationId: "store-1", closedAt: null }]);
    expect(mapped.purchaseOrders[0]).toMatchObject({ id: "po-1", repairOrderId: "ro-1", locationId: "store-1" });
    expect(mapped.receipts[0].purchaseOrderId).toBe("po-1");
    expect(compactPartsModel({ ...model, purchaseOrders: [{ ...po, requisition: { demand: { repairOrder: { repairOrderNumber: "RO-1" } } } }] }).purchaseOrders).toEqual([]);
  });
  it("gives each PO line an independent selection and subtracts earlier exact receipts", () => {
    const options = compactPurchaseOptions({ ...model, purchaseOrders: [po, { ...po, id: "other", locationId: "other" }] }, "ro-1");
    expect(options).toHaveLength(2);
    expect(options.map(item => [item.id, item.partId, item.quantity, item.unitPriceCents, item.selectionKey])).toEqual([["po-1", "part-1", 3, 250, "po-1:part-1"], ["po-1", "part-2", 3, 500, "po-1:part-2"]]);
  });
  it("does not offer ambiguous duplicate part lines or completed quantities", () => {
    expect(compactPurchaseOptions({ ...model, purchaseOrders: [{ ...po, lines: [po.lines[0], po.lines[0]] }] }, "ro-1")).toEqual([]);
    expect(compactPurchaseOptions({ ...model, receipts: [{ id: "all", purchaseOrderId: po.id, lines: po.lines }] }, "ro-1")).toEqual([]);
  });
  it("keeps legacy tools collapsed and limits receiving bins to the selected store", () => {
    const tree = ServiceClosePartsWorkspace({ initial: model, initialRepairOrderId: "ro-1" });
    const details = nodes(tree).find(node => node.type === "details" && nodes(node.props.children).some(child => child.type === "summary" && child.props.children === "Detailed parts tools"));
    expect(details?.props.open).toBe(false);
    const compact = nodes(tree).find(node => node.type === CompactPartsEntry)!;
    expect(compact.props.stockLocations).toEqual([{ id: "bin-1", label: "Receiving bin" }]);
  });
  it.each(["RETRY", "AWAITING_APPROVAL"])("restores frozen input and progress after %s instead of creating another request", async status => {
    mocks.run.mockImplementation(async (input, _model, options) => {
      const progress = { ...options.progress, steps: { purchase: { path: "/api/service-close-parts", body: { idempotencyKey: "original-key" } } } };
      await options.onProgress(progress);
      return { status, progress, message: "Needs follow-up", nextAction: "Resume", purchaseOrderId: "po-1" };
    });
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    await (compact.props.onSave as (value: CompactPartsEntryInput) => Promise<unknown>)(entry);
    const restored = readUnfinishedPartsEntries(storage, "ro-1");
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ entry, purchaseOrderId: "po-1", progress: { submissionId: entry.requestId, input: { locationId: "store-1" }, steps: { purchase: { body: { idempotencyKey: "original-key" } } } } });
    expect(readUnfinishedPartsEntries(storage, "other-ro")).toEqual([]);
  });
  it("reports completed save truthfully when the following board refresh fails", async () => {
    mocks.run.mockImplementation(async (_input, _model, options) => { await options.onProgress(options.progress); return { status: "COMPLETE", progress: options.progress, message: "Part need recorded.", nextAction: "Review procurement" }; });
    vi.mocked(fetch).mockRejectedValue(new Error("Network offline"));
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    const result = await (compact.props.onSave as (value: CompactPartsEntryInput) => Promise<{ status: string; message: string }>)(entry);
    expect(result.status).toBe("saved");
    expect(result.message).toContain("Part need recorded.");
    expect(result.message).toContain("board could not refresh");
    expect(storage.getItem(compactEntryStorageKey(entry))).toBeNull();
  });
  it("prioritizes receiving discrepancies and opens installation locally after receipts are clear", () => {
    const receivedModel = { ...model, purchaseOrders: [], receipts: [{ ...model.receipts[0], purchaseOrder: { purchaseOrderNumber: "PO-1", requisition: { demand: { repairOrder: { repairOrderNumber: "RO-1" } } } } }] };
    const issue = { id: "short-1", status: "OPEN", receipt: { purchaseOrder: { requisition: { demand: { repairOrder: { id: "ro-1", repairOrderNumber: "RO-1" } } } } } };
    const blocked = ServiceClosePartsWorkspace({ initial: { ...receivedModel, discrepancies: [issue] } });
    const next = nodes(blocked).find(node => node.props["aria-label"] === "Next parts action")!;
    expect(nodes(next).some(node => node.type === "button" && node.props.children === "Review receiving issues")).toBe(true);
    expect(nodes(next).some(node => node.type === "button" && node.props.children === "Record installation")).toBe(false);
    mocks.stateIndex = 0;
    const clear = ServiceClosePartsWorkspace({ initial: receivedModel });
    const clearNext = nodes(clear).find(node => node.props["aria-label"] === "Next parts action")!;
    expect(nodes(clearNext).some(node => node.type === "button" && node.props.children === "Record installation")).toBe(true);
    expect(nodes(clearNext).some(node => node.props.href === "/vehicles/repair-workbench?repairOrderId=ro-1&step=repair")).toBe(false);
  });
  it("leads with reservation for an already received part and keeps assignment blocked until stock is reserved", async () => {
    const demand = { id: "demand-1", repairJobId: "job-1", partId: "part-1", quantityRequired: 1, quantityReserved: 0, status: "OPEN", requiredAt: "2026-11-14", part: model.parts[0], repairOrder: order };
    const job = { id: "job-1", jobNumber: "J001", status: "WAITING_PARTS", partsRequired: true, partDemands: [demand] };
    const purchase = { ...po, status: "RECEIVED", requisition: { demand: { id: demand.id, repairOrder: order } } };
    const initial = { ...model, repairOrders: [{ ...order, repairJobs: [job] }], demands: [demand], purchaseOrders: [purchase], receipts: [{ ...model.receipts[0], purchaseOrder: purchase, stockLocationId: "bin-1" }] };
    mocks.states.set(3, true);
    const props = { initial, compactStage: true, reviewOrderId: order.id };
    const tree = nodes(ServiceClosePartsWorkspace(props));
    const next = tree.find(node => node.props["aria-label"] === "Next parts action")!;
    const reserve = nodes(next).find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.join("") === "Reserve for J001")!;
    expect(reserve.props.disabled).toBe(false);
    expect(nodes(next).some(node => node.props.children === "Record installation")).toBe(false);
    expect(tree.some(node => node.props.children === "Continue to assignment")).toBe(false);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "Insufficient available stock for this reservation." }, { status: 400 })).mockResolvedValueOnce(Response.json(initial));
    await (reserve.props.onClick as () => Promise<void>)();
    expect([...mocks.states.values()]).toContain("Reservation failed. The receiving bin no longer has enough available stock. Review stock and existing reservations for this part.");
    mocks.stateIndex = 0;
    const blocked = nodes(ServiceClosePartsWorkspace(props));
    expect(blocked.some(node => node.props.children === "Continue to assignment")).toBe(false);
    const reserved = { ...demand, quantityReserved: 1, status: "RESERVED" };
    const refreshed = { ...initial, demands: [reserved], repairOrders: [{ ...order, repairJobs: [{ ...job, partDemands: [reserved] }] }] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 201 })).mockResolvedValueOnce(Response.json(refreshed));
    await (reserve.props.onClick as () => Promise<void>)();
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/repair-orders/ro-1/parts/reservations");
    expect(JSON.parse(String(request?.body))).toMatchObject({ demandId: demand.id, stockLocationId: "bin-1", quantity: 1 });
    mocks.stateIndex = 0;
    expect(nodes(ServiceClosePartsWorkspace(props)).some(node => node.props.children === "Continue to assignment")).toBe(true);
  });
  it("unlocks a validation block with no started requests and removes only that empty journal", async () => {
    mocks.run.mockImplementation(async (_input, _model, options) => ({ status: "BLOCKED", progress: options.progress, message: "Choose one matching catalog part.", nextAction: "Review the entry" }));
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    const result = await (compact.props.onSave as (value: CompactPartsEntryInput) => Promise<{ status: string; retryable: boolean }>)(entry);
    expect(result).toMatchObject({ status: "error", retryable: false });
    expect(storage.length).toBe(0);
  });
  it("refreshes approved PO state before resuming the frozen request after reload", async () => {
    const progress = { submissionId: entry.requestId, input: { mode: "NEEDED", repairOrderId: "ro-1", locationId: "store-1", description: entry.part, quantity: 1, note: "Original note" }, startedAt: "2026-11-14T00:00:00Z", steps: {} };
    const saved = { entry, progress, status: "AWAITING_APPROVAL", purchaseOrderId: po.id };
    storage.setItem(compactEntryStorageKey(entry), JSON.stringify(saved));
    mocks.states.set(2, [saved]);
    const fresh = { ...model, purchaseOrders: [{ ...po, status: "APPROVED" }] };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => fresh } as Response);
    mocks.run.mockImplementation(async (input, mapped, options) => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(mapped.purchaseOrders[0].status).toBe("APPROVED");
      expect(input).toEqual(progress.input);
      return { status: "COMPLETE", progress: options.progress, message: "Purchase recorded.", nextAction: "Review receipt" };
    });
    const tree = ServiceClosePartsWorkspace({ initial: model });
    const resume = nodes(tree).find(node => node.type === "button" && node.props.children === "Retry save")!;
    (resume.props.onClick as () => void)();
    for (let index = 0; index < 30; index++) await Promise.resolve();
    expect(mocks.run).toHaveBeenCalledOnce();
    expect(storage.length).toBe(0);
  });
  it("coalesces rapid saves and retains a blocked journal if a request already started", async () => {
    mocks.run.mockImplementation(async (_input, _model, options) => {
      const progress = { ...options.progress, steps: { demand: { path: "/parts", body: {}, result: { id: "demand-1" } } } };
      await options.onProgress(progress);
      return { status: "BLOCKED", progress, message: "Review existing purchase.", nextAction: "Review purchase" };
    });
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    const save = compact.props.onSave as (value: CompactPartsEntryInput) => Promise<unknown>;
    await Promise.all([save(entry), save(entry)]);
    expect(mocks.run).toHaveBeenCalledOnce();
    expect(readUnfinishedPartsEntries(storage, "ro-1")).toHaveLength(1);
  });
  it("does not invoke the mutation helper for an unknown RO or when durable checkpoint storage fails", async () => {
    const compact = nodes(ServiceClosePartsWorkspace({ initial: model })).find(node => node.type === CompactPartsEntry)!;
    const save = compact.props.onSave as (value: CompactPartsEntryInput) => Promise<unknown>;
    await save({ ...entry, repairOrderId: "other-ro" });
    expect(mocks.run).not.toHaveBeenCalled();
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    await save(entry);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
