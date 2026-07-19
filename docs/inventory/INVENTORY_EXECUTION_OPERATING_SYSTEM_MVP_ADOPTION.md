# Inventory Execution Operating System MVP Adoption Plan

**Product:** Time Motor Sales Dispatch Board  
**Program:** Inventory Console Optimization  
**Governing strategy:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md)  
**Enterprise roadmap:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md)  
**MVP version:** `1.0.0`  
**Status:** Approved official immediate-adoption baseline; operational preflight required  
**Date adopted:** July 19, 2026  
**Earliest adoption window:** July 20–25, 2026  
**Implementation claim:** None. This document defines a no-code operating adoption using verified current capabilities and governed manual controls.  
**Official adoption record:** [`INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_OFFICIAL_ADOPTION.md)  
**Official vehicle cards:** [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md)
**Official Vehicle Execution Workbench:** [`INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_WORKBENCH_UI_SOURCE_OF_TRUTH.md)

---

## 1. Executive adoption decision

Time Motor Sales can begin using the Inventory EOS operating model as early as the week of July 20, 2026 without waiting for the complete enterprise roadmap, provided the pilot remains narrow, manually governed, and based only on verified current capabilities.

The MVP will adopt the enterprise foundation now:

- one execution backbone through existing Tasks and My Work;
- one accountable owner per action, dependency, blocker, approval, and handoff;
- one Current Work assignment and at most one verified-ready staged assignment;
- exact next action, due time, definition of done, and required evidence;
- manager-controlled priority using the Inventory EOS urgency classes;
- evidence-backed completion and Ready for Review where applicable;
- structured blocker ownership, next check, and escalation;
- end-of-day handoff and duplicate-safe next-day carryover;
- material activity recorded through existing task and activity history;
- no additional landing page, navigation destination, or task engine.

The MVP will not claim to activate the complete Next-Best-Work Sequencer, advanced capacity optimization, external providers, multi-location policy, consequential automation, or full enterprise release readiness.

## 2. MVP promise

During the pilot, every participating staff member should be able to answer:

1. What am I responsible for now?
2. Why is it the current priority?
3. What vehicle or work does it affect?
4. When is it due?
5. What must be ready before I act?
6. What proves completion?
7. What do I do if I cannot proceed?
8. Who owns the resolution or approval?
9. What work should I perform next?
10. What must be handed forward at day end?

The pilot manager should be able to answer:

1. Which P0/P1 conditions require intervention?
2. Which work lacks an owner, acknowledgement, next action, or due time?
3. Which staff member is blocked, waiting, ready for review, or ready for another assignment?
4. Which dependency or approval is delaying flow?
5. Which work should be reassigned or staged next?
6. What will carry over, and who owns tomorrow's next action?

## 3. Adoption boundary

### 3.1 Recommended pilot workflow

Use one bounded Inventory flow:

```text
Vehicle Receipt
  -> Identity and Custody Check
  -> Initial Condition Evidence
  -> Inspection
  -> Findings and Triage
  -> Recon Handoff
```

This is the recommended MVP boundary because it establishes the facts every later Inventory EOS capability needs:

- correct vehicle identity;
- correct physical location;
- clear custody and keys;
- observed condition;
- accountable ownership;
- safety or condition restrictions;
- inspection evidence;
- a valid next route;
- an accepted Shop/recon handoff.

### 3.2 Recommended operating scope

- one dealership location;
- one pilot manager;
- one backup manager;
- four to eight participating staff across Inventory, lot/receiving, inspection/Shop, and recon coordination;
- five to ten active vehicles or another explicitly approved low-volume boundary;
- one operating week for initial adoption;
- no required external integration;
- no automatic financial, pricing, publication, release, transfer, wholesale, or disposition command.

The final vehicle and participant count must be approved based on actual workload. The values above are planning recommendations, not active policy.

### 3.3 Primary operating surfaces

