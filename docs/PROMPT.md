# Task

DB-043 Add activity feed API

# Goal

Implement the backend/API read path for the event-backed activity feed so the board can load activity events for today or a selected board date.

This task should expose date-based retrieval for `ActivityEvent` records created by DB-041 and DB-042. The feed API should return events in a stable, UI-ready shape with actor, task, event type, message, timestamp, and metadata context.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- Existing activity/event files from DB-041 and DB-042
- Existing board/date API patterns from DB-028
- Existing auth/session and policy helpers
- Existing test patterns for API routes or server services

Relevant product/architecture rules:

- The activity feed must be event-backed, not inferred from UI state.
- Important state changes should create `ActivityEvent` records.
- The activity feed should default to today’s board and support selected board dates.
- Activity events should include who performed the action when applicable.
- System actions such as daily generation should be clearly labeled.
- MVP refresh can use polling; do not build streaming/SSE in this task.
- Planned API surface includes `GET /api/activity?date=YYYY-MM-DD`.
- Keep permission checks server-side.

# Current behavior

DB-041 should have added the `ActivityEvent` schema and persistence helpers.

DB-042 should have started emitting activity events for generation and task lifecycle operations.

However, there is not yet a dedicated read API that the board/activity feed UI can call to load events for a selected board date.

# Desired behavior

Add an authenticated activity feed API endpoint.

Preferred route:

- `GET /api/activity?date=YYYY-MM-DD`

If the current app uses a different API route convention, follow the existing convention but preserve the same capability.

The endpoint should:

1. Require an authenticated user.
2. Accept an optional `date` query parameter in `YYYY-MM-DD` format.
3. If `date` is omitted, default to today using the app’s existing board/date helper or configured timezone behavior.
4. Find the `BoardDay` for that date.
5. Return an empty event list if the board date exists but has no activity events.
6. Return an empty event list if no board exists for that date, unless the existing board API pattern returns a typed not-found response. Prefer consistency with existing board read API behavior.
7. Return events newest-first by `createdAt`, with a stable secondary order by `id` if needed.
8. Include enough related data for DB-044 activity feed UI without additional N+1 calls.

# Response shape

Return a JSON response similar to this, adapting names to existing project conventions:

```ts
{
  date: "2026-06-21",
  boardDayId: "board_day_id_or_null",
  events: [
    {
      id: "event_id",
      eventType: "TASK_STATUS_CHANGED",
      message: "Walter moved Oil Change to In Progress",
      createdAt: "2026-06-21T14:35:00.000Z",
      actor: {
        id: "user_id",
        name: "Walter",
        email: "walter@example.com"
      } | null,
      task: {
        id: "task_id",
        title: "Oil Change",
        status: "In Progress",
        workflowArea: "Inventory"
      } | null,
      metadata: {}
    }
  ]
}