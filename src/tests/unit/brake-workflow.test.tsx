import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { applyWorkflowAction, newBrakeWorkflow, parseBrakeWorkflow, workflowTotal, type BrakeWorkflow, type WorkflowAction } from "@/features/prototype/repair-explorer/brake-workflow";
import { BrakeWorkflowPreview } from "@/features/prototype/repair-explorer/brake-workflow-preview";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn().mockResolvedValue({ id: "reviewer" }) }));

function advance(state: BrakeWorkflow, type: WorkflowAction["type"], fields: Partial<WorkflowAction> = {}) {
  return applyWorkflowAction(state, { actor: "Reviewer", at: (state.events.at(-1)?.at ?? 0) + 1000, type, ...fields });
}

function approved() {
  let state = advance(newBrakeWorkflow(), "inspect", { vehicle: "Review truck, front disc brakes", notes: "Front brake wear", measurement: "Both sides measured; reference recorded" });
  state = advance(state, "quote", { hours: 2, rate: 150, parts: 220, technician: "Review technician" });
  return advance(state, "approve", { notes: "Customer role reviewer" });
}

describe("Isolated brakes workflow", () => {
  it("authenticates the route and scopes its storage to the user", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/brake-workflow/page");
    const { requireCurrentUser } = await import("@/server/auth/current-user");
    const page = await Page();
    expect(requireCurrentUser).toHaveBeenCalledWith("/prototype/brake-workflow");
    expect(page.props.storageKey).toBe("dispatch-board.brake-workflow.v1.reviewer");
  });

  it("renders the isolated workflow with no claim of real customer approval", () => {
    const html = renderToStaticMarkup(<BrakeWorkflowPreview storageKey="review" />);
    expect(html).toContain("From finding to finished.");
    expect(html).toContain("not authenticated customers");
    expect(html).toContain("No live repair orders");
    expect(html).toContain("Vehicle configuration / reference");
  });

  it("requires inspection evidence, complete pricing and an assignment", () => {
    expect(() => advance(newBrakeWorkflow(), "inspect")).toThrow();
    const inspected = advance(newBrakeWorkflow(), "inspect", { vehicle: "Truck", notes: "Wear", measurement: "Measured" });
    for (const hours of [-1, NaN, Infinity, 101]) expect(() => advance(inspected, "quote", { hours, rate: 150, parts: 220, technician: "Tech" })).toThrow();
    expect(() => advance(inspected, "quote", { hours: 2, rate: 150, parts: 220 })).toThrow();
  });

  it("snapshots the exact estimate and preserves declined revisions in history", () => {
    const state = approved();
    expect(workflowTotal(state)).toBe(520);
    expect(state.approval).toMatchObject({ revision: 1, total: 520, actor: "Customer role reviewer" });
    const pending = { ...state, stage: 2 as const, approval: null };
    const declined = advance(pending, "decline", { notes: "Adjust price" });
    const revised = advance(declined, "quote", { hours: 2, rate: 175, parts: 220, technician: "Tech" });
    expect(revised.revision).toBe(2);
    expect(revised.approval).toBeNull();
    expect(revised.events.at(-2)?.notes).toBe("Adjust price");
    expect(() => advance(state, "quote")).toThrow();
  });

  it("does not skip approval, readiness, start or release gates", () => {
    expect(() => advance(newBrakeWorkflow(), "start", { partsReady: true })).toThrow();
    expect(() => advance(approved(), "start")).toThrow();
    expect(() => advance(approved(), "finish", { notes: "Done" })).toThrow();
    let state = advance(approved(), "start", { partsReady: true });
    expect(() => advance(state, "start", { partsReady: true })).toThrow();
    state = advance(state, "finish", { notes: "Completed within approved scope" });
    expect(() => advance(state, "verify", { checks: [true, false, true, true], notes: "Incomplete" })).toThrow();
    state = advance(state, "verify", { checks: [true, true, true, true], notes: "Results recorded" });
    expect(state.stage).toBe(5);
    expect(() => advance(state, "start", { partsReady: true })).toThrow();
  });

  it("excludes paused and blocked time and stops the timer on completion", () => {
    let state = advance(approved(), "start", { partsReady: true, at: 10000 });
    state = advance(state, "pause", { at: 20000 });
    state = advance(state, "resume", { partsReady: true, at: 40000 });
    state = advance(state, "block", { notes: "Awaiting correct parts", at: 50000 });
    expect(state.elapsedMs).toBe(20000);
    expect(() => advance(state, "finish", { notes: "Not resolved" })).toThrow();
    state = advance(state, "resume", { partsReady: true, at: 90000 });
    state = advance(state, "finish", { notes: "Completed", at: 100000 });
    expect(state.elapsedMs).toBe(30000);
    expect(state.runningSince).toBeNull();
  });

  it("replays drafts through transition validation rather than trusting saved totals", () => {
    const state = approved();
    expect(parseBrakeWorkflow(JSON.stringify({ version: 1, events: state.events, stage: 5, total: 0 }))).toEqual(state);
    for (const raw of ["invalid", "null", '{"version":2,"events":[]}', '{"version":1,"events":[null]}']) expect(parseBrakeWorkflow(raw)).toBeNull();
    expect(parseBrakeWorkflow(JSON.stringify({ version: 1, events: [{ type: "verify", actor: "X", at: 1 }] }))).toBeNull();
    expect(() => advance(state, "start", { partsReady: true, at: 1 })).toThrow();
  });
});
