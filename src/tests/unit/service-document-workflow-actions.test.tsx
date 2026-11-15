import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, push: vi.fn(), refresh: vi.fn(), print: vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: () => {},
  useState: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = initial; return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }]; },
  useRef: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = { current: initial }; return hooks.values[index]; }
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: hooks.push, refresh: hooks.refresh }) }));
vi.mock("@/lib/service-document-print", () => ({ openServiceDocumentPrint: hooks.print, serviceDocumentPdfHref: (ro: string, doc: string) => `/pdf/${ro}/${doc}` }));
import { ServiceDocumentWorkflow, type WorkflowDocument } from "@/features/inventory/service-document-workflow";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";
import { DocumentApproval } from "@/features/inventory/document-approval";
import { ServiceDocumentReview } from "@/features/inventory/service-document-review";
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Node[] { if (Array.isArray(value)) return value.flatMap(nodes); if (!value || typeof value !== "object" || !("props" in value)) return []; const node = value as Node; return [node, ...nodes(node.props.children)]; }
const doc: WorkflowDocument = { id: "doc-1", sourceId: "invoice-1", kind: "INVOICE", sha256: "hash", templateVersion: "v1", content: { title: "Invoice", number: "INV-1", issuedAt: "2026-11-14T00:00:00Z", identity: { customer: "Customer", store: "Store", address: "Address", timezone: "UTC", vehicle: "Car", vin: "VIN", vehicleNumber: "V1", concern: "Repair", repairOrderNumber: "RO-1" }, lines: [], notes: [] } };
function render(document = doc) { hooks.cursor = 0; return ServiceDocumentWorkflow({ repairOrderId: "ro-1", documents: [document], selectedId: document.id }); }
function click(tree: unknown, label: string) { const button = nodes(tree).find(node => node.type === "button" && node.props.children === label)!; expect(button).toBeTruthy(); (button.props.onClick as () => void)(); }
beforeEach(() => { hooks.values = []; hooks.cursor = 0; vi.clearAllMocks(); hooks.print.mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllGlobals());
describe("document workspace actions", () => {
  it("cannot print an unsaved preview even before the review panel reports its lock", async () => {
    click(render(), "Customer details & charges"); const review = nodes(render()).find(node => node.type === ServiceDocumentReview)!;
    (review.props.onPreview as (value: unknown) => void)({ ...doc.content, identity: { ...doc.content.identity, customer: "Unsaved customer" } });
    const tree = render(); const print = nodes(tree).find(node => node.type === "button" && node.props.children === "Print")!;
    expect(print.props.disabled).toBe(true); (print.props.onClick as () => void)();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(hooks.print).not.toHaveBeenCalled(); expect(nodes(tree).find(node => node.type === "a" && node.props.children === "Save PDF")?.props.href).toBeUndefined();
    (review.props.onPreview as (value: unknown) => void)(null); const restored = render();
    expect(nodes(restored).find(node => node.type === "button" && node.props.children === "Print")?.props.disabled).toBe(false);
    click(restored, "Print"); for (let i = 0; i < 10; i++) await Promise.resolve(); expect(hooks.print).toHaveBeenCalledOnce();
  });
  it("opens payment for the exact invoice displayed", () => {
    click(render(), "Record payment"); const billing = nodes(render()).find(node => node.type === ServiceBillingWorkspace)!;
    expect(billing.props.invoiceId).toBe("invoice-1"); expect(billing.props.repairOrderId).toBe("ro-1");
  });
  it("opens and closes the customer review panel", () => {
    click(render(), "Customer details & charges"); expect(nodes(render()).some(node => node.type === ServiceDocumentReview)).toBe(true);
    click(render(), "Close actions · view document"); expect(nodes(render()).some(node => node.type === ServiceDocumentReview)).toBe(false);
  });
  it("records approval then advances to invoice requirements without issuing an invoice", () => {
    const estimate = { ...doc, kind: "ESTIMATE", sourceId: "estimate-1" };
    click(render(estimate), "Record customer approval"); const approval = nodes(render(estimate)).find(node => node.type === DocumentApproval)!;
    expect(approval.props.estimateId).toBe("estimate-1"); (approval.props.onApproved as () => void)();
    expect(hooks.refresh).toHaveBeenCalledOnce(); expect(nodes(render(estimate)).some(node => node.props.children === "Review invoice requirements")).toBe(true);
  });
  it("keeps navigation and print disabled during a pending financial action", () => {
    click(render(), "Record payment"); const billing = nodes(render()).find(node => node.type === ServiceBillingWorkspace)!;
    (billing.props.onLockChange as (value: boolean) => void)(true);
    const tree = render(); expect(nodes(tree).find(node => node.type === "button" && node.props.children === "Print")?.props.disabled).toBe(true);
    const pdf = nodes(tree).find(node => node.type === "a" && node.props.children === "Save PDF")!; expect(pdf.props.href).toBeUndefined();
  });
  it("shows a print failure and allows a subsequent attempt", async () => {
    hooks.print.mockRejectedValueOnce(new Error("Printer unavailable")); click(render(), "Print");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(nodes(render()).some(node => node.props.role === "alert" && node.props.children === "Printer unavailable")).toBe(true);
    click(render(), "Print"); for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(hooks.print).toHaveBeenCalledTimes(2); expect(nodes(render()).some(node => node.props.role === "alert")).toBe(false);
  });
});
