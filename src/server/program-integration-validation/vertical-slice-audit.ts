import { PROGRAM_RELEASES } from "./catalog";

export type VerticalSliceStatus = "COMPLETE" | "PARTIAL" | "NOT_STARTED" | "EXTERNAL_EVIDENCE_REQUIRED" | "BLOCKED_BY_DECISION";
export type VerticalSliceAuditRow = {
  id: string; release: string; milestone: string; title: string; acceptance: string; status: VerticalSliceStatus;
  evidenceReferences: readonly string[]; remainingGap: string; nextAction: string; completionScope: "REPOSITORY";
};

const COMPLETE_IDS = new Set([
  "IC-001", "IC-010", "IC-011", "IC-012", "IC-013", "IC-016", "IC-021",
  "IC-030", "IC-033", "IC-038", "IC-039", "IC-040", "IC-041", "IC-042", "IC-043", "IC-044", "IC-046",
  "IC-070", "IC-071", "IC-072", "IC-073", "IC-075", "IC-076", "IC-077",
  "IC-080", "IC-081", "IC-082", "IC-084", "IC-085", "IC-086", "IC-087", "IC-088",
  "IC-090", "IC-091", "IC-092", "IC-093", "IC-095", "IC-100", "IC-101", "IC-102", "IC-105", "IC-107", "IC-112", "IC-118"
]);
const EXTERNAL_IDS = new Set(["IC-017", "IC-059", "IC-113", "IC-114", "IC-115", "IC-116", "IC-117", "IC-120", "IC-121", "IC-122", "IC-123", "IC-124", "IC-125", "IC-126", "IC-127", "IC-128", "IC-129"]);
const BLOCKED_IDS = new Set(["IC-000", "IC-003", "IC-004", "IC-110"]);

const DEFAULT_GAPS: Record<string, string> = {
  R0: "Repository planning exists, but named operational owners, source decisions, targets, or pilot confirmations remain unresolved.",
  R1: "Synthetic repository conformance exists; production-like database, security, recovery, or rollout evidence remains outside the demonstrated boundary.",
  R2: "The shared experience is implemented, but full user-saved views, connected domains, representative accessibility, and rollout evidence are incomplete.",
  R3: "The authoritative InventoryUnit projection exists, but disconnected Shop, Parts, decisions, integrations, event-history statistics, or production-volume evidence remain incomplete.",
  R4: "The acquisition aggregate and internal command path exist; external acknowledgement, automation, representative operational evidence, or deployment remains incomplete.",
  R5: "The nine-stage aggregate exists; provider reconciliation, automation, representative tabletop, accessibility/performance, deployment, and pilot evidence remain incomplete.",
  R6: "The retail aggregate exists; scheduled automation, provider acknowledgement/replay, mismatch operations, Control Tower integration, deployment, and pilot evidence remain incomplete.",
  R7: "The authoritative Shop capability exists; mobile/accessibility, production-volume concurrency, provider, deployment, and pilot evidence remain incomplete where applicable.",
  R8: "The authoritative Parts capability exists; provider/hardware, configurable authority, export/saved-view, accessibility/performance, deployment, and pilot evidence remain incomplete where applicable.",
  R9: "The disposition aggregate exists; live providers, calibrated outcomes, accessibility/performance, deployment, and pilot evidence remain incomplete where applicable.",
  R10: "The governance projection exists; controlled export, historical/restated facts, authorized operations, support readiness, accessibility/performance, and pilot evidence remain incomplete where applicable.",
  R11: "The sandbox harness exists; named actual systems, credentials, signed webhooks, provider round trips, reconciliation, and pilot activation remain incomplete.",
  R12: "The fail-closed control plane exists, but the acceptance criterion requires real independently reviewed enterprise or pilot evidence."
};

