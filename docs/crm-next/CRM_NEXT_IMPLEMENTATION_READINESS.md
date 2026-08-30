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
