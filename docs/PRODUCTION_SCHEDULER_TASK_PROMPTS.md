# Production Scheduler Task Prompts

This document packages the implementation-ready task prompts for `v0.6.1 - Production scheduler verification` from [ROADMAP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ROADMAP.md).

Use these prompts as paste-ready issue bodies or Codex task prompts. They are ordered to match the recommended execution sequence in the roadmap.

## PROD-SCHED-001

**Title:** Define scheduler verification contract

```md
Goal:
Define the durable contract for production scheduler verification so scheduled board generation outcomes are explicit, consistent, and reusable across service, UI, and docs.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- `src/app/api/cron/generate-board/route.ts`
- `src/server/services/board-generation.ts`
- `src/server/services/generation-tasks.ts`

Relevant files:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- any new contract doc you add under `docs/`

Task:
Create a durable scheduler verification contract for autonomous board generation. The contract should define the states, meanings, required fields, and intended operator use for scheduled attempt outcomes.

The contract must cover:
- `received`
- `unauthorized`
- `skipped`
- `started`
- `succeeded`
- `failed`

The contract must also define explicit skip reason categories, including:
- non-business-day
- before configured generation time
- already generated
- missing or invalid configuration

Constraints:
- Do not implement code changes yet unless a tiny code comment or type export is required to keep docs accurate.
- Keep the contract additive and aligned to the current Dispatch Board architecture.
- The contract must distinguish scheduled attempts from manual retries.
- Failure details must be manager-safe and must not expose secrets.

Done criteria:
- A clear contract document exists in the repo.
- The contract defines required fields for each scheduler outcome.
- Skip reasons are explicitly categorized instead of left as free-form text.
- The contract explains how the UI and manager operations surfaces will consume it.
- `docs/ROADMAP.md` stays aligned with the new contract.

Tests to run:
- No code tests required if this stays documentation-only.
- If you add types or exports, run `npm.cmd run typecheck`.

Deliverable:
- A concise contract doc and any minimal roadmap/docs alignment needed.
```

## PROD-SCHED-002

**Title:** Persist cron request evidence

```md
Goal:
Make every scheduled route hit leave durable evidence, even when generation does not proceed.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- the scheduler verification contract from `PROD-SCHED-001`
- `src/app/api/cron/generate-board/route.ts`
- `src/server/services/board-generation.ts`
- `src/server/services/generation-tasks.ts`
- `src/server/repositories/generation-tasks-repository.ts`
- `prisma/schema.prisma`

Relevant files:
- `prisma/schema.prisma`
- `prisma/migrations/`
- `src/app/api/cron/generate-board/route.ts`
- `src/server/services/board-generation.ts`
- `src/server/services/generation-tasks.ts`
- `src/server/repositories/generation-tasks-repository.ts`
- `src/tests/unit/cron-generate-board-route.test.ts`
- add new tests where appropriate

Task:
Implement durable evidence for every cron request to `/api/cron/generate-board`.

The persisted evidence must capture:
- request received timestamp
- trigger type `scheduled`
- authorization result
- resulting outcome classification from the scheduler verification contract

This slice should focus on request-level evidence, not yet the full manager UI.

Constraints:
- Scheduled and manual generation must continue to use the same shared generation engine.
- Keep the implementation additive.
- Do not expose secrets in persisted data.
- Preserve idempotent board generation behavior.
- Avoid broad rewrites.

Done criteria:
- Authorized and unauthorized cron hits both leave durable evidence.
- Evidence is queryable for later read-model use.
- The route behavior remains safe and backward-compatible.
- Existing scheduled generation behavior still works.

Tests to run:
- `npm.cmd test -- src/tests/unit/cron-generate-board-route.test.ts`
- add focused unit/integration tests for persistence behavior
- `npm.cmd run typecheck`

Deliverable:
- Schema/repository/service changes for cron-hit evidence
- focused tests
- minimal docs updates if schema or behavior meaningfully changes
```

