# COO Workbook Workspace Workflows and UX Logic

**Status:** Planning source of truth  
**Scope:** User-facing workflow rules for keeping the workspace simple while backend reporting intelligence becomes enterprise-grade.

---

## 1. Primary UX Rule

The workspace must feel like a daily work assistant, not a reporting burden.

The staff-facing experience should remain calm, fast, and practical:

```text
Plan the day.
Work the day.
Capture what happened.
Close the day.
Generate the report when needed.
```

## 2. Staff Daily Workspace Workflow

The staff workspace should support this flow:

```text
Start day
  -> Review assigned work
  -> Confirm priorities
  -> Add or accept daily plan
  -> Add lightweight Daily Checklist items
  -> Work tasks
  -> Check off checklist items and add short updates
  -> Capture blockers, notes, promises, and Quick Updates
  -> Check day status
  -> Complete or carry over work
  -> Review report draft
  -> Submit or save end-of-day summary
```

The user should always be able to answer:

- What is next?
- What is due?
- What is blocked?
- What have I done?
- What do I need to tell someone?
- What should not be forgotten?

## 3. Daily Checklist Workflow

The Daily Checklist is a lightweight personal execution list. It is not the same as a formal Task.

Suggested user flow:

```text
Add checklist item
  -> Work it during the day
  -> Mark done, needs update, or blocked
  -> Add a short update if useful
  -> Convert to task only when it needs formal ownership, tracking, approval, or handoff
```

Recommended item controls:

- Text field for the item.
- Check mark for done.
- Status color.
- Add update.
- Convert to task.
- Carry over to tomorrow.

Recommended status colors:

- **Green:** done or on track.
- **Yellow:** needs update, waiting, delayed, or may need help.
- **Red:** blocked, overdue, urgent, or needs manager attention.

Use Daily Checklist for:

- Personal reminders.
- Small same-day work.
- Simple action items.
- Informal prep work.
- Notes that may become tasks later.

Use formal Tasks for:

- Assigned work with ownership.
- Work that affects another person or department.
- Approval-required work.
- Customer promise work.
- Work that needs audit history.
- Work that may carry over with accountability.

Checklist items may still feed reports, but only when they create meaningful progress, blocker, follow-up, carryover, or training signals.

## 4. COO Workspace Workflow

The COO Workbook should support this flow:

```text
Open COO Workbook
  -> Review operating summary
  -> Inspect approval-sensitive items
  -> Inspect operating risks
  -> Review production flow and blockers
  -> Review Quick Updates and report seeds
  -> Create or refine daily action plan
  -> Draft daily report
  -> Approve, edit, exclude, or carry over items
```

The COO should always be able to answer:

- What needs my attention before approval?
- What may affect customer commitments?
- What is blocked by parts, vendors, staff, facility, or process?
- What happened today that was not planned?
- What should be in today's report?
- What must carry over tomorrow?

## 5. Quick Update Workflow

Quick Update should be available near daily action controls.

Suggested user flow:

```text
Click Quick Update
  -> Type what happened
  -> Optionally add category, person, company, photo, or file
  -> Mark follow-up needed if applicable
  -> Save
  -> System classifies and routes it quietly
```

The first version should avoid too many required fields.

Recommended fields:

- What happened? Required.
- Category. Optional, with suggested value.
- Who was involved? Optional.
- Company or outside party. Optional.
- Follow-up needed? Optional.
- Due date or time window. Optional.
- Visibility. Default based on role.
- Convert to to-do. Optional.

## 6. Quick Update Categories

Keep the first version simple:

- Customer
- Vendor
- Facility
- Staff
- Sales / Opportunity
- Finance
- Inventory / Parts
- Safety
- Training
- Other

The category should help organize, not slow capture.

## 7. Daily Status Panel

The staff workspace should include a simple day status panel.

Suggested sections:

- Planned for today
- Daily Checklist
- In progress
- Completed
- Blocked
- Follow-up
- Quick Updates
- Carryover

The panel should be operational, not decorative. It should help staff know where they stand.

## 8. Report Draft Workflow

Report generation should be a draft-first workflow:

```text
Generate draft
  -> Show source-backed sections
  -> Let user edit wording
  -> Let user exclude items
  -> Let user add missing context
  -> Save draft or submit report
```

Report drafts should include source links whenever possible so users can verify where each line came from.

## 9. Daily Report Template

Suggested sections:

- Summary of today
- Completed work
- Daily Checklist highlights
- Important progress
- Blockers and risks
- Customer promises and follow-ups
- Quick Updates
- Carryover for tomorrow
- Manager or COO attention needed

For a staff report, use individual language:

```text
Today I completed...
I am waiting on...
Tomorrow I need to...
```

For COO report, use operating language:

```text
Today the operation completed...
Open risks include...
Leadership attention is needed for...
```

## 10. Weekly Report Template

Suggested sections:

- Major accomplishments
- Repeated blockers
- Staff/team workload patterns
- Customer promise health
- Vendor/parts/facility issues
- Training opportunities
- Decisions needed next week

## 11. Monthly Report Template

Suggested sections:

- Operating health summary
- Trend changes
- Persistent bottlenecks
- Staff/accountability themes
- Customer impact themes
- Cost, delay, rework, and risk observations
- Recommended leadership actions

## 12. Accountability Without Surveillance

The workspace should support accountability by making work visible and easier to close.

It should not become:

- Hidden monitoring
- A productivity score
- A discipline tool
- A way to shame staff
- A tool that rewards busywork

Preferred framing:

```text
Here is what was planned, what happened, what changed, what is stuck,
and what support is needed.
```

## 13. Live Refinement Rule

As the page is improved live, each change should be evaluated against three questions:

1. Does this make the staff day easier to manage?
2. Does this create better report evidence without extra paperwork?
3. Does this help managers/COO see risk, support needs, and accountability clearly?

If the answer is no, the feature should be simplified, hidden behind a secondary interaction, or deferred.
