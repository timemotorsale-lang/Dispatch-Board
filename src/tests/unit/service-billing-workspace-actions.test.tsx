import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
// A minimal hook driver exposes event handlers without a browser or live billing endpoint.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async original => {
  const react = await original<typeof import("react")>();
  return { ...react, useEffect: (effect: () => unknown) => { hooks.effects.push(effect); }, useCallback: (fn: unknown) => fn,
    useState: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = initial; return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }]; },
    useRef: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = { current: initial }; return hooks.values[index]; }
  };
});
import { ServiceDepositWorkspace } from "@/features/inventory/service-deposit-workspace";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";
type Node = { type: unknown; props: Record<string, unknown>; key?: string };
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node; return [node, ...nodes(node.props.children)];
}
const billing = { canManage: true, mutationAvailability: { allowed: true, reason: null }, order: { id: "ro-1", repairOrderNumber: "RO-1" }, readiness: { mismatchCodes: [] }, packages: [], invoices: [] };
let inner: (props: React.ComponentProps<typeof ServiceBillingWorkspace>) => React.ReactNode;
function render(extra: Partial<React.ComponentProps<typeof ServiceBillingWorkspace>> = {}) { hooks.cursor = 0; return inner({ repairOrderId: "ro-1", ...extra }); }
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function submit(tree: unknown) { const forms = nodes(tree).filter(node => node.type === "form"); (forms[forms.length - 1].props.onSubmit as (event: { preventDefault(): void }) => void)({ preventDefault() {} }); }
beforeEach(() => {
  vi.clearAllMocks();
  hooks.values = []; hooks.cursor = 0; hooks.effects = [];
  const tree = ServiceBillingWorkspace({ repairOrderId: "ro-1" });
  inner = nodes(tree).find(node => typeof node.type === "function")!.type as typeof inner;
  hooks.values = []; render();
  // Populate the fetched model and idle state, retaining real refs and event handlers.
  hooks.values[4] = structuredClone(billing); hooks.values[7] = false;
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
describe("billing UI request boundaries", () => {
  const handoff = "/vehicles/repair-workbench?repairOrderId=ro-1&step=handoff";
  const estimateDocument = { documentId: "document-1", documentHash: "a".repeat(64) };
  const readyBilling = { ...billing, readiness: { mismatchCodes: [], estimateId: "estimate-1", estimateVersion: 1, estimateDocument },
    packages: [{ id: "package-1", billingMode: "NATIVE", mismatchCodes: [], preview: { lines: [{ key: "labor", description: "Authorized labor", quantity: 1, totalCents: 2500 }], subtotalCents: 2500, discountCents: 0, taxCents: 0, totalCents: 2500 } }] };

  it("issues the reviewed estimate and opens its exact frozen document before payment", async () => {
    hooks.values[4] = readyBilling;
    hooks.values[8] = "POST_INVOICE";
    hooks.values[9] = "package-1";
    const context = { invoiceOnly: true, estimateId: "estimate-1", estimateDocument, returnTo: handoff };
    const tree = render(context);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Authorized labor");
    expect(html).toContain("Issue invoice");
    expect(html).not.toContain("Receive payment");
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ result: { id: "invoice-1", documentId: "frozen-1" } }) } as Response);
    submit(tree);
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ action: "POST_INVOICE", expectedEstimateId: "estimate-1", expectedEstimateDocument: estimateDocument, packageId: "package-1" });
    expect(navigation.push).toHaveBeenCalledOnce();
    const destination = new URL(navigation.push.mock.calls[0][0], "https://workspace.invalid");
    expect(destination.pathname).toBe("/service-documents");
    expect(Object.fromEntries(destination.searchParams)).toMatchObject({ documentId: "frozen-1", repairOrderId: "ro-1", returnTo: handoff });
    expect(renderToStaticMarkup(render(context))).not.toContain(">Issue invoice</button>");
  });

  it("retains the Workbench document snapshot on refresh and requires a fresh review after correction", async () => {
    const revised = { documentId: "document-2", documentHash: "b".repeat(64) };
    const context = { invoiceOnly: true, estimateId: "estimate-1", returnTo: handoff };
    hooks.values = [];
    hooks.effects = [];
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...readyBilling, packages: [] }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "The saved estimate document changed." }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...readyBilling, readiness: { ...readyBilling.readiness, estimateDocument: revised } }) } as Response);
    render(context);
    for (const effect of hooks.effects.splice(0)) effect();
    await settle();
    submit(render(context));
    await settle();
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toMatchObject({ action: "PREPARE_INVOICE", expectedEstimateId: "estimate-1", expectedEstimateDocument: estimateDocument });
    const html = renderToStaticMarkup(render(context));
    expect(html).toContain("Review latest estimate document");
    expect(html).toContain("documentId=document-2");
    expect(html).not.toContain("Issue invoice");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("reopens an issued invoice with a matching estimate document and view access", () => {
    hooks.values[4] = { ...readyBilling, canManage: false, mutationAvailability: { allowed: false }, invoices: [{ id: "invoice-1", status: "POSTED", invoiceNumber: "INV-1", ledger: { estimateId: "estimate-1", estimateDocument } }] };
    hooks.values[8] = "PAYMENT";
    const tree = render({ invoiceOnly: true, estimateId: "estimate-1", estimateDocument, returnTo: handoff });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Open / Print Final Invoice");
    expect(html).not.toContain("Receive payment");
    expect(nodes(tree).filter(node => node.type === "form")).toHaveLength(0);
    hooks.effects.at(-1)?.();
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("sourceKind=INVOICE"));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("sourceId=invoice-1"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { ...estimateDocument, documentId: "document-2" },
    { ...estimateDocument, documentHash: "b".repeat(64) },
    undefined,
  ])("leaves an explicit print link when the issued invoice cannot match the requested document (%j)", issuedEstimateDocument => {
    hooks.values[4] = { ...readyBilling, invoices: [{ id: "invoice-1", status: "POSTED", invoiceNumber: "INV-1", ledger: { estimateId: "estimate-1", estimateDocument: issuedEstimateDocument } }] };
    hooks.values[8] = "PAYMENT";
    const html = renderToStaticMarkup(render({ invoiceOnly: true, estimateId: "estimate-1", estimateDocument }));
    hooks.effects.at(-1)?.();
    expect(html).toContain("Review saved estimate for invoicing");
    expect(html).toContain("Open / Print Final Invoice");
    expect(html).toContain("sourceId=invoice-1");
    expect(html).not.toContain("Receive payment");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a readiness hold visible with the deposit option and no issuance form", () => {
    hooks.values[4] = { ...readyBilling, readiness: { ...readyBilling.readiness, mismatchCodes: ["INVOICE_JOB_QC_INCOMPLETE"] },
      deposits: { version: 0, balance: { collectedCents: 0, refundedCents: 0, appliedCents: 0, availableCents: 0 }, entries: [],
        collectionAvailability: { allowed: true, maxAmountCents: 2500 } } };
    const tree = render({ invoiceOnly: true, estimateId: "estimate-1" });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Refresh after completing requirements");
    expect(html).toContain("Receive money before invoicing (deposit)");
    expect(html).not.toContain("Issue invoice");
    expect(html).not.toContain("Review approved invoice lines");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("blocks conversion from an older saved estimate and links to the current estimate", () => {
    hooks.values[4] = { ...billing, readiness: { ...billing.readiness, estimateId: "estimate-2", estimateVersion: 2 } };
    const html = renderToStaticMarkup(render({ estimateId: "estimate-1", onDocumentReady: vi.fn() }));
    expect(html).toContain("This document is not the current approved estimate.");
    expect(html).toContain("Review current estimate");
    expect(html).not.toContain("Check invoice readiness");
  });
  it("reloads billing after a rejected invoice so the operator can prepare again", async () => {
    hooks.values[8] = "POST_INVOICE";
    hooks.values[9] = "old-package";
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "Invoice source changed." }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => billing } as Response);
    submit(render());
    await settle();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(hooks.values[8]).toBe("PREPARE_INVOICE");
    expect(hooks.values[5]).toBe("Invoice source changed.");
  });
  it("routes internal recon to cost closeout without offering a customer invoice", () => {
    hooks.values[4] = { ...billing, invoiceEligibility: "INTERNAL_COST" };
    const html = renderToStaticMarkup(render());
    expect(html).toContain("Internal recon order");
    expect(html).toContain("Open internal cost closeout");
    expect(html).toContain("step=handoff");
    expect(html).not.toContain("Check invoice readiness");
    expect(html).not.toContain("Create Final Invoice");
  });
  it.each([undefined, false, true])("explains rollout blocks and offers settings only with explicit authorization (%s)", canManageRollout => {
    hooks.values[4] = { ...billing, mutationAvailability: { allowed: false, reason: "This workflow is paused in Settings > Vehicle Operations.", canManageRollout } };
    const tree = render();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Billing changes unavailable.");
    expect(html).toContain("This workflow is paused");
    expect(html).toContain("Saved documents remain available to view and print.");
    expect(html.includes('href="/settings/vehicle-operations"')).toBe(canManageRollout === true);
    const fields = nodes(tree).filter(node => node.type === "fieldset");
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field.props.disabled).toBe(true);
      expect(field.props["aria-describedby"]).toBe("billing-blocked-ro-1");
    }
    submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
  it("rechecks blocked billing through a read without submitting a payment", async () => {
    hooks.values[4] = { ...billing, mutationAvailability: { allowed: false, reason: "Paused" } };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => billing } as Response);
    const button = nodes(render()).find(node => node.type === "button" && node.props.children === "Recheck billing access")!;
    (button.props.onClick as () => void)(); await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBeUndefined();
    expect(renderToStaticMarkup(render())).not.toContain("Billing changes unavailable.");
  });

  it("keeps embedded billing bound to its document repair order while standalone billing can choose an order", () => {
    const embedded = renderToStaticMarkup(render({ onDocumentReady: vi.fn() }));
    expect(embedded).not.toContain("Choose / change repair order"); expect(embedded).not.toContain("Load repair order");
    const standalone = renderToStaticMarkup(render()); expect(standalone).toContain("Choose / change repair order");
  });
  it("uses the server balance after applying deposits and maps internal payment entries to their exact deposit document", async () => {
    const transfer = { id: "transfer-payment", kind: "PAYMENT", amountCents: 2000, reference: "Deposit allocation", method: "CHECK", occurredAt: "2026-11-14", evidence: { depositTransfer: true } };
    const model = { ...billing, deposits: { version: 2, balance: { collectedCents: 5000, refundedCents: 0, appliedCents: 2000, availableCents: 3000 }, collectionAvailability: { allowed: false, reason: "Use invoice payment", maxAmountCents: 0 }, entries: [{ id: "application-1", kind: "APPLY", invoiceEntryId: transfer.id, invoiceId: "invoice-1", documentId: "deposit-exact", reference: "Deposit allocation", amountCents: 2000, occurredAt: "2026-11-14" }] }, invoices: [{ id: "invoice-1", invoiceNumber: "INV-1", version: 7, status: "POSTED", totalCents: 10000, appliedDepositCents: 2000, balance: { balanceCents: 8000 }, ledger: { lines: [] }, entries: [transfer, { ...transfer, id: "cash-payment", reference: "Cashier log", evidence: {} }] }] };
    hooks.values[4] = model; vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => model } as Response);
    const panel = nodes(render()).find(node => node.type === ServiceDepositWorkspace)!;
    await (panel.props.onRefresh as () => Promise<unknown>)();
    expect(hooks.values[10]).toBe("80.00"); expect(hooks.values[0]).toBe(false);
    const html = renderToStaticMarkup(render()); expect(html).toContain("documentId=deposit-exact"); expect(html).toContain("already included in the remaining balance");
    hooks.values[8] = "REFUND"; hooks.values[9] = "invoice-1";
    const options = nodes(render()).filter(node => node.type === "option");
    expect(options.some(node => node.props.value === "transfer-payment")).toBe(false); expect(options.some(node => node.props.value === "cash-payment")).toBe(true);
  });
  it("locks invoice activity while a deposit request is unresolved", () => {
    hooks.values[19] = true; const tree = render();
    expect(nodes(tree).filter(node => node.type === "fieldset").every(node => node.props.disabled)).toBe(true);
    submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
  it("pins the payment task to the invoice being viewed, not another posted invoice", async () => {
    hooks.values = []; hooks.effects = [];
    const model = { ...billing, invoices: [{ id: "newer", status: "POSTED", balance: { balanceCents: 700 } }, { id: "selected", status: "POSTED", balance: { balanceCents: 500 } }] };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => model } as Response);
    render({ invoiceId: "selected", onDocumentReady: vi.fn() });
    for (const effect of hooks.effects.splice(0)) effect(); await settle();
    expect(hooks.values[9]).toBe("selected"); expect(hooks.values[10]).toBe("5.00");
  });
  it("blocks a missing or void selected invoice rather than posting to another invoice", () => {
    hooks.values[4] = { ...billing, invoices: [{ id: "other", status: "POSTED", invoiceNumber: "INV-2", totalCents: 100, balance: { balanceCents: 100 }, entries: [] }] };
    const tree = render({ invoiceId: "missing" });
    expect(renderToStaticMarkup(tree)).toContain("saved invoice is not available"); submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
  it("shows a direct load retry and reloads the same repair order", async () => {
    hooks.values[4] = null; hooks.values[5] = "Offline";
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => billing } as Response);
    const retry = nodes(render()).find(node => node.type === "button" && node.props.children === "Retry loading billing")!;
    (retry.props.onClick as () => void)(); await settle();
    expect(fetch).toHaveBeenCalledWith("/api/repair-orders/ro-1/billing", expect.objectContaining({ cache: "no-store" }));
    expect(hooks.values[4]).toEqual(billing);
  });
  it("clears prior payment evidence and confirmation only after a confirmed save", async () => {
    hooks.values[0] = true; hooks.values[8] = "PAYMENT"; hooks.values[9] = "invoice-1"; hooks.values[10] = "1.00"; hooks.values[11] = "Old receipt"; hooks.values[13] = "Old evidence";
    hooks.values[4] = { ...billing, invoices: [{ id: "invoice-1", status: "POSTED", invoiceNumber: "INV-1", totalCents: 200, balance: { balanceCents: 200 }, entries: [] }] };
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ result: { entryId: "entry-1" } }) } as Response).mockResolvedValueOnce({ ok: true, json: async () => billing } as Response);
    submit(render()); await settle();
    expect(hooks.values[0]).toBe(false); for (const index of [10, 11, 13]) expect(hooks.values[index]).toBe("");
  });
  it("does not offer another payment on a settled invoice but retains adjustment access", () => {
    hooks.values[8] = "PAYMENT"; hooks.values[9] = "invoice-1";
    hooks.values[4] = { ...billing, invoices: [{ id: "invoice-1", status: "POSTED", invoiceNumber: "INV-1", totalCents: 100, balance: { balanceCents: 0 }, entries: [] }] };
    const tree = render(); expect(renderToStaticMarkup(tree)).toContain("no outstanding balance");
    const adjustment = nodes(tree).find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children[0] === "Credit / refund / void ")!;
    expect(adjustment.props.disabled).toBe(false); submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([false, true])("disables mutations when availability is blocked (canManage=%s), retaining print links", canManage => {
    hooks.values[4] = { ...billing, canManage, mutationAvailability: { allowed: false, reason: "View and print only; ask for billing manage access." }, invoices: [{ id: "invoice-1", invoiceNumber: "INV-1", status: "POSTED", version: 1, totalCents: 100, balance: { balanceCents: 100, settlement: "OPEN" }, entries: [], ledger: { lines: [] } }] };
    const tree = render();
    expect(nodes(tree).filter(node => node.type === "fieldset").every(node => node.props.disabled)).toBe(true);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("View and print only"); expect(html).toContain("Open / Print Final Invoice"); expect(html).not.toContain('aria-disabled="true"');
    submit(tree); expect(fetch).not.toHaveBeenCalled();
  });
  it("coalesces same-turn repeated submits into one request", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const tree = render(); submit(tree); submit(tree);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves the exact command on an uncertain response and retries it unchanged", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "Uncertain outcome" }) } as Response);
    submit(render()); await settle();
    const first = vi.mocked(fetch).mock.calls[0][1]?.body;
    const tree = render();
    const retry = nodes(tree).find(node => node.type === "button" && node.props.children === "Retry unchanged request")!;
    expect(retry).toBeTruthy(); (retry.props.onClick as () => void)(); await settle();
    expect(vi.mocked(fetch).mock.calls[1][1]?.body).toBe(first);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("ro-1/billing");
  });
  it("treats an incomplete success response as uncertain rather than clearing the command", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    submit(render()); await settle();
    const html = renderToStaticMarkup(render()); expect(html).toContain("response was incomplete"); expect(html).toContain("Retry unchanged request");
  });
  it("does not imply a confirmed save failed when the subsequent refresh fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ result: { id: "package-1" } }) } as Response).mockRejectedValueOnce(new Error("offline"));
    submit(render()); await settle();
    const html = renderToStaticMarkup(render()); expect(html).toContain("request was saved"); expect(html).not.toContain("Retry unchanged request");
  });
  it("changes the keyed repair-order context only after a pending request is unlocked", () => {
    hooks.values = []; hooks.cursor = 0;
    let tree = ServiceBillingWorkspace({ repairOrderId: "ro-1" });
    let child = nodes(tree).find(node => typeof node.type === "function")!;
    (child.props.onLockChange as (value: boolean) => void)(true);
    hooks.cursor = 0; tree = ServiceBillingWorkspace({ repairOrderId: "ro-2" });
    child = nodes(tree).find(node => typeof node.type === "function")!;
    expect(child.props.repairOrderId).toBe("ro-1");
    (child.props.onLockChange as (value: boolean) => void)(false);
    hooks.cursor = 0; ServiceBillingWorkspace({ repairOrderId: "ro-2" });
    hooks.cursor = 0; tree = ServiceBillingWorkspace({ repairOrderId: "ro-2" });
    child = nodes(tree).find(node => typeof node.type === "function")!;
    expect(child.props.repairOrderId).toBe("ro-2"); expect(child.key).toBe("ro-2");
  });
});