## PROD-SCHED-003

**Title:** Persist scheduled skip reasons

```md
Goal:
Make scheduled skips explicit, durable, and queryable so production operators can tell why auto-generation did not create a board.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- the scheduler verification contract from `PROD-SCHED-001`
- `src/server/services/board-generation.ts`
- `src/server/services/generation-tasks.ts`
- any evidence model added in `PROD-SCHED-002`

Relevant files:
- `src/server/services/board-generation.ts`
- `src/server/services/generation-tasks.ts`
- `src/server/repositories/generation-tasks-repository.ts`
- `prisma/schema.prisma`
- `src/tests/unit/board-generation-service.test.ts`
- add new tests where needed

Task:
Persist explicit scheduled skip reasons instead of leaving skip handling as only ad hoc summary text.

At minimum support:
- non-business-day
- before configured generation time
- already generated
- missing configuration
- invalid configuration

Constraints:
- Keep skip reasons normalized and suitable for UI/read-model consumption.
- Preserve existing human-readable summary strings where helpful, but do not rely on them as the only source of truth.
- Do not break current scheduled/manual result contracts without updating consumers.
- Keep changes focused on scheduled generation observability.

Done criteria:
- Scheduled skips store a stable reason code plus manager-safe explanation.
- Existing skip behaviors still function correctly.
- The latest scheduled state can distinguish one skip reason from another without log access.

Tests to run:
- extend `src/tests/unit/board-generation-service.test.ts`
- add any repository/service coverage required
- `npm.cmd run typecheck`

Deliverable:
- normalized skip-reason persistence
- updated tests
- small docs updates if the verification contract or setup guidance changes
```

## PROD-SCHED-004

**Title:** Persist sanitized failure diagnostics

```md
Goal:
Store manager-safe failure diagnostics for scheduled generation without leaking secrets or protected runtime details.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- the scheduler verification contract from `PROD-SCHED-001`
- `src/server/services/generation-tasks.ts`
- `src/server/services/board-generation.ts`
- current tests around generation failure behavior

Relevant files:
- `src/server/services/generation-tasks.ts`
- `src/server/services/board-generation.ts`
- `src/server/repositories/generation-tasks-repository.ts`
- `src/tests/unit/generation-tasks.test.ts`
- `src/tests/unit/board-generation-service.test.ts`

Task:
Harden failure persistence so scheduled generation records:
- safe failure category
- manager-safe error message
- enough operational detail to diagnose what happened
- no secrets, tokens, connection strings, or protected runtime values

Make sure this works for both:
- failures before task creation
- failures during task creation or board update

Constraints:
- Reuse existing sanitization patterns where possible.
- Do not downgrade already-generated boards incorrectly when a later retry fails.
- Keep failure diagnostics suitable for future manager-facing UI.

Done criteria:
- Failed scheduled runs persist a safe, structured diagnostic record.
- Sensitive strings are not stored in operator-visible failure fields.
- Existing generation failure semantics remain intact.
- The persisted shape is stable enough for read-model and UI use.

Tests to run:
- extend `src/tests/unit/generation-tasks.test.ts`
- extend `src/tests/unit/board-generation-service.test.ts`
- `npm.cmd run typecheck`

Deliverable:
- failure diagnostics hardening
- focused regression tests
- minimal docs alignment if behavior semantics changed
```

## PROD-SCHED-005

**Title:** Add scheduler health read model

