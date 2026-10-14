# Inventory-to-Frontline Staff Experience

**Status:** Proposed experience contract  
**Version:** `0.1.0`  
**Activation:** Documentation only

## 1. Experience objective

Staff should not need to understand the entire workflow engine. At each moment the system should answer:

- What needs attention now?
- Why does it matter?
- What does the system already know, and from where?
- What decision or work is expected from me?
- Which options are actually available?
- What evidence is required?
- When is it due?
- Who can help or approve it?
- What will happen after I respond?

The workflow should reduce decisions and re-entry, not turn operations into data-entry administration.

## 2. Access model

Workflows are not additional global tabs.

| Surface | Staff purpose |
| --- | --- |
| Overview | Managers see workflow health, acquisition-to-frontline flow, aging, exposure, and attention needs |
| Live Board | Teams see active workflow work grouped by stage, owner, location, or exception |
| My Work | Staff receive only their eligible decisions, tasks, approvals, follow-ups, and evidence requests |
| Exceptions | Authorized owners resolve blocked, overdue, conflicting, or failed workflow conditions |
| Manager Review | Managers approve cost, disposition, exceptions, overrides, and release decisions within authority |
| Vehicle Workbench / Vehicle 360 | Users see complete vehicle workflow context and perform contextual commands |
| Activity/Audit | Authorized users inspect attributable history |
| Administration -> Workflows | Policy owners manage draft, approved, shadow, pilot, active, paused, and retired versions |

Automatic triggers may propose or start a workflow according to rollout mode. Authorized users may manually start from the vehicle/inventory record when policy permits. Staff execute resulting work rather than browsing a template catalog.

## 3. Decision card contract

Every adaptive decision card contains:

1. Vehicle identity and current physical/custody context.
2. Workflow stage, owner, elapsed time, target, and urgency reason.
3. One plain-language question.
4. A short explanation of why it is asked.
5. Prefilled facts with source, freshness, and confidence state.
6. Context-sensitive answer options.
7. Recommended option, if any, with explanation—not visual coercion.
8. Consequence preview: work, approval, hold, escalation, or next stage.
9. Required evidence and validation.
10. Help, report-conflict, and save/return actions.

Example:

```text
Vehicle: 2019 Toyota Camry SE · Stock TMS19045
Stage: Transport Planning · Case owner: Inventory Manager

Where is the vehicle now?
This determines whether transport is required and which methods are safe.

Known source: Auction release record · refreshed 18 minutes ago

[At auction] [At dealership] [At seller] [In transit]
[Location unknown] [Information conflicts]

After you answer: the workflow will show eligible transportation options
or create a location-resolution task. It will not dispatch a vehicle yet.
```

## 4. Progressive disclosure

Questions appear only when their conditions are true.

- Do not ask whether transport is arranged if the vehicle is verified at its destination.
- Do not show internal driving when roadworthiness or insurance eligibility is absent.
- Do not ask staff to re-enter authoritative acquisition facts; allow them to report a conflict.
- Do not request manager-only decisions from staff; offer “Request manager approval” and preserve the entered proposal.
- Do not display every exception recovery option when only a subset is currently eligible.
- Do not show later-stage checklists before they become useful, except as a concise readiness preview.

## 5. Answer design

Use explicit operational choices rather than ambiguous Yes/No where the negative has multiple meanings.

For “Has transportation been arranged?” present:

- Arranged and confirmed
- Requested; awaiting confirmation
- Not arranged
- Seller/auction arranging
- Internal pickup planned
- Already in transit
- Unable to arrange
- Unknown
- Transportation not required

When an option requires structured detail, reveal only that follow-up section. Staff can review the effect before submission.

## 6. Recommendations and alternatives

A recommendation includes:

- action;
- reasons;
- authoritative inputs and freshness;
- expected time/cost/risk where supported;
- required approval;
- confidence/data sufficiency;
- eligible alternatives;
- excluded alternatives and reasons when helpful.

The primary action may emphasize a safe recommended option, but eligible alternatives remain accessible. Hard-rule-ineligible actions are unavailable with an explanation, not merely hidden when understanding the reason helps staff recover.

## 7. Task card contract

Every workflow-created task shows:

- outcome-oriented title;
- vehicle/stock reference;
- current stage and case owner;
- assigned executor;
- due time and clock type;
- priority/class-of-service reasons;
- exact next action;
- checklist and required evidence;
- dependencies and readiness;
- blocked/waiting controls;
- what completion will unlock;
- link to complete vehicle context.

Starting, completing, blocking, or waiting must be fast on mobile. High-impact approvals and plan changes may require a larger confirmation experience.

## 8. State and failure presentation

Every surface distinguishes:

- loading;
- empty/no eligible work;
- live/fresh;
- stale;
- partially available;
- missing required information;
- conflicting sources;
- unauthorized;
- concurrent update conflict;
- provider/integration unavailable;
- accepted command pending projection;
- command rejected with actionable reason;
- retry/recovery available.

The application must not retain prototype values or static vehicle detail while presenting a live projection. Facts, calculations, estimates, predictions, and recommendations use distinct labels.

## 9. Conflict-safe staff recovery

If another user changes the case while a staff member is responding:

1. preserve the staff member's unsaved/entered information;
2. show the latest authoritative state and who/what changed it;
3. explain whether the decision is still applicable;
4. allow safe reapply, merge, or discard according to the command;
5. never silently overwrite the newer state.

## 10. Help and escalation

“I need help” offers structured options:

- information is missing;
- displayed information is wrong;
- I do not have authority;
- I cannot complete this by the target;
- safety or condition concern;
- external party is unresponsive;
- system/integration problem;
- other documented issue.

The result is an owned task or correlated exception with a response target. It is not an unowned message.

## 11. Manager experience

Managers receive exception-first views containing:

- decision/approval required;
- exact affected vehicle and outcome;
- requested action and requester;
- evidence and freshness;
- cost, timing, safety, customer, and operational impact;
- eligible alternatives;
- policy/authority basis;
- approve, reject, return-for-information, assign, contain, or escalate commands;
- reason and evidence requirements;
- downstream consequence preview.

Bulk actions are prohibited for decisions whose evidence or consequences must be evaluated individually. Low-risk routine assignment may support safe bulk operation later with preview and per-item results.

## 12. Accessibility and operational usability

- Complete workflows by keyboard and assistive technology.
- Do not communicate state only by color.
- Use dealership terminology approved by actual operators.
- Keep decision labels short; keep policy explanation available without crowding the task.
- Preserve drafts when navigation, conflicts, or recoverable failures occur.
- Support responsive desktop, tablet, and mobile execution.
- Make evidence capture resilient to slow upload and show pending/failed state.
- Avoid alert noise; route one actionable exception to a responsible person.

## 13. Staff validation requirement

Before code activation, inventory staff, receiving staff, a manager, and at least one person responsible for transportation must walk through the catalog using real anonymized cases. Validation records:

- misunderstood questions or terms;
- options that are missing or never used;
- unnecessary questions;
- information the system should prefill;
- tasks that lack a clear owner;
- evidence staff cannot reasonably capture;
- unsafe shortcuts or excessive approvals;
- mobile/field constraints;
- recovery paths for common mistakes.
