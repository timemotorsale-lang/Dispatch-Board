# CRM Next — Implementation Readiness

**Status:** CRMN-001 through CRMN-006 approved readiness baseline  
**Decision:** Product Owner approved CRMN-001 through CRMN-006 implementation-readiness decisions on 2026-08-28.

## Readiness verdict

CRM Next is ready for the first controlled implementation slice after the current approved baseline is pushed and an isolated CRM Next implementation branch/workspace is created. Product Owner approval confirms the route, feature flag, Legacy protection posture, and CRMN-010 starting boundary.

## CRMN-001 through CRMN-006 scorecard

| Gate | Current state | Readiness |
|---|---|---|
| CRMN-001 approve documentation pack | CRM Next documentation pack is represented under `docs/crm-next/`. | Approved |
| CRMN-002 inspect Legacy routes/screens | `/customers`, `/customers/customer-360`, `/customers/resolutions`, `/crm`, opportunity, quote, and supporting APIs were inspected. | Approved audit baseline |
| CRMN-003 inventory schema/services | Customer, task, appointment, activity, vehicle, opportunity, quote, approval, saved-view, and integration-readiness models/services exist. | Approved audit baseline |
| CRMN-004 complete capability ledger | Initial reuse/redesign/migrate/retire/defer map is documented. | Approved for implementation planning |
| CRMN-005 data ownership map | Source-owner boundaries are recorded for Customers, Tasks, Appointments, Vehicles, Activity, and CRM commercial records. | Approved for implementation planning |
| CRMN-006 feature-flag/parallel-route plan | `/crm-next`, `CRM_NEXT`, Legacy protection, and CRMN-010 starting boundary are approved. | Approved |

## Route strategy

CRM Next should be built as a parallel replacement experience inside the existing Dispatch Board platform.

### Existing routes remain operational

- Keep `/customers` available as the Legacy Customers surface.
- Keep `/customers/customer-360`, `/customers/[customerId]`, and `/customers/resolutions` available during build.
- Keep current `/crm` and `/crm/*` routes available during build unless a separate cleanup task is approved.
- Do not redirect or retire Legacy routes until CRM Next passes promotion and rollback gates.

### CRM Next route decision

Use a separate CRM Next route and feature control during implementation:

- Approved implementation route: `/crm-next`
- Approved feature flag: `CRM_NEXT`
- Production default: off until promotion
- Development/review default: enabled only for approved review users or local review mode

This keeps CRM Next from being confused with the current Unified CRM review shell at `/crm`.

### Future cutover options

After CRM Next passes promotion:

1. make `/crm-next` the internal default CRM entry;
2. optionally redirect `/crm` to CRM Next;
3. keep `/customers` read-only/reference for an approved stabilization window;
4. retire or redirect Legacy routes only after no critical capability is missing.

## First implementation slice proposal

The first code slice is approved as:

**CRMN-010 — CRM Next shell and feature flag**

Scope:

- Add isolated `/crm-next` route.
- Add server-side feature gate that fails closed.
- Add simple shell with approved CRM Next navigation.
- No customer mutations.
- No live communications.
- No replacement of `/customers` or `/crm`.
- Include unavailable, unauthorized, and fallback states.
- Add focused tests for flag-off, unauthorized, permitted review, and safe fallback behavior.

Out of scope:

- replacing existing Legacy routes;
- moving data;
- live SMS/email/phone;
- new customer/opportunity writes;
- provider integrations.

## Before coding checklist

- Route approved: `/crm-next`.
- Feature flag approved: `CRM_NEXT`.
- Legacy protection approved: existing `/customers`, `/customers/*`, `/crm`, and `/crm/*` stay operational during build.
- CRMN-010 boundary approved: shell + feature flag only; no customer writes, no live communications, no route replacement.
- Current checkpoint committed: `7629a9dd chore: checkpoint crm cleanup and crm next docs`.
- Remaining setup before code: push the approved baseline and create the isolated CRM Next implementation branch/workspace.

## Current implementation hold