| Surface | MVP purpose |
| --- | --- |
| `/tasks` | Manager Task Operations Console and daily attention review |
| `/my-tasks` | Staff My Work, task execution, and current assignment |
| `/tasks/[id]` | Detailed task context, checklist, comments, evidence requirements, and history |
| `/manager-review` | Ready for Review, approval, and Team Execution Health where enabled |
| `/activity` | Material task and staff execution history |
| Inventory Console / Vehicle workspace | Authoritative vehicle and lifecycle context where current data is available |

The pilot must not require staff to browse Inventory landing pages to discover routine assignments. The assigned task links to the applicable vehicle or domain context.

## 4. Enterprise foundation adopted on day one

### 4.1 Source authority

- Vehicle, lifecycle, Shop, Parts, quality, title, merchandising, pricing, and disposition records remain authoritative for their domain facts.
- Tasks own assigned execution, next action, due time, checklist, updates, blocker context, and review handoff.
- Activity and domain events provide attributable history where implemented.
- A task status alone does not change vehicle, custody, inspection, Shop, Parts, quality, title, pricing, release, or disposition state.
- When authoritative domain support is not available, the task records a clearly labeled manual observation with source, observer, and time. It is not presented as an integrated fact.

### 4.2 One-owner rule

Every pilot task requires:

- one accountable owner;
- one assigned executor, normally the same person for the MVP;
- one due time;
- one current next action;
- one definition of done;
- a dependency or approval owner when waiting;
- a manager escalation owner.

External responsibility never removes internal monitoring ownership.

### 4.3 One-active/one-staged rule

For execution-heavy pilot staff:

- one task is identified as Current Work;
- at most one additional task is staged as Next Work;
- Next Work is staged only when vehicle, information, authority, skill, Parts, tool, bay, and upstream handoff requirements are sufficiently ready;
- remaining tasks stay in the manager-controlled queue;
- legitimate blocking or waiting permits substitute work without erasing the original assignment.

The MVP uses manager judgment and visible facts to enforce this rule. It does not claim that an automated capacity optimizer is active.

### 4.4 Completion control

Completion requires the applicable combination of:

- required checklist complete;
- required update fields complete;
- blocker resolved or correctly transferred;
- required observation or evidence recorded;
- next domain action or handoff identified;
- manager review where configured;
- no known safety, identity, custody, or critical-condition conflict.

Where the existing task engine enforces completion readiness, that control is used. Where a domain-specific gate is not yet available, the manager must review the task packet manually before accepting the operational handoff.

### 4.5 Audit and fairness

- Use task history, comments, checklist events, activity, review, and handoff evidence.
- Do not use keystroke, screen, browser, hidden inactivity, continuous location, or camera monitoring.
- Do not create individual rankings or a composite productivity score.
- A reported blocker creates resolution work, not an assumption of employee fault.
- A declined next-work recommendation or request for direction is operating feedback, not discipline evidence.

## 5. Minimum Inventory Work Packet

Every pilot assignment must contain the following minimum information.

| Contract element | MVP representation |
| --- | --- |
| Outcome | Task title written as an observable result |
| Subject | Stock number, VIN suffix, year/make/model, and current known location |
| Purpose | Short description of why the work matters now |
| Accountable owner | Assigned task owner |
| Current next action | First explicit instruction in the task description or required update |
| Due time | Required task due time |
| Urgency | P0–P4 class with plain-language reason |
| Readiness | Checklist or task update identifying vehicle, evidence, skill, tool, bay, Parts, and approval readiness as applicable |
| Definition of done | Required checklist and completion statement |
| Evidence | Existing attachment/evidence capability where available; otherwise a traceable reference recorded in the task update or approved domain record |
| Dependency | Named person, team, provider, or condition required to proceed |
| Blocker recovery | Reason, requested action, resolution owner, next check, and escalation time |
| Handoff | Named next owner, accepted result, and next action |
| History | Existing task, comment, status, checklist, review, and activity records |

### 5.1 Standard task title format

Use an outcome-oriented title:

