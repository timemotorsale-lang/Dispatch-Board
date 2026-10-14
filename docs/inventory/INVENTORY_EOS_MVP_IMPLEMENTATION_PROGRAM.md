# Inventory Execution Operating System MVP Implementation Program

**Status:** Repository implementation complete; operational acceptance pending  
**Branch:** `codex/inventory-eos-mvp-implementation`  
**Implementation mode:** Sequential, independently reviewable milestones; all changes remain uncommitted  
**Last updated:** July 19, 2026

## 1. Purpose

This document is the implementation control record for the approved Inventory Execution Operating System MVP. It translates the official product, forms, vehicle card, workbench, workflow launcher, and roadmap documents into repository-deliverable milestones without creating a second task engine or claiming operational evidence that can only be earned in a live pilot.

The MVP is a vehicle-centered execution layer over the existing authoritative domains:

- Tasks/My Work remains the shared work backbone.
- Vehicle 360 remains the vehicle-centered record.
- Repair Order, Parts, Shop, evidence, authority, audit, and outbox services remain authoritative for their domains.
- The Vehicle Card is the canonical lifecycle projection.
- The Vehicle Workbench is the focused execution workspace.
- Recommendations remain deterministic, explainable, and advisory unless an approved bounded command explicitly permits automation.

## 2. Authority and bounded interpretation

The implementation authorization attached to this program supersedes earlier no-code restrictions only for application code, automated tests, repository documentation, and source-controlled schema or migration artifacts. It does not authorize deployment, production activation, external-provider activity, purchases, shared-database migration, or consequential automation.

Where the enterprise roadmap includes operational rollout, a milestone receives one of four truthful dispositions:

- **Repository deliverable** — implemented and verified in source.
- **Existing foundation** — already implemented and reused, with conformance evidence recorded.
- **External evidence required** — code may be ready, but pilot, provider, production, or workplace proof is not available under this authorization.
- **Decision required** — a material authority, financial, or policy decision is still needed; the safest fail-closed behavior remains in force.

## 3. Baseline record

### 3.1 Working tree and branch

- Branch confirmed: `codex/inventory-eos-mvp-implementation`.
- Working tree was clean before implementation began.
- Existing Add Vehicle implementation and official documents were already committed before this program started and are treated as reusable foundation.
- This program will not stage, commit, push, deploy, or open a pull request.

### 3.2 Baseline verification

| Gate | Baseline result | Disposition |
| --- | --- | --- |
| Full automated test suite | 1,282 of 1,283 tests passed; one stale trace-count assertion expected 18 after the approved Add Vehicle action raised the authoritative count to 19 | Corrected in EOS-M0; production behavior unchanged |
| TypeScript validation | Passed | Baseline accepted |
| Zero-warning lint | Passed; only a Babel large-file de-optimization informational message | Baseline accepted |
| Prisma schema validation | Passed | Baseline accepted |
| Inventory program validation | Repository conformance passed; operational evidence remains required | External evidence is not claimed |
| Inventory vertical-slice audit | 69 complete, 31 partial, 0 not started; 17 require external evidence and 4 require decisions | Used as bounded implementation input |

## 4. MVP milestone execution matrix