```md
Goal:
Build a single server-side read model for production scheduler health so manager-facing UI can render reliable generation status without reconstructing logic in the client.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- scheduler verification contract from `PROD-SCHED-001`
- code from `PROD-SCHED-002` through `PROD-SCHED-004`
- `src/server/services/board-read.ts`
- `src/features/board/board-screen.tsx`
- `src/features/board/board-toolbar.tsx`

Relevant files:
- `src/server/services/board-read.ts`
- `src/server/services/board-generation.ts`
- `src/server/repositories/generation-tasks-repository.ts`
- `src/app/api/board/today/route.ts`
- `src/app/api/board/[date]/route.ts`
- `src/tests/unit/board-read-service.test.ts`
- `src/tests/unit/board-route.test.ts`
- add tests as needed

Task:
Create a server-side scheduler health read model that can summarize:
- latest scheduled run
- latest manual run
- last success
- last failure
- latest skip reason
- today’s board generation status
- whether manager attention is needed

Keep the read model focused and stable enough to drive the next UI milestone.

Constraints:
- Do not move business logic into client components.
- Prefer additive server-side shape changes over API rewrites.
- Keep manager-safe text separate from any internal diagnostics.
- Preserve current board read behavior for existing consumers.

Done criteria:
- Board read paths can return scheduler health data in a stable shape.
- The read model can distinguish scheduled vs manual outcomes.
- It is possible for a future UI to answer: did it fire, what happened, what should I do next?
- Existing board reads continue to work.

Tests to run:
- extend `src/tests/unit/board-read-service.test.ts`
- extend `src/tests/unit/board-route.test.ts`
- add focused integration coverage if needed
- `npm.cmd run typecheck`

Deliverable:
- scheduler health read model
- API/read-service wiring
- focused tests
```

## PROD-SCHED-006

**Title:** Add manager generation health panel

```md
Goal:
Expose production scheduler health in a manager-only surface so a manager can tell whether automatic board generation ran and what the current state is without checking logs.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- scheduler verification contract from `PROD-SCHED-001`
- work from `PROD-SCHED-005`
- `src/features/board/board-screen.tsx`
- `src/features/board/board-toolbar.tsx`
- `src/app/(app)/settings/page.tsx`
- any existing settings or board status surfaces

Relevant files:
- `src/features/board/`
- `src/features/settings/`
- `src/app/(app)/board/`
- `src/app/(app)/settings/`
- `src/server/services/board-read.ts`
- tests covering the chosen UI surface

Task:
Add a manager-only generation health panel that renders the scheduler health read model clearly.

The panel should show:
- today’s board generation status
- latest scheduled run
- latest manual run
- last successful generation
- last failed generation
- whether manager attention is needed

Constraints:
- Keep the UI honest and operations-first.
- Do not invent fake certainty when production evidence is missing.
- Reuse the read model rather than duplicating logic in the client.
- Preserve the existing board workflow and manager experience.

Done criteria:
- A manager can open the app and see generation health for the current board day.
- The panel distinguishes automatic vs manual runs.
- The panel communicates success, running, skipped, failed, and unknown states clearly.
- Non-manager users do not get manager-only health controls.

Tests to run:
- add focused unit tests for the UI surface if the repo already uses them for this area
- extend service/route tests if the UI needs new data wiring
- `npm.cmd run typecheck`

Deliverable:
- manager-only generation health panel
- supporting UI wiring and tests
```

## PROD-SCHED-007

**Title:** Add generation guidance states

```md
Goal:
Turn scheduler health from raw status into practical operator guidance so managers know what to do next.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- scheduler verification contract from `PROD-SCHED-001`
- `PROD-SCHED-006` implementation
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`

Relevant files:
- manager health panel files from `PROD-SCHED-006`
- `src/features/board/`
- `src/features/settings/`
- supporting server read model files if small additions are needed

Task:
Add clear UI guidance for these cases:
- unauthorized scheduled requests
- skipped because before generation time
- skipped because non-business day
- skipped because board already generated
- failed generation
- no scheduled evidence yet
- generation currently running

Each state should explain:
- what happened
- whether manager action is needed
- the next recommended action

Constraints:
- Keep messages operational and specific.
- Avoid blamey or vague wording.
- Do not expose internal-only diagnostics in user-facing guidance.
- Make sure “safe to retry” is only shown where true.

Done criteria:
- Manager-facing guidance exists for every major scheduler outcome.
- The UI answers “what happened” and “what should I do next” for each state.
- Guidance aligns with actual scheduler behavior and does not overpromise.
- Existing generation controls remain usable.

