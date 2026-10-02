export const CLAIM_CHECKPOINTS = ["TEARDOWN", "PARTS", "REPAIR", "QC", "BILLING"] as const;
export type ClaimCheckpoint = typeof CLAIM_CHECKPOINTS[number];
export const CHECKPOINT_LABELS: Record<ClaimCheckpoint, string> = {
  TEARDOWN: "Inspection / teardown", PARTS: "Parts changes", REPAIR: "Repair changes", QC: "Quality findings", BILLING: "Final billing"
};
export type WorkflowEstimate = { id: string; version: number; totalCents: number; lines: Array<{ key: string; description: string; amountCents: number }>; authorizations: Array<{ id: string; disposition: string; keys: string[]; actor: string; amountCents: number }> };
export type ClaimWorkflowSource = {
  claimId: string; customer: string; vin: string; claimNumber: string; claimClosed: boolean; customerAuthorization: boolean;
  communicationPermission?: string; directPayPermission?: string;
  repairOrder: null | { id: string; number: string; stage: string; owner: string; targetAt: string; closed: boolean; version: number };
  estimates: WorkflowEstimate[];
  jobs: Array<{ id: string; number: string; description: string; status: string; blocker: string | null; technician: string; estimateId: string; lineKey: string; latestQc: string | null }>;
  parts: Array<{ id: string; number: string; description: string; required: number; reserved: number; status: string }>;
  orders: Array<{ id: string; number: string; supplier: string; status: string; orderedCents: number; receivedCents: number; discrepancyCount: number }>;
  qualityRelease: boolean; invoiceTotalCents: number; invoiceCount: number; invoiceReady: boolean;
  candidates: Array<{ id: string; number: string; vehicle: string }>;
  evidence: Array<{ id: string; title: string; category: string }>;
  fingerprints: Record<ClaimCheckpoint, string>;
};
export type ClaimSupplement = {
  id: string; number: number; revision: number; replacesId?: string;
  status: "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED" | "PARTIALLY_APPROVED" | "DENIED" | "SUPERSEDED";
  baseEstimateId: string; targetEstimateId?: string; reason: string; owner: string; followUpDate: string; recipient?: string;
  lines: Array<{ key: string; description: string; amountCents: number }>;
  approvedKeys: string[]; evidenceIds: string[]; decisionBy?: string; decisionAt?: string; submittedAt?: string;
};
export type ClaimWorkflowState = {
  schemaVersion: 1; supplements: ClaimSupplement[];
  checkpoints: Partial<Record<ClaimCheckpoint, { outcome: "NO_CHANGE" | "SUPPLEMENT"; fingerprint: string; reason: string; supplementId?: string; actor: string; at: string }>>;
  delivery?: { at: string; actor: string; mileage: string; recipient: string; evidenceIds: string[]; fingerprint: string };
  financialClose?: { at: string; actor: string; reason: string; evidenceIds: string[]; fingerprint: string };
};
export const emptyClaimWorkflow = (): ClaimWorkflowState => ({ schemaVersion: 1, supplements: [], checkpoints: {} });
export class ClaimWorkflowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function required(value: unknown, label: string, max = 1000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ClaimWorkflowError(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
function strings(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string") || value.length > 100) throw new ClaimWorkflowError("Select valid evidence or line references.");
  return [...new Set(value as string[])];
}
function date(value: unknown) {
  const result = required(value, "Follow-up date", 10);
  const parsed = new Date(`${result}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new ClaimWorkflowError("Select a valid follow-up date.");
  return result;
}
function evidence(value: unknown, source: ClaimWorkflowSource) {
  const ids = strings(value);
  if (!ids.length || ids.some((id) => !source.evidence.some((item) => item.id === id))) throw new ClaimWorkflowError("Select supporting evidence from this claim.");
  return ids;
}
export function supplementChanges(base: WorkflowEstimate, target: WorkflowEstimate) {
  const keys = [...new Set([...base.lines.map((line) => line.key), ...target.lines.map((line) => line.key)])];
  return keys.map((key) => {
    const previous = base.lines.find((line) => line.key === key);
    const next = target.lines.find((line) => line.key === key);
    return { key, description: next?.description ?? previous!.description, amountCents: (next?.amountCents ?? 0) - (previous?.amountCents ?? 0) };
  }).filter((line) => line.amountCents !== 0 || base.lines.find((item) => item.key === line.key)?.description !== target.lines.find((item) => item.key === line.key)?.description);
}
export function currentCheckpoint(state: ClaimWorkflowState, source: ClaimWorkflowSource, point: ClaimCheckpoint) {
  const record = state.checkpoints[point];
  return record?.fingerprint === source.fingerprints[point] ? record : null;
}
export function supplementResolved(supplement: ClaimSupplement) {
  return ["APPROVED", "PARTIALLY_APPROVED", "DENIED", "SUPERSEDED"].includes(supplement.status);
}
export type ClaimWorkflowNextAction = { label: string; reason: string; view: "Overview" | "Repair plan" | "Parts" | "Supplements" | "QC & delivery" | "Billing" | "History"; point?: ClaimCheckpoint; action?: "DELIVERY" | "FINANCIAL_CLOSE" | "REOPEN"; complete?: boolean };
export function claimWorkflowNextAction(state: ClaimWorkflowState, source: ClaimWorkflowSource): ClaimWorkflowNextAction {
  if (source.claimClosed) return { label: "View closed claim", reason: "This claim is closed. Workflow history remains available.", view: "History", complete: true };
  if (state.financialClose) return state.financialClose.fingerprint !== source.fingerprints.BILLING
    ? { label: "Review changed settlement", reason: "Billing records changed after settlement. A manager must reopen the review.", view: "Billing", action: "REOPEN" }
    : { label: "View completed workflow", reason: "Customer handover and verified settlement are recorded.", view: "History", complete: true };
  if (source.communicationPermission && source.communicationPermission !== "Verified signed copy") return { label: "Get claim authorization signed", reason: "Obtain and verify limited claim communication permission before claim coordination. Direct payment is a separate optional choice; repair approval remains separate.", view: "Overview" };
  if (!source.repairOrder) return { label: "Create / link repair order", reason: "A matching repair order must be linked before repair planning can continue. Linking does not authorize repairs.", view: "Overview" };
  if (state.supplements.some((item) => !supplementResolved(item))) return { label: "Resolve pending supplement", reason: "Record the submission, follow-up, revision, or payer decision before continuing the affected scope.", view: "Supplements" };
  if (!source.customerAuthorization || !["ACCEPTED", "PARTIAL"].includes(source.estimates[0]?.authorizations[0]?.disposition ?? "")) return { label: "Review scope and authorization", reason: "Customer evidence and an accepted authorization for the current estimate are required. Uploaded amounts alone do not authorize work.", view: "Repair plan" };
  if (state.supplements.some((item) => ["APPROVED", "PARTIALLY_APPROVED"].includes(item.status) && item.approvedKeys.some((key) => !source.estimates.find((estimate) => estimate.id === item.targetEstimateId)?.authorizations[0]?.keys.includes(key)))) return { label: "Reconcile supplement authorization", reason: "The recorded payer approval must match the repair authorization before handover.", view: "Repair plan" };
  if (!currentCheckpoint(state, source, "TEARDOWN")) return { label: "Review teardown findings", reason: "Confirm whether the current inspection findings require a supplement.", view: "Repair plan", point: "TEARDOWN" };
  if (source.orders.some((item) => item.discrepancyCount > 0) || source.parts.some((item) => ["OPEN", "PARTIALLY_RESERVED"].includes(item.status) && item.reserved < item.required)) return { label: "Resolve parts requirements", reason: "Review procurement, reservations, receiving, and discrepancies before dependent repairs proceed.", view: "Parts" };
  if (!currentCheckpoint(state, source, "PARTS")) return { label: "Review parts changes", reason: "Confirm whether current parts costs or substitutions require a supplement.", view: "Parts", point: "PARTS" };
  if (source.jobs.some((item) => item.latestQc === "FAILED")) return { label: "Resolve QC rework", reason: "Failed findings require corrective work and a fresh inspection. Commercial approval cannot bypass QC.", view: "QC & delivery" };
  if (!source.jobs.length || source.jobs.some((item) => !["READY_FOR_QC", "QC_PASSED"].includes(item.status))) return { label: "Continue authorized repairs", reason: "Open repair operations and resolve the current job blockers. Unapproved scope remains stopped.", view: "Repair plan" };
  if (!currentCheckpoint(state, source, "REPAIR")) return { label: "Review repair changes", reason: "Record the supplement review for completed repair work.", view: "Repair plan", point: "REPAIR" };
  if (!source.qualityRelease || source.jobs.some((item) => item.status !== "QC_PASSED" || item.latestQc !== "PASSED")) return { label: "Complete QC clearance", reason: "Every operation must pass its latest inspection and receive quality release authorization.", view: "QC & delivery" };
  if (!currentCheckpoint(state, source, "QC")) return { label: "Review QC findings", reason: "Confirm whether the latest quality findings require a supplement.", view: "QC & delivery", point: "QC" };
  if (!state.delivery) return workflowReleaseBlockers(state, source).length
    ? { label: "Resolve handover blockers", reason: "Reconcile the current authorized scope and release requirements before customer handover.", view: "QC & delivery" }
    : { label: "Record customer handover", reason: "Quality and workflow release gates are satisfied. Record the recipient, mileage, keys, and evidence.", view: "QC & delivery", action: "DELIVERY" };
  if (state.delivery.fingerprint !== source.fingerprints.QC) return { label: "Review post-handover changes", reason: "Repair or QC records changed after handover. Resolve the change before settlement.", view: "QC & delivery" };
  if (!source.invoiceCount || !source.invoiceReady) return { label: "Reconcile invoice package", reason: "Resolve the invoice package and its mismatches before settlement verification.", view: "Billing" };
  if (!currentCheckpoint(state, source, "BILLING")) return { label: "Review final invoice and supplements", reason: "Confirm that current billing matches the approved scope and supplement decisions.", view: "Billing", point: "BILLING" };
  return { label: "Verify settlement", reason: "A manager must verify settlement against payment evidence. Vehicle delivery does not close the financial record.", view: "Billing", action: "FINANCIAL_CLOSE" };
}
export function claimWorkflowAlerts(state: ClaimWorkflowState, source: ClaimWorkflowSource, today: string) {
  const alerts: string[] = [];
  if (state.financialClose && state.financialClose.fingerprint !== source.fingerprints.BILLING) alerts.push("Billing source records changed after financial closeout. Manager review is required.");
  if (!source.repairOrder) alerts.push("Link a matching repair order before planning repair execution.");
  if (!source.customerAuthorization) alerts.push("Customer authorization evidence is missing.");
  if (source.repairOrder && !["ACCEPTED", "PARTIAL"].includes(source.estimates[0]?.authorizations[0]?.disposition ?? "")) alerts.push("The latest estimate has no accepted repair authorization. Uploaded amounts do not authorize work.");
  for (const point of CLAIM_CHECKPOINTS) {
    const check = currentCheckpoint(state, source, point);
    if (!check) alerts.push(`${CHECKPOINT_LABELS[point]}: supplement review outstanding${state.checkpoints[point] ? " after source records changed" : ""}.`);
    else if (check.outcome === "SUPPLEMENT" && !state.supplements.some((item) => item.id === check.supplementId && supplementResolved(item))) alerts.push(`${CHECKPOINT_LABELS[point]}: linked supplement needs a decision.`);
  }
  for (const item of state.supplements.filter((supplement) => !supplementResolved(supplement))) {
    if (item.followUpDate <= today) alerts.push(`Supplement ${item.number}.${item.revision}: follow-up due; owner ${item.owner}.`);
  }
  for (const item of state.supplements.filter((supplement) => ["APPROVED", "PARTIALLY_APPROVED"].includes(supplement.status))) {
    const estimate = source.estimates.find((entry) => entry.id === item.targetEstimateId);
    const authorized = estimate?.authorizations[0];
    if (!authorized || !["ACCEPTED", "PARTIAL"].includes(authorized.disposition) || item.approvedKeys.some((key) => !authorized.keys.includes(key))) alerts.push(`Supplement ${item.number}.${item.revision}: payer decision recorded; matching repair authorization still required.`);
  }
  if (source.jobs.some((job) => job.latestQc === "FAILED")) alerts.push("Failed QC findings require rework and a fresh inspection.");
  if (source.orders.some((order) => order.discrepancyCount)) alerts.push("Parts receiving discrepancies remain open.");
  const latest = source.estimates[0];
  const authorized = latest?.authorizations[0];
  if (source.invoiceCount && (!authorized || source.invoiceTotalCents > authorized.amountCents)) alerts.push("Invoice-ready labor scope needs reconciliation against the authorized estimate.");
  if (source.invoiceCount && !source.invoiceReady) alerts.push("Invoice-ready package has unresolved mismatches or an incomplete handoff status.");
  return alerts;
}
export function workflowReleaseBlockers(state: ClaimWorkflowState, source: ClaimWorkflowSource) {
  const blockers: string[] = [];
  if (!source.repairOrder) blockers.push("A linked repair order is required.");
  if (!source.customerAuthorization) blockers.push("Customer authorization is required.");
  if (!source.estimates.length || !["ACCEPTED", "PARTIAL"].includes(source.estimates[0]?.authorizations[0]?.disposition ?? "")) blockers.push("The current estimate requires a recorded repair authorization.");
  if (source.jobs.some((job) => !source.estimates[0]?.authorizations[0]?.keys.includes(job.lineKey))) blockers.push("Completed operations must reconcile with the currently authorized estimate lines.");
  if (!source.qualityRelease || !source.jobs.length || source.jobs.some((job) => job.status !== "QC_PASSED" || job.latestQc !== "PASSED")) blockers.push("Every repair job must pass its latest QC and have an existing quality release authorization.");
  for (const point of CLAIM_CHECKPOINTS.filter((item) => item !== "BILLING")) {
    const check = currentCheckpoint(state, source, point);
    if (!check) blockers.push(`${CHECKPOINT_LABELS[point]} supplement checkpoint is outstanding.`);
    else if (check.outcome === "SUPPLEMENT" && !state.supplements.some((item) => item.id === check.supplementId && supplementResolved(item))) blockers.push(`${CHECKPOINT_LABELS[point]} supplement is unresolved.`);
  }
  if (state.supplements.some((item) => !supplementResolved(item))) blockers.push("Open supplements require a recorded disposition.");
  if (source.orders.some((order) => order.discrepancyCount)) blockers.push("Resolve parts discrepancies before handover.");
  for (const item of state.supplements.filter((supplement) => ["APPROVED", "PARTIALLY_APPROVED"].includes(supplement.status))) {
    const authorization = source.estimates.find((entry) => entry.id === item.targetEstimateId)?.authorizations[0];
    if (!authorization || !["ACCEPTED", "PARTIAL"].includes(authorization.disposition) || item.approvedKeys.some((key) => !authorization.keys.includes(key))) blockers.push(`Supplement ${item.number}.${item.revision} requires matching repair authorization.`);
  }
  return blockers;
}
export function applyClaimWorkflowAction(state: ClaimWorkflowState, source: ClaimWorkflowSource, raw: Record<string, unknown>, context: { actor: string; manager: boolean; now: string; id: string }) {
  if (source.claimClosed) throw new ClaimWorkflowError("This claim is closed.", 409);
  const next = structuredClone(state);
  const reason = required(raw.reason, "Reason");
  const action = required(raw.action, "Action", 40);
  if (state.financialClose && action !== "REOPEN") throw new ClaimWorkflowError("This workflow is financially closed.", 409);
  if (action === "REOPEN") {
    if (!context.manager || !state.financialClose) throw new ClaimWorkflowError("A manager must reopen a financially closed workflow.", 403);
    next.financialClose = undefined;
  } else if (action === "CREATE_SUPPLEMENT") {
    if (state.delivery) throw new ClaimWorkflowError("Record post-delivery findings through a comeback repair case.", 409);
    const base = source.estimates[0];
    if (!base) throw new ClaimWorkflowError("Record the original repair estimate before creating a supplement.");
    next.supplements.push({ id: context.id, number: Math.max(0, ...state.supplements.map((item) => item.number)) + 1, revision: 1, status: "DRAFT", baseEstimateId: base.id, reason, owner: context.actor, followUpDate: date(raw.followUpDate), lines: [], approvedKeys: [], evidenceIds: [] });
  } else if (action === "CHECKPOINT") {
    const point = raw.point as ClaimCheckpoint;
    if (!CLAIM_CHECKPOINTS.includes(point) || !["NO_CHANGE", "SUPPLEMENT"].includes(String(raw.outcome))) throw new ClaimWorkflowError("Select a checkpoint and outcome.");
    if (!source.repairOrder) throw new ClaimWorkflowError("Link the repair order before reviewing supplement checkpoints.");
    const supplementId = typeof raw.supplementId === "string" ? raw.supplementId : undefined;
    if (raw.outcome === "SUPPLEMENT" && !next.supplements.some((item) => item.id === supplementId && item.status !== "SUPERSEDED")) throw new ClaimWorkflowError("Link an active supplement to this finding.");
    next.checkpoints[point] = { outcome: raw.outcome as "NO_CHANGE" | "SUPPLEMENT", fingerprint: source.fingerprints[point], reason, supplementId: raw.outcome === "SUPPLEMENT" ? supplementId : undefined, actor: context.actor, at: context.now };
  } else if (["SUBMIT_SUPPLEMENT", "DECIDE_SUPPLEMENT", "REVISE_SUPPLEMENT", "FOLLOW_UP"].includes(action)) {
    const item = next.supplements.find((entry) => entry.id === raw.supplementId);
    if (!item) throw new ClaimWorkflowError("Supplement not found.", 404);
    if (action === "FOLLOW_UP") {
      if (supplementResolved(item)) throw new ClaimWorkflowError("This supplement already has a disposition.");
      item.followUpDate = date(raw.followUpDate);
    } else if (action === "REVISE_SUPPLEMENT") {
      if (!["CHANGES_REQUESTED", "DENIED"].includes(item.status)) throw new ClaimWorkflowError("Only a returned or denied supplement can be revised.");
      const previousId = item.id;
      item.status = "SUPERSEDED";
      next.supplements.push({ ...item, id: context.id, replacesId: previousId, revision: item.revision + 1, status: "DRAFT", reason, followUpDate: date(raw.followUpDate), approvedKeys: [], evidenceIds: [], decisionAt: undefined, decisionBy: undefined, submittedAt: undefined });
      for (const check of Object.values(next.checkpoints)) if (check?.supplementId === previousId) check.supplementId = context.id;
    } else if (action === "SUBMIT_SUPPLEMENT") {
      if (item.status !== "DRAFT") throw new ClaimWorkflowError("Only a draft supplement can be submitted.");
      const base = source.estimates.find((entry) => entry.id === item.baseEstimateId);
      const target = source.estimates.find((entry) => entry.id === raw.estimateId);
      if (!base || !target || target.version <= base.version) throw new ClaimWorkflowError("Record and select a newer estimate revision for this supplement.");
      if (state.supplements.some((entry) => entry.id !== item.id && entry.status !== "SUPERSEDED" && entry.targetEstimateId === target.id)) throw new ClaimWorkflowError("This estimate revision is already recorded on another supplement.", 409);
      item.lines = supplementChanges(base, target);
      if (!item.lines.length) throw new ClaimWorkflowError("The selected revision has no changed repair lines.");
      if (item.lines.reduce((sum, line) => sum + line.amountCents, 0) !== target.totalCents - base.totalCents) throw new ClaimWorkflowError("Tax or discount changes require reconciliation in estimate planning before this supplement can be submitted.");
      item.targetEstimateId = target.id;
      item.recipient = required(raw.recipient, "Submission recipient", 200);
      item.followUpDate = date(raw.followUpDate);
      item.evidenceIds = evidence(raw.evidenceIds, source);
      item.submittedAt = context.now;
      item.status = "SUBMITTED";
    } else {
      if (!context.manager) throw new ClaimWorkflowError("A claim manager must record the verified payer decision.", 403);
      if (item.status !== "SUBMITTED") throw new ClaimWorkflowError("Only a submitted supplement can receive a decision.");
      const status = String(raw.status) as ClaimSupplement["status"];
      if (!["APPROVED", "PARTIALLY_APPROVED", "CHANGES_REQUESTED", "DENIED"].includes(status)) throw new ClaimWorkflowError("Select a valid payer decision.");
      const keys = strings(raw.approvedKeys ?? []);
      if (keys.some((key) => !item.lines.some((line) => line.key === key))) throw new ClaimWorkflowError("Approved lines must belong to this supplement.");
      if (status === "APPROVED" && keys.length !== item.lines.length) throw new ClaimWorkflowError("Full approval requires all supplement lines.");
      if (status === "PARTIALLY_APPROVED" && (!keys.length || keys.length === item.lines.length)) throw new ClaimWorkflowError("Partial approval requires a subset of supplement lines.");
      if (["DENIED", "CHANGES_REQUESTED"].includes(status) && keys.length) throw new ClaimWorkflowError("A denied or returned supplement cannot approve lines.");
      item.evidenceIds = evidence(raw.evidenceIds, source);
      item.decisionBy = required(raw.decisionBy, "Payer decision-maker", 200);
      item.decisionAt = context.now;
      item.approvedKeys = keys;
      item.status = status;
    }
  } else if (action === "DELIVERY") {
    if (state.delivery) throw new ClaimWorkflowError("Delivery is already recorded.", 409);
    const blockers = workflowReleaseBlockers(state, source);
    if (blockers.length) throw new ClaimWorkflowError(blockers.join(" "), 409);
    if (raw.keysVerified !== true) throw new ClaimWorkflowError("Confirm the vehicle keys before recording handover.");
    const mileage = required(raw.mileage, "Delivery mileage", 12);
    if (!/^\d+$/.test(mileage)) throw new ClaimWorkflowError("Delivery mileage must be a nonnegative whole number.");
    next.delivery = { at: context.now, actor: context.actor, recipient: required(raw.recipient, "Receiving customer", 200), mileage, evidenceIds: evidence(raw.evidenceIds, source), fingerprint: source.fingerprints.QC };
  } else if (action === "FINANCIAL_CLOSE") {
    if (!context.manager) throw new ClaimWorkflowError("A claim manager must approve financial closeout.", 403);
    if (!state.delivery || state.delivery.fingerprint !== source.fingerprints.QC) throw new ClaimWorkflowError("A current, QC-cleared delivery record is required.", 409);
    if (claimWorkflowAlerts(state, source, context.now.slice(0, 10)).length || !source.invoiceCount || !source.invoiceReady) throw new ClaimWorkflowError("Resolve workflow alerts and record the invoice before financial closeout.", 409);
    if (raw.settlementConfirmed !== true) throw new ClaimWorkflowError("Confirm verified settlement before financial closeout.");
    const paymentEvidence = evidence(raw.evidenceIds, source);
    if (!paymentEvidence.some((id) => source.evidence.some((item) => item.id === id && item.category === "PAYMENT"))) throw new ClaimWorkflowError("Payment evidence is required for financial closeout.");
    next.financialClose = { at: context.now, actor: context.actor, reason, evidenceIds: paymentEvidence, fingerprint: source.fingerprints.BILLING };
  } else throw new ClaimWorkflowError("Unknown claim workflow action.");
  return next;
}
