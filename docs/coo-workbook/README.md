# COO Workbook and Staff Reporting Intelligence

**Status:** Planning source of truth  
**Purpose:** Define the product philosophy, algorithms, workflows, and pilot rules for the COO Workbook and future staff daily workspace reporting capability.  
**Primary philosophy:** Enterprise capability in the backend. UX simplicity on the front end.

---

## 1. Product Intent

The COO Workbook is not only a report page. It is the pilot workspace for a broader reporting and accountability engine.

The long-term system should support two views of the same operational truth:

1. **COO / leadership view:** what is happening across the app, what is blocked, what needs approval, what changed today, what carries risk, and what should appear in daily, weekly, and monthly leadership reports.
2. **Staff view:** what this person planned, worked on, completed, blocked, promised, escalated, handed off, or carried over today.

Both views must be generated from one shared evidence trail. The COO should see the whole business. Staff should see their own day, responsibilities, blockers, updates, and report draft.

## 2. Non-Negotiable Philosophy

The workspace remains a place where work happens first.

For staff, the page should answer:

- What do I need to do today?
- What is most important right now?
- What have I completed?
- What is stuck?
- What did I promise?
- What needs follow-up?
- What should carry over tomorrow?
- What should I document quickly because it happened outside the plan?

Reporting is a result of using the workspace well. It must not make daily work feel like paperwork.

## 3. Core System Model

The reporting intelligence should follow this flow:

```text
Work activity
  -> Work event
  -> Operational signal
  -> Report seed
  -> Reviewed report draft
  -> Daily, weekly, or monthly report
```

Definitions:

- **Work activity:** Something a user did or something the system observed inside the app.
- **Work event:** A structured record of that activity with actor, owner, subject, time, source, and evidence.
- **Operational signal:** The business meaning detected from the event, such as blocker, promise, decision, approval risk, quick update, handoff, progress, or completion.
- **Report seed:** A candidate item that may belong in a report.
- **Reviewed report draft:** A generated summary that staff, manager, or COO can edit, approve, exclude, or send.
- **Report:** A saved daily, weekly, or monthly snapshot with source links and audit history.

## 4. Required Companion Documents

Use these documents together:

- [Algorithms and Signal Logic](ALGORITHMS_AND_SIGNAL_LOGIC.md)
- [Workspace Workflows and UX Logic](WORKSPACE_WORKFLOWS_AND_UX_LOGIC.md)
- [Pilot Rollout and Live Refinement Plan](PILOT_ROLLOUT_AND_LIVE_REFINEMENT_PLAN.md)
- [Implementation Roadmap and Milestones](IMPLEMENTATION_ROADMAP_AND_MILESTONES.md)

## 5. Relationship To Existing App Foundations

The implementation should reuse the current foundation instead of creating a parallel system:

- Tasks
- My Day
- Activity feed events
- Task comments
- Blocker reasons
- Manager review
- Board day generation
- Staff execution handoff
- Customer promises
- Repair orders
- Parts, vendor, inventory, and production workspaces

The COO Workbook should become a higher-level operating view over those existing events and workflows.

## 6. Quick Update Feature

The Quick Update feature is a required part of the workspace plan.

It exists to capture meaningful unplanned work or real-world operational context that would otherwise be lost.

Examples:

- Moises from T-Mobile visited to discuss or sell products.
- AJ checked the roof and may perform repairs in the next few weeks.
- A vendor stopped by.
- A facility issue appeared.
- A staff member handled an unusual interruption.
- A customer made a non-routine request.
- A manager made a decision that should be remembered.

Quick Update should follow the rule:

```text
Capture first. Organize later.
```

The user should be able to type a natural update quickly. The system can classify, score, and route it behind the scenes.

## 7. Daily Checklist Feature

The workspace should also support a lightweight Daily Checklist that is not the same as formal Tasks.

Not every small to-do should become an enterprise task immediately. Staff need a simple place to write down today's working list, mark items done, and add short updates without triggering a full workflow.

Daily Checklist should support:

- Simple item entry.
- Check mark for done.
- Color/status such as green, yellow, or red.
- Short update note.
- Optional conversion into a formal task later.
- Optional promotion into a report seed when meaningful.

Recommended statuses:

- **Green:** done or on track.
- **Yellow:** needs update, waiting, delayed, or may need help.
- **Red:** blocked, overdue, urgent, or needs manager attention.

The Daily Checklist is for personal/day execution. Formal Tasks remain for assigned, trackable, reviewable, cross-person or process-governed work.

## 8. Success Definition

The pilot is successful when:

- Staff can use the page as a simple daily work area.
- Unplanned work can be captured quickly.
- COO can see app-wide risk and progress.
- Daily reports can be drafted from real work activity without staff recreating the day manually.
- Weekly and monthly reports can summarize patterns, not just lists.
- Every report item can trace back to source activity.
- The design improves accountability and training without feeling like surveillance.