Do not implement CRM Next on the shared `main` baseline directly. Start CRMN-010 only after the approved baseline is pushed and an isolated branch/workspace is created from that baseline.

## Implementation evidence — CRMN-010 through CRMN-015 initial UX envelope

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-command-center`  
**Scope:** CRM Next shell at `/crm-next`, Command Center layout, Needs Attention queue, Customer 360 overview, Work Customer/Attend Mode, and action-to-task dispatch bridge preview.  

**Safety posture:**
- Legacy `/customers` remains linked and operational.
- Current `/crm` remains linked and operational.
- CRM Next is controlled by `CRM_NEXT` and fails closed when the flag is absent or off.
- No customer writes, live communications, route replacement, or Dispatch Board task creation were enabled.
- CRMN-015 is preview-only: it returns the bridge handoff shape without mutating Dispatch Board tasks.

**UX baseline:** User-approved CRM Next UI mockup dated 2026-08-28: Command Center, Customer 360, Customer Workbench/Attend Mode, Needs Attention, Intelligence & Next Action, and Dispatch Board handoff flow.

## Implementation evidence — CRMN-016 visible progress cockpit

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-command-center`  
**Scope:** Added a visible CRM Next implementation progress surface at `/crm-next/progress` and staged the next 20-milestone delivery envelope from CRMN-016 through CRMN-035.  

**Review location:** `/crm-next/progress` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- Progress uses the approved status vocabulary only: PLANNED, CONTRACTED, IN_PROGRESS, IMPLEMENTED_UNVERIFIED, VERIFIED, HELD, DEFERRED.
- The page is read-only and does not create customer, communication, opportunity, or Dispatch Board task records.
- Legacy `/customers` and current `/crm` remain linked as fallback review paths.
- The envelope is explicitly sequential: each milestone is reviewed, verified, and committed before moving to the next slice.

## Implementation evidence — CRMN-017 through CRMN-035 review-safe milestone envelope

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-command-center`  
**Scope:** Completed the CRM Next review-safe envelope after the progress cockpit: UX navigation polish, search shell, grouped search, dynamic Customer 360 context, 70/30 Attend Mode refinement, universal action bar, open-items rail, unified source-linked timeline, responsive behavior, state/permission/rollback proof pages, lead/opportunity read adapters, read-only pipeline board, appointments context, test-drive review, deal review, and sales timeline events.

**Review locations:**
- `/crm-next`
- `/crm-next/search`
- `/crm-next/needs-attention`
- `/crm-next/customers/michael-johnson`
- `/crm-next/work/attn-michael-overdue-follow-up`
- `/crm-next/timeline`
- `/crm-next/pipeline`
- `/crm-next/appointments`
- `/crm-next/test-drives`
- `/crm-next/deals`
- `/crm-next/system/states`
- `/crm-next/system/permissions`
- `/crm-next/system/rollback`
- `/crm-next/progress`

**Safety posture:**
- Legacy `/customers` and current `/crm` remain available and unchanged.
- CRM Next remains behind `CRM_NEXT`.
- New CRM Next surfaces are review-safe/read-only.
- Live calling, texting, email, customer writes, deal mutation, appointment mutation, and Dispatch Board task creation remain disabled.
- Source-of-truth boundaries are preserved: customer, vehicle, appointment, sales/deal, communication, and Dispatch context are displayed as linked review data, not duplicated operational ownership.
- Rollback remains simple: disable `CRM_NEXT` and `/crm-next` fails closed to safe fallback workspaces.

**Progress truth:** CRMN-016 through CRMN-035 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader pilot-release proof and user review are complete. The next implementation marker is CRMN-036.

## Implementation evidence — CRMN-040 through CRMN-048 ownership/support foundation

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-ownership-intelligence-envelope`  
**Scope:** Added the first packet of the CRMN-040 through CRMN-067 envelope: vehicle relationships, BHPH/finance context, payment context, common case framework, titles/documents, service, rentals/loaners, customer issues, and insurance context.

