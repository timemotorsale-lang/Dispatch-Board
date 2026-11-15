import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), stateIndex: 0, states: new Map<number, unknown>() }));
vi.mock("@/lib/compact-parts-entry", () => ({ runCompactPartsEntry: mocks.run }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (value: unknown) => { const index = mocks.stateIndex++; return [mocks.states.has(index) ? mocks.states.get(index) : typeof value === "function" ? value() : value, vi.fn()]; }, useRef: (value: unknown) => ({ current: value }), useEffect: vi.fn() };
});
import { CompactPartsEntry, type CompactPartsEntryInput } from "@/features/inventory/compact-parts-entry";
import { ServiceClosePartsWorkspace, compactPartsModel, compactPurchaseOptions, compactEntryStorageKey, readUnfinishedPartsEntries } from "@/features/inventory/service-close-parts-workspace";

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
beforeEach(() => { vi.resetAllMocks(); mocks.stateIndex = 0; mocks.states.clear(); storage = memoryStorage(); vi.stubGlobal("sessionStorage", storage); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => model })); });
afterEach(() => vi.unstubAllGlobals());

describe("compact parts parent integration", () => {
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
    expect(nodes(clearNext).some(node => node.props.href === "/prototype/repair-workbench?repairOrderId=ro-1&step=repair")).toBe(true);
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
    const resume = nodes(tree).find(node => node.type === "button" && node.props.children === "Resume unfinished entry")!;
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
