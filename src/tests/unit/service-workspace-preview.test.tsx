import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { decideServiceRevision, handoffApprovedWork, newServicePreview, presentServiceRevision, reviseServiceEstimate, REVIEW_CONTEXTS, revisionLines } from "@/features/prototype/repair-explorer/service-preview-domain";
import { ServiceWorkspacePreview } from "@/features/prototype/repair-explorer/service-workspace-preview";
import { normalizeEstimate, normalizeAuthorization } from "@/server/shop-planning/domain";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn().mockResolvedValue({ id: "reviewer" }) }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: vi.fn(), listRepairOrders: vi.fn() }));
vi.mock("@/server/shop-planning/service", () => ({ getShopPlanningDetail: vi.fn() }));
const now = Date.UTC(2026, 9, 16);
const context = REVIEW_CONTEXTS[0];

function presented() {
  return presentServiceRevision(newServicePreview(), context, "Review front axle friction replacement", now);
}

describe("Connected service preview contracts", () => {
  it("reuses the production line shape and validates with the existing estimate normalizer", () => {
    const state = presented();
    const revision = state.revisions[0];
    const normalized = normalizeEstimate({ ...revision, presentedAt: new Date(now).toISOString(), expiresAt: new Date(revision.expiresAt).toISOString(), idempotencyKey: "preview-contract", presentationChannel: "IN_PERSON", reason: revision.reason, taxBoundary: "Not finalized · preview subtotal" }, new Date(now));
    expect(normalized.totalCents).toBe(52000);
    expect(normalized.lineItems).toEqual(revision.lineItems);
    expect(revision.lineItems.map(item => item.key)).toEqual(["front-pads-rotors:labor", "front-pads-rotors:parts"]);
  });

  it("freezes scope and pricing, rejects empty/unpriced/invalid work and preserves zero pricing", () => {
    const draft = newServicePreview();
    const state = presentServiceRevision(draft, context, "Review scope", now);
    draft.lines[0].parts = 999;
    expect(state.revisions[0].lines[0].parts).toBe(220);
    expect(() => presentServiceRevision(state, context, "Change", now)).toThrow();
    for (const lines of [[], [{ ...draft.lines[0], parts: null }], [{ ...draft.lines[0], hours: -1 }], [draft.lines[0], draft.lines[0]]]) expect(() => revisionLines(lines, 150)).toThrow();
    expect(revisionLines([{ ...draft.lines[0], hours: 0, parts: 0 }], 0).every(line => line.unitPriceCents === 0)).toBe(true);
  });

  it("records approve/decline/defer per complete work package and hands off approved work only", () => {
    const draft = newServicePreview();
    draft.lines.push({ id: "diagnose", label: "Diagnosis", hours: 0.8, parts: 0 }, { id: "deferred", label: "Later work", hours: 1, parts: 10 });
    let state = presentServiceRevision(draft, context, "Review multiple jobs", now);
    state = decideServiceRevision(state, "preview-v1", { "front-pads-rotors": "APPROVED", diagnose: "DECLINED", deferred: "DEFERRED" }, "Customer role", "Staff role", now + 1000);
    const decision = state.decisions[0];
    expect(decision.authorizedAmountCents).toBe(52000);
    expect(decision.authorizedLineKeys).toHaveLength(2);
    const normalized = normalizeAuthorization({ ...decision, authorizedLineKeys: decision.authorizedLineKeys, disposition: "PARTIAL", channel: "IN_PERSON", decidedAt: new Date(decision.at).toISOString(), decisionActorName: decision.name, decisionActorType: "CUSTOMER", estimateVersionId: decision.revisionId, idempotencyKey: "preview-authorization-contract", reason: "Simulated review only" });
    expect(normalized.authorizedLineKeys).toEqual(decision.authorizedLineKeys);
    state = handoffApprovedWork(state, "Tech", now + 2000);
    expect(state.handoffs.map(item => item.workId)).toEqual(["front-pads-rotors"]);
    expect(handoffApprovedWork(state, "Tech", now + 3000).handoffs).toEqual(state.handoffs);
  });

  it("rejects missing, extra, stale, expired and duplicate decisions", () => {
    const state = presented();
    for (const choices of [{}, { "front-pads-rotors": "APPROVED", unknown: "APPROVED" }, { "front-pads-rotors": "PENDING" }]) expect(() => decideServiceRevision(state, "preview-v1", choices as never, "Customer", "Staff", now)).toThrow();
    expect(() => decideServiceRevision(state, "old-revision", { "front-pads-rotors": "APPROVED" }, "Customer", "Staff", now)).toThrow();
    expect(() => decideServiceRevision(state, "preview-v1", { "front-pads-rotors": "APPROVED" }, "Customer", "Staff", state.revisions[0].expiresAt)).toThrow();
    const decided = decideServiceRevision(state, "preview-v1", { "front-pads-rotors": "APPROVED" }, "Customer", "Staff", now);
    expect(() => decideServiceRevision(decided, "preview-v1", { "front-pads-rotors": "DECLINED" }, "Customer", "Staff", now)).toThrow();
    expect(() => handoffApprovedWork(state, "Tech", now)).toThrow();
  });

  it("requires new authorization after supplemental scope without altering historical snapshots", () => {
    let state = decideServiceRevision(presented(), "preview-v1", { "front-pads-rotors": "APPROVED" }, "Customer", "Staff", now + 1);
    state = handoffApprovedWork(state, "Tech", now + 2);
    const original = JSON.stringify(state.revisions[0]);
    state = reviseServiceEstimate(state);
    expect(() => handoffApprovedWork(state, "Tech", now + 3)).toThrow();
    state.lines[0].parts = 300;
    state = presentServiceRevision(state, context, "Supplemental parts scope", now + 4);
    expect(state.revisions[1].subtotalCents).toBe(60000);
    expect(JSON.stringify(state.revisions[0])).toBe(original);
    expect(() => handoffApprovedWork(state, "Tech", now + 5)).toThrow();
    state = decideServiceRevision(state, "preview-v2", { "front-pads-rotors": "DEFERRED" }, "Customer", "Staff", now + 5);
    expect(() => handoffApprovedWork(state, "Tech", now + 6)).toThrow();
  });

  it("keeps customer/vehicle identity and the loaded RO baseline on each snapshot", () => {
    const live = { ...context, live: true, id: "existing-ro", vehicleId: "existing-vehicle", roVersion: 8, latestEstimateVersion: 4 };
    const revision = presentServiceRevision(newServicePreview(), live, "Context review", now).revisions[0];
    expect(revision).toMatchObject({ version: 5, contextId: "existing-ro", roVersion: 8, vehicleId: "existing-vehicle" });
    expect(() => presentServiceRevision(newServicePreview(), context, "", now)).toThrow();
    expect(() => presentServiceRevision(newServicePreview(), context, "Scope", NaN)).toThrow();
    expect(() => presentServiceRevision(reviseServiceEstimate(presented()), REVIEW_CONTEXTS[1], "Different context", now + 1)).toThrow();
  });

  it("renders safe defaults, explicit preview limits and disabled live-context export", () => {
    const html = renderToStaticMarkup(<ServiceWorkspacePreview explorerStorageKey="review" />);
    expect(html).toContain("One connected service workspace.");
    expect(html).toContain("not verified customer signatures");
    expect(html).toContain("Session-only");
    const liveHtml = renderToStaticMarkup(<ServiceWorkspacePreview explorerStorageKey="review" initialContext={{ ...context, live: true }} />);
    expect(liveHtml).toContain('disabled=""');
    expect(liveHtml).toContain("no customer data is saved to browser storage");
  });
});