```text
[Outcome] — [Stock # or vehicle]
```

Examples:

- `Verify receipt and custody — Stock 1842`
- `Complete intake inspection — Stock 1842`
- `Prepare recon handoff — Stock 1842`

### 5.2 Standard task description template

```text
PURPOSE
[Why this action matters now]

CURRENT NEXT ACTION
[One explicit action]

PRIORITY
[P0/P1/P2/P3/P4] — [plain-language reason]

READY WHEN
- Vehicle identity/location confirmed: [Yes/No/Unknown]
- Required information/evidence available: [Yes/No/Unknown]
- Required skill/tool/bay available: [Yes/No/Unknown/Not applicable]
- Required approval available: [Yes/No/Not applicable]

DONE WHEN
- [Observable completion condition]
- [Required evidence or checklist]
- [Required handoff or manager review]

IF BLOCKED OR WAITING
Record the reason, resolution owner, requested action, next check time,
operational impact, and escalation time.
```

This is an operating convention for immediate adoption. It is not a claim that every field is currently a separate structured database field.

### 5.3 Standard blocker update

```text
BLOCKER OR WAIT
Reason: [structured category and concise explanation]
Resolution owner: [person or accountable team]
Requested action: [what is needed]
Impact: [vehicle, promise, downstream work, safety, or value]
Next check: [date/time]
Escalate at: [date/time]
Substitute work: [assigned task or manager direction]
```

### 5.4 Standard handoff update

```text
HANDOFF
Completed outcome: [what was verified]
Evidence: [record, observation, photo/document reference, or checklist]
Open exception: [none or exact issue]
Next owner: [person]
Next action: [one explicit action]
Target: [date/time]
Accepted: [person and time, when confirmed]
```

## 6. Manual Next-Best-Work policy

The MVP adopts the Inventory EOS ordering model through manager-controlled, explainable dispatch. It does not claim the enterprise sequencer is active.

### 6.1 Eligibility check

Before assigning or staging work, the manager verifies:

- staff role/duty and practical qualification;
- location and vehicle access;
- vehicle identity and custody;
- safety and condition restrictions;
- required information and evidence;
- required tool, bay, Parts, and equipment;
- required approval and financial authority;
- upstream dependency and handoff;
- no prohibited separation-of-duties conflict.

Ineligible or unready work remains visible and receives owned resolution work.

### 6.2 Urgency order

| Class | MVP use |
| --- | --- |
| P0 — Contain | Safety, identity, custody, legal, or severe operational condition requiring immediate containment |
| P1 — Recover | Overdue or imminent critical-path, promise, approval, quality, or flow failure |
| P2 — Unlock | Ready action that releases important downstream work |
| P3 — Protect | Work that reduces aging, capital, margin, space, or market exposure |
| P4 — Advance | Ready routine work that advances flow and fits available capacity |

Within the same class, the manager considers:

- due time and remaining schedule buffer;
- number and importance of downstream tasks unlocked;
- time already idle or waiting;
- customer or frontline commitment;
- work continuity and reduced context switching;
- vehicle movement and setup;
- confidence that the work is actually ready.

### 6.3 Explanation standard

Every staged or reassigned priority should have a short reason, for example:

> P2 Unlock: inspection is ready, the vehicle and keys are present, and completion will release the recon estimate and Parts planning.

## 7. Staff operating procedure

### 7.1 Start Day

1. Open My Work.
2. Review responsibilities and carryover.
3. Confirm Current Work and staged Next Work.
4. Review due time, readiness, and definition of done.
5. Acknowledge the plan where Staff Execution is enabled.
6. Record a starting blocker or request manager direction if expectations are unclear.

### 7.2 Execute Current Work

1. Open the assigned task.
2. Confirm the correct vehicle and current location.
3. Confirm readiness before acting.
4. Start the task using the available status/action.
5. Complete required checklist and evidence.
6. Record material facts or conflicts promptly.
7. Submit Ready for Review or Complete according to the task policy.

