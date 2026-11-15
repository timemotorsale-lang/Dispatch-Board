import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effects: [] as (() => unknown)[] }));
vi.mock("react", async original => {
  const react = await original<typeof import("react")>();
  return { ...react,
    useState: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = initial; return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }]; },
    useRef: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.values)) hooks.values[index] = { current: initial }; return hooks.values[index]; },
    useEffect: (effect: () => unknown) => { hooks.effects.push(effect); }
  };
});
import { DocumentApproval } from "@/features/inventory/document-approval";
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node; return [node, ...nodes(node.props.children)];
}
const estimate = { id: "estimate-1", version: 1, expiresAt: "2026-11-20T12:00:00Z", lineItems: [{ key: "labor-1", description: "Repair" }], authorizations: [] };
beforeEach(() => {
  hooks.values = []; hooks.cursor = 0; hooks.effects = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ estimateVersions: [estimate] }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("default customer approval timestamp", () => {
  it.each(["2026-11-14T20:40:00.001Z", "2026-11-14T20:40:25.789Z", "2026-11-14T20:40:59.999Z"])("preserves the exact instant %s through the local input and submitted command", async instant => {
    vi.setSystemTime(new Date(instant));
    const element = DocumentApproval({ repairOrderId: "ro-1", estimateId: "estimate-1", customerName: "Customer", onApproved: vi.fn() });
    const render = () => { hooks.cursor = 0; return (element.type as (props: typeof element.props) => ReactNode)(element.props); };
    render();
    for (const effect of hooks.effects.splice(0)) effect();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    let tree = render();
    const input = nodes(tree).find(node => node.type === "input" && node.props.type === "datetime-local")!;
    expect(input.props.step).toBe("0.001");
    expect(input.props.value).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(new Date(String(input.props.value)).toISOString()).toBe(instant);
    const confirmation = nodes(tree).find(node => node.type === "input" && node.props.type === "checkbox")!;
    (confirmation.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: true } });
    const evidence = nodes(tree).find(node => node.type === "input" && node.props.minLength === 3)!;
    (evidence.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "Signed estimate" } });
    tree = render();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ result: { id: "approval-1" } }) } as Response);
    const form = nodes(tree).find(node => node.type === "form")!;
    (form.props.onSubmit as (event: { preventDefault(): void }) => void)({ preventDefault() {} });
    const [, request] = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST")!;
    const command = JSON.parse(String(request?.body));
    expect(command.decidedAt).toBe(instant);
    // A freshly presented estimate one millisecond earlier must not be made newer by truncation.
    const presentedAt = new Date(new Date(instant).getTime() - 1);
    expect(new Date(command.decidedAt).getTime()).toBeGreaterThan(presentedAt.getTime());
    expect(command.estimateVersionId).toBe("estimate-1");
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
});

async function readyApproval() {
  const onApproved = vi.fn();
  const element = DocumentApproval({ repairOrderId: "ro-1", estimateId: "estimate-1", customerName: "Customer", onApproved });
  const render = () => { hooks.cursor = 0; hooks.effects = []; return (element.type as (props: typeof element.props) => ReactNode)(element.props); };
  render(); for (const effect of hooks.effects.splice(0)) effect();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const tree = render();
  const checkbox = nodes(tree).find(node => node.type === "input" && node.props.type === "checkbox")!;
  (checkbox.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: true } });
  const submit = () => { const form = nodes(render()).find(node => node.type === "form")!; (form.props.onSubmit as (event: { preventDefault(): void }) => void)({ preventDefault() {} }); };
  return { render, submit, onApproved };
}
async function flushApproval() { for (let i = 0; i < 15; i++) await Promise.resolve(); }
describe("approval response and retry behavior", () => {
  it.each([503, 200])("retains the same command after an uncertain or incomplete %i response", async status => {
    const ui = await readyApproval();
    vi.mocked(fetch).mockResolvedValue({ ok: status === 200, status, json: async () => status === 200 ? {} : { error: "Uncertain outcome" } } as Response);
    ui.submit(); await flushApproval();
    expect(ui.onApproved).not.toHaveBeenCalled();
    const first = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST")![1]?.body;
    const retry = nodes(ui.render()).find(node => node.type === "button" && node.props.children === "Retry unchanged approval")!;
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ result: { id: "approval-1" } }) } as Response);
    (retry.props.onClick as () => void)(); await flushApproval();
    expect(vi.mocked(fetch).mock.calls.at(-1)![1]?.body).toBe(first); expect(ui.onApproved).toHaveBeenCalledOnce();
    expect(nodes(ui.render()).some(node => node.type === "form")).toBe(false);
  });
  it("coalesces rapid approval submissions and keeps the form locked until the outcome is known", async () => {
    const ui = await readyApproval(); vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    ui.submit(); ui.submit();
    expect(vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    expect(nodes(ui.render()).find(node => node.type === "fieldset")?.props.disabled).toBe(true);
  });
  it("clears a known rejection so staff can correct the decision", async () => {
    const ui = await readyApproval(); vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Decision precedes estimate" }) } as Response);
    ui.submit(); await flushApproval();
    const tree = ui.render(); expect(nodes(tree).find(node => node.type === "fieldset")?.props.disabled).toBe(false);
    expect(nodes(tree).some(node => node.type === "button" && node.props.children === "Retry unchanged approval")).toBe(false); expect(ui.onApproved).not.toHaveBeenCalled();
  });
});
