import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: () => {},
  useState: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = initial; return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }]; },
  useRef: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = { current: initial }; return hooks.values[index]; }
}));
import { ServiceDepositWorkspace, type RepairDeposits } from "@/features/inventory/service-deposit-workspace";
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Node[] { if (Array.isArray(value)) return value.flatMap(nodes); if (!value || typeof value !== "object" || !("props" in value)) return []; const node = value as Node; return [node, ...nodes(node.props.children)]; }
const deposits: RepairDeposits = { storageReady: true, version: 4, balance: { collectedCents: 5000, refundedCents: 0, appliedCents: 2000, availableCents: 3000 }, collectionAvailability: { allowed: true, reason: null, maxAmountCents: 10000 }, entries: [{ id: "collection-1", kind: "COLLECTION", relatedEntryId: null, invoiceId: null, method: "CHECK", amountCents: 5000, occurredAt: "2026-11-14T12:00:00Z", reference: "Check 123", documentId: "receipt-original" }, { id: "application-1", kind: "APPLY", relatedEntryId: "collection-1", invoiceId: "invoice-1", method: "CHECK", amountCents: 2000, occurredAt: "2026-11-14T12:30:00Z", reference: "Apply check", documentId: "application-doc" }] };
const props = { repairOrderId: "ro/1", deposits, invoices: [{ id: "invoice-1", invoiceNumber: "INV-1", status: "POSTED", version: 7, balance: { balanceCents: 8000 } }], canManage: true, disabled: false, preferredInvoiceId: "invoice-1", onRefresh: vi.fn(), onLockChange: vi.fn() };
function render(overrides: Partial<typeof props> = {}) { hooks.cursor = 0; return ServiceDepositWorkspace({ ...props, ...overrides }); }
function submit(tree = render()) { const form = nodes(tree).find(node => node.type === "form")!; (form.props.onSubmit as (event: { preventDefault(): void }) => void)({ preventDefault() {} }); }
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function setEntry(action = "DEPOSIT") { render(); hooks.values[0] = action; hooks.values[1] = "20.00"; hooks.values[3] = "Verified cashier record"; hooks.values[6] = action === "UNAPPLY_DEPOSIT" ? "application-1" : "collection-1"; hooks.values[8] = true; }
beforeEach(() => { hooks.values = []; hooks.cursor = 0; vi.clearAllMocks(); props.onRefresh.mockResolvedValue(undefined); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { entryId: "entry-2", documentId: "doc/exact" } }) })); });
afterEach(() => vi.unstubAllGlobals());
describe("repair deposit and printable receipt UI", () => {
  it("shows server balances, recording-only language and an unverified blank form", () => {
    const html = renderToStaticMarkup(render());
    for (const text of ["money already received", "does not process a card", "Unapplied deposit", "$30.00", "already include applied deposits", "Card — processed externally"]) expect(html).toContain(text);
    expect(nodes(render()).find(node => node.type === "input" && node.props.type === "checkbox")?.props.checked).toBe(false);
    expect(hooks.values[1]).toBe(""); expect(hooks.values[3]).toBe("");
  });
  it("records a deposit with exact version and evidence and immediately retains an exact receipt link", async () => {
    setEntry(); hooks.values[4] = "2026-11-14T12:34:56.789"; submit(); await settle();
    const [url, options] = vi.mocked(fetch).mock.calls[0]; const command = JSON.parse(String(options?.body));
    expect(url).toBe("/api/repair-orders/ro%2F1/billing"); expect(command).toMatchObject({ action: "DEPOSIT", expectedVersion: 4, amountCents: 2000, method: "CASH", reference: "Verified cashier record", evidence: ["Verified cashier record"] });
    expect(command.occurredAt).toBe(new Date("2026-11-14T12:34:56.789").toISOString());
    const html = renderToStaticMarkup(render()); expect(html).toContain("documentId=doc%2Fexact"); expect(html).toContain("Open / Print Repair Deposit Receipt");
    expect(hooks.values[8]).toBe(false); expect(hooks.values[1]).toBe(""); expect(hooks.values[3]).toBe("");
  });
  it.each(["APPLY_DEPOSIT", "UNAPPLY_DEPOSIT"])("sends %s as an internal allocation with both exact versions", async action => {
    setEntry(action); submit(); await settle(); const command = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(command).toMatchObject({ action, expectedVersion: 4, invoiceExpectedVersion: 7, invoiceId: "invoice-1", amountCents: 2000, relatedEntryId: action === "APPLY_DEPOSIT" ? "collection-1" : "application-1" }); expect(command).not.toHaveProperty("method");
  });
  it("refunds against the original collection method, not the current collection-form method", async () => {
    setEntry("REFUND_DEPOSIT"); submit(); await settle(); const command = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)); expect(command).toMatchObject({ relatedEntryId: "collection-1", method: "CHECK" });
  });
  it.each([503, 200])("keeps an uncertain or incomplete %i result retryable without changing its command", async status => {
    setEntry(); vi.mocked(fetch).mockResolvedValueOnce({ ok: status === 200, status, json: async () => ({ error: "Uncertain" }) } as Response); submit(); await settle();
    const original = vi.mocked(fetch).mock.calls[0][1]?.body; const retry = nodes(render()).find(node => node.type === "button" && node.props.children === "Retry unchanged deposit request")!;
    (retry.props.onClick as () => void)(); await settle(); expect(vi.mocked(fetch).mock.calls[1][1]?.body).toBe(original);
  });
  it("retains the exact receipt when refreshing balances fails and blocks another deposit", async () => {
    setEntry(); props.onRefresh.mockRejectedValue(new Error("offline")); submit(); await settle();
    const html = renderToStaticMarkup(render()); expect(html).toContain("documentId=doc%2Fexact"); expect(html).toContain("deposit action was saved");
    expect(nodes(render()).find(node => node.type === "fieldset")?.props.disabled).toBe(true);
    props.onRefresh.mockResolvedValue(undefined); const retry = nodes(render()).find(node => node.type === "button" && node.props.children === "Reload deposit balances")!;
    (retry.props.onClick as () => void)(); await settle(); expect(nodes(render()).find(node => node.type === "fieldset")?.props.disabled).toBe(false);
  });
  it("requires a visible balance reload after a 409 and preserves the staff-entered amount and reference", async () => {
    setEntry(); vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "Expected version changed" }) } as Response);
    submit(); await settle(); const oldCommand = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(hooks.values[1]).toBe("20.00"); expect(hooks.values[3]).toBe("Verified cashier record"); expect(hooks.values[8]).toBe(false);
    expect(nodes(render()).some(node => node.props.children === "Retry unchanged deposit request")).toBe(false);
    const reload = nodes(render()).find(node => node.type === "button" && node.props.children === "Reload deposit balances")!;
    expect(reload).toBeTruthy(); (reload.props.onClick as () => void)(); await settle();
    hooks.values[8] = true; submit(render({ deposits: { ...deposits, version: 5 } })); await settle();
    const newCommand = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(newCommand.expectedVersion).toBe(5); expect(newCommand.idempotencyKey).not.toBe(oldCommand.idempotencyKey); expect(newCommand.amountCents).toBe(oldCommand.amountCents); expect(newCommand.reference).toBe(oldCommand.reference);
  });
  it("prevents duplicate clicks, unverified writes and read-only writes", async () => {
    render(); submit(); expect(fetch).not.toHaveBeenCalled(); setEntry(); submit(render({ canManage: false })); expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); const tree = render(); submit(tree); submit(tree); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not offer new deposits when collection is blocked or storage is unavailable", () => {
    setEntry(); const blocked = { ...deposits, storageReady: false, collectionAvailability: { allowed: false, reason: "Deposit migration is not ready", maxAmountCents: 0 } }; const tree = render({ deposits: blocked });
    expect(renderToStaticMarkup(tree)).toContain("Deposit migration is not ready"); submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
});
