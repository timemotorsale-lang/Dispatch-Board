# COO Workbook Algorithms and Signal Logic

**Status:** Planning source of truth  
**Scope:** Behind-the-scenes logic for turning normal app activity into accountability, coaching, and report-ready operational intelligence.

---

## 1. Guiding Principle

Every meaningful action in the app should be capable of answering this question:

```text
Did this action create progress, accountability, risk, a promise, a blocker,
a decision, a handoff, a follow-up, or a training opportunity?
```

If yes, the action may become an operational signal.

The system should not treat every event as equally important. It should preserve raw activity where needed, then promote only meaningful activity into report seeds.

## 2. Event To Report Algorithm

The core algorithm is:

```text
1. Record the event.
2. Normalize the event.
3. Identify ownership.
4. Classify operational meaning.
5. Detect risk, commitment, blocker, progress, and follow-up signals.
6. Score report relevance.
7. Decide visibility and review requirements.
8. Create or update report seed.
9. Link back to source evidence.
10. Include in daily, weekly, or monthly draft when appropriate.
```

## 3. Minimum Event Fields

Every report-aware event should have:

- Event id
- Event type
- Source area
- Actor
- Owner
- Affected staff member
- Department or workspace
- Date and time
- Related task, vehicle, customer, repair order, appointment, part, vendor, or facility item
- Raw user-entered text when applicable
- Structured status change when applicable
- Visibility level
- Evidence link
- Confidence level

## 4. Signal Types

The first pilot should support these signal types:

| Signal | Meaning |
| --- | --- |
| `planned_work` | Work was part of the user's expected day. |
| `checklist_item` | Lightweight daily to-do item used for personal execution, not yet a formal task. |
| `quick_update` | Meaningful unplanned event was captured. |
| `progress` | Work moved forward. |
| `completion` | Work was completed or closed. |
| `blocker` | Work cannot move without help, input, parts, approval, or external action. |
| `customer_promise` | A customer-facing commitment was made or changed. |
| `follow_up` | Something must happen later. |
| `approval_needed` | A manager, COO, or authorized person must review before moving forward. |
| `handoff` | Responsibility or context moved from one person/team/stage to another. |
| `carryover` | Work did not close today and needs tomorrow ownership. |
| `training_opportunity` | Repeated issue, missed step, unclear instruction, or process gap should become coaching material. |
| `operating_risk` | Something may affect customer trust, time, money, safety, production flow, or leadership attention. |

## 5. Report Relevance Scoring

Report seeds should be scored so the system can keep the page useful instead of noisy.

Suggested scoring factors:

| Factor | Effect |
| --- | --- |
| Customer impact | Raises priority when a customer is affected. |
| Promise or deadline | Raises priority when a commitment exists. |
| Overdue or aging | Raises priority as unresolved time grows. |
| Blocked dependency | Raises priority when other work depends on it. |
| Approval sensitivity | Raises priority and may require review. |
| Financial impact | Raises priority when money, cost, sale, payment, or authorization is involved. |
| Facility or safety impact | Raises priority when facility readiness, staff safety, or property risk is involved. |
| Leadership visibility | Raises priority when COO/CEO awareness is appropriate. |
| Repetition | Raises priority for weekly/monthly pattern reporting. |
| User flag | Raises priority when staff marks the update important. |
| Resolved quickly | Lowers report priority unless it explains a meaningful win or pattern. |

Suggested relevance bands:

- **High:** Must be visible in daily review.
- **Medium:** Candidate for daily report or weekly pattern.
- **Low:** Keep as searchable activity, include only if requested.

## 6. Daily Report Logic

Daily reports should answer:

- What was planned?
- What was completed?
- What moved forward?
- What was blocked?
- What promises were made or protected?
- What was unexpected but important?
- What needs follow-up tomorrow?
- What requires manager or COO review?

Daily report inputs:

- Completed tasks
- Daily Checklist items marked done, delayed, blocked, or carried over
- In-progress tasks
- Blocked tasks
- Comments and status updates
- Quick Updates
- Customer promises
- Approval items
- Handoffs
- Carryover items
- End-of-day staff confirmation

## 7. Weekly Report Logic