### 7.3 Blocked or Waiting

1. Do not silently abandon the task.
2. Record the standard blocker update.
3. Keep the original work assigned unless the manager explicitly changes accountability.
4. Notify or route to the resolution owner through the existing task/manager workflow.
5. Move to manager-approved substitute work.
6. Recheck at the recorded time.

### 7.4 Request Next Work

- Use Find Next Work where the Staff Execution pilot is safely enabled.
- Otherwise notify the pilot manager that Current Work is complete or unavailable.
- Review the explanation before claiming or accepting work.
- Decline only with an accurate operating reason such as missing context, not available, or need manager direction.

### 7.5 End-of-Day Handoff

1. Review active, waiting, blocked, Ready for Review, and completed work.
2. Confirm the draft handoff where enabled, or record the standard handoff update.
3. Name tomorrow's owner and first next action.
4. Preserve blocker, evidence, vehicle, and workflow context.
5. Ask the manager to resolve any ownerless carryover before closing the operating day.

## 8. Manager operating procedure

### 8.1 Start-of-day control — target 10 minutes

1. Review P0 and P1 work.
2. Review unowned, unacknowledged, blocked, waiting, and Ready for Review work.
3. Confirm attendance and capability coverage.
4. Verify one Current Work and at most one staged ready assignment per pilot executor.
5. Confirm every dependency and approval has an owner.
6. Publish or confirm the day plan.

The 10-minute target is a planning objective, not an active performance standard until validated.

### 8.2 Continuous exception control

Respond to:

- P0 containment;
- unclear or missing ownership;
- blocker without resolution ownership;
- approval or review waiting beyond the agreed target;
- vehicle or evidence conflict;
- missing skill, tool, bay, Parts, or vehicle access;
- work likely to miss its target;
- failed completion or handoff gate.

Do not repeatedly ask every employee for unchanged status. Use existing task and activity facts, then contact the owner only when a decision or missing fact is required.

### 8.3 Midday review — target 10 minutes

1. Review Blocked, Waiting, Ready for Review, and Needs Assignment.
2. Confirm whether staged work is still ready.
3. Resolve approval and dependency delays.
4. Reassign or resequence only when the expected operational gain is clear.
5. Identify work likely to carry over.

### 8.4 Day-end review — target 15 minutes

1. Review incomplete and review-pending work.
2. Confirm every carryover has one owner and next action.
3. Resolve ownerless blockers and handoffs.
4. Record material exceptions and tomorrow constraints.
5. Confirm that no vehicle, key, evidence, or custody fact is left ambiguous.

## 9. Immediate adoption modes

### 9.1 Mode A — Safe default manual MVP

Use when Staff Execution flags, location isolation, or enterprise pilot authorization have not been proven.

Use:

- existing manager Tasks Console;
- My Tasks/My Work;
- task detail, checklist, comments, status, and Ready for Review;
- manager assignment/reassignment;
- Activity history;
- the manual work-packet, blocker, priority, and handoff conventions in this document.

Do not enable new feature flags or claim automated sequencing.

Mode A can begin after the operational preflight and manager/staff training pass.

### 9.2 Mode B — Controlled Staff Execution MVP

Use only when:

- the deployment is isolated to the pilot location;
- the pilot manager and users are verified;
- roles and direct duties are correct;
- daily generation is duplicate safe;
- the Staff Execution preflight in [`../STAFF_EXECUTION_PILOT_RUNBOOK.md`](../STAFF_EXECUTION_PILOT_RUNBOOK.md) passes;
- the responsible deployment owner explicitly authorizes the feature-flag configuration;
- rollback by disabling the master flag is prepared and tested.

Mode B may use:

- Start Day;
- task acceptance;
- Available Work recommendations;
- end-of-day handoff;
- Team Execution Health.

The current StaffDay and Tasks board location-scope limitation remains a hard boundary. Do not enable Mode B broadly in a multi-location deployment.

### 9.3 Enterprise readiness control-plane boundary

