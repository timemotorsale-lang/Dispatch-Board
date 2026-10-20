# Inventory Lifecycle Team Functions

Implementation baseline: 2026-10-10, release/inventory-console-adoption.
This is local implementation evidence, not a production deployment approval.

## Assignment

Use existing Team Management direct functions or role-default functions. There
is no separate permission store. Authentication reloads these assignments for
each request. Removing an assignment removes that source of authority; existing
manager roles and explicit capability grants can still authorize the account.

| Existing team function | Authority |
| --- | --- |
| Work on inventory | Workspace and lifecycle visibility, not mutation |
| Edit acquisition intake | Intake drafts; not acquisition confirmation |
| Manage inventory acquisition | Vehicle creation, acquisition, receiving, inventory cycle and intake confirmation |
| Execute inventory recon | Inspections, recon planning/execution coordination, work packets, repair/parts/evidence operations |
| Verify inventory readiness | Quality, safety, title and delivery readiness evidence |
| Edit inventory pricing | Price proposals and provisional intake prices; not publishing |
| Publish inventory listings | Merchandising review and observed publication reconciliation |
| Authorize inventory release | Frontline release, retail sale/delivery/reconciliation, disposition and unwind |

For staff who should execute the entire inventory lifecycle, assign this complete
package through their existing role defaults or direct functions. New function
definitions do not automatically grant permissions to real accounts. Existing
inventory-management roles retain their prior authority.

## Retained Boundaries

- Explicit applicable denials, location/expiry restrictions and grant constraints
  are evaluated before role or function authority.
- Readiness evidence, stage eligibility, exact versions and idempotency remain
  mandatory. The server enforces permissions, not just the buttons.
- Quality review identifies the signed-in reviewer. Workflow owners cannot
  self-review where independence is required. Sale/unwind approvals remain
  independent. No automatic approval has been enabled.
- Inventory functions do not certify technicians or grant diagnostic conclusion
  confirmation. Technical Shop stages still require qualified authority.
- Assigned execution records and work sessions retain executor ownership checks.
- External publication, payment and accounting adapters remain unchanged.
- Rollout administration is separate from inventory task authority.

## Master Disabled And Release Preflight

MASTER_DISABLED means the applicable Vehicle Operations master flag is absent
or OFF. A role/function assignment cannot enable it. FEATURE_DISABLED,
OUTSIDE_PILOT and SHADOW_ONLY identify different configuration blockers.

Run the read-only check against the intended deployment database and a named
fully authorized account before staff rollout:

```powershell
npm run check:inventory-access -- --user-id <staff-id> --location-id <location-id>
```

Load the deployment's DATABASE_URL using its existing environment mechanism.
The check prints host/database without credentials, available functions,
rollout eligibility and permission decisions. It exits unsuccessfully if any
required rollout or full-lifecycle permission is missing. An intentionally
limited staff account will therefore fail the full-package check correctly.
Repeat per operating location and representative account; it is not a substitute
for evaluating amount, ownership, field or independent-review constraints on
individual commands.

Do not automatically turn on a missing/OFF master during application startup or
migration. An authorized rollout administrator must use the existing audited
Settings > Vehicle Operations controls after confirming database, migrations,
cohort and release revision.

## Local Evidence

- Applied only 20261010140000_inventory_lifecycle_team_functions to verified
  localhost:5432/dispatch_board. It inserts six Duty definitions, no assignments
  and no rollout changes.
- All ten existing active, role-assigned local staff are intake-pilot eligible.
  Retail, shop and parts rollout checks execute at the Minneapolis location.
- The vehicle reported in the intake error, 7c8c0aee-cea8-4a2d-9c52-0003e480aea3,
  loads its DRAFT from the authoritative local service.
- A simulated staff actor using an existing pilot user ID with acquisition and
  pricing functions loads that intake with both editing authorities. No real
  account assignments were changed by the simulation.
- Following explicit user authorization, the full eight-function package was
  assigned locally to Inventory Manager and Operations Coordinator role defaults
  and directly to Baraka Sales. Existing duties were preserved and changes
  audited. Brock Inventory, Brock Harris, Ancilla Ops and Baraka Sales passed
  all lifecycle permission and intake-pilot checks. These database assignments
  are not transported by a Git commit or the function-definition migration.
- Collections assignment remains pending: the requested Evelyn account did not
  match the existing Eva Collections account. No Collections permissions were
  changed.
- Automated coverage verifies direct/default functions, task separation,
  removal/inactivity, applicable denials, spending constraints, independent
  quality review, service-side command authorization and master shutdown.

## Acceptance And Rollback

1. Assign the complete package to two approved test staff through Team Management.
2. Confirm Add Vehicle & Continue Intake opens the created vehicle's compact form;
   save/reopen its draft, open its inventory cycle and confirm intake without duplicates.
3. Execute recon, readiness, pricing and merchandising on exact versions; reject
   stale submissions and unready transitions. Qualified technicians perform the
   technical sign-offs.
4. Have the second authorized person perform independent release/sale approval;
   reject self-approval, then complete observed delivery and reconciliation.
5. Remove a direct function with no role-default equivalent; verify the affected
   command is denied. Test location denials and spending limits.
6. Pause intake/master through rollout controls in a test environment; verify
   writes stop with an actionable message and existing vehicle/draft data remains.
7. Repeat the authenticated browser workflow on the deployed revision before
   claiming production acceptance. Local service simulation is not browser or
   production proof.

To contain a problem, use audited feature pause/rollback, revoke the relevant
team assignment, or redeploy the recorded last-known-good application revision.
Keep database migration/history and saved vehicle records; do not delete records
or reset the database to undo a permission rollout. Record the actual deployed
revision before promotion. No production configuration or deployment is changed
by this implementation slice.