| EOS milestone | Objective and bounded slices | Dependencies | Repository acceptance gate | Roadmap mapping |
| --- | --- | --- | --- | --- |
| **EOS-M0 — Authorization, baseline, and traceability** | Confirm authority, preserve worktree, run baseline, classify all roadmap milestones, establish implementation ledger, correct stale non-behavioral baseline assertion | Official adoption and attached implementation authorization | Baseline recorded; all M0–M35 receive a disposition; focused test passes; no staged files | M0–M3 |
| **EOS-M1 — Shared Inventory Work Contract** | Add the versioned Inventory Work Packet as a Task extension; current/staged invariant; urgency, readiness, definition of done, dependency, evidence, blocker recovery, handoff, authority and audit contracts | Existing Tasks, Vehicle, authority, audit/outbox foundations | Contract validation, permission, idempotency, concurrency, invariant, and negative-path tests pass | M4–M5 |
| **EOS-M2 — Official Vehicle Card** | Implement canonical compact and expanded vehicle-card projections; source authority; Flow Clock; current and staged actions; financial exposure; constraint, next best action, linked work, execution health, and context commands | EOS-M1 plus Vehicle 360 projections | Projection/component/accessibility tests; no generic stage mutation; stale/unavailable states remain truthful | M6–M7, M10 |
| **EOS-M3 — Vehicle Execution Workbench Core** | Create focused vehicle execution workspace with overview, work orders, parts, evidence, activity, persistent identity/action shell, authoritative links, and responsive hierarchy | EOS-M1–M2; Repair Order, Parts, evidence services | Route, projection, component, permission, unavailable-state, desktop/mobile tests | M7, M16–M19 |
| **EOS-M4 — Time-Aware Current Work** | Start/pause/resume/complete time sessions, estimates, elapsed/remaining guidance, checkpoints, overrun prompts, manager visibility without surveillance or automatic discipline | EOS-M1–M3 | Idempotency, single-active-session, concurrency, time-boundary, permission, and component tests | M6–M8, M11 |
| **EOS-M5 — Quick Closeout, Blocker, Completion, and Handoff** | Required low-burden technician closeout; conditional explanation for incomplete/further-diagnosis outcomes; optional detail; evidence-backed completion; structured blocker recovery; accepted handoff | EOS-M1–M4 | Required/conditional validation, fail-closed completion, evidence, blocker, recovery, and handoff tests | M8–M9 |
| **EOS-M6 — Manager Decision and Next Plan** | Manager direction, private comment, structured next-task preview and publish, expected effects, separation of duties, optimistic concurrency, audit | EOS-M5 | Authority, stale-version, duplicate, next-task lineage, audit/outbox, and UI tests | M10–M11 |
| **EOS-M7 — Readiness and Next-Best-Work Orchestration** | Deterministic eligibility and readiness hard gates; explainable sequencing; confidence and freshness; Start Workflow guided questions; bounded low-risk coordination | EOS-M1–M6 | Rule-version, explanation, stale/unavailable input, tie-break, shadow/manual fallback, and launcher tests | M12–M15, M24–M26 |
| **EOS-M8 — Receipt-to-Recon Integrated Slice** | Wire Add Vehicle purpose to receipt, identity/custody, condition evidence, inspection, findings/triage, and recon handoff through the shared work contract | EOS-M1–M7 and existing Add Vehicle foundation | Integrated service/route/component happy paths plus duplicate, conflict, blocker, recovery, and permission paths | M16; foundation for M17–M23 |
| **EOS-M9 — Integrated Acceptance and Handoff** | Accessibility, responsive behavior, security, audit, recovery, measurement definitions, operational runbooks, full regression and production build | EOS-M0–M8 | Full applicable suite, typecheck, lint, build, schema/migration validation, Inventory validators, safe local browser checks, diff review | M27–M29; repository portion of M31–M35 |

## 5. Enterprise-roadmap disposition matrix

| Roadmap milestone | MVP disposition | Implementation evidence or boundary |
| --- | --- | --- |
| M0 Program authorization | Existing foundation | Official adoption plus attached implementation authorization |
| M1 Current-state conformance audit | EOS-M0 repository deliverable | Baseline and source audit recorded here |
| M2 Operational baseline | External evidence required | Repository baseline is recorded; live cycle-time, WIP, adoption, and quality measures require a controlled pilot |
| M3 Responsibility and policy model | Existing foundation + EOS-M0 conformance | Existing role/capability framework is reused; missing policy decisions remain fail closed |
| M4 Shared Inventory Work Contract | EOS-M1 repository deliverable | Task extension, not a second work engine |
| M5 Standard states, clocks, and service classes | EOS-M1 repository deliverable | Versioned shared contract and deterministic clocks |
| M6 Start Day and daily plan | Existing foundation + EOS-M2/M4 integration | Existing Staff Day and recommendations are reused |
| M7 Current Work execution packet | EOS-M1–M4 repository deliverable | Vehicle-centered current-work projection and time guidance |
| M8 Blocker and dependency resolution | EOS-M5 repository deliverable | Structured recovery contract and manager visibility |
| M9 Evidence-backed completion and handoff | EOS-M5 repository deliverable | Completion gates and accepted handoff |
| M10 Unified Manager Control Loop | EOS-M2/M6 repository deliverable | Exception-oriented review and next-plan publication |
| M11 Capacity and work-in-process control | EOS-M4/M6 repository deliverable | One current/one staged and visible WIP; staffing policy remains manager-controlled |
| M12 Eligibility and hard-gate engine | EOS-M7 repository deliverable | Deterministic, fail-closed rules |
| M13 Readiness engine | EOS-M7 repository deliverable | Explainable and freshness-aware projection |
| M14 Next-Best-Work Sequencer | EOS-M7 repository deliverable | Advisory ranking with stable tie-breaks |
| M15 Shadow-mode evaluation | Repository support + external evidence required | Shadow/manual comparison can be coded; operational precision and adoption require a pilot |
| M16 Receipt, identity, custody, and inspection | EOS-M8 repository deliverable | Approved first vertical slice |
| M17 Recon planning and Shop execution | Existing domain foundation + EOS-M3/M8 integration | Full operational acceptance requires Shop pilot evidence |
| M18 Parts readiness and execution | Existing domain foundation + EOS-M3 integration | External/vendor fulfillment evidence is not claimed |
| M19 Quality and Inventory handoff | Existing domain foundation + EOS-M5/M8 integration | Operational acceptance requires pilot evidence |
| M20 Title and document readiness | Existing domain foundation; external evidence required | Provider and workplace validation excluded |
| M21 Merchandising, pricing, and publication | Existing domain foundation; decision/external evidence required | Consequential pricing/publication remains human-authorized |
| M22 Frontline release and post-release verification | Existing domain foundation; external evidence required | Production activation excluded |
| M23 Aging, transfer, wholesale, and disposition | Existing domain foundation; decision/external evidence required | Consequential actions remain behind existing approval controls |
| M24 Low-risk coordination automation | EOS-M7 repository deliverable | Bounded reversible coordination only |
| M25 Reversible routine execution | EOS-M7 repository support; decision required for activation | Defaults to advisory/manual until each exact automation is approved |
| M26 Consequential automation governance review | Decision required | No consequential automation will be enabled by this implementation |
| M27 Mobile, accessibility, and workplace validation | EOS-M9 repository checks + external evidence required | Automated/local checks do not replace workplace validation |
| M28 Security, privacy, authority, and audit hardening | Existing foundation + every milestone gate | Fail-closed capability checks, audit, idempotency, and concurrency |
| M29 Performance, resilience, and recovery | EOS-M9 repository checks + external evidence required | Local build/recovery evidence only; production SLO proof excluded |
| M30 External adapter activation | External evidence required | Explicitly prohibited by current authorization |
| M31 Multi-location scaling | Repository support + external evidence required | Location scoping is preserved; rollout evidence requires operations |
| M32 Controlled production pilot | External evidence required | Deployment and production activation are prohibited |
| M33 Expanded cross-functional pilot | External evidence required | Requires M32 and operational authorization |
| M34 Full Inventory lifecycle pilot | External evidence required | Requires M33 and operational authorization |
| M35 Enterprise release acceptance | External evidence required | Cannot be declared from repository evidence alone |