The existing enterprise-readiness control plane does not itself authorize a real pilot. Inventory R12 pilot activation remains subject to its independent evidence, authorization, configuration, and sign-off requirements in [`R12_ENTERPRISE_READINESS_PILOT_IMPLEMENTATION.md`](R12_ENTERPRISE_READINESS_PILOT_IMPLEMENTATION.md).

The immediate MVP may operate as a manager-controlled internal operating practice in Mode A without representing the Inventory Console as enterprise-ready or activating an R12 pilot command.

## 10. Known current limitations

The MVP must disclose and work around these limits rather than hiding them:

- the Inventory Console is not operationally complete across all 121 enterprise slices;
- StaffDay and Tasks board location ownership is not sufficient for broad multi-location Staff Execution activation;
- full operational, provider, accessibility, performance, deployment, recovery, and pilot evidence remains pending for multiple Inventory slices;
- external DMS, vendor, title, listing, accounting, payment, and hardware acknowledgements are not assumed live;
- advanced capacity and duration data is not yet reliable enough for autonomous optimization;
- the full Inventory EOS hard-gate, readiness, and Next-Best-Work engines are not claimed active;
- available task fields may require the approved description/update conventions rather than separate structured fields;
- evidence attachment behavior must be verified during preflight; when unavailable, use an approved authoritative record reference rather than implying a file is stored;
- mobile and workplace accessibility require representative validation;
- enterprise pilot authorization and general availability remain separate future decisions.

## 11. Adoption roles

| Role | Immediate responsibility |
| --- | --- |
| Executive sponsor | Approve the bounded operating pilot and stop/continue decisions |
| MVP policy owner | Approve responsibility, evidence, urgency, blocker, and handoff conventions |
| Pilot manager | Publish daily plan, own exceptions, assign work, review completion, confirm carryover |
| Backup manager | Assume manager control if the pilot manager is unavailable |
| Inventory/receiving owner | Own receipt, identity, custody, keys, location, and condition packet |
| Inspector/Shop owner | Own inspection eligibility, findings, restrictions, and completion evidence |
| Recon coordinator | Accept the recon handoff and establish its next action |
| Participating staff | Execute assigned work, maintain truthful status, capture evidence, report blockers, confirm handoff |
| Release operator | Verify deployment, accounts, configuration, flags where authorized, and rollback readiness |
| Observer/recorder | Capture usability issues, duplicate entry, missing facts, and operating outcomes without interrupting work |

One person may hold multiple MVP roles only where the approved authority and separation-of-duties rules permit it.

## 12. Next-week adoption schedule

### Day 0 — Approval and preparation

**Recommended date:** Sunday, July 19 or before opening Monday, July 20.

- Name sponsor, policy owner, pilot manager, backup manager, staff, and observer.
- Approve Mode A or Mode B.
- Freeze the workflow, location, vehicle-count, and participant boundaries.
- Approve stop and rollback conditions.
- Confirm no consequential automation or unapproved policy is included.

### Day 1 — Preflight and work-packet setup

**Recommended date:** Monday, July 20.

- Verify manager and staff sign-in.
- Verify roles, direct duties, and task permissions.
- Verify current board generation and duplicate behavior.
- Verify task create, assign, accept/update, Blocked, Waiting, Ready for Review, Complete, comments, checklist, and activity behavior applicable to the chosen mode.
- Select the bounded pilot vehicles.
- Create or validate their receipt-to-recon work packets.
- Record baseline facts.
- Train staff using one representative vehicle.
- Do not begin live pilot use if a P0 preflight condition fails.

### Day 2 — Tabletop and shadow operation

**Recommended date:** Tuesday, July 21.

- Walk one normal receipt-to-recon case.
- Walk identity conflict, damage/safety concern, missing keys, missing evidence, blocked inspection, manager approval, failed handoff, and carryover cases.
- Manager applies the manual urgency and eligibility policy beside current practice.
- Staff use Current Work, blocker, evidence, and handoff conventions.
- Correct confusing instructions and ownership gaps.
- Decide whether live activation may begin.

