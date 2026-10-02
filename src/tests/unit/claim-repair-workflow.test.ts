import { describe, expect, it } from "vitest";
import { applyClaimWorkflowAction, claimWorkflowAlerts, claimWorkflowNextAction, currentCheckpoint, emptyClaimWorkflow, supplementChanges, workflowReleaseBlockers, CLAIM_CHECKPOINTS, type ClaimWorkflowSource, type ClaimWorkflowState } from "@/lib/claim-repair-workflow";

export function workflowSource(): ClaimWorkflowSource {
  return {
    claimId: "claim-review", customer: "Review Customer", vin: "1HGCM82633A004352", claimNumber: "REVIEW-1", claimClosed: false, customerAuthorization: true,
    repairOrder: { id: "ro-1", number: "RO-REVIEW", stage: "REPAIR", owner: "Review Advisor", targetAt: "2026-10-10T16:00:00Z", closed: false, version: 2 },
    estimates: [{ id: "estimate-1", version: 1, totalCents: 10000, lines: [{ key: "base", description: "Initial repair", amountCents: 10000 }], authorizations: [{ id: "authorization-1", disposition: "ACCEPTED", keys: ["base"], actor: "Customer", amountCents: 10000 }] }],
    jobs: [{ id: "job-1", number: "JOB-1", description: "Initial repair", status: "QC_PASSED", blocker: null, technician: "Review Technician", estimateId: "estimate-1", lineKey: "base", latestQc: "PASSED" }],
    parts: [], orders: [], qualityRelease: true, invoiceCount: 1, invoiceTotalCents: 10000, invoiceReady: true, candidates: [],
    evidence: [{ id: "evidence-1", title: "Carrier approval", category: "ESTIMATE" }, { id: "payment-1", title: "Payment receipt", category: "PAYMENT" }],
    fingerprints: { TEARDOWN: "teardown-1", PARTS: "parts-1", REPAIR: "repair-1", QC: "qc-1", BILLING: "billing-1" }
  };
}
const context = { actor: "Review Manager", manager: true, now: "2026-10-02T14:00:00Z", id: "supplement-1" };
const reason = "Reviewed hidden damage and supporting evidence.";
const run = (state: ClaimWorkflowState, source: ClaimWorkflowSource, input: Record<string, unknown>, manager = true) => applyClaimWorkflowAction(state, source, { reason, ...input }, { ...context, manager });
function ready(state = emptyClaimWorkflow(), source = workflowSource()) {
  for (const point of CLAIM_CHECKPOINTS) state = run(state, source, { action: "CHECKPOINT", point, outcome: "NO_CHANGE" });
  return state;
}
function revised(source = workflowSource()) {
  source.estimates.unshift({ id: "estimate-2", version: 2, totalCents: 18000, lines: [{ key: "base", description: "Initial repair", amountCents: 10000 }, { key: "extra", description: "Hidden damage", amountCents: 5000 }, { key: "part", description: "Additional part", amountCents: 3000 }], authorizations: [{ id: "authorization-2", disposition: "ACCEPTED", keys: ["base", "extra", "part"], actor: "Customer", amountCents: 18000 }] });
  return source;
}
function submitted() {
  const original = workflowSource();
  let state = run(emptyClaimWorkflow(), original, { action: "CREATE_SUPPLEMENT", followUpDate: "2026-10-02" });
  const source = revised(original);
  state = run(state, source, { action: "SUBMIT_SUPPLEMENT", supplementId: "supplement-1", estimateId: "estimate-2", recipient: "Carrier adjuster", followUpDate: "2026-10-02", evidenceIds: ["evidence-1"] });
  return { state, source };
}
describe("claim repair workflow", () => {
  it("prioritizes signed claim permission without replacing separate repair authorization", () => {
    const source = workflowSource(); source.communicationPermission = "Missing";
    expect(claimWorkflowNextAction(emptyClaimWorkflow(), source).label).toBe("Get claim authorization signed");
    source.communicationPermission = "Withdrawn";
    expect(claimWorkflowNextAction(emptyClaimWorkflow(), source).label).toBe("Get claim authorization signed");
    source.communicationPermission = "Verified signed copy"; source.customerAuthorization = false;
    expect(claimWorkflowNextAction(emptyClaimWorkflow(), source).label).toBe("Review scope and authorization");
  });
  it("uses repair linkage, not generic task completion, to choose the handoff step", () => {
    const source = workflowSource(); source.repairOrder = null;
    expect(claimWorkflowNextAction(emptyClaimWorkflow(), source)).toMatchObject({ label: "Create / link repair order", view: "Overview" });
  });
  it("routes missing or revoked scope approval to repair planning", () => {
    const source = workflowSource(); source.estimates[0].authorizations[0].disposition = "REVOKED";
    expect(claimWorkflowNextAction(emptyClaimWorkflow(), source).label).toBe("Review scope and authorization");
  });
  it("opens the exact stale checkpoint instead of a generic task", () => {
    const source = workflowSource(); const state = ready(emptyClaimWorkflow(), source);
    source.fingerprints.PARTS = "new-parts";
    expect(claimWorkflowNextAction(state, source)).toMatchObject({ view: "Parts", point: "PARTS" });
  });
  it("prioritizes an unresolved supplement over continued affected work", () => {
    const { state, source } = submitted();
    expect(claimWorkflowNextAction(state, source).view).toBe("Supplements");
  });
  it("separates active repairs, QC-ready operations, failed rework, and handover", () => {
    const source = workflowSource(); const state = ready(emptyClaimWorkflow(), source);
    source.jobs[0].status = "IN_PROGRESS"; source.jobs[0].latestQc = null;
    expect(claimWorkflowNextAction(state, source).label).toBe("Continue authorized repairs");
    source.jobs[0].status = "READY_FOR_QC";
    expect(claimWorkflowNextAction(state, source).label).toBe("Complete QC clearance");
    source.jobs[0].latestQc = "FAILED";
    expect(claimWorkflowNextAction(state, source).label).toBe("Resolve QC rework");
    source.jobs[0].status = "QC_PASSED"; source.jobs[0].latestQc = "PASSED";
    expect(claimWorkflowNextAction(state, source).action).toBe("DELIVERY");
  });
  it("routes pending parts to procurement without treating consumed reservations as shortages", () => {
    const source = workflowSource(); const state = ready(emptyClaimWorkflow(), source);
    source.parts.push({ id: "part", number: "P-1", description: "Bracket", required: 1, reserved: 0, status: "OPEN" });
    expect(claimWorkflowNextAction(state, source).label).toBe("Resolve parts requirements");
    source.parts[0].status = "RELEASED";
    expect(claimWorkflowNextAction(state, source).action).toBe("DELIVERY");
  });
  it("distinguishes invoice readiness, settlement, and completed workflow", () => {
    const source = workflowSource(); let state = run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] });
    source.invoiceReady = false;
    expect(claimWorkflowNextAction(state, source).label).toBe("Reconcile invoice package");
    source.invoiceReady = true;
    expect(claimWorkflowNextAction(state, source).action).toBe("FINANCIAL_CLOSE");
    state = run(state, source, { action: "FINANCIAL_CLOSE", settlementConfirmed: true, evidenceIds: ["payment-1"] });
    expect(claimWorkflowNextAction(state, source).complete).toBe(true);
    source.fingerprints.BILLING = "changed";
    expect(claimWorkflowNextAction(state, source).action).toBe("REOPEN");
  });
  it("requires a base estimate and valid calendar date for supplements", () => {
    const source = workflowSource(); source.estimates = [];
    expect(() => run(emptyClaimWorkflow(), source, { action: "CREATE_SUPPLEMENT", followUpDate: "2026-10-02" })).toThrow("original repair estimate");
    for (const invalid of ["2026-02-30", "2026-99-99", "not-a-date"]) expect(() => run(emptyClaimWorkflow(), workflowSource(), { action: "CREATE_SUPPLEMENT", followUpDate: invalid })).toThrow("valid follow-up date");
  });
  it("creates attributed drafts without treating extracted amounts as authorization", () => {
    const state = run(emptyClaimWorkflow(), workflowSource(), { action: "CREATE_SUPPLEMENT", followUpDate: "2026-10-02" });
    expect(state.supplements[0]).toMatchObject({ status: "DRAFT", number: 1, revision: 1, owner: "Review Manager", baseEstimateId: "estimate-1", approvedKeys: [] });
  });
  it("derives changed lines from exact estimate revisions", () => {
    const { state } = submitted();
    expect(state.supplements[0]).toMatchObject({ status: "SUBMITTED", targetEstimateId: "estimate-2", recipient: "Carrier adjuster" });
    expect(state.supplements[0].lines.map((line) => line.amountCents)).toEqual([5000, 3000]);
    const source = revised();
    expect(supplementChanges(source.estimates[1], source.estimates[0])).toHaveLength(2);
  });
  it("rejects unchanged estimates, foreign evidence and tax discrepancies", () => {
    const source = workflowSource(); const state = run(emptyClaimWorkflow(), source, { action: "CREATE_SUPPLEMENT", followUpDate: "2026-10-02" });
    expect(() => run(state, source, { action: "SUBMIT_SUPPLEMENT", supplementId: "supplement-1", estimateId: "estimate-1" })).toThrow("newer estimate");
    revised(source);
    expect(() => run(state, source, { action: "SUBMIT_SUPPLEMENT", supplementId: "supplement-1", estimateId: "estimate-2", recipient: "Carrier", followUpDate: "2026-10-02", evidenceIds: ["foreign-document"] })).toThrow("supporting evidence");
    source.estimates[0].totalCents += 100;
    expect(() => run(state, source, { action: "SUBMIT_SUPPLEMENT", supplementId: "supplement-1", estimateId: "estimate-2" })).toThrow("Tax or discount");
  });
  it("requires a manager and evidence to record verified payer decisions", () => {
    const { state, source } = submitted();
    const input = { action: "DECIDE_SUPPLEMENT", supplementId: "supplement-1", status: "APPROVED", approvedKeys: ["extra", "part"], decisionBy: "Adjuster", evidenceIds: ["evidence-1"] };
    expect(() => run(state, source, input, false)).toThrow("claim manager");
    expect(() => run(state, source, { ...input, evidenceIds: [] })).toThrow("supporting evidence");
    expect(run(state, source, input).supplements[0]).toMatchObject({ status: "APPROVED", decisionBy: "Adjuster", decisionAt: context.now });
  });
  it("enforces partial and full line-level approval", () => {
    const { state, source } = submitted();
    const input = { action: "DECIDE_SUPPLEMENT", supplementId: "supplement-1", status: "PARTIALLY_APPROVED", decisionBy: "Adjuster", evidenceIds: ["evidence-1"] };
    expect(() => run(state, source, { ...input, approvedKeys: ["extra", "part"] })).toThrow("subset");
    expect(() => run(state, source, { ...input, status: "APPROVED", approvedKeys: ["extra"] })).toThrow("all supplement lines");
    expect(() => run(state, source, { ...input, approvedKeys: ["unrelated"] })).toThrow("belong to this supplement");
    expect(run(state, source, { ...input, approvedKeys: ["extra"] }).supplements[0].approvedKeys).toEqual(["extra"]);
  });
  it("requires matching core repair authorization even after payer approval", () => {
    const fixture = submitted(); const source = fixture.source; let state = fixture.state;
    state = run(state, source, { action: "DECIDE_SUPPLEMENT", supplementId: "supplement-1", status: "APPROVED", approvedKeys: ["extra", "part"], decisionBy: "Adjuster", evidenceIds: ["evidence-1"] });
    source.estimates[0].authorizations = [];
    expect(claimWorkflowAlerts(state, source, "2026-10-02").join(" ")).toContain("matching repair authorization");
    expect(workflowReleaseBlockers(ready(state, source), source).join(" ")).toContain("matching repair authorization");
  });
  it("preserves rejected revisions and reconnects related checkpoint findings", () => {
    const fixture = submitted(); const source = fixture.source; let state = fixture.state;
    state = run(state, source, { action: "CHECKPOINT", point: "TEARDOWN", outcome: "SUPPLEMENT", supplementId: "supplement-1" });
    state = run(state, source, { action: "DECIDE_SUPPLEMENT", supplementId: "supplement-1", status: "CHANGES_REQUESTED", approvedKeys: [], decisionBy: "Adjuster", evidenceIds: ["evidence-1"] });
    state = applyClaimWorkflowAction(state, source, { action: "REVISE_SUPPLEMENT", reason, supplementId: "supplement-1", followUpDate: "2026-10-03" }, { ...context, id: "supplement-2" });
    expect(state.supplements[0].status).toBe("SUPERSEDED"); expect(state.supplements[1].revision).toBe(2);
    expect(state.checkpoints.TEARDOWN?.supplementId).toBe("supplement-2");
    expect(currentCheckpoint(state, source, "TEARDOWN")).not.toBeNull();
  });
  it("reopens checkpoints when their source fingerprint changes", () => {
    const source = workflowSource(); const state = ready(emptyClaimWorkflow(), source);
    expect(currentCheckpoint(state, source, "PARTS")).not.toBeNull(); source.fingerprints.PARTS = "changed";
    expect(currentCheckpoint(state, source, "PARTS")).toBeNull();
    expect(claimWorkflowAlerts(state, source, "2026-10-02").join(" ")).toContain("source records changed");
  });
  it("does not allow a finding to point to an unrelated supplement", () => {
    expect(() => run(emptyClaimWorkflow(), workflowSource(), { action: "CHECKPOINT", point: "TEARDOWN", outcome: "SUPPLEMENT", supplementId: "foreign" })).toThrow("active supplement");
  });
  it("surfaces overdue follow-up with an accountable owner", () => {
    const { state, source } = submitted();
    expect(claimWorkflowAlerts(state, source, "2026-10-02").join(" ")).toContain("follow-up due; owner Review Manager");
  });
  it("blocks delivery on failed QC even with commercial approval", () => {
    const source = workflowSource(); source.jobs[0].latestQc = "FAILED";
    expect(() => run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] })).toThrow("latest QC");
  });
  it("blocks delivery for missing checkpoints, open supplements and parts discrepancies", () => {
    const { state, source } = submitted();
    expect(workflowReleaseBlockers(state, source).join(" ")).toContain("Open supplements");
    source.orders.push({ id: "po", number: "PO-1", supplier: "Supplier", status: "PARTIALLY_RECEIVED", orderedCents: 10000, receivedCents: 5000, discrepancyCount: 1 });
    expect(workflowReleaseBlockers(state, source).join(" ")).toContain("parts discrepancies");
  });
  it("uses the latest approval decision rather than a superseded acceptance", () => {
    const source = workflowSource(); source.estimates[0].authorizations.unshift({ id: "revoked", disposition: "REVOKED", keys: [], actor: "Customer", amountCents: 0 });
    expect(workflowReleaseBlockers(ready(emptyClaimWorkflow(), source), source).join(" ")).toContain("current estimate");
  });
  it("records delivery separately from financial closeout", () => {
    const source = workflowSource(); const state = run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] });
    expect(state.delivery?.recipient).toBe("Customer"); expect(state.financialClose).toBeUndefined();
    expect(() => run(state, source, { action: "DELIVERY" })).toThrow("already recorded");
  });
  it("requires verified payment evidence and manager authorization for settlement", () => {
    const source = workflowSource(); const state = run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] });
    const input = { action: "FINANCIAL_CLOSE", settlementConfirmed: true, evidenceIds: ["payment-1"] };
    expect(() => run(state, source, input, false)).toThrow("claim manager");
    expect(() => run(state, source, { ...input, evidenceIds: ["evidence-1"] })).toThrow("Payment evidence");
    expect(run(state, source, input).financialClose?.actor).toBe(context.actor);
    source.fingerprints.QC = "changed";
    expect(() => run(state, source, input)).toThrow("current, QC-cleared delivery");
  });
  it("rejects unsupported actions and closed cases without mutating state", () => {
    const state = emptyClaimWorkflow(); expect(() => run(state, workflowSource(), { action: "UNKNOWN" })).toThrow("Unknown");
    const source = workflowSource(); source.claimClosed = true;
    expect(() => run(state, source, { action: "CREATE_SUPPLEMENT" })).toThrow("closed"); expect(state.supplements).toEqual([]);
  });
  it("prevents financial closeout while the invoice package is incomplete", () => {
    const source = workflowSource();
    const state = run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] });
    source.invoiceReady = false;
    expect(() => run(state, source, { action: "FINANCIAL_CLOSE", settlementConfirmed: true, evidenceIds: ["payment-1"] })).toThrow("Resolve workflow alerts");
  });
  it("allows only a manager to reopen verified settlement while retaining handover", () => {
    const source = workflowSource();
    let state = run(ready(emptyClaimWorkflow(), source), source, { action: "DELIVERY", recipient: "Customer", mileage: "100", keysVerified: true, evidenceIds: ["evidence-1"] });
    state = run(state, source, { action: "FINANCIAL_CLOSE", settlementConfirmed: true, evidenceIds: ["payment-1"] });
    expect(() => run(state, source, { action: "REOPEN" }, false)).toThrow("manager must reopen");
    const reopened = run(state, source, { action: "REOPEN" });
    expect(reopened.financialClose).toBeUndefined();
    expect(reopened.delivery).toEqual(state.delivery);
    expect(state.financialClose).toBeDefined();
  });
});
