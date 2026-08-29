# CRM Next — Implementation Readiness

**Status:** CRMN-001 through CRMN-006 readiness baseline  
**Decision:** Do not start production implementation until this packet is reviewed.

## Readiness verdict

CRM Next is ready for foundation planning and controlled documentation adoption. It is not yet ready for the first production implementation slice because the repository now needs a clean branch/worktree state, a formal CRM Next route/flag decision, and review of the reuse/migration map.

## CRMN-001 through CRMN-006 scorecard

| Gate | Current state | Readiness |
|---|---|---|
| CRMN-001 approve documentation pack | CRM Next documentation pack is now represented under `docs/crm-next/`. | Ready for Product Owner review |
| CRMN-002 inspect Legacy routes/screens | `/customers`, `/customers/customer-360`, `/customers/resolutions`, `/crm`, opportunity, quote, and supporting APIs were inspected. | Audit baseline complete |
| CRMN-003 inventory schema/services | Customer, task, appointment, activity, vehicle, opportunity, quote, approval, saved-view, and integration-readiness models/services exist. | Audit baseline complete |
| CRMN-004 complete capability ledger | Initial reuse/redesign/migrate/retire/defer map is documented. | Ready for review |
| CRMN-005 data ownership map | Source-owner boundaries are recorded for Customers, Tasks, Appointments, Vehicles, Activity, and CRM commercial records. | Ready for review |
| CRMN-006 feature-flag/parallel-route plan | Route strategy is documented below; implementation decision still required. | Needs approval before coding |

## Route strategy

CRM Next should be built as a parallel replacement experience inside the existing Dispatch Board platform.

### Existing routes remain operational

- Keep `/customers` available as the Legacy Customers surface.
- Keep `/customers/customer-360`, `/customers/[customerId]`, and `/customers/resolutions` available during build.
- Keep current `/crm` and `/crm/*` routes available during build unless a separate cleanup task is approved.
- Do not redirect or retire Legacy routes until CRM Next passes promotion and rollback gates.

### CRM Next route proposal

Use a separate CRM Next route and feature control during implementation:

- Preferred implementation route: `/crm-next`
- Preferred feature flag: `CRM_NEXT`
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

After this readiness packet is reviewed, the first code slice should be:

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

- Confirm whether CRM Next route should be `/crm-next` or another approved internal path.
- Confirm whether the feature flag should be `CRM_NEXT`, `CRM_NEXT_REVIEW`, or another existing convention.
- Clean or isolate the current uncommitted source work before starting implementation.
- Decide whether the current Unified CRM `/crm` code will be treated as Legacy, source foundation, or future redirect target.
- Confirm Product Owner acceptance of the reuse/migration map.

## Current blocker

The repository currently contains uncommitted source changes and `.next-local` cache noise from prior work. CRM Next implementation should not begin until the next branch/workspace is clean or the current work is intentionally committed and isolated.