### Day 3 — Controlled live adoption

**Recommended date:** Wednesday, July 22.

- Begin with the approved vehicle and staff boundary.
- Conduct start-of-day, midday, and day-end manager reviews.
- Record every blocker, review, handoff, and correction.
- Capture staff burden and missing-tool observations.
- Pause immediately for a defined stop condition.

### Day 4 — Stabilize and measure

**Recommended date:** Thursday, July 23.

- Continue within the same boundary.
- Correct operating instructions and templates without silently changing approved policy.
- Compare ownership, readiness, blocker, handoff, and manager-chasing outcomes with baseline.
- Exercise one safe rollback or manual-fallback scenario if it can be done without disrupting customer or vehicle commitments.

### Day 5 — Acceptance review

**Recommended date:** Friday, July 24.

- Complete the staff and manager feedback review.
- Confirm every carryover has an owner and next action.
- Review P0/P1 defects and workarounds.
- Record scorecard results and data limitations.
- Decide: continue unchanged, continue with corrections, pause, roll back, or prepare the next vertical slice.

### Day 6 — Optional closeout

**Recommended date:** Saturday, July 25 if the location operates.

- Verify Saturday carryover and support behavior.
- Finalize the pilot evidence packet.
- Freeze the next-week improvement list.

The dates above are an earliest responsible schedule. Failed preflight or missing authority moves adoption later rather than weakening the gates.

## 13. Preflight checklist

### 13.1 People and policy

- [ ] Sponsor, policy owner, pilot manager, backup, staff, release operator, and observer are named.
- [ ] One location and one workflow boundary are approved.
- [ ] Roles, duties, skills, and assignment authority reflect actual responsibilities.
- [ ] Definitions of done and minimum evidence are approved for receipt, identity/custody, inspection, and recon handoff.
- [ ] P0–P4 use is understood.
- [ ] Blocker owners and escalation route are understood.
- [ ] Privacy, fairness, and no-surveillance rules are acknowledged.

### 13.2 System

- [ ] Manager and staff authentication works.
- [ ] Manager can create, assign, reassign, and review applicable tasks.
- [ ] Staff can see and update their assigned tasks.
- [ ] Blocked requires useful context.
- [ ] Ready for Review and manager completion operate where configured.
- [ ] Checklist, comments, and activity history are usable.
- [ ] Current-day board generation or manual board preparation is verified.
- [ ] Retry does not create duplicate work.
- [ ] Mode B feature flags are isolated, approved, and rollback ready if used.
- [ ] No production surface presents mock or unavailable facts as live.

### 13.3 Operations

- [ ] Pilot vehicles are known and physically available.
- [ ] Stock/VIN identity, location, keys, and custody can be recorded.
- [ ] Inspection staff, tools, bay/space, and evidence method are available.
- [ ] Recon handoff recipient is named.
- [ ] Staff have a usable desktop, tablet, phone, or shared workstation.
- [ ] Connectivity and charging are sufficient.
- [ ] Manual fallback and support contact are known.
- [ ] Stop and rollback conditions are visible.

## 14. MVP scorecard

### 14.1 Required day-one integrity measures

- percentage of pilot tasks with one accountable owner;
- percentage with a current next action and due time;
- percentage with a definition of done;
- blocked/waiting tasks with resolution owner and next check;
- handoffs with next owner and next action;
- duplicate tasks or carryovers;
- unsupported completions;
- authorization failures;
- missing activity or evidence references.

### 14.2 Staff simplicity measures

- time to identify Current Work;
- number of screens or searches required to begin;
- duplicate facts staff must enter;
- time to record a blocker;
- time to prepare a handoff;
- misunderstood terms or instructions;
- missing tools, information, or options;
- mobile/connectivity/evidence problems.

### 14.3 Manager-efficiency measures