Tests to run:
- add focused UI tests if feasible
- extend read-model tests if guidance depends on derived flags
- `npm.cmd run typecheck`

Deliverable:
- outcome-specific guidance states in the manager health experience
- any needed small read-model additions
- tests where practical
```

## PROD-SCHED-008

**Title:** Link retry actions to visible run evidence

```md
Goal:
Make manual retry feel like a trustworthy operations action by linking it directly to visible generation evidence before and after the retry.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- scheduler verification contract from `PROD-SCHED-001`
- `src/app/api/board/generate/route.ts`
- `src/server/services/board-generation.ts`
- `src/features/board/board-toolbar.tsx`
- the manager health panel from `PROD-SCHED-006`

Relevant files:
- `src/app/api/board/generate/route.ts`
- `src/server/services/board-generation.ts`
- `src/features/board/board-toolbar.tsx`
- manager health panel files
- tests for manual generation and board read health

Task:
Strengthen the manual retry workflow so the manager can:
- see the most recent evidence before retry
- trigger a safe retry
- see the retry reflected in the visible health state after refresh
- understand whether the retry succeeded, failed, or skipped

Constraints:
- Manual retry must remain idempotent.
- Retry should continue using the same shared generation engine as scheduled runs.
- Do not create duplicate generated tasks.
- Keep the retry UX fast and operationally clear.

Done criteria:
- The manager can retry from a health-aware surface.
- The visible health state updates coherently after retry.
- Retry outcomes are linked to latest run evidence rather than isolated toast-only feedback.
- Existing manual generation protections remain intact.

Tests to run:
- extend `src/tests/unit/board-generation-service.test.ts`
- extend board route/read tests if needed
- add focused UI tests if practical
- `npm.cmd run typecheck`

Deliverable:
- health-aware retry workflow
- visible evidence linkage
- focused regression coverage
```

## PROD-SCHED-009

**Title:** Surface repeated unauthorized cron attempts

```md
Goal:
Make unauthorized scheduled requests visible as an operations and security signal instead of letting them fail silently.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- scheduler verification contract from `PROD-SCHED-001`
- evidence work from `PROD-SCHED-002`
- manager health work from `PROD-SCHED-006` and `PROD-SCHED-007`

Relevant files:
- cron route and any cron-evidence persistence files
- scheduler health read model
- manager health panel files
- `docs/SETUP.md` if troubleshooting guidance needs updating
- relevant tests

Task:
Expose unauthorized scheduled hits in a safe manager-visible way.

The feature should help identify:
- missing or wrong `CRON_SECRET`
- misconfigured host scheduler headers
- suspicious repeated unauthorized requests

Keep the output operational, not alarmist.

Constraints:
- Do not expose raw secret values or request headers.
- Surface patterns and counts, not sensitive payloads.
- Avoid turning one stray failure into excessive UI noise.
- Keep the manager signal useful and scannable.

Done criteria:
- Repeated unauthorized cron hits are visible in scheduler health.
- The manager can distinguish unauthorized failures from app-generation failures.
- The UI gives a sane next step, such as checking deployment secret or scheduler configuration.
- Sensitive request data remains protected.

Tests to run:
- extend cron route and scheduler health tests
- add read-model coverage for unauthorized aggregation if needed
- `npm.cmd run typecheck`

Deliverable:
- unauthorized-attempt visibility in the scheduler health workflow
- focused test coverage
- small setup/troubleshooting doc updates if needed
```

## PROD-SCHED-010

**Title:** Add production scheduler readiness checks

```md
Goal:
Help the app distinguish likely production configuration problems from normal generation outcomes or code failures.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- scheduler verification contract from `PROD-SCHED-001`
- manager health work from earlier `PROD-SCHED` tasks

Relevant files:
- `src/server/services/app-settings-service.ts`
- `src/server/services/board-generation.ts`
- manager health read model files
- any settings or operations surfaces that should show readiness information
- tests for settings/config validation

