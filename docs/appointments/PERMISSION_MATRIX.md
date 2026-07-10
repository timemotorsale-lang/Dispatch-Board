# Enterprise Appointment Permission Matrix

**Status:** Initial MVP gate evidence exists; broader Enterprise 1.0 policy remains planned
**Approved boundary:** Only a manager or the appointment owner may change an appointment  
**Enforcement:** Server-side policy is authoritative

## 1. Policy Model

Appointment authorization evaluates:

```text
Authenticated user
+ active role and capabilities
+ organization and location access
+ appointment ownership
+ appointment participation
+ appointment state
+ requested action
+ sensitive-field scope
= allow or deny
```

Possession of an appointment identifier never grants access. List, search, export, reporting, and direct-record access apply the same policy boundary.

## 2. Policy Actors

| Actor | Definition |
| --- | --- |
| Manager | User with appointment-management authority for the appointment location |
| Owner | User currently recorded as the single accountable appointment owner |
| Participant | Internal user attached to the appointment but not its owner |
| Viewer | User with schedule-view permission but no ownership or participation |
| Appointment Administrator | User allowed to configure purposes, templates, resources, policies, or automation |
| System Automation | Trusted internal process executing an active, versioned rule |

One user can satisfy multiple actors. The highest applicable permission applies only within the user’s authorized organization and location boundary.

## 3. Live Appointment Actions

| Action | Manager | Owner | Participant | Viewer | Administrator only | System automation |
| --- | --- | --- | --- | --- | --- | --- |
| View schedule summary | Allow | Allow | Allow | Allow when location policy permits | No implicit access | As required |
| View full appointment | Allow | Allow | Allow, subject to field restrictions | Deny unless separately granted | No implicit access | As required |
| View restricted customer fields | Allow when granted | Allow when granted | Deny by default | Deny | No implicit access | Only for authorized rule |
| Create appointment | Allow | Allow when general creation is granted | Deny | Deny | No implicit access | Allow by active rule |
| Create appointment from task | Allow | Allow when task and appointment ownership rules permit | Deny unless also owner | Deny | No implicit access | Allow by active rule |
| Edit title, purpose, notes, or operational fields | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Change time or duration | Allow | Allow, subject to conflicts | Deny | Deny | Deny | Only by active rule |
| Add or remove participants | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Add or remove resources | Allow | Allow, subject to conflicts | Deny | Deny | Deny | Only by active rule |
| Change confirmation | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Check in or reverse check-in | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Mark no-show | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Start, wait, resume, or finish execution | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Record outcome and reason | Allow | Allow | Deny | Deny | Deny | Only by active rule |
| Reschedule | Allow | Allow, subject to policy | Deny | Deny | Deny | Only by active rule |
| Cancel | Allow | Allow, subject to policy | Deny | Deny | Deny | Only by active rule |
| Transfer ownership | Allow | Request only | Deny | Deny | Deny | Only by explicit rule |
| Override warning | Allow with reason | Deny unless policy explicitly grants a named warning | Deny | Deny | Deny | Deny by default |
| Override hard block | Deny; resolve condition | Deny | Deny | Deny | Deny | Deny |
| Link existing task | Allow | Allow | Deny | Deny | Deny | Allow by active rule |
| Create linked task | Allow | Allow when task policy permits | Use task workflow only | Deny | Deny | Allow by active rule |
| Remove task link | Allow | Allow when link is not template-required | Deny | Deny | Deny | Only by compensating rule |
| View appointment history | Allow | Allow | Limited to visible events | Deny by default | No implicit access | As required |
| Add internal note | Allow | Allow | Deny unless implemented as a linked-task comment | Deny | Deny | Only by active rule |
| Export appointment records | Separate export capability required | Deny by default | Deny | Deny | Deny | Approved reporting jobs only |

## 4. Administration Actions

| Action | Manager | Appointment Administrator | Owner | Other users |
| --- | --- | --- | --- | --- |
| View active configuration | Allow | Allow | Read purpose-relevant configuration | Deny |
| Create or revise appointment purpose | Only if also administrator | Allow | Deny | Deny |
| Activate or deactivate purpose | Only if also administrator | Allow | Deny | Deny |
| Create or revise template | Only if also administrator | Allow | Deny | Deny |
| Manage reason and outcome catalogs | Only if also administrator | Allow | Deny | Deny |
| Manage resource types and capacity | Only if also administrator | Allow | Deny | Deny |
| Manage location hours and closures | Only if also administrator | Allow | Deny | Deny |
| Create or revise automation rule | Only if also administrator | Allow | Deny | Deny |
| Simulate automation rule | Only if also administrator | Allow | Deny | Deny |
| Activate, pause, or retire automation rule | Only if also administrator | Allow with two-step confirmation | Deny | Deny |
| View automation failure queue | Allow for managed locations | Allow | Deny unless owner is affected | Deny |
| Replay failed automation | Allow with reason | Allow with reason | Deny | Deny |
| View security audit | Separate audit capability required | Deny by default | Deny | Deny |

## 5. Location and Organization Boundaries

- A manager’s authority applies only to authorized locations unless organization-wide authority is explicitly granted.
- An owner must have access to the appointment location.
- Moving an appointment to another location reruns permissions, resource availability, conflicts, purpose eligibility, and required-task rules.
- Cross-location reports require explicit organization-level reporting permission.
- Search suggestions must not reveal customer, vehicle, appointment, or resource records outside the user’s scope.
- Direct URLs return a consistent not-found or forbidden response without leaking record existence.

## 6. Sensitive Information

Field visibility is independent from appointment visibility.

Recommended field classes:

| Class | Examples | Default visibility |
| --- | --- | --- |
| Operational | Purpose, time, owner, location, public resource labels | Authorized schedule viewers |
| Limited | Customer name, phone, vehicle identifiers, complaint summary | Manager and owner when granted |
| Restricted | Sensitive notes, payment-related context, protected documents | Explicit field capability only |
| Audit | Prior values, override reasons, access events | Manager or auditor capability |

Sensitive values must be masked in shared schedule views when full detail is not required.

## 7. Ownership Rules

- Every scheduled appointment has exactly one accountable owner.
- Draft automation output may remain unowned only while placed in the review queue.
- Only a manager can finalize an ownership transfer.
- An owner can request reassignment but cannot assign responsibility to another user unilaterally.
- Owner deactivation, absence, or loss of location access creates a manager-review item.
- Bulk ownership changes require preview, conflict evaluation, reason, confirmation, and audit history.

## 8. System Automation Authority

System automation is not an unrestricted manager.

Every automated mutation requires:

- Active rule identifier and version
- Authorized trigger
- Matching organization and location
- Deterministic inputs
- Idempotency key
- Correlation to source record
- Permission-safe owner and participant selection
- Conflict evaluation
- Recorded result

Automation creates a draft review item when required authority, ownership, time, or resources cannot be resolved. It cannot override a warning or hard block.

## 9. Denial and Audit Behavior

- Denied mutations return a consistent permission error.
- Denials do not partially change data.
- Privileged and suspicious denials are security events.
- Successful sensitive-field access is auditable when policy requires it.
- Permission changes do not rewrite historical actor or owner records.
- Background and bulk operations apply authorization to every affected appointment.

## 10. Permission Acceptance Gate

The permission model passes only when automated tests prove:

- A manager can manage appointments only within authorized scope.
- An owner can manage their appointment but cannot use manager overrides.
- A participant cannot mutate an appointment.
- A viewer cannot reach restricted detail by direct URL or API.
- An administrator cannot mutate live appointments solely because they administer templates.
- Cross-location search and reporting do not leak records.
- Automation cannot exceed its rule authority.
- Every appointment mutation passes through a reusable server-side policy.

Initial MVP evidence is tracked in `APPOINTMENT_PERMISSION_SAFETY_GATE.md` and `APPOINTMENT_CROSS_LOCATION_SEARCH_PROOF.md`. The current safety gate proves the live command boundary and scoped appointment search/read boundary for manager, owner, participant, viewer, and appointment-admin-only actors; durable export/reporting and broader system-action coverage remain rollout hardening items.