**Review location:** `/crm-next/ownership-support` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers`, current `/crm`, Dispatch Board, tasks, appointments, vehicles, and repair/service workspaces remain protected.
- Stage 1 is review-safe and read-only.
- Vehicle, finance, payment, case, document/title, service, rental/loaner, customer issue, and insurance cards show source-of-truth ownership instead of creating duplicate systems.
- Sensitive finance, payment, document, and insurance execution remains restricted or held.
- No payment collection, document sending, rental contract mutation, case closure, repair mutation, customer write, or Dispatch Board task creation is enabled.

**Progress truth:** CRMN-040 through CRMN-048 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-050.

## Implementation evidence — CRMN-050 through CRMN-054 shared execution foundation

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-ownership-intelligence-envelope`  
**Scope:** Added the second packet of the CRMN-040 through CRMN-067 envelope: CRM-to-shared-task linkage, Dispatch Board customer context, comments/blockers/review synchronization, task activity to Customer 360 timeline posture, and manager customer-work queue foundation.

**Review location:** `/crm-next/shared-execution` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRM Next still does not create live Dispatch Board tasks.
- Shared execution is preview-only/read-only unless a later business approval enables live commands.
- Dispatch Board remains the operating owner for task status, assignment, comments, blockers, reviews, and manager execution.
- CRM Next displays bridge shape, source systems, destination surfaces, and safety limits without duplicating task records.
- No reassignment, escalation, override, comment write, blocker write, task completion, customer write, or communication send is enabled.

**Progress truth:** CRMN-050 through CRMN-054 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-060.

## Implementation evidence — CRMN-060 through CRMN-067 intelligence foundation

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-ownership-intelligence-envelope`  
**Scope:** Added the third packet of the CRMN-040 through CRMN-067 envelope: explainable signal foundation, risk scoring posture, next-best-action foundation, opportunity intelligence, priority rules, Needs Attention intelligence, feedback-loop foundation, and manager intelligence cockpit.

**Review location:** `/crm-next/intelligence-foundation` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- Intelligence is advisory, explainable, and human-reviewed.
- Every card shows the signal, recommendation, explanation, source system, confidence posture, and safety boundary.
- No AI action, customer mutation, live call, live text, live email, task creation, task completion, deal movement, manager override, or reassignment is enabled.
- Opportunity intelligence remains read-only and does not change pipeline stages.
- Priority and queue intelligence explain review order without silently reprioritizing Dispatch Board work.
- Feedback-loop categories are foundation-only; no model training or automatic preference mutation occurs.

**Progress truth:** CRMN-060 through CRMN-067 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-068.

## Implementation evidence — CRMN-068 through CRMN-074 Command Center review completion

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-pilot-readiness-envelope`  
**Scope:** Added the first packet of the CRMN-068 through CRMN-094 pilot-readiness envelope: compact review UX completion, visible review-state labels, employee Command Center, manager Command Center, appointments/work summary, pipeline/intelligence summary, and team-response/load indicators.

**Review location:** `/crm-next` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers`, current `/crm`, Dispatch Board, tasks, appointments, manager workspaces, and source-owned modules remain protected.
- Command Center cards are review-safe and do not create, mutate, reassign, escalate, send, or complete work.
- Employee and manager command views show guidance, metrics, and review paths without enabling live actions.
- Appointments/work and pipeline/intelligence summaries link to existing CRM Next review surfaces while preserving source-of-truth ownership.
- Team load indicators explain pressure without invisible reprioritization or assignment automation.

**Progress truth:** CRMN-068 through CRMN-074 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-075.

## Implementation evidence — CRMN-075 through CRMN-079 pilot scenario expansion

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-pilot-readiness-envelope`  
**Scope:** Added the second packet of the CRMN-068 through CRMN-094 pilot-readiness envelope: pilot customer scenarios, Needs Attention scenario expansion, Customer 360 context expansion, timeline/communications scenario coverage, and manager pilot-review scenarios.

