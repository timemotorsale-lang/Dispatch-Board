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