Task:
Add production scheduler readiness checks that can identify likely prerequisites problems, including:
- missing `CRON_SECRET`
- invalid generation timezone
- empty business days
- invalid generation time
- no scheduled evidence yet after expected time window

This should not require privileged deployment access; it should report what the app itself can safely know.

Constraints:
- Keep checks safe and manager-readable.
- Do not expose secret values.
- Distinguish app-known readiness from deployment-provider-only unknowns.
- Avoid false certainty where the app cannot directly inspect hosting configuration.

Done criteria:
- The app can report likely scheduler-readiness gaps from inside the codebase/runtime.
- Manager-facing surfaces can distinguish “app looks misconfigured” from “scheduler may not have fired.”
- Readiness checks are additive and do not disrupt normal generation.

Tests to run:
- add focused service tests for readiness checks
- extend board/settings read-model tests if needed
- `npm.cmd run typecheck`

Deliverable:
- scheduler readiness checks
- manager-readable readiness output
- tests
```

## PROD-SCHED-011

**Title:** Write scheduler deployment verification runbook

```md
Goal:
Create a repo-owned production verification runbook so the team can validate automatic board generation setup without relying on memory or tribal knowledge.

Read first:
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- scheduler verification contract from `PROD-SCHED-001`
- any manager health/readiness work completed in earlier `PROD-SCHED` tasks

Relevant files:
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- add a dedicated runbook in `docs/` if appropriate
- small roadmap/docs alignment updates if needed

Task:
Write a production scheduler deployment verification runbook for autonomous board generation.

The runbook should cover:
- required deployment prerequisites
- where `CRON_SECRET` must exist
- the expected scheduler route path
- supported authorization header shapes
- expected scheduled behavior before and after configured generation time
- how to safely validate the route manually
- what healthy evidence looks like in the app
- what common failure states mean
- what to do next for unauthorized, skipped, failed, or no-evidence states

Constraints:
- Keep the runbook concrete and operator-friendly.
- Do not include real secrets or environment values.
- Align terminology with the scheduler verification contract and manager health UI.
- Prefer exact expected outcomes over vague suggestions.

Done criteria:
- A new operator can follow the runbook and validate scheduler setup end to end.
- The runbook clearly distinguishes local checks from production checks.
- The runbook aligns with actual route behavior and manager-facing health states.
- Existing setup docs remain coherent after the update.

Tests to run:
- No code tests required if docs-only.
- If any code or typed config changes are made, run `npm.cmd run typecheck`.

Deliverable:
- scheduler deployment verification runbook
- any setup/release-checklist alignment required
```

## PROD-SCHED-012

**Title:** Upgrade release checklist with scheduler proof gate

```md
Goal:
Turn scheduler production readiness into an explicit release gate instead of a best-effort reminder.

Read first:
- `docs/ROADMAP.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- scheduler verification runbook from `PROD-SCHED-011`
- manager health/readiness work from earlier `PROD-SCHED` tasks

Relevant files:
- `docs/RELEASE_CHECKLIST.md`
- `docs/SETUP.md`
- any new runbook from `PROD-SCHED-011`

Task:
Upgrade the release checklist so production scheduler validation is required for release readiness.

Add explicit checklist items for:
- `CRON_SECRET` configured in deployment
- hosting scheduler enabled for `/api/cron/generate-board`
- app generation settings reviewed for timezone, time, and business days
- first successful scheduled evidence observed
- unauthorized scheduler hits checked
- manual retry verified after a controlled failure or safe validation path
- manager-facing health surface reviewed for the first production day

Constraints:
- Keep the checklist auditable and specific.
- Avoid checklist items that cannot be reasonably verified.
- Make the proof gate practical for the team’s current deployment model.
- Align with the runbook so operators are not sent in circles.

Done criteria:
- The release checklist contains explicit scheduler verification gates.
- It is clear what evidence counts as “production auto-generation verified.”
- The checklist is consistent with the current app behavior and docs.
- The checklist is strong enough to catch “manual generation still required every day” before sign-off.

Tests to run:
- None if docs-only.
- If any code changes are introduced, run `npm.cmd run typecheck`.

Deliverable:
- upgraded scheduler-specific release checklist section
- any related setup/runbook alignment
```