**Review location:** `/crm-next/pilot-readiness` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers`, current `/crm`, Dispatch Board, communication systems, and source-owned workspaces remain protected.
- Pilot scenarios are read-only review records.
- The page explains what reviewers should inspect, what source system owns the data, and what remains gated.
- No customer write, opportunity write, payment action, live call, live text, live email, task creation, manager override, or route replacement is enabled.
- Scenario links route reviewers back to already-gated CRM Next review surfaces instead of creating new operational commands.

**Progress truth:** CRMN-075 through CRMN-079 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-080.

## Implementation evidence — CRMN-080 through CRMN-086 hardening packet

**Status:** MIXED — CRMN-080 is `HELD`; CRMN-081 through CRMN-086 are `IMPLEMENTED_UNVERIFIED`  
**Branch:** `codex/crm-next-pilot-readiness-envelope`  
**Scope:** Added the third packet of the CRMN-068 through CRMN-094 pilot-readiness envelope: migration/reconciliation hold visibility, pilot proof plan, accessibility/responsive review checklist, performance budget posture, security/audit boundaries, rollback rehearsal posture, and one hardening evidence package.

**Review location:** `/crm-next/hardening` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRMN-080 is intentionally held because migration/reconciliation execution is outside this approval envelope.
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers`, current `/crm`, Dispatch Board, communications, finance/payment, document, insurance, and manager-control systems remain protected.
- Hardening gates are reviewer-facing evidence and do not promote, migrate, replace routes, create customer records, send communications, or create Dispatch Board tasks.
- Rollback remains simple: disable `CRM_NEXT`, and CRM Next fails closed while Legacy/current CRM remain available.

**Progress truth:** CRMN-080 is marked `HELD` until a later migration/cutover approval. CRMN-081 through CRMN-086 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. The next implementation marker is CRMN-087.

## Implementation evidence — CRMN-087 through CRMN-090 Legacy coexistence packet

**Status:** MIXED — CRMN-087 through CRMN-089 are `IMPLEMENTED_UNVERIFIED`; CRMN-090 is `HELD`  
**Branch:** `codex/crm-next-pilot-readiness-envelope`  
**Scope:** Added the fourth packet of the CRMN-068 through CRMN-094 pilot-readiness envelope: Legacy coexistence map, capability migration planning posture, pilot switchback rules, and explicit Legacy-retirement hold.

**Review location:** `/crm-next/coexistence` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- Legacy `/customers` and current `/crm` remain operational.
- CRM Next remains a parallel review/replacement candidate behind `/crm-next` and `CRM_NEXT`.
- Capability migration planning does not replace backend models, services, APIs, permissions, data, or integrations.
- Users have visible switchback paths to current operational routes during pilot.
- CRMN-090 is intentionally held because Legacy retirement requires explicit promotion/cutover approval.
- No redirect, deletion, archive, deprecation, migration execution, or route replacement is included.

**Progress truth:** CRMN-087 through CRMN-089 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until broader proof and user review are complete. CRMN-090 is marked `HELD` until Legacy retirement is explicitly approved. The next implementation marker is CRMN-091.

## Implementation evidence — CRMN-091 through CRMN-094 pilot release gates

**Status:** MIXED — CRMN-091 through CRMN-093 are `IMPLEMENTED_UNVERIFIED`; CRMN-094 is `HELD`  
**Branch:** `codex/crm-next-pilot-readiness-envelope`  
**Scope:** Added the final packet of the CRMN-068 through CRMN-094 pilot-readiness envelope: pilot promotion checklist, training/operations readiness, release-candidate proof bundle visibility, and pilot-launch approval hold.

**Review location:** `/crm-next/pilot-release` with `CRM_NEXT=REVIEW`.

**Safety posture:**
- CRM Next remains a protected preview until leadership explicitly approves pilot launch.
- CRMN-094 is intentionally held; the implementation does not launch the pilot.
- No customer writes, live communication, task creation, deal movement, manager override, migration execution, route replacement, or Legacy retirement is enabled.
- The pilot release page is a reviewer-facing checklist and proof register, not an operational promotion command.
- Legacy `/customers` and current `/crm` remain the safe operating fallback.

**Progress truth:** CRMN-091 through CRMN-093 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until the release-candidate proof bundle and user review are complete. CRMN-094 is marked `HELD` until pilot launch is explicitly approved. The envelope now points to `Pilot approval` as the next decision, not an automatic rollout.

