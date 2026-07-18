# IC-000 — Program Charter and No-Code-to-Code Gate

**State:** `BLOCKED FOR SIGN-OFF`  
**Scope:** Enterprise Inventory Console R0-R12  
**Current authority:** Documentation implementation only

## Charter

Deliver one enterprise Inventory Console that connects Home, Inventory Lifecycle, Control Tower, Acquisition & Appraisal, Inventory-to-Frontline, retail completion, Shop & Recon, Parts Operations, Disposition & Wholesale, Reviews, Approvals, Reports, Administration, integrations, and enterprise readiness through canonical shared services and auditable vertical slices.

The program optimizes staff productivity and operational truth. It does not replace human authority, external systems of record, accounting, legal/title judgment, or safety controls.

## Fixed boundaries

- One deployable application unless an approved ADR changes the boundary.
- Existing canonical domains and shared enterprise services are reused before any new foundation is created.
- Commands are purpose-built, idempotent, version-aware, server-authorized, and evidence-bearing.
- Recommendations remain advisory; consequential action requires an authorized human command.
- External request, provider acceptance, internal completion, and reconciliation are different states.
- Deployment does not imply migration, rollout, pilot, integration activation, or production use.
- Approved mockup values are illustrative and cannot become live facts or unlabeled fixtures.

## Ownership and signature register

Role codes come from the approved Vehicle Operations governance baseline. A role title is not a signature; a named accountable person and date are required.

| Required authority | Accountable person | Decision scope | Status |
| --- | --- | --- | --- |
| Executive/business sponsor | `TBD` | Charter, risk acceptance, release/stop authority | `OPEN` |
| Product owner | `TBD` | Journey, source hierarchy, scope, acceptance | `OPEN` |
| Architecture owner | `TBD` | Canonical domains, contracts, ADR decisions | `OPEN` |
| Security/privacy owner | `TBD` | Access, fields, exports, privacy, threat controls | `OPEN` |
| Data/KPI owner | `TBD` | Definitions, quality, reconciliation, restatement | `OPEN` |
| Finance/title owner | `TBD` | Cost basis, title/release, financial authority | `OPEN` |
| Integration owner | `TBD` | Actual systems, authority, acknowledgements, fallback | `OPEN` |
| Operations/support owner | `TBD` | Monitoring, incident, runbooks, training, recovery | `OPEN` |
| Pilot owner | `TBD` | Cohort, environment, daily control, outcome evidence | `OPEN` |

One person may fill more than one role only when the separation-of-duties matrix explicitly permits it. The requester cannot self-approve a consequential proposal when four-eyes control applies.

## First-transition scope

R0 authorizes no application code. The recommended next order, after this gate passes, is M1 foundation conformance beginning with IC-010. Existing implementation is inspected and tested first; gaps are implemented only when separately authorized.

## Pilot and release fields

| Field | Required decision | Current state |
| --- | --- | --- |
| Pilot organization/location | Exact permitted location IDs and time zone | `OPEN` |
| Pilot roles/users | Named trained participants and permissions | `OPEN` |
| Pilot records/volume/duration | Bounded cohort and minimum observation window | `OPEN` |
| Source systems | Actual systems, owners, environments, access modes | `OPEN` |
| Success thresholds | Accuracy, task time, errors, mismatches, incidents, support load | `OPEN` |
| Stop thresholds | Safety, identity, custody, authority, privacy, duplicate, reconciliation, reliability | Zero tolerance for critical failures; remaining numeric thresholds `OPEN` |
| Pause/rollback | Named decision maker, kill switches, read continuity, recovery evidence | `OPEN` |
| Release authority | Named go/no-go approvers by gate | `OPEN` |

Recommended Minneapolis/20-vehicle/30-day values in earlier planning remain proposals, not approved policy.

## Branch and change strategy

- R0 branch: `codex/inventory-console-r0-implementation-readiness`.
- One later implementation branch per authorized release/milestone or smaller risk-bounded slice.
- No commit, push, PR, merge, deployment, real migration, integration call, or rollout is inferred from an implementation request.
- Each execution order must state those actions explicitly.
- Changes to canonical ownership, authority, navigation, or release order require coordinated program updates and an ADR where architecture is affected.

## Code authorization checklist

- [x] Program, roadmap, architecture, milestones, and execution protocol exist.
- [x] R0 branch and documentation-only stop boundary are known.
- [x] Approved visual sources and primary navigation are versioned.
- [ ] Named people accept every required ownership role.
- [ ] Actual source systems and field/workflow authority are approved.
- [ ] KPI targets, quality/freshness, materiality, and pilot thresholds are approved.
- [ ] Fixed first-slice acceptance fixtures are approved.
- [ ] Pilot, pause, rollback, support, and release decision records are signed.
- [ ] First M1 execution order states code authority and git/activation limits.
- [ ] No material canonical-domain, command, navigation, or authority question remains.

**Gate result:** `NO-GO FOR M1 CODE` until all unchecked blocking items are resolved and signed.