## 6. Cross-milestone invariants

Every implementation milestone must preserve these rules:

1. A vehicle has at most one current Inventory Work Packet and at most one staged packet.
2. The Task record is the work-system backbone; Inventory EOS records enrich or project it rather than replacing it.
3. Staff see one obvious current action, the definition of done, time guidance, readiness, dependencies, and recovery path.
4. Consequential commands remain behind approved human authority and separation-of-duties controls.
5. Recommendations expose rule version, reasons, confidence/freshness, blockers, and the authoritative source.
6. Missing, stale, unauthorized, or unavailable inputs fail closed and are never displayed as successful or available.
7. Every mutation uses validated structured input, idempotency, optimistic concurrency where applicable, and audit evidence.
8. Free text supplies context only; it never grants authority or bypasses a hard gate.
9. Technician documentation is required but optimized for rapid structured selection. Detail is mandatory only for incomplete/further-diagnosis outcomes and optional otherwise.
10. Staff execution information supports workflow and coaching; it must not become opaque employee scoring, public ranking, automatic discipline, or covert surveillance.

## 7. Milestone evidence ledger

Each milestone appends a completion record containing objective, slices, staff-visible behavior, foundations reused, exact file manifest, tests and results, browser/accessibility evidence, authority review, limitations, deferred dependencies, working-tree status, and readiness for the next milestone.

### EOS-M0 completion record

- **Outcome:** Implementation authority, repository baseline, roadmap dispositions, delivery sequence, and enterprise boundaries are explicit.
- **Slices completed:** Branch/worktree preservation; official-source audit; baseline test/type/lint/schema/program checks; M0–M35 disposition; stale trace-count correction.
- **Staff-visible behavior:** None. This milestone changes no production behavior.
- **Enterprise foundations reused:** Existing Tasks, Staff Day, Vehicle 360, Repair Order, Parts, Shop, authority, audit/outbox, evidence, Add Vehicle, and Inventory validation foundations.
- **Files changed:** This program record and the Wave 6 traceability assertion.
- **Security and authority review:** No authority or runtime path changed. External and consequential actions remain excluded.
- **Known limitations:** Operational baseline, workplace validation, provider proof, and pilot results cannot be produced under repository-only authorization.
- **Readiness:** EOS-M1 may begin after its focused verification gate passes.

### EOS-M1 through EOS-M3 completion record — shared work, Vehicle Card, and Workbench

- **Outcome:** Inventory work is modeled as a versioned Task extension and presented through one official lifecycle card and one vehicle-centered execution workspace.
- **Staff-visible behavior:** Staff receive a compact or expanded vehicle summary with current work, Flow Clock, constraint, next best action, financial exposure, execution health, and direct Workbench access. The Workbench keeps vehicle identity and current action persistent while linking authoritative Work Orders, Parts, evidence, and activity.
- **Controls:** One-current/one-staged packet invariants, optimistic versions, idempotent commands, capability checks, source freshness, honest unavailable states, and no generic lifecycle-stage mutation.
- **Repository evidence:** Inventory work packet schema/migration, domain/repository/service/API; Vehicle Card projection/component and Control Tower integration; Workbench route/service/component; focused contract, projection, component, permission, negative-path, and unavailable-state tests.

