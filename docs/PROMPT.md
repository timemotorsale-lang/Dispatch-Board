# Task

DB-045 Implement recommendation matching rules

# Goal

Implement the assignment recommendation matching service for the Time Motor Sales Dispatch Board.

The service should recommend the best eligible staff member for a task/template using this ordered rule path:

1. Direct user duty match
2. Role match
3. Task template owner
4. Workflow-area match
5. Manager review needed if no clear match exists

The output must be deterministic, explainable, and easy for the manager to override later.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing recommendation, generation, task-template, user, duty, role, board, and test files

Relevant project rules:

- Keep recommendation logic server-side.
- Keep automation simple and explainable.
- Recommendations support the manager; they do not replace manager judgment.
- Do not add advanced scoring, staff capacity limits, profit scoring, sales urgency scoring, aged inventory scoring, or AI-only assignment.
- Do not implement DB-046 persistence of recommendation reason codes/text unless a field already exists and current code already expects it.
- Do not implement DB-047 manager reassignment/override endpoint.
- Do not implement DB-048 review queue or approval UI.

# Current behavior

Inspect the current implementation before changing code.

Likely current state:

- Daily generation and task creation may already set `assignedUserId` or `recommendedUserId`.
- There may be an existing placeholder recommendation service or inline recommendation logic.
- There may already be seeded users, roles, duties, task templates, and workflow areas.
- Activity events may already exist from DB-041 through DB-044.

Do not assume exact file names. Locate the actual service/repository/test structure first.

# Desired behavior

Create or update a recommendation service that accepts enough context to recommend an assignee for a task/template.

The service should return a structured result similar to:

```ts
type RecommendationResult = {
  recommendedUserId: string | null;
  reasonCode:
    | "DIRECT_DUTY_MATCH"
    | "ROLE_MATCH"
    | "TEMPLATE_OWNER_MATCH"
    | "WORKFLOW_AREA_MATCH"
    | "MANAGER_REVIEW_NEEDED";
  reasonPath: string[];
  explanation: string;
  managerReviewNeeded: boolean;
};