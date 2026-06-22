# Task

DB-047 Add manager reassignment and override endpoint

# Goal

Implement a manager-only task assignment endpoint that lets managers safely:

1. Accept the stored recommendation for a task.
2. Override the recommendation by assigning the task to a different active user.
3. Reassign an already-assigned task to another active user.

The endpoint must enforce server-side permissions, validate input, preserve existing task workflow rules, and create durable activity events for assignment changes.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- Relevant task, policy, activity, recommendation, and validation files
- Existing tests around task creation, staff status updates, activity events, recommendations, and permissions

This task follows:

- DB-041 activity event schema and persistence
- DB-042 activity event emission
- DB-043 activity feed API
- DB-045 recommendation matching rules
- DB-046 persisted recommendation reason codes/text

Before editing, verify that DB-045 and DB-046 behavior exists. If the needed recommendation fields or helpers are missing, stop and report the prerequisite gap instead of inventing a large workaround.

# Desired behavior

Add or complete the assignment endpoint using the existing route/API conventions.

Preferred route if not already present:

`POST /api/tasks/:id/assign`

The endpoint should support a payload shaped similarly to this, adapting names to existing project conventions:

```ts
type AssignTaskRequest = {
  mode: "accept_recommendation" | "override" | "reassign";
  assignedUserId?: string;
  reason?: string;
};