const GAP_OVERRIDES: Record<string, string> = {
  "IC-002": "Visible-action traceability is strong across implemented workspaces, but it has not been exhaustively certified for every value, permission, event, projection, and integration effect.",
  "IC-005": "Synthetic fixtures exist, but the complete representative pilot, accessibility, outage, recovery, and rollback case set is not approved and executed.",
  "IC-014": "Integrity, quarantine, retention, and legal-hold rules exist; end-to-end upload scanning and field-access evidence remain incomplete.",
  "IC-015": "Versioned policy and OFF/SHADOW rollout controls exist; full inheritance, pilot outcome, pause, and rollback conformance remains incomplete.",
  "IC-020": "Seven destinations and responsive shell exist; approved tablet/mobile accessibility journeys are not independently validated.",
  "IC-022": "Vehicle Discovery is permission-filtered, but universal cross-domain identifiers and complete return-context coverage remain incomplete.",
  "IC-023": "Versioned system URL views exist; durable user-created/shared Inventory Console saved views are not implemented.",
  "IC-024": "Phase-one launcher routes to purpose-built workspaces; some forms, previews, receipts, and recovery paths remain gated by owning slices.",
  "IC-025": "InventoryUnit Home facts are live; Shop, Parts, throughput, and integration-health facts remain explicitly unavailable.",
  "IC-026": "Inventory priority work exists; complete My Work, Team, exception escalation, and cross-domain deduplication coverage remains incomplete.",
  "IC-027": "Permission-scoped counts and queue links exist; complete contextual direct-action coverage remains incomplete.",
  "IC-028": "Honest UI states exist; full cross-domain recovery and accessibility validation remains incomplete.",
  "IC-031": "Counts, average age, and targets exist; entry/exit distributions and median/p90 require representative event-history volume.",
  "IC-032": "Shop and Parts dependency panels are honest but unavailable; a reconciled cross-lane dependency projection is not implemented.",
  "IC-034": "Owning workspaces are linked, but integrated review, approval, recommendation, expiry, decision, and outcome projections are incomplete.",
  "IC-035": "Recorded USD exposure and acquisition aging exist; component confidence and broader capital/carrying-cost reconciliation are incomplete.",
  "IC-036": "Selected InventoryUnit facts exist; joined Shop, Parts, task, approval, audit, command, and field-policy detail is incomplete.",
  "IC-037": "Projection freshness and partial reasons exist; connected source conflicts, dead letters, owners, manual paths, and recovery are incomplete.",
  "IC-045": "Offer/counter versions and accepted evidence exist; live external acknowledgement and variance/reapproval tabletop evidence are incomplete.",
  "IC-047": "Cancellation and non-destructive reversal exist; title, payment, custody compensation, and operational verification remain incomplete.",
  "IC-048": "Internal downstream handoff is idempotent; transport/provider acknowledgement, rejection, and reconciliation remain disabled.",
  "IC-050": "Internal transport/no-transport control exists; carrier acknowledgement, reconciliation, and automated exception escalation remain incomplete.",
  "IC-054": "Authoritative Shop and Parts gates are read; production activation, supplier/custody integration, and representative workload evidence remain incomplete.",
  "IC-058": "Whole-package release and suspension are implemented; operational reinstatement, notifications, and pilot sign-off remain incomplete.",
  "IC-060": "Frontline eligibility is enforced; real publication freshness and pilot reconciliation remain incomplete.",
  "IC-062": "Command-time expiry works; scheduled expiry, tasks, notifications, and promise effects remain incomplete.",
  "IC-063": "Exact-version sale approval works; enterprise amount policy and DMS/payment acknowledgement remain incomplete.",
  "IC-067": "Compensation and mismatch rejection exist; dedicated mismatch queue, replay worker, and provider outage evidence remain incomplete.",
  "IC-068": "Retail queue and clocks exist; Control Tower projection, complete global queues, and approved KPI baselines remain incomplete.",
  "IC-074": "Technician execution controls exist; approved mobile accessibility validation remains incomplete.",
  "IC-078": "Close/reopen gates exist; real downstream acknowledgement and mismatch reconciliation remain incomplete.",
  "IC-079": "Shop landing and handoffs exist; representative concurrency, accessibility/performance, deployment, and pilot evidence remain incomplete.",
  "IC-083": "PO lifecycle and independent approval exist; real vendor acknowledgement/failure behavior and configurable authority evidence remain incomplete.",
  "IC-089": "Parts workspace and analytics exist; saved views/export, hardware/providers, accessibility/performance, deployment, and pilot evidence remain incomplete.",
  "IC-094": "Activation evidence and sandbox/manual states exist; no live provider adapter or certified external acknowledgement is enabled.",
  "IC-096": "Internal sale/transfer completion gates exist; external receipt/handoff reconciliation and unwind tabletop evidence remain incomplete.",
  "IC-097": "Settlement reconciliation rules exist; live accounting/provider acknowledgement and mismatch operations remain incomplete.",
  "IC-098": "Recommendations are versioned and advisory; calibration, back-testing, outcome linkage, and approved thresholds remain incomplete.",
  "IC-099": "Wholesale workspace exists; accessibility/performance, live provider, deployment, and release evidence remain incomplete.",
  "IC-103": "Current governed KPI snapshots exist; historical facts, cohorts, targets, and restatement workflow remain incomplete.",
  "IC-104": "Export is fail-closed and preview-only; controlled field/row scope, reason, watermark, bounded volume, and audit execution are not activated.",
  "IC-106": "Roles and capability grants are projected; complete delegation, amount-limit, field-visibility, and separation administration remains incomplete.",
  "IC-108": "Failures, outbox attention, projection lag, and errors are observable; authorized replay/retry, incidents, ownership, and resolution workflow are incomplete.",
  "IC-109": "Retention and legal-hold truth is projected; privacy execution, production runbooks, training, ownership, and support workflows remain incomplete.",
  "IC-111": "Registry and durable exchange harness exist; real credential vault, provider auth, signed webhook, metrics, and certified contract tests remain incomplete.",
  "IC-119": "Partner scopes, limits, idempotency, HTTPS, versioning, and deprecation are enforced; no real credential or webhook is activated."
};

const EXTERNAL_GAPS: Record<string, string> = {
  "IC-017": "A real backup/restore, migration dry run, replay, rollback/roll-forward, RPO/RTO, and reconciled-total exercise has not been executed.",
  "IC-059": "The complete nine-slice representative tabletop, accessibility/performance run, and pilot-readiness approval have not been executed.",
  "IC-113": "No actual DMS/accounting provider sandbox or pilot round trip has been executed.",
  "IC-114": "No actual VIN/history/title provider validation has been executed.",
  "IC-115": "No actual market/listing/auction provider validation has been executed.",
  "IC-116": "No actual Parts vendor round trip has been executed.",
  "IC-117": "No actual transport provider round trip has been reconciled to physical custody evidence.",
  "IC-120": "No current independently reviewed security/privacy assessment is recorded.",
  "IC-121": "No approved cross-device accessibility validation is recorded.",
  "IC-122": "No production-representative performance and scale result is recorded.",
  "IC-123": "No current recovery, RPO/RTO, DR, reconciliation, and rollback exercise is recorded.",
  "IC-124": "No complete SLO, alert, runbook, training, communications, and support-readiness evidence is recorded.",
  "IC-125": "No deployed migration/shadow run with approved source/target reconciliation is recorded.",
  "IC-126": "No limited pilot has been authorized or run.",
  "IC-127": "No authorized pause/rollback and resume exercise has been run.",
  "IC-128": "No pilot outcome and calibration review has been recorded.",
  "IC-129": "No eight-dimension expansion/GA decision has been recorded."
};

const BLOCKED_GAPS: Record<string, string> = {
  "IC-000": "Repository code is authorized, but the full named operational/pilot/release charter required by the acceptance criterion is not signed.",
  "IC-003": "The provider-neutral authority map exists, but actual external systems, owners, and authoritative fields are not approved.",
  "IC-004": "KPI definitions exist, but production targets, authoritative labels, alert thresholds, and outcome baselines are not approved.",
  "IC-110": "The eight-system registry is a provider-neutral contract; the actual-system inventory, owners, volumes, and source matrix are not approved."
};

function statusFor(id: string): VerticalSliceStatus {
  if (COMPLETE_IDS.has(id)) return "COMPLETE";
  if (EXTERNAL_IDS.has(id)) return "EXTERNAL_EVIDENCE_REQUIRED";
  if (BLOCKED_IDS.has(id)) return "BLOCKED_BY_DECISION";
  return "PARTIAL";
}

