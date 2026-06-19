# Task

Implement DB-038 (Add task comments API) and DB-039 (Add task comments UI)

# Goal

Add a simple, reliable task comments/update workflow so staff and managers can read and add task-specific updates from the task detail view.

Comments should persist in the database, attach to the correct task and author, and appear in the task detail UI with clear author and timestamp context.

# Classification

Full vertical slice.

Reason: This task spans persistence/read model, API/server action behavior, permission checks, validation, UI integration, and tests.

# Context

Read these first:

- `docs/AGENTS.md`

- `docs/ARCHITECTURE.md`

- `docs/ROADMAP.md`

- `docs/PRODUCT_SPEC.md`

- `docs/MVP_SCOPE.md`

- Existing task API, task detail, policy, validation, repository, and UI files

- Existing Prisma schema and migrations

- `UI_REFERENCE.png` or `docs/images/UI_REFERENCE.png` if present

Relevant roadmap items:

- DB-038: Add task comments API

  - Implement comment creation and retrieval for task updates.

  - Task comments persist and are attached to the correct task and author.

- DB-039: Add task comments UI

  - Surface task comments in the task detail view with basic author and timestamp context.

  - Staff and managers can read and add task comments from the app.

Relevant product rules:

- Staff can add comments/updates to their own tasks.

- Managers can oversee the full board and task activity.

- Keep updates low friction, especially on mobile.

- Keep permission checks server-side. UI controls may hide actions, but the server must enforce the rule.

# Current behavior

The app has or should have:

- Board and task workflow from DB-028 through DB-037.

- A task detail read path from DB-033.

- Staff status update and validation flows from DB-034 through DB-036.

- Staff-focused task view from DB-037.

Task comments may not yet be implemented. Inspect the current code before making assumptions.

# Desired behavior

## API / server behavior

Implement task comment creation and retrieval using the existing project patterns.

Use the existing route/server-action style already used for tasks. Prefer the architecture route if appropriate:

- `POST /api/tasks/:id/comments`

For retrieval, use the existing task detail read model if that is the cleanest pattern. Otherwise add a dedicated comments read route consistent with the codebase, such as:

- `GET /api/tasks/:id/comments`

The final result must provide a reliable way for the task detail UI to load comments.

Each comment should include:

- `id`

- `taskId`

- `authorUserId`

- author display data needed by the UI, usually name and email if already exposed elsewhere

- `body`

- `createdAt`

## Data model

If `TaskComment` already exists, reuse it.

If it does not exist, add it following the architecture:

- `id`

- `taskId`

- `authorUserId`

- `body`

- `createdAt`

Add relations to `Task` and `User` if needed.

Add useful indexes if consistent with existing Prisma style:

- comments by `taskId`

- comments ordered by `createdAt`

Do not create unrelated activity-feed schema in this task unless it already exists.

## Permissions

Server-side rules must enforce:

- Authenticated users only.

- Managers may read and add comments on any task they can access.

- Staff may read task comments for tasks visible to them under the current board/task visibility rules.

- Staff may add comments only to their own assigned tasks unless an existing policy already allows broader staff updates.

- Staff must not be able to add comments to another staff member’s task by calling the API directly.

- Return consistent permission errors using existing app conventions.

Important: reuse existing policy helpers where possible. Do not duplicate role logic inside UI components.

## Validation

For comment creation:

- `body` is required.

- Trim leading/trailing whitespace.

- Reject empty or whitespace-only comments.

- Add a reasonable max length, preferably matching existing validation conventions. If none exists, use 2,000 characters.

- Preserve line breaks if the UI supports them.

- Do not render user-entered HTML as HTML.

## Optional activity integration

The roadmap has dedicated future work for activity events, so do not build the full activity event system here.

However, if an `ActivityEvent` model/service/helper already exists in the current branch, emit a lightweight `COMMENT_ADDED` or equivalent event from the same server operation that creates the comment.

If activity infrastructure does not exist yet, leave it alone and do not create a placeholder production-facing fake feed.