- time spent preparing the daily plan;
- time spent chasing status;
- unowned work discovered after the start review;
- approval and blocker response time;
- number of manual clarifications required;
- time required for midday and day-end control;
- carryover requiring repair after day end.

### 14.4 Flow and quality measures

- ready-to-start delay;
- receipt-to-inspection and inspection-to-recon-handoff time;
- active, waiting, blocked, and unexplained idle time where observable;
- first-pass accepted handoff;
- identity, custody, evidence, or quality corrections;
- work started without prerequisites;
- vehicles waiting without a named next action.

### 14.5 Recommended MVP acceptance thresholds

The following proposed thresholds require policy-owner approval before use:

- `100%` of pilot work has one accountable owner, due time, and next action;
- `100%` of blocked/waiting work has useful context, a resolution owner, and next check;
- `100%` of carryover has a next owner and next action;
- `0` duplicate tasks or carryovers;
- `0` unauthorized consequential actions;
- `0` known safety, identity, custody, or critical-condition gate bypasses;
- `0` lost required evidence or audit history;
- all participating staff can explain Current Work, blocker reporting, completion, and handoff;
- the pilot manager confirms that the operating loop reduces or has a credible path to reduce manual chasing.

Speed or throughput improvement is desirable but is not accepted at the expense of safety, quality, evidence, privacy, or staff clarity.

## 15. Stop, pause, and rollback

### 15.1 Immediate stop conditions

- safety, identity, custody, or critical-condition control can be bypassed;
- work loses or duplicates ownership;
- the wrong vehicle or authoritative record is affected;
- staff can complete governed work without required evidence or review;
- permission or separation-of-duties enforcement fails;
- carryover duplicates or loses context;
- activity or decision history is missing;
- staff cannot recover from a common error;
- the system presents unavailable or mock data as operational fact;
- privacy or no-surveillance rules are violated.

### 15.2 Mode A rollback

1. Stop using the MVP conventions for new pilot work.
2. Preserve all existing tasks, comments, checklists, reviews, and history.
3. Return to ordinary manager assignment and My Tasks operation.
4. Confirm every active vehicle and task retains an owner and next action.
5. Record the reason, affected work, correction owner, and restart decision.

### 15.3 Mode B rollback

Follow [`../STAFF_EXECUTION_PILOT_RUNBOOK.md`](../STAFF_EXECUTION_PILOT_RUNBOOK.md): disable the Staff Execution master flag, confirm ordinary Board/My Tasks/Manager Review operation, preserve records, and document the rollback.

Rollback must never erase evidence or rewrite history.

## 16. MVP acceptance decision

At the end of the first operating week, choose exactly one disposition:

| Decision | Meaning |
| --- | --- |
| Continue unchanged | Integrity, usability, and manager-control gates pass |
| Continue with corrections | No P0 defect; bounded instruction, configuration, or workflow corrections are approved |
| Extend observation | More representative volume is required before deciding |
| Pause | A material issue requires correction before further live use |
| Roll back | Safety, authority, ownership, evidence, privacy, or operating burden makes continued use inappropriate |
| Prepare next slice | Current slice is stable enough to plan the next bounded domain expansion |

The decision record must include:

- scope and dates;
- participants and vehicles;
- mode used;
- scorecard and limitations;
- defects and workarounds;
- staff and manager feedback;
- unresolved decisions;
- approved disposition and owner;
- next review date.

## 17. Enterprise-preserving follow-on

The MVP is not a disposable prototype. Its conventions map directly to the enterprise roadmap:

| MVP capability | Enterprise destination |
| --- | --- |
| Manual work packet | M4 Shared Inventory Work Contract |
| Start Day and Current Work | M6–M7 Staff execution |
| Manual blocker ownership | M8 Blocker Resolution System |
| Evidence and handoff | M9 completion and handoff |
| Manager daily rhythm | M10 Manager Control Loop |
| One-active/one-staged convention | M11 capacity and WIP control |
| Manual eligibility check | M12 hard-gate engine |
| Manual readiness review | M13 readiness engine |
| Manager P0–P4 sequencing | M14 Next-Best-Work Sequencer |
| Side-by-side priority review | M15 shadow evaluation |
| Receipt-to-recon pilot | M16 first domain rollout |
| Manual coordination | M24 low-risk automation candidate after proof |