## Implementation evidence — CRMN-095 through CRMN-119 operational read envelope

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-operational-read-envelope`  
**Scope:** Moved CRM Next from static/scenario-only review surfaces toward safe operational read surfaces by adding existing source-owned customer list, Unified CRM search, Needs Attention, Customer 360, vehicle relationship, and customer timeline adapters.

**Review locations:**
- `/crm-next`
- `/crm-next/search`
- `/crm-next/needs-attention`
- `/crm-next/customers/michael-johnson`
- `/crm-next/timeline`
- `/crm-next/progress`

**What changed:**
- CRM Next now tries to read existing customer records through the Unified CRM customer list service before using protected preview records.
- CRM Next search now tries to read existing grouped Unified CRM global search results before using protected preview search groups.
- Needs Attention rows can be built from source-owned customer next-action dates with deterministic High/Medium/Low priority.
- Customer 360 can hydrate source-owned customer detail, masked contacts, vehicle relationships, appointments, open case/opportunity counts, and recent timeline items.
- Timeline events preserve source labels and source links from the existing customer timeline read model.
- A visible operational-read status strip shows whether the current screen is using `LIVE_READ`, `PARTIAL_READ`, `EMPTY_READ`, or `FALLBACK_READ`.

**Safety posture:**
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers` and current `/crm` remain operational and linked.
- Customer, search, Customer 360, and timeline data remain source-owned by existing backend services.
- CRM Next does not create a new customer master.
- No customer writes, customer creation, live calls, live texts, live emails, deal movement, payment action, document sending/uploading, Dispatch Board task creation, migration execution, route replacement, default switch, broad flag promotion, or pilot launch is enabled.
- Missing, inaccessible, gated, or partial source data falls back honestly to protected preview data and visible status messaging.

**Progress truth:** CRMN-095 through CRMN-119 are marked `IMPLEMENTED_UNVERIFIED`, not `VERIFIED`, until final release-candidate proof, source-owner review, and pilot approval are complete. The next decision remains `Pilot approval`, not automatic rollout.

## Implementation evidence — CRMN-120 operating CRM navigation conversion

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-operational-read-envelope`  
**Scope:** Converted the CRM Next shell from an implementation/review cockpit into a staff-facing operating CRM navigation model.

**What changed:**
- Regular sidebar navigation now emphasizes daily CRM work: Command Center, Customers, Needs Attention, Work Customer, Search, Pipeline, Timeline, Appointments, Deals, Ownership & Support, Shared Execution, and Intelligence.
- Build-review/governance pages were removed from the regular staff navigation.
- Build milestone cards were removed from the operating Command Center dashboard body.
- Staff-facing action cards now occupy that space: work next customer, open Customer 360, prepare contact, review appointments, prepare follow-up task, and review deals.
- A low-emphasis `/crm-next/review` Review Center keeps the hidden pages available when explicitly needed for approval, QA, release, or leadership review.
- The hidden review pages remain: Progress, Pilot Readiness, Hardening, Coexistence, Pilot Release, system permissions, system states, and rollback review.

**Safety posture:**
- No review/proof page was deleted.
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers` and current `/crm` remain operational and linked.
- No customer writes, communication sends, task creation, migration execution, route replacement, pilot launch, or default CRM switch was enabled.

**Progress truth:** CRMN-120 is marked `IMPLEMENTED_UNVERIFIED` until user review confirms the staff-facing navigation is simpler and the hidden Review Center remains sufficient for approval workflows.

## Implementation evidence — CRMN-121 compact Customer 360 redesign

**Status:** IMPLEMENTED_UNVERIFIED  
**Branch:** `codex/crm-next-operational-read-envelope`  
**Scope:** Redesigned the CRM Next Customer 360 page for review using the compact Legacy Customers landing page as the visual and layout reference.

