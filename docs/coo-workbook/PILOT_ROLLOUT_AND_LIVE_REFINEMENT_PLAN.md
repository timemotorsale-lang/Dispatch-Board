# COO Workbook Pilot Rollout and Live Refinement Plan

**Status:** Planning source of truth  
**Scope:** How to build the COO Workbook reporting capability as a live pilot before duplicating the concept to every staff member.

---

## 1. Pilot Objective

Build the COO Workbook as the first live pilot of the Work Intelligence and Reporting layer.

The pilot should prove that the app can:

- Support daily work planning and execution.
- Capture unplanned operational updates.
- Track staff accountability through normal work.
- Detect report-worthy signals across the app.
- Generate daily report drafts.
- Preserve source evidence behind report items.
- Prepare the same engine for staff, manager, COO, and CEO views.

## 2. Pilot Scope

Start narrow enough to learn quickly.

Phase one should focus on:

- COO Workbook page
- Staff daily plan concepts
- Tasks and lightweight Daily Checklist to-dos
- Blockers
- Customer promises
- Approvals
- Handoffs
- Quick Updates
- Daily report draft
- Carryover items

Do not start by connecting every possible app area. Add sources only when they improve the daily workflow and report quality.

## 3. Recommended Build Order

### Step 1: Define report-aware events

Create the event vocabulary and decide which existing actions should become report-aware.

Initial report-aware actions:

- Daily Checklist item added
- Daily Checklist item marked done, delayed, blocked, or carried over
- Daily Checklist item converted to task
- Task created
- Task accepted or started
- Task completed
- Task blocked
- Task comment added
- Approval requested
- Approval completed or rejected
- Customer promise created or updated
- Handoff created
- Quick Update captured
- Follow-up created
- Carryover confirmed

### Step 2: Add Daily Checklist

Daily Checklist should be the first planning tool because it lets staff list what they need to do today without turning every small item into a formal task.

Pilot expectations:

- Fast item entry
- Check mark for done
- Green/yellow/red status
- Short update note
- Carry over option
- Convert to formal task option
- Meaningful checklist updates can feed report seeds

### Step 3: Add Quick Update

Quick Update should be the first new user-facing feature because it captures real-world work that existing structured workflows miss.

Pilot expectations:

- Fast capture
- Natural language entry
- Optional category
- Optional follow-up
- Optional convert to to-do
- Appears in today's workspace
- Feeds report seeds

### Step 4: Create report seed lane

The report seed lane should show items the system thinks may belong in the daily report.

Users should be able to:

- Review
- Edit wording
- Exclude
- Mark important
- Convert to follow-up
- Carry over

### Step 5: Generate daily report draft

The first daily report should be a draft only.

It should pull from:

- Completed work
- Daily Checklist highlights
- Blockers
- Promises
- Quick Updates
- Follow-ups
- Approval items
- Carryover

### Step 6: Add review history

Track what was included, edited, excluded, and submitted.

This creates trust and gives the system feedback for better future drafts.

### Step 7: Expand to staff page

Once the COO pilot works, duplicate the experience as a staff-filtered view:

- Staff sees their own plan, work, updates, blockers, and report draft.
- Manager sees the team view.
- COO sees cross-app operations.

## 4. Live Refinement Method

Because this will be improved while being used, every change should be small and observable.

Use this loop:

```text
Ship a narrow improvement
  -> Use it live
  -> Notice friction
  -> Adjust labels, layout, categories, or logic
  -> Add only the next most valuable capability
```

Live feedback questions:

- Did staff understand what to do?
- Did the page help the day move forward?
- Did Quick Update capture something that would have been forgotten?
- Did the report draft save time?
- Were any report seeds noisy or irrelevant?
- Was any important item missed?
- Did managers/COO gain better visibility?

## 5. Pilot Metrics

The pilot should measure usefulness, not staff surveillance.

Suggested success indicators:

- Daily plans created
- Daily Checklist items added, completed, updated, carried over, or converted to tasks
- Tasks completed from the daily plan
- Blockers captured with usable reasons
- Quick Updates captured
- Follow-ups created from Quick Updates
- Report seeds accepted vs excluded
- Daily report drafts generated
- Carryover items confirmed
- Missed follow-ups reduced
- Manager/COO review time reduced
- Staff clarity improved

Avoid:

- A single productivity score
- Rankings of staff
- Hidden activity monitoring
- Counting clicks as work

## 6. Pilot Governance Rules

The reporting engine must remain source-backed and human-reviewable.

Rules:

- Do not generate final sensitive reports without review.
- Do not describe staff performance with unsupported judgment language.
- Do not infer facts beyond the event evidence.
- Do not expose private or leadership-only notes to staff.
- Do not use report logic for discipline without separate human process.
- Always preserve the source link for report lines when possible.

## 7. First Pilot Scenario

Use real examples to validate the system.

Example 1:

```text
Moises from T-Mobile came in today to discuss phone and internet products.
```

Expected result:

- Captured as Quick Update.
- Category suggested as Sales / Opportunity or Vendor.
- Included as low/medium daily report seed.
- Follow-up optional.

Example 2:

```text
AJ checked the roof today. Possible repair work may happen in the next few weeks.
```

Expected result:

- Captured as Quick Update.
- Category suggested as Facility.
- Follow-up suggested.
- Carryover candidate if repair estimate or scheduling is needed.
- Included in COO report seed.

## 8. Promotion Criteria

Do not duplicate the workspace to every staff member until the pilot proves:

- The daily workspace remains simple.
- Quick Update is fast enough for real use.
- Report seeds are more helpful than noisy.
- Daily report draft saves time.
- Staff can review their own day without confusion.
- Managers can see blockers and accountability without micromanaging.
- COO can see cross-app risk and progress.

## 9. Future Expansion

After the pilot:

- Add weekly summaries.
- Add monthly operating summaries.
- Add department-level dashboards.
- Add training opportunity review.
- Add role-based report templates.
- Add source-backed report export.
- Add configurable report audiences.
- Add smarter classification from repeated live feedback.