### 17.1 Recommended next steps after acceptance

1. Stabilize the MVP for one to two additional representative weeks.
2. Convert observed work-packet gaps into the M4 contract decision set.
3. Approve the formal role, authority, evidence, and timing policy.
4. Complete the current-state traceability audit.
5. Use actual blocker, duration, readiness, and handoff facts to design the first implementation slice.
6. Prepare R0/R1 enterprise-roadmap approval.
7. Do not expand the workflow or location merely because the first week had low volume or no incident.

## 18. MVP definition of done

The immediate MVP is adopted successfully when:

- the approved one-location receipt-to-recon boundary is used in real work;
- every pilot work item has one owner, due time, next action, definition of done, and required evidence;
- staff operate from My Work rather than searching landing pages for assignments;
- one-current/one-staged discipline is understandable and practical;
- blocked and waiting work has resolution ownership and a next check;
- manager start, midday, and day-end reviews operate from shared task facts;
- completion and handoff are evidence backed;
- no duplicate task engine, primary navigation, or static dashboard is added;
- no unsupported automation or enterprise-readiness claim is made;
- no unresolved P0 authorization, safety, identity, custody, ownership, duplicate, evidence, audit, privacy, or recovery defect remains;
- staff and managers accept the operating workflow;
- a documented continue, correct, pause, rollback, or next-slice decision is recorded.

## 19. Relationship to existing documents

This MVP must be used with:

- [`INVENTORY_EXECUTION_OPERATING_SYSTEM.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM.md);
- [`INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md`](INVENTORY_EXECUTION_OPERATING_SYSTEM_IMPLEMENTATION_ROADMAP.md);
- [`INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md`](INVENTORY_EXECUTION_VEHICLE_CARD_UI_SOURCE_OF_TRUTH.md);
- [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md);
- [`frontline-workflow/STAFF_EXPERIENCE.md`](frontline-workflow/STAFF_EXPERIENCE.md);
- [`frontline-workflow/OPERATING_CONTROLS.md`](frontline-workflow/OPERATING_CONTROLS.md);
- [`../STAFF_EXECUTION_HANDOFF_ENGINE.md`](../STAFF_EXECUTION_HANDOFF_ENGINE.md);
- [`../STAFF_EXECUTION_PILOT_RUNBOOK.md`](../STAFF_EXECUTION_PILOT_RUNBOOK.md);
- [`../TASKS_MVP_DAY_ONE_READINESS.md`](../TASKS_MVP_DAY_ONE_READINESS.md);
- [`R12_ENTERPRISE_READINESS_PILOT_IMPLEMENTATION.md`](R12_ENTERPRISE_READINESS_PILOT_IMPLEMENTATION.md);
- [`INVENTORY_CONSOLE_POST_GAP_CLOSURE_CONFORMANCE_REVIEW.md`](INVENTORY_CONSOLE_POST_GAP_CLOSURE_CONFORMANCE_REVIEW.md).

Where this MVP uses a manual convention because structured enterprise capability is not yet available, the convention must remain visible as manual and must not be represented as completed automation.

## 20. Adoption status and operational authorization boundary

This document was officially adopted on July 19, 2026 as the immediate Inventory EOS MVP baseline. Its adoption authorizes bounded Mode A preparation and operating adoption after the named ownership and preflight requirements pass.

Official adoption does not authorize:

- application code or database changes;
- new production feature flags without their separate deployment approval;
- R12 enterprise pilot activation;
- external integrations;
- numeric policy beyond explicitly approved MVP thresholds;
- autonomous assignment or consequential commands;
- employee-performance or disciplinary use;
- physical-tool purchases;
- workflow, role, vehicle-volume, or location expansion beyond the approved boundary.