**What changed:**
- Customer 360 now leads with the customer profile instead of a large implementation/source-status block.
- Source/read status moved into a compact trust strip.
- Added compact customer metric tiles for leads, cases, appointments, tasks, documents, and SLA/risk.
- Added a right-side operating rail with Quick Actions, Next Best Action, Customer Risk, and Linked Vehicles.
- Preserved Customer 360 tabs and source-linked overview/timeline content.

**Safety posture:**
- This is a layout/UI redesign only.
- Existing CRM Next read adapters remain read-only.
- No live call, text, email, task creation, case creation, document upload/send, customer write, deal movement, route replacement, migration, or pilot launch was enabled.

**Progress truth:** CRMN-121 is marked `IMPLEMENTED_UNVERIFIED` until user review approves the redesigned Customer 360 layout for adoption.

## Implementation evidence — CRMN-122 through CRMN-150 pilot-ready operating envelope

**Status:** IMPLEMENTED_UNVERIFIED / FINAL PROOF IN PROGRESS  
**Branch:** `codex/crm-next-operational-read-envelope`  
**Scope:** Converts CRM Next from a protected review cockpit toward a pilot-ready operating CRM candidate by wiring normal staff actions to safe destinations, keeping risky capabilities held, and extending progress/readiness truth through CRMN-150.

**Review locations:**
- `/crm-next`
- `/crm-next/search`
- `/crm-next/needs-attention`
- `/crm-next/customers/michael-johnson`
- `/crm-next/work/attn-michael-overdue-follow-up`
- `/crm-next/actions/log-call`
- `/crm-next/actions/send-email`
- `/crm-next/actions/send-text`
- `/crm-next/actions/new-task`
- `/crm-next/actions/new-case`
- `/crm-next/actions/schedule-appointment`
- `/crm-next/actions/upload-document`
- `/crm-next/timeline`
- `/crm-next/deals`
- `/crm-next/appointments`
- `/crm-next/review`
- `/crm-next/progress`
- `/crm-next/pilot-release`

**What changed:**
- Added a CRM Next operating-action readiness catalog for Log Call, Send Email, Send Text, New Task, New Case, Schedule Appointment, and Upload Document.
- Added `/crm-next/actions/[actionId]` so visible staff actions route to a safe, useful page instead of dead anchors or accidental 404s.
- Customer 360 Quick Actions now open safe CRM Next action readiness routes.
- Attend Mode action buttons now open safe action routes or existing source-owned workspaces.
- The Schedule Appointment action is treated as a safe route to the existing appointment workspace, while appointment mutations remain source-owned.
- Communication, task, case, and document actions show their source authority, current state, audit posture, and pilot requirement before any live activation.
- Progress milestones now include CRMN-122 through CRMN-150, with CRMN-150 retained as the final proof bundle gate.

**Safety posture:**
- CRM Next remains behind `/crm-next` and `CRM_NEXT`.
- Legacy `/customers` and current `/crm` remain operational and linked.
- CRM Next does not become the default CRM.
- CRM Next does not create a duplicate customer master.
- No live phone call, text, email, customer write, payment action, document upload/send, deal movement, migration execution, Legacy read-only switch, route replacement, pilot launch, or broad feature-flag promotion was enabled.
- Held actions render useful readiness states rather than pretending to be live.
- Every future live-capable action identifies source authority and audit posture before activation.

**Remaining blockers before release or broad pilot:**
- User acceptance of the Customer 360 and staff workflow layout.
- Browser proof on the actual running app for desktop/laptop/tablet/mobile overflow.
- Business approval for the pilot cohort, action permissions, rollback owner, and go/no-go decision.
- Provider/consent/quiet-hours/audit approval before any live communication.
- Document authority, storage, retention, and restricted-field approval before upload/send.
- Dispatch Board task creation approval before CRM Next creates live tasks.
- Migration/reconciliation approval before any Legacy/default route cutover.

**Progress truth:** CRMN-122 through CRMN-149 are marked `IMPLEMENTED_UNVERIFIED`. CRMN-150 remains `IN_PROGRESS` until the final proof bundle is run and accepted. CRM Next is a pilot-ready operating candidate only after proof and business approval; it is not release-approved by implementation alone.