### EOS-M4 through EOS-M6 completion record — time, closeout, handoff, and manager plan

- **Outcome:** Current work now supports accountable elapsed-time guidance, fast evidence-backed technician documentation, structured recovery, accepted handoff, and governed manager direction.
- **Staff-visible behavior:** Technicians can start, pause, and resume work; see estimate/checkpoint/overrun guidance; close out through short structured selections; add optional detail; and must explain incomplete or further-diagnosis outcomes. Managers can review results, leave private direction, preview a traceable follow-up Task, and publish it as the next staged packet.
- **Controls:** A user can have only one active session; thresholds prompt rather than discipline; completion fails closed without required evidence; handoffs preserve acceptance state; manager publication uses authority, separation of duties, idempotency, optimistic concurrency, lineage, audit, and outbox evidence.
- **Repository evidence:** Three source-only migrations plus time, closeout, handoff, and manager-plan domain/repository/service/API layers; Workbench controls; focused boundary, concurrency, permission, and UI tests.

### EOS-M7 and EOS-M8 completion record — orchestration and receipt-to-recon

- **Outcome:** Start Workflow and the Workbench now use deterministic, explainable orchestration and a first integrated lifecycle execution slice.
- **Staff-visible behavior:** Readiness questions expose hard gates, missing inputs, confidence/freshness, and a single recommended action with reasons. The receipt-to-recon launcher guides five short steps: receipt context, identity/custody, condition evidence, inspection/triage, and recon handoff.
- **Controls:** Rules are versioned, deterministic, stable under ties, fail closed on stale/unavailable facts, and remain advisory except for approved reversible work-record commands. Duplicate launches, stale versions, permission failures, and blockers receive explicit recovery paths.
- **Repository evidence:** Orchestration domain/service and decision guide; receipt-to-recon domain/repository/service/API/page/component and workflow-catalog integration; focused rule, tie-break, stale-input, permission, duplicate, and recovery tests.

### EOS-M9 integrated acceptance record

- **Repository gates passed:** Full stable suite — 236 files and 1,321 tests; EOS-focused tests; TypeScript; zero-warning lint; Prisma schema validation; Next.js production build with 166 generated routes/pages; Inventory Console program validation; 121-slice conformance audit; clean diff check.
- **Browser gate:** The Playwright harness started Next.js and Chromium, but all 16 scenarios stopped in shared setup before product interaction. The older `dispatch_board_e2e` schema retains a failed `20260714170000_add_enterprise_discovery_knowledge_output` migration. A second run against a fresh isolated schema proved the underlying repository-history defect: pre-existing migration `20260713000000_add_customer_sla_control` inserts a policy for `org-time-motor-sales` before an Organization row exists, causing PostgreSQL `23503` and Prisma `P3018`; subsequent setup attempts correctly fail with `P3009`. These are migration-setup failures, not sixteen product assertion failures. Responsive/workplace acceptance remains external evidence required.
- **Migration boundary:** Four additive EOS migrations are source-controlled and schema-validated. They were not reached by the fresh-schema browser run and were not applied to any shared or production database. Prisma client types were refreshed, while the Windows query-engine DLL replacement remained locked by another process; TypeScript and build gates used the refreshed generated types successfully.
- **Security and governance:** Capability enforcement, tenancy/location scoping, idempotency, optimistic concurrency, audit/outbox evidence, human authority, no automatic discipline, no consequential automation, and truthful unavailable states remain intact.
- **Operational boundary:** Deployment, live migration reconciliation, provider round trips, production performance/recovery, named pilot ownership, workplace accessibility, adoption, cycle-time improvement, quality outcomes, and release sign-offs require separately authorized operational evidence.
- **Working-tree disposition:** All implementation files remain unstaged and uncommitted for one final user-controlled commit. No push, pull request, deployment, migration application, rollout, or activation was performed.
- **Readiness:** Repository implementation is complete for review. Operational pilot readiness is conditional on repairing the isolated migration history, reviewing/applying the new migrations in an approved environment, and completing the external-evidence gates.

## 8. Change-control rules

- Milestones remain separable through this ledger, focused tests, and bounded file manifests even though the working tree is intentionally uncommitted.
- A legitimate test will not be weakened to hide a defect. The EOS-M0 assertion update follows an authoritative action count already raised by the approved Add Vehicle slice and does not alter runtime behavior.
- Unrelated user changes will be preserved and reported.
- Every “complete” claim refers only to repository acceptance unless operational evidence is explicitly cited.