# UI behavior

Add a comments/updates section to the task detail view.

The UI should show:

- Section title such as `Updates` or `Comments`

- Empty state: `No updates yet.`

- Existing comments ordered oldest-to-newest or newest-to-oldest, whichever matches the current app pattern

- Author name

- Timestamp in a readable format

- Comment body

- A textarea/input for adding a new update

- Submit button with loading state

- Validation error when the comment is empty

- Server error message when save fails

After a successful submit:

- Clear the input.

- Show the new comment without requiring a full browser refresh.

- Keep the user in the same task detail view.

Staff who are not allowed to comment should not see an active comment form, but the server must still enforce the restriction.

# Visual guidance from mockup

Use the existing Time Motor Sales Dispatch Board visual direction.

For the comments UI:

- Keep it simple and enterprise-clean.

- Treat comments as operational updates, not a social chat.

- Avoid visual clutter.

- Use compact spacing and readable hierarchy.

- Make the textarea easy to use on mobile.

- Keep important task actions visible.

- Do not let the comments section crowd out the status/update controls.

- Avoid horizontal overflow.

- Match existing card, panel, border, typography, and button patterns.

# Constraints

- Keep the change scoped to DB-038 and DB-039.

- Do not rewrite the board layout.

- Do not redesign the full task detail view beyond what comments require.

- Do not add notifications, rich text, mentions, attachments, editing, deleting, reactions, or threaded replies.

- Do not add new dependencies unless absolutely necessary.

- Do not weaken existing task status, blocker, approval, or permission rules.

- Do not expose sensitive user fields in comment author data.

- Do not seed real customer or dealership-sensitive data.

- Preserve existing behavior and tests.

# Implementation guidance

Suggested order:

1. Inspect current task detail API/read model and task UI.

2. Inspect Prisma schema for `TaskComment`.

3. Add or reuse `TaskComment` persistence.

4. Add repository/service functions:

   - list comments for a task

   - create comment for a task

5. Add validation and permission checks close to the server entry point.

6. Expose comment creation and retrieval through existing API/server-action conventions.

7. Include comments in the task detail UI.

8. Add loading, empty, and error states.

9. Add tests for API/service behavior and UI behavior where practical.

10. Run relevant checks.

# Tests to add or update

Add tests for:

- Creating a comment attaches it to the correct task.

- Creating a comment attaches the current authenticated user as author.

- Empty or whitespace-only comment is rejected.

- Over-length comment is rejected.

- Staff can comment on their own assigned task.

- Staff cannot comment on another user’s task.

- Manager can comment on a task.

- Task detail/comment retrieval returns comments with author and timestamp context.

- UI shows empty state when no comments exist.

- UI displays existing comments.

- UI can submit a new valid comment and show it afterward.

Use existing test style and factories/seed helpers. Do not invent a separate test framework.

# Manual verification

After implementation, manually verify:

1. Log in as manager.

2. Open a task detail view.

3. Add a comment.

4. Confirm the comment appears with manager name and timestamp.

5. Log in as assigned staff.

6. Open one of that staff user’s tasks.

7. Add a comment.

8. Confirm it appears without page refresh.

9. Try to comment on another staff member’s task if the UI allows access.

10. Confirm the server rejects the unauthorized mutation.

11. Try submitting a blank comment.

12. Confirm validation appears and no comment is created.

13. Check mobile-size viewport for usability and no horizontal overflow.

# Done when

- DB-038 behavior works: comments can be created and retrieved through the app’s server/API path.

- DB-039 behavior works: task detail view shows comments with author and timestamp and supports adding a new comment.

- Comments persist in the database and are attached to the correct task and author.

- Server-side permissions are enforced.

- Validation rejects blank comments.

- UI handles loading, empty, submitting, validation, and failure states.

- Relevant tests pass.

- Typecheck/lint/test commands are run, or any skipped command is clearly explained.

- The final response summarizes:

  - Files changed

  - Behavior added

  - Tests run

  - Any known limitations or follow-up work