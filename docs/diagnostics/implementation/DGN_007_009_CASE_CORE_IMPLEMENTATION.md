# DGN-007–009 — Diagnostic Case Core Implementation

**Milestones:** `DGN-007`, `DGN-008`, `DGN-009`  
**Status:** Implemented in source; additive migration not deployed by this branch  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G1`

## Delivered Runtime Slice

Dispatch Board now has an independent `DIAGNOSTICS` / `DIAGNOSTIC_CASE` aggregate foundation. This slice implements durable case identity, immutable concern and state history, governed create/read behavior, assignment, lifecycle transitions, blockers represented by explicit waiting states, escalation, abandonment, terminal outcomes, and reopen handling.

It does not implement the `/diagnostics` console UI, evidence capture, test plans, reasoning, conclusions, diagnosis publishing, repair handoff, verification execution, knowledge ingestion, hardware adapters, or AI.

## Persistence

The additive migration introduces:

- `DiagnosticCase` with organization, location, vehicle, Repair Order, concern key/fingerprint, risk tier, assignment, lifecycle, resume state, aggregate version, and open/close timestamps;
- `DiagnosticConcernVersion` with immutable statement, operating conditions, canonical Repair Order source snapshot, author, source classification, and supersession lineage;
- `DiagnosticCaseStateEvent` with immutable version, event type, prior/next status and assignee, stable reason code, actor, correlation, and occurrence time;
- case status, risk-tier, and state-event enums;
- composite tenant foreign keys to Location, Vehicle, Repair Order, and Diagnostic Case;
- unique Repair Order/concern-key and case/version constraints;
- database triggers that reject update or deletion of concern versions and state events;
- all contracted Diagnostics rollout flags seeded `OFF`.

A Repair Order can have multiple cases using distinct stable concern keys. The case always retains the canonical intake concern snapshot; a qualified shop-authored decomposition is labeled `REPAIR_ORDER_CONCERN_DERIVATION` rather than replacing or disguising the source concern.

## Command and Reliability Behavior

Implemented commands:

- `CREATE_DIAGNOSTIC_CASE`;
- `ASSIGN_DIAGNOSTIC_CASE`;
- `TRANSITION_DIAGNOSTIC_CASE`;
- `ESCALATE_DIAGNOSTIC_CASE`;
- `REOPEN_DIAGNOSTIC_CASE`;
- `ABANDON_DIAGNOSTIC_CASE`.

Each mutation uses the existing enterprise transaction pattern for request-hash idempotency, expected aggregate version, command ledger, case mutation, immutable case event, audit record, exact domain event, and `diagnostics.case` outbox message.

Creation uses a deterministic case ID derived from organization and idempotency key. Exact retries reach the ledger before mutable case validation and return the original result. Reuse of an idempotency key with different input and stale aggregate or Repair Order versions fail with typed conflicts and no partial write.

## Authority and Rollout

Implemented capability codes:

- `DIAGNOSTIC_CASE_VIEW`;
- `DIAGNOSTIC_CASE_CREATE`;
- `DIAGNOSTIC_CASE_ASSIGN`;
- `DIAGNOSTIC_CASE_TRANSITION`.

General/delegated managers retain server-side management authority. Mechanics receive view, create, and transition defaults, but a non-manager can transition only a case assigned to that technician. Assignment to another person requires assignment authority. Explicit deny still wins. Own-resource grants permission-filter case queues.

Mutations require both `DIAGNOSTICS_MASTER` and `DIAGNOSTIC_CASES` to be executable. Every Diagnostics feature is seeded `OFF`; this branch does not activate a pilot or production cohort.

## Lifecycle Invariants

- No shortcut from draft/triage directly to confirmed cause or closure.
- Waiting and escalated cases retain the exact state to which they may resume.
- A waiting case may resume only to that stored state or be abandoned.
- Terminal cases must be explicitly reopened before further work.
- Reopened cases return through triage.
- Closed timestamps exist only for verified closed, inconclusive, no-fault-found, or abandoned outcomes.
- Terminal cases cannot be reassigned without reopening.
- Stable reason codes must be compatible with their target states.

## API Boundary

| Method/path | Behavior |
| --- | --- |
| `GET /api/diagnostics/cases` | Permission-filtered case queue |
| `POST /api/diagnostics/cases` | Create one governed concern-specific case |
| `GET /api/diagnostics/cases/{caseId}` | Permission-checked case detail and history |
| `POST /api/diagnostics/cases/{caseId}/assignment` | Assign or reassign with expected version and reason |
| `POST /api/diagnostics/cases/{caseId}/transition` | Execute a validated lifecycle, waiting, escalation, terminal, or reopen transition |

The endpoints are runtime backend boundaries for later UI milestones; no UI completion is claimed.

## Verification Evidence

- Prisma formatting and schema validation pass.
- Standard Prisma Client generation passes through a temporary output path because a running Windows process held the in-place query-engine DLL; the normal generated client files were restored without stopping that process.
- Focused Diagnostics and enterprise-command tests pass: 4 files, 21 tests.
- TypeScript typecheck passes.
- Tests cover normalization, deterministic identity, concern fingerprinting, lifecycle sequencing, waiting/resume, terminal/reopen, reason-code compatibility, canonical concern derivation, authority boundaries, assigned-technician enforcement, own-resource filtering, rollout-off behavior, and post-transition replay routing.
- The full suite passes 242 of 244 files and 1,353 of 1,355 tests; the two remaining failures are pre-existing Inventory Control Tower visual-contract expectations (`Selected inventory unit` and `Decisions`/`Audit Trail`) outside this branch's scope.

## Remaining Gate

`DG-G1` remains open. DGN-010 through DGN-012 must still deliver and prove the independent console shell, case workspace, Repair Order bridge, responsive/accessibility states, and operational browser workflows.