export function getVerticalSliceClassificationIndex() {
  const slices = PROGRAM_RELEASES.flatMap((release) => release.slices.map((id) => ({ id, release: release.release, milestone: release.milestone, status: statusFor(id), evidenceDocument: release.evidenceDocument })));
  const counts = slices.reduce<Record<VerticalSliceStatus, number>>((result, row) => ({ ...result, [row.status]: result[row.status] + 1 }), { COMPLETE: 0, PARTIAL: 0, NOT_STARTED: 0, EXTERNAL_EVIDENCE_REQUIRED: 0, BLOCKED_BY_DECISION: 0 });
  return { contractVersion: "inventory-console-vertical-slice-audit/v1", completionScope: "REPOSITORY_ONLY" as const, counts, slices };
}

function parseMilestones(markdown: string) {
  return markdown.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\| (IC-\d{3}) \| (.*?) \| (.*?) \|\s*$/);
    return match ? [{ id: match[1], title: match[2], acceptance: match[3] }] : [];
  });
}

export function auditInventoryConsoleVerticalSlices(markdown: string, availablePaths: ReadonlySet<string>) {
  const parsed = parseMilestones(markdown), expected = PROGRAM_RELEASES.flatMap((release) => release.slices), expectedSet = new Set(expected), parsedSet = new Set(parsed.map((slice) => slice.id));
  const blockers = [
    ...(parsed.length === 121 ? [] : [`Expected 121 milestone rows; parsed ${parsed.length}.`]),
    ...expected.filter((id) => !parsedSet.has(id)).map((id) => `Milestone catalog is missing ${id}.`),
    ...parsed.filter((slice) => !expectedSet.has(slice.id)).map((slice) => `Unexpected slice ${slice.id}.`)
  ];
  const releaseBySlice = new Map(PROGRAM_RELEASES.flatMap((release) => release.slices.map((slice) => [slice, release] as const)));
  const rows: VerticalSliceAuditRow[] = parsed.map((slice) => {
    const release = releaseBySlice.get(slice.id); if (!release) throw new Error(`No release owns ${slice.id}.`);
    if (!availablePaths.has(release.evidenceDocument)) blockers.push(`${slice.id} evidence document is missing: ${release.evidenceDocument}.`);
    const status = statusFor(slice.id), remainingGap = BLOCKED_GAPS[slice.id] ?? EXTERNAL_GAPS[slice.id] ?? GAP_OVERRIDES[slice.id] ?? (status === "COMPLETE" ? "No repository acceptance gap identified. Deployment, operational validation, pilot, and activation remain separate gates." : DEFAULT_GAPS[release.release]);
    const nextAction = status === "COMPLETE" ? "Preserve conformance; attach later operational evidence only to the applicable R12 gate." : status === "EXTERNAL_EVIDENCE_REQUIRED" ? "Execute the named real-environment exercise and submit independently reviewed R12 evidence." : status === "BLOCKED_BY_DECISION" ? "Obtain and record the named decision before dependent activation or evidence collection." : "Implement and verify the remaining acceptance behavior in a dependency-ordered gap-closure branch.";
    return { ...slice, release: release.release, milestone: release.milestone, status, evidenceReferences: [release.evidenceDocument, "docs/inventory/INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md"], remainingGap, nextAction, completionScope: "REPOSITORY" };
  });
  const counts = rows.reduce<Record<VerticalSliceStatus, number>>((result, row) => ({ ...result, [row.status]: result[row.status] + 1 }), { COMPLETE: 0, PARTIAL: 0, NOT_STARTED: 0, EXTERNAL_EVIDENCE_REQUIRED: 0, BLOCKED_BY_DECISION: 0 });
  return { contractVersion: "inventory-console-vertical-slice-audit/v1", disposition: blockers.length ? "BLOCKED" as const : "AUDITED" as const, completionClaim: "REPOSITORY_ONLY" as const, blockers, counts, rows };
}