Weekly reports should summarize patterns, not simply repeat daily notes.

Weekly reports should answer:

- What was accomplished this week?
- What kept repeating?
- Which blockers consumed attention?
- Which vendors, departments, or workflows caused delays?
- What training themes appeared?
- Which customer promises were at risk or saved?
- Which staff members need support, clarification, or recognition?

Weekly report inputs:

- Aggregated daily report seeds
- Repeated signal counts
- Aging work
- Completed high-priority work
- Reopened or reworked items
- Repeated blocker types
- Training opportunity signals

## 8. Monthly Report Logic

Monthly reports should focus on operating health and leadership decisions.

Monthly reports should answer:

- What trends changed?
- Which bottlenecks are persistent?
- Where are costs, delays, rework, or risk increasing?
- Which processes need redesign?
- Which training needs are recurring?
- Which staff workflows are improving?
- Which leadership decisions are needed?

Monthly report inputs:

- Weekly summaries
- Trended blocker and completion data
- Aging and carryover history
- Department and staff-level patterns
- Review outcomes
- Manual COO notes

## 9. Quick Update Classification

Quick Update must support natural language first.

The user can type:

```text
Moises from T-Mobile came in today to discuss phone and internet products.
```

The system should classify:

- Signal type: quick update
- Category: sales opportunity or vendor
- Person: Moises
- Organization: T-Mobile
- Follow-up: optional
- Report relevance: low to medium unless follow-up is needed

The user can type:

```text
AJ checked the roof today. Possible repair work may happen in the next few weeks.
```

The system should classify:

- Signal type: quick update
- Category: facility
- Person: AJ
- Follow-up: likely
- Date horizon: next few weeks
- Report relevance: medium
- Carryover candidate: yes, if follow-up is needed

## 10. Daily Checklist Classification

Daily Checklist items are intentionally lighter than formal Tasks.

The system should classify checklist items by simple state:

- Done
- On track
- Needs update
- Waiting
- Blocked
- Carryover
- Converted to task

The system should promote a checklist item into report intelligence only when it creates meaningful evidence.

Examples:

- A green done item can support "completed work" if it mattered to the day.
- A yellow item can become a follow-up or carryover candidate.
- A red item can become an operating risk or manager attention item.
- A converted item becomes a formal Task and should inherit the checklist source link.

Checklist items should not be over-scored. They are primarily a staff planning and execution tool.

## 11. Visibility Rules

The same event may appear differently by role:

| View | Sees |
| --- | --- |
| Staff | Their own work, updates, blockers, promises, follow-ups, report draft. |
| Manager | Team work, exceptions, blockers, reviews, coaching opportunities. |
| COO | Cross-app flow, approval risk, operating risk, department patterns, daily leadership report seeds. |
| CEO | High-level business impact, unresolved risk, strategic patterns, escalations. |

Staff should not see confidential leadership-only notes unless explicitly permitted.

## 12. Human Review Rules

The system may draft, recommend, classify, and score. It should not silently finalize sensitive reports.

Require review when:

- Financial commitment is involved.
- Customer-facing promise is disputed or sensitive.
- Staff performance or training language appears.
- Approval or authority is required.
- The signal was inferred from ambiguous natural language.
- A report is being sent outside the immediate staff/manager workspace.

## 13. Anti-Noise Rules

The system should avoid flooding reports with low-value activity.

Do not promote an event to a report seed only because:

- A page was viewed.
- A user clicked around.
- A minor field changed without operational meaning.
- A task was touched but no progress, blocker, promise, decision, or follow-up was created.
- A checklist item was added but never updated and has no operational consequence.
- The text is vague and cannot be linked to an owner or outcome.

## 14. Training Logic

Training signals should be handled carefully.

The system may identify:

- Missed follow-ups
- Repeated blocked work due to unclear process
- Repeated late updates
- Frequent missing evidence
- Repeated manager corrections
- Repeated handoff gaps

The system should describe training opportunities as process support, not personal judgment.

Preferred language:

```text
Training opportunity: follow-up ownership should be clarified when vendor delays are logged.
```

Avoid:

```text
Employee is bad at follow-up.
```