## PROD-SCHED-013

**Title:** Add scheduler verification test coverage

```md
Goal:
Protect the new scheduler verification workflow with automated tests so evidence, health reporting, and retry visibility do not regress.

Read first:
- `docs/ROADMAP.md`
- scheduler verification contract from `PROD-SCHED-001`
- completed `PROD-SCHED` implementation work through `PROD-SCHED-012`
- current tests for cron route, board generation, and board read behavior

Relevant files:
- `src/tests/unit/cron-generate-board-route.test.ts`
- `src/tests/unit/board-generation-service.test.ts`
- `src/tests/unit/generation-tasks.test.ts`
- `src/tests/unit/board-read-service.test.ts`
- `src/tests/unit/board-route.test.ts`
- `src/tests/integration/api-routes.test.ts`
- add new focused tests if needed

Task:
Add automated coverage for the scheduler verification workflow.

At minimum cover:
- authorized scheduled request
- unauthorized scheduled request
- scheduled skip states
- scheduled success state
- scheduled failure state
- latest scheduled vs latest manual evidence
- readiness checks if implemented
- manager health read-model output

Constraints:
- Prefer focused tests over massive integration rewrites.
- Keep the tests aligned with the scheduler verification contract.
- Avoid brittle UI-only assertions when service/read-model assertions are stronger.
- Do not silently remove existing coverage to make the suite pass.

Done criteria:
- Scheduler verification behavior is protected by automated tests.
- Core failure and skip paths have coverage.
- Read-model and route behavior are verified where the new data flows through.
- Tests would catch a regression that makes production auto-generation opaque again.

Tests to run:
- targeted `npm.cmd test -- ...` for changed files
- broader `npm.cmd test` if practical
- `npm.cmd run typecheck`

Deliverable:
- expanded scheduler verification test coverage
- stable, focused assertions for evidence and health behavior
```

## PROD-SCHED-014

**Title:** Execute first live scheduler validation checklist

```md
Goal:
Use the new scheduler evidence, manager health surface, readiness checks, and runbook to validate the first real autonomous production run.

Read first:
- `docs/ROADMAP.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md`
- scheduler verification runbook from `PROD-SCHED-011`
- completed `PROD-SCHED` implementation work

Relevant files:
- `docs/RELEASE_CHECKLIST.md`
- runbook docs from `PROD-SCHED-011`
- any place in docs where first live validation evidence should be recorded

Task:
Prepare the repo and operator workflow for the first live production validation of autonomous board generation.

This task should not assume direct production access from Codex unless explicitly provided. Instead, make the repo ready for a real operator to execute and record the validation.

The workflow should support proving:
- the scheduler fired
- the request was authorized
- the run was not silently skipped for the wrong reason
- the board generated successfully after the configured local generation time
- manager-facing health surfaces reflected the real result
- manual retry remained available if needed

Constraints:
- If no deployment access is provided, do not pretend the live validation was completed.
- Distinguish “implementation ready for validation” from “production validation actually observed.”
- Keep the output useful for a real operator on first deployment day.

Done criteria:
- The repo contains a clean first-live-validation workflow.
- It is obvious what evidence to capture on first production day.
- The team can record whether production auto-generation is truly verified or still blocked by deployment configuration.
- If production access is unavailable, the repo clearly marks this step as pending external execution.

Tests to run:
- No new code tests required if this is docs/process only.
- If any code changes are added, run `npm.cmd run typecheck`.

Deliverable:
- first-live-validation procedure and evidence expectations
- any checklist/runbook alignment needed
- clear note about external execution requirement if production access is not available
```
