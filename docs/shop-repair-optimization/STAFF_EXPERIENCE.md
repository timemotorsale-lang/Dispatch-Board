# Staff Experience and Shop Workspace

**Status:** Proposed UX contract; no UI implemented by this package

## 1. Navigation principle

Staff should access shop optimization through one primary **Shop & Repair** workspace, not a collection of algorithm tabs.

Primary views:

1. **My Work** — current job, staged next job, instructions, evidence, clock, blockers.
2. **Shop Flow** — ready, active, waiting, QC/rework, promise-risk, and unowned work.
3. **Schedule & Capacity** — appointment demand, skill/resource capacity, forecast ranges, conflicts.
4. **Parts Readiness** — demand, kit state, reservations, ETA risk, receipt/substitution actions.
5. **Customer & Advisor** — approvals, promises, drafts, heat cases, delivery readiness.
6. **Manager Control** — overrides, financial approvals, bottlenecks, quality, algorithm health.

Pricing, algorithms, integrations, and policy configuration belong in a restricted administration area—not daily staff navigation.

## 2. Role experiences

| Role | Landing focus | Primary actions |
| --- | --- | --- |
| Technician | Current and next work | Start/pause/resume, evidence, finding, changed scope, finish to QC |
| Dispatcher/foreman | Whole-shop flow | Assign, resequence, resolve conflicts/blockers, balance WIP |
| Advisor | Customer commitments | Intake, estimate/authorization, status, promise, heat-case response |
| Parts staff | Job-start readiness | Source, reserve, receive, substitute review, ETA/reconciliation |
| QC verifier | Verification queue | Inspect, road test, pass/fail item, create exact rework |
| Shop manager | Exceptions and performance | Approvals, overrides, bottlenecks, recovery, pilot health |
| Inventory manager | Recon lane | Frontline risk, economics, priority request, verified shop handoff |

## 3. Recommendation card

Every recommendation answers:

- What is happening?
- Why does it matter now?
- What facts are authoritative, estimated, or predicted?
- What is recommended and what alternatives remain valid?
- What was excluded and why?
- What happens to customers, promises, resources, parts, and downstream work?
- Who may decide, and is manager approval required?
- How confident is the result and what is missing/stale?

Actions use staff language such as `Assign Alex to brake job`, `Keep current sequence`, `Resolve missing alignment rack`, or `Ask manager to review promise risk`; algorithm names and formulas stay in the explanation drawer.

## 4. Progressive disclosure

The default board shows vehicle/customer identifier, lane, current state, owner, promised/target time, readiness, blocker, and next action. Selecting an item opens a workbench with evidence, dependencies, parts, resources, history, recommendation details, and authorized commands. Staff should not scan dense lifecycle maps to complete a routine action.

## 5. Required states

Every surface supports loading, empty, ready, blocked, stale, low-confidence, source unavailable, permission denied, concurrent change, draft saved, command failed, retry, correction, and recovered states. A stale recommendation cannot appear identical to a current one.

## 6. Voice and AI assistance

The technician can dictate or type an observation. Before it becomes a finding, the interface shows transcription, extracted component/side/condition/severity, uncertain terms, missing measurements/evidence, source suggestions, and a confirmation button. It never silently changes technician words into a confirmed diagnosis.

The advisor receives an editable draft with source lineage and warnings. Sending, presenting price, changing a promise, or opening authorization remains explicit.

## 7. Heat-case experience

The card shows the triggering interaction/commitment, risk reasons, confidence, customer history relevant to the active case, current owner, response target, and valid actions: review context, contact customer, correct commitment, request manager, record resolution, or dismiss/correct the signal. It does not label a customer as difficult or expose sentiment as an employee score.

## 8. Accessibility and floor use

- Touch targets and critical controls support gloves/tablets where practical.
- Color is never the only status signal.
- Critical warnings remain readable in bright shop environments.
- Draft/evidence capture survives transient connection failure.
- Common technician actions require minimal navigation and preserve context.
- Keyboard, screen-reader, language, and plain-language needs are included in acceptance testing.
