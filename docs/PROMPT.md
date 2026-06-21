# Task

DB-044 — Build activity feed UI

# Goal

Build the user-facing Activity Feed UI for the Time Motor Sales Dispatch Board so managers and staff can quickly see what changed today, who changed it, and when it happened.

This task should consume the activity feed API from DB-043. Do not redesign the whole board or rewrite activity persistence. This is a focused UI slice.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- `README.md` if present
- Existing activity API/client code from DB-043
- Existing board page/layout code
- Existing UI components, fetch helpers, hooks, and tests
- `UI_REFERENCE.png` for visual guidance

Relevant roadmap sequence:

- DB-041 added activity event schema and persistence.
- DB-042 emitted events for generation and task lifecycle.
- DB-043 added activity feed API.
- DB-044 should now build the UI that displays those events.

# Product behavior

The activity feed should help the team understand what changed today without asking everyone for updates.

The feed should show events such as:

- Daily board generated
- Task created
- Task assigned or reassigned
- Due time changed
- Status changed
- Task blocked
- Waiting on parts
- Waiting on approval
- Ready for review
- Task completed
- Comment/update added

Each visible event should clearly show:

- Actor name, or `System` for system-generated events
- Event type or human-readable action label
- Event message/details
- Relative time or readable timestamp
- Related task context when available
- Clear visual distinction for important events like blocked, waiting on approval, ready for review, and completed

# UI guidance from mockup

Use `UI_REFERENCE.png` as the visual guide.

The reference shows a right-side rail titled `Live Activity Feed` with:

- A compact event list
- Event icon/status indicator
- Time on the left
- Event title/action
- Supporting task or vehicle context
- Actor name
- An `All Events` filter dropdown
- A `View full activity` link

Match that direction closely, but adapt to the existing implemented UI structure.

Do not create a cluttered notification center. Keep the activity rail clean, scannable, and enterprise-level.

# Desired implementation

Implement a reusable activity feed UI, preferably in a feature-owned location such as:

- `src/features/activity/ActivityFeedPanel.tsx`
- `src/features/activity/ActivityFeedItem.tsx`
- `src/features/activity/activityTypes.ts`
- or the closest existing project pattern

The UI should:

1. Load activity events for the selected board date using the DB-043 API.
2. Render events newest-first unless the API already returns a specific order.
3. Display actor, event/action, task context, and time clearly.
4. Include loading, empty, and error states.
5. Include a retry action for failed loading.
6. Include a compact filter control if practical:
   - `All Events`
   - `Tasks`
   - `Status Changes`
   - `Blocked`
   - `Comments`
   - `System`
7. Use short polling only if there is already a project pattern for polling or refresh intervals. If not, add a simple low-risk refresh strategy only if it stays minimal.
8. Keep mobile responsive:
   - On desktop/tablet, show the feed as a right rail if the board layout supports it.
   - On smaller screens, stack the feed below the board or make it accessible without horizontal overflow.
9. If the sidebar already has an `Activity Feed` navigation item, make sure it does not lead to a broken page. Either:
   - connect it to a simple full activity page using the same component, or
   - keep the implementation scoped and explain why the page should be a follow-up.
10. Do not expose raw JSON metadata directly to users.

# Current assumptions

Assume DB-043 already exposes a date-based activity API, likely similar to:

```text
GET /api/activity?date=YYYY-MM-DD