describe("Connected preview read-only route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authenticates without querying live data by default", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/service-workspace/page");
    const { listRepairOrders, getRepairOrderDetail } = await import("@/server/repair-order/service");
    const { requireCurrentUser } = await import("@/server/auth/current-user");
    const page = await Page({});
    expect(requireCurrentUser).toHaveBeenCalledWith("/prototype/service-workspace");
    expect(listRepairOrders).not.toHaveBeenCalled();
    expect(getRepairOrderDetail).not.toHaveBeenCalled();
    expect(page.props.explorerStorageKey).toBe("dispatch-board.repair-explorer-preview.v1.reviewer");
  });

  it("loads existing context through both existing authorized read services and sends minimal data", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/service-workspace/page");
    const { getRepairOrderDetail } = await import("@/server/repair-order/service");
    const { getShopPlanningDetail } = await import("@/server/shop-planning/service");
    vi.mocked(getRepairOrderDetail).mockResolvedValue({ id: "existing", repairOrderNumber: "RO-8", version: 8, customer: { displayName: "Customer", phoneNumber: "private" }, vehicle: { id: "vehicle", year: 2019, make: "Ford", model: "F-150" }, serviceVisit: { concernSummary: "Noise" } } as never);
    vi.mocked(getShopPlanningDetail).mockResolvedValue({ estimateVersions: [{ version: 4 }] } as never);
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "existing" }) });
    expect(getRepairOrderDetail).toHaveBeenCalledWith({ id: "reviewer" }, "existing");
    expect(getShopPlanningDetail).toHaveBeenCalledWith({ id: "reviewer" }, "existing");
    expect(page.props.initialContext).toMatchObject({ id: "existing", latestEstimateVersion: 4, live: true });
    expect(JSON.stringify(page.props)).not.toContain("private");
  });

  it("fails closed without exposing errors or bypassing authorization", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/service-workspace/page");
    const { getRepairOrderDetail } = await import("@/server/repair-order/service");
    const { getShopPlanningDetail } = await import("@/server/shop-planning/service");
    vi.mocked(getRepairOrderDetail).mockRejectedValue(new Error("Sensitive internal failure"));
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "restricted" }) });
    expect(page.props.initialContext).toBeUndefined();
    expect(page.props.notice).toContain("access is unavailable");
    expect(page.props.notice).not.toContain("Sensitive");
    expect(getShopPlanningDetail).not.toHaveBeenCalled();
  });

  it("lists live ROs only on explicit browse and projects only reference labels", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/service-workspace/page");
    const { listRepairOrders } = await import("@/server/repair-order/service");
    vi.mocked(listRepairOrders).mockResolvedValue({ items: [{ id: "existing", repairOrderNumber: "RO-8", vehicle: { year: 2019, make: "Ford", model: "F-150" }, customer: { email: "private@example.com" } }] } as never);
    const page = await Page({ searchParams: Promise.resolve({ browse: "1" }) });
    expect(listRepairOrders).toHaveBeenCalledWith({ id: "reviewer" }, { page: 1, pageSize: 20, state: "ACTIVE" });
    expect(page.props.records).toEqual([{ id: "existing", label: "RO-8 · 2019 Ford F-150" }]);
    expect(JSON.stringify(page.props)).not.toContain("private@example.com");
  });

  it("does not expose RO context when shop-planning access fails", async () => {
    const { default: Page } = await import("@/app/(repair-preview)/prototype/service-workspace/page");
    const { getRepairOrderDetail } = await import("@/server/repair-order/service");
    const { getShopPlanningDetail } = await import("@/server/shop-planning/service");
    vi.mocked(getRepairOrderDetail).mockResolvedValue({ id: "existing" } as never);
    vi.mocked(getShopPlanningDetail).mockRejectedValue(new Error("Permission denied"));
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "existing" }) });
    expect(page.props.initialContext).toBeUndefined();
    expect(page.props.notice).toContain("access is unavailable");
  });
});
