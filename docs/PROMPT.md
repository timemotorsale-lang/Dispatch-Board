# Task

Implement DB-046 — Persist recommendation reason codes and text

# Goal

Persist assignment recommendation explanation data so tasks and recommendation results carry durable, human-readable recommendation context for later UI display.

The recommendation system should not only return a recommended user; it should also store:

- Recommended user, if found
- Stable recommendation reason code
- Short human-readable explanation
- Whether manager review is needed

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- Relevant recommendation, generation, task, board read, Prisma schema, seed, and test files

This task follows DB-045, which implemented recommendation matching rules. Assume DB-045 exists. If DB-045 is missing or incomplete, stop and report what is missing before implementing DB-046.

Relevant product rules:

- Recommendation logic must remain deterministic, explainable, and manager-overridable.
- Recommendation order is:
  1. Direct user duty match
  2. Role match
  3. Task template owner
  4. Workflow-area / department match
  5. Manager review needed if no clear match exists
- Do not build advanced scoring, capacity balancing, AI assignment, or manager override endpoints in this task.
- DB-047 will handle manager reassignment and override behavior later.

# Current behavior

Recommendation matching may return a recommended user and reason path from the service, but the reason code and explanation are not yet durably persisted alongside tasks or exposed consistently in task/board read models.

# Desired behavior

Add durable recommendation explanation fields to the task/recommendation persistence path.

Prefer the smallest schema change that fits the current app design. If there is no dedicated recommendation table already, add nullable fields to `Task` or the existing task persistence model, for example:

- `recommendationReasonCode`
- `recommendationReasonText`
- `recommendationReviewNeeded`

Use existing naming conventions if the codebase already has similar fields.

Reason codes should be stable machine-readable values. Reuse DB-045 reason names if they already exist. If not, introduce a small shared constant/enum such as:

- `DIRECT_DUTY_MATCH`
- `ROLE_MATCH`
- `TEMPLATE_OWNER_MATCH`
- `WORKFLOW_AREA_MATCH`
- `MANAGER_REVIEW_NEEDED`

The human-readable explanation should be short and suitable for UI display, for example:

- `Recommended because this user has a direct duty match.`
- `Recommended because this user's role matches the task template.`
- `Manager review needed because no eligible staff match was found.`

# Implementation guidance

1. Inspect the existing DB-045 recommendation service output.
2. Normalize the recommendation result shape so it consistently includes:
   - `recommendedUserId`
   - `reasonCode`
   - `reasonText`
   - `reviewNeeded`
3. Persist these fields when generated tasks are created.
4. Persist these fields when manual task creation or assignment recommendation paths compute a recommendation, if that path already exists.
5. Do not overwrite existing manual tasks or manager-changed assignments.
6. Do not change idempotent generation behavior:
   - Re-running generation must not duplicate generated tasks.
   - Existing generated tasks should not be recreated just to update recommendation text.
7. Update board/task read models so these fields are returned where task recommendation data is already exposed.
8. If activity events already include assignment recommendation metadata, include the persisted reason code/text in event metadata. Do not create a large new activity system in this task.
9. Update seed/factory/test helpers as needed.

# Constraints

- Keep the change minimal and scoped to DB-046.
- Do not implement DB-047 manager override or reassignment endpoint.
- Do not add advanced priority scoring, staff capacity limits, workload balancing, or AI assignment.
- Do not create a complex recommendation history table unless the current architecture already points that way.
- Do not add new dependencies unless absolutely necessary.
- Preserve existing tests and behavior.
- Follow existing Prisma, service, repository, and validation patterns.
- Keep business logic server-side.
- If a larger refactor appears necessary, stop and explain the tradeoff before editing.

# Tests

Add or update tests for:

- A direct-duty match persists the expected reason code and readable explanation.
- A role match persists the expected reason code and readable explanation.
- A template-owner or workflow-area match persists the expected reason code and readable explanation, if those cases exist in DB-045.
- A no-match result persists manager-review-needed context.
- Generated tasks store recommendation explanation fields during creation.
- Board/task read models include recommendation reason fields.
- Idempotent generation still avoids duplicate tasks.

Run the relevant test commands, likely:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Use the actual project commands if they differ.

# Done when

- Recommendation reason code and explanation text are persisted.
- Recommendation review-needed state is persisted.
- Generated tasks carry recommendation explanation data.
- Existing board/task read models expose the persisted recommendation explanation fields.
- Tests cover the main recommendation persistence paths.
- Existing generation idempotency still works.
- No unrelated files were changed.
- Any affected docs are updated if schema or architecture changed.
- Final response summarizes:
  - Files changed
  - Schema/model changes
  - Behavior added
  - Tests run
  - Anything not verified