# Role Landing and Record Routing Algorithms

**Product:** Time Motor Sales Dispatch Board
**Program:** Role-Aware Workspace Optimization
**Version:** `1.0.0`
**Status:** Approved implementation contract
**Date approved:** July 25, 2026
**Role experience:** [`ROLE_EXPERIENCE_MATRIX.md`](ROLE_EXPERIENCE_MATRIX.md)
**Page and record routing:** [`TECHNICIAN_WORKSPACE_PAGE_RECORD_ROUTING_MATRIX.md`](TECHNICIAN_WORKSPACE_PAGE_RECORD_ROUTING_MATRIX.md)

---

## 1. Governing principles

1. Authentication identifies the user.
2. Authorization determines permitted capabilities and records.
3. Workspace selection determines the simplified shell.
4. Record routing opens the authoritative specialist page.
5. The server revalidates every protected read and command.
6. Resolver output is deterministic, explainable, and testable.
7. No resolver creates, copies, or mutates a canonical record.

## 2. Landing-page resolver

### Inputs

- authenticated user;
- active roles and duties;
- active organization/location grants;
- optional preferred workspace;
- optional safe `returnTo`;
- feature availability;
- last active workspace, when policy permits persistence.

### Resolution order

```text
1. No authenticated user
   -> /login

2. Safe, permitted returnTo supplied
   -> returnTo

3. Valid preferred workspace supplied for a multi-role user
   -> preferred workspace landing

4. General Manager or delegated manager capability
   -> /board

5. Service Department Manager
   -> /vehicles/shop-recon

6. Inventory Manager
   -> /vehicles

7. Service Advisor
   -> /appointments

8. Mechanic or Technician
   -> /my-tasks
   -> resolve attendance inside the technician workspace:
      NONE/CLOSED -> Clock In gate
      ON_MEAL     -> End Meal gate
      OPEN        -> My Work
      unavailable -> non-blocking warning + My Work

9. Parts role
   -> /vehicles/parts-operations

10. QC role
    -> /vehicles/quality-control

11. Salesperson
    -> /tasks?department=SALES

12. Marketing/Advertisement Manager
    -> /tasks?department=MARKETING

13. Office Manager, Collections, or unknown authenticated staff
    -> /my-tasks
```

The first matching permitted rule wins. A configured preference may choose among permitted workspaces but cannot elevate authority.

## 3. Record-routing resolver

### Inputs

- record type and ID;
- authenticated actor;
- optional originating queue;
- available canonical links;
- current record version and state.

### Resolution order

```text
RepairJob
  -> /vehicles/repair-jobs/:repairJobId/workbench

Task linked through InventoryWorkPacket.repairJobId
  -> /vehicles/repair-jobs/:repairJobId/workbench

DiagnosticCase
  -> /diagnostics/cases/:caseId/troubleshooting

Task linked to a DiagnosticCase
  -> /diagnostics/cases/:caseId/troubleshooting

InventoryWorkPacket without RepairJob
  -> /vehicles/:vehicleId/workbench

RepairOrder
  -> /vehicles/repair-workbench?repairOrderId=:repairOrderId

Review or approval item
  -> /manager-review with authoritative subject context

General Task
  -> /tasks/:taskId
```

Specialist linkage wins over the generic Task destination. The resolver must never route a repair-linked task to a second repair-completion form.

## 4. Technician assignment projection

### Shift gate

Authentication, attendance, and repair labor are intentionally separate:

```text
sign in
  -> resolve technician workspace
  -> resolve attendance state
     -> off clock: Clock In gate
     -> on meal: End Meal gate
     -> clocked in: My Work
     -> attendance unavailable: warn, preserve My Work, notify manager

open assigned repair
  -> technician explicitly starts the RepairJob labor clock
```

Clock Out is disabled while the technician has a running repair labor clock. The technician must pause or finish the repair first so payroll time and job labor cannot silently diverge.

My Work combines, without merging records:

- current and staged `RepairJobDispatch` assignments;
- the technician's linked diagnostic cases;
- assigned general Tasks;
- waiting, blocked, review, and recently submitted work.

It may also include a read-only Shop Pulse derived from permitted aggregate shop facts. Shop Pulse is context, not a fourth technician page and not a substitute for Shop Dispatch.

Ordering:

1. active/running repair job;
2. active paused or blocked repair job;
3. staged next repair job;
4. assigned safety-critical or overdue work;
5. remaining assigned work by priority and due time;
6. recently submitted work.

Each row carries its authoritative destination from the record-routing resolver.

## 5. Available Work eligibility and ranking

Eligibility is evaluated before ranking:

- active user and location access;
- claimable state;
- no conflicting current assignment;
- required skill and certification;
- required bay, tool, and safety readiness;
- Parts and authorization readiness;
- dependency readiness;
- no separation-of-duty conflict.

Eligible candidates are ranked deterministically by priority, due/promise risk, skill fit, location, readiness, dependency-unblock value, and workload saturation. The UI explains the operational reason. It must not expose an employee grade or performance score.

Claiming is atomic. A successful claim writes the authoritative assignment or dispatch and returns the record-routing destination. A race returns `no longer available` without creating a duplicate assignment.

## 6. Multi-role algorithm

```text
permittedWorkspaces = resolveWorkspaces(effectiveCapabilities)

if permittedWorkspaces is empty:
  use SAFE_GENERAL_STAFF

if preferredWorkspace is permitted:
  use preferredWorkspace

otherwise:
  use the highest-precedence landing rule
```

The workspace switcher lists only `permittedWorkspaces`. Switching controls presentation, not capability. Deep links are checked independently.

## 7. Empty states

| State | Required behavior |
| --- | --- |
| My Work has no assignments | Explain that nothing is assigned; show `Find Available Work`; show manager-direction state when claim is unavailable |
| Technician is off clock | Show the focused Clock In gate; do not render repair execution controls until attendance is open |
| Technician is on meal | Show End Meal and the shift/labor distinction; do not resume repair execution implicitly |
| Attendance capture unavailable | Preserve My Work, show an honest non-blocking warning, retry, and manager-reconciliation direction |
| Available Work has no eligible candidates | Explain that no eligible work is ready; offer refresh and return to My Work; never show inaccessible jobs |
| Repair Workbench has no valid assignment | Do not show execution controls; offer My Work and request-direction routes |
| Diagnostic case has no linked repair work | Preserve diagnostic case and explain that repair authorization/handoff is pending |
| No feature/capability configured | Show unavailable reason and safe return route; do not render fake data |

## 8. Unavailable, forbidden, stale, and conflict states

- **Unavailable:** dependency, feature, or data source cannot serve the request. Preserve work and provide retry plus a safe return.
- **Forbidden:** actor lacks scope or assignment. Do not reveal protected record details.
- **Not found:** record does not exist or is not visible. Do not distinguish those cases to unauthorized users.
- **Stale:** link or version is superseded. Resolve the canonical successor when permitted or ask the user to refresh.
- **Conflict:** assignment, claim, or command lost a race. Show current ownership/state and return to the originating queue.
- **Completed:** route to read-only outcome/evidence or the next assigned work; never reopen implicitly.

## 9. Redirect rules

1. Preserve only relative, allowlisted application paths.
2. Reject protocol-relative paths, backslashes, external origins, and unauthorized console roots.
3. Login honors a safe permitted `returnTo`; otherwise it uses the landing resolver.
4. Legacy aliases redirect to one canonical route.
5. Specialist-linked task routes redirect to the specialist record.
6. A mechanic opening a broad console root is redirected to My Work unless another active workspace permits it.
7. A contextual, permitted record link may open without exposing its parent console navigation.
8. Redirect loops fail closed to the workspace landing page.

## 10. Audit and observability

Record:

- selected workspace and rule code;
- rejected return-target reason without storing secrets;
- specialist-routing decision;
- claim result and conflict;
- denied record type and policy code;
- legacy redirect use;
- unavailable dependency state.

These events support troubleshooting and security review. They are not employee-performance measurements.

## 11. Required tests

- role-by-role landing resolution;
- mechanic and manager multi-role preference;
- safe and unsafe `returnTo`;
- mechanic-only navigation;
- RepairJob and repair-linked Task routing;
- generic Task fallback;
- assignment and claim permission;
- claim race behavior;
- empty available queue;
- unavailable and forbidden workbench;
- completed and stale record redirects;
- no redirect loop;
- no second canonical repair or task record created.
- shift clock and repair labor clock remain separate;
- off-clock, on-meal, active-shift, active-repair, and attendance-unavailable states.
