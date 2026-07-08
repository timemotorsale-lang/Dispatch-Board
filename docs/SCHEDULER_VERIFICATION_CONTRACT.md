# Scheduler Verification Contract

**Document:** Scheduler verification contract  
**Version:** v0.6.1 baseline  
**Last updated:** 2026-07-08  
**Status:** Approved documentation contract; persistence, health read model, and manager operations UI remain in progress

---

## 1. Purpose

This document defines the durable evidence contract for autonomous board generation through `/api/cron/generate-board`.

The goal is to make scheduled generation observable and explainable in production. Service code, manager-facing UI, operator runbooks, and release gates should all use the same scheduler state meanings instead of inferring health from board presence alone.

This contract is additive. It does not replace the shared generation engine or the existing `GenerationRun` model. Instead, it defines the scheduler-attempt evidence that production operations will rely on.

---

## 2. Scope

This contract applies to scheduled board generation attempts only.

- A scheduler attempt begins when the scheduled route receives an HTTP request.
- A scheduler attempt ends in one terminal outcome: `unauthorized`, `skipped`, `succeeded`, or `failed`.
- `received` and `started` are transitional states that still require durable evidence.
- Manual manager retries remain separate from scheduled attempts even though both use the same idempotent generation engine.
- Manager-facing operational surfaces must read scheduler evidence directly instead of guessing from free-form logs or UI-only inference.

Current implementation note:

- The current route and service already return `skipped`, `failed`, and transient `success` responses.
- This contract standardizes the durable terminal success state as `succeeded`.
- Future implementation work should map the current transient response label `success` to durable scheduler evidence state `succeeded`.

---

## 3. Core State Model

Scheduler evidence uses `attemptState` with these allowed values:

- `received`
- `unauthorized`
- `skipped`
- `started`
- `succeeded`
- `failed`

Expected flow:

```text
received -> unauthorized
received -> skipped
received -> started -> succeeded
received -> started -> failed
received -> failed
```

State meanings:

| `attemptState` | Meaning | Terminal | Generation run required |
| --- | --- | --- | --- |
| `received` | The scheduled route was hit and the app has accepted the request for evaluation. | No | No |
| `unauthorized` | The request reached the route but could not be trusted to execute scheduled generation. | Yes | No |
| `skipped` | The request was evaluated but generation intentionally did not run. | Yes | No |
| `started` | The request passed preflight checks and the shared generation engine started. | No | Yes |
| `succeeded` | The shared generation engine completed successfully for the board date. | Yes | Yes |
| `failed` | The request or generation flow encountered an operational failure that needs attention. | Yes | Optional for preflight failures; required once generation has started |

Rules:

- Every scheduled route hit must leave one durable attempt record.
- Every attempt record must end in exactly one terminal state.
- `skipped` is not an error by itself. The reason code determines whether it is expected or attention-worthy.
- `failed` must use manager-safe details only. Secrets, connection strings, raw tokens, and protected runtime data must never be stored in manager-visible evidence.

---

## 4. Common Required Fields

Every scheduler attempt record must include these fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `attemptId` | `string` | Yes | Stable identifier for the scheduler attempt record |
| `attemptState` | enum | Yes | One of the contract states in this document |
| `triggerType` | `"scheduled"` | Yes | Distinguishes scheduler evidence from manual retries |
| `triggerSource` | enum | Yes | High-level source of the request |
| `routePath` | `string` | Yes | Expected to be `/api/cron/generate-board` |
| `requestMethod` | `"GET" \| "POST"` | Yes | Method used for the scheduled route hit |
| `receivedAt` | ISO timestamp | Yes | When the route first accepted the request |
| `boardDate` | `YYYY-MM-DD` | Yes | Local board date the attempt is evaluating |
| `authorizationOutcome` | enum | Yes | Authorization result for the request |
| `generationRunId` | `string \| null` | Yes | Shared generation run identifier when a run exists |
| `managerMessage` | `string` | Yes | Short manager-safe explanation suitable for UI display |

Allowed `triggerSource` values:

- `platform_cron`
- `external_scheduler`
- `manual_http_test`
- `unknown`

Allowed `authorizationOutcome` values:

- `pending`
- `authorized`
- `unauthorized`
- `system_misconfigured`

Notes:

- `manual_http_test` is for deliberate operator validation against the scheduled route. It is still a scheduled attempt because it exercises the production entrypoint.
- `system_misconfigured` means the application could not safely evaluate authorization or scheduler preconditions because required runtime or app configuration was missing or invalid. This is not the same as an unauthorized caller.

---

## 5. State-Specific Required Fields

### `received`

Required fields in addition to the common fields:

- `attemptState = "received"`
- `authorizationOutcome = "pending"`

Meaning:

- The route was reached.
- The app has not yet committed to `unauthorized`, `skipped`, `started`, or `failed`.

### `unauthorized`

Required fields in addition to the common fields:

- `attemptState = "unauthorized"`
- `authorizationOutcome = "unauthorized"`
- `completedAt`
- `unauthorizedReasonCode`

Allowed `unauthorizedReasonCode` values:

- `MISSING_CREDENTIAL`
- `SECRET_MISMATCH`

Rules:

- `generationRunId` must be `null`.
- Unauthorized attempts must remain visible as operational evidence because repeated unauthorized hits may indicate deployment misconfiguration or probing.

### `skipped`

Required fields in addition to the common fields:

- `attemptState = "skipped"`
- `completedAt`
- `skipReasonCode`

Rules:

- `generationRunId` is normally `null`.
- When `skipReasonCode = "ALREADY_GENERATED"`, the record may also include `relatedGenerationRunId` to point at the successful run that made the retry unnecessary.
- `authorizationOutcome` must be `authorized` or `system_misconfigured`.

### `started`

Required fields in addition to the common fields:

- `attemptState = "started"`
- `authorizationOutcome = "authorized"`
- `startedAt`
- `generationRunId`

Rules:

- `startedAt` may equal `receivedAt` if the preflight path is immediate.
- `started` should be written when the shared generation engine begins its durable run boundary, not merely when the route decides it intends to run.

### `succeeded`

Required fields in addition to the common fields:

- `attemptState = "succeeded"`
- `authorizationOutcome = "authorized"`
- `startedAt`
- `completedAt`
- `generationRunId`
- `resultSummary`

Required `resultSummary` fields:

- `tasksCreated`
- `tasksSkippedAsDuplicates`
- `tasksAlreadyExisting`
- `manualTasksPreserved`

Rules:

- `succeeded` is the durable success state even if transient API responses continue using `success`.
- `managerMessage` should summarize the outcome in plain language without requiring log access.

### `failed`

Required fields in addition to the common fields:

- `attemptState = "failed"`
- `completedAt`
- `failureStage`
- `failureCode`
- `safeErrorMessage`

Allowed `failureStage` values:

- `preflight`
- `generation_run`
- `post_run_finalize`

Rules:

- `authorizationOutcome` may be `authorized` or `system_misconfigured`, depending on where the failure happened.
- `generationRunId` is required when `failureStage` is `generation_run` or `post_run_finalize`.
- `safeErrorMessage` must be manager-safe and sanitized.

---

## 6. Skip Reason Taxonomy

`skipped` must not use free-form skip reasons. It must use one of these reason codes:

| `skipReasonCode` | Meaning | Attention level | Manual retry guidance |
| --- | --- | --- | --- |
| `NON_BUSINESS_DAY` | The resolved board date is not enabled in business-day settings. | Expected | No retry needed |
| `BEFORE_GENERATION_TIME` | The scheduler fired before the configured local generation time. | Expected | Wait until the configured time |
| `ALREADY_GENERATED` | A successful board generation already exists for the board date. | Expected | No retry needed |
| `CONFIGURATION_MISSING` | Required scheduler or app configuration is absent. | Attention needed | Retry only after configuration is corrected |
| `CONFIGURATION_INVALID` | Required scheduler or app configuration exists but is unusable. | Attention needed | Retry only after configuration is corrected |

Examples of `CONFIGURATION_MISSING`:

- `CRON_SECRET` is not configured in the runtime where the scheduled route runs
- generation settings cannot be loaded because required app settings do not exist

Examples of `CONFIGURATION_INVALID`:

- invalid timezone value
- invalid `dailyGenerationTime`
- malformed scheduler-related runtime configuration

Rules:

- Missing or invalid configuration should not be buried in a generic error when the system can classify it intentionally.
- `skipped` reasons must stay stable enough to power a future manager health panel and release checklist gates.

---

## 7. Manager-Facing Consumption Rules

Manager-facing operations surfaces should use scheduler evidence to answer three questions quickly:

1. Did it fire?
2. What happened?
3. What should I do next?

Required consumption behavior:

- Show the latest scheduled attempt, not just the latest manual generation run.
- Preserve the distinction between scheduled attempts and manual retries.
- Treat unauthorized scheduled hits as visible operational evidence.
- Treat `NON_BUSINESS_DAY`, `BEFORE_GENERATION_TIME`, and `ALREADY_GENERATED` as normal skip outcomes.
- Treat `CONFIGURATION_MISSING`, `CONFIGURATION_INVALID`, and `failed` outcomes as attention states.
- Recommend manual retry only when retry is safe and meaningful.

Guidance expectations by state:

| State | Manager guidance expectation |
| --- | --- |
| `unauthorized` | Check deployment scheduler secret wiring before retrying manually |
| `skipped` + `NON_BUSINESS_DAY` | No action required |
| `skipped` + `BEFORE_GENERATION_TIME` | Wait for the configured local time |
| `skipped` + `ALREADY_GENERATED` | No action required |
| `skipped` + `CONFIGURATION_MISSING` | Check runtime env and required settings |
| `skipped` + `CONFIGURATION_INVALID` | Fix invalid scheduler or settings configuration |
| `failed` | Review the manager-safe failure message, then retry manually if appropriate |
| `succeeded` | No action required unless the resulting board still looks incomplete |

---

## 8. Relationship to Manual Generation

Manual manager generation remains the safe retry path.

Rules:

- Manual retries must continue using the same shared idempotent generation engine as scheduled attempts.
- Manual retries must not overwrite or erase scheduler-attempt evidence.
- Scheduler evidence and manual generation runs should be combined later in a health read model, but they remain distinct records with distinct operator meaning.

---

## 9. Implementation Notes for Follow-On Tasks

This contract is the source of truth for:

- `PROD-SCHED-002` persistent cron request evidence
- `PROD-SCHED-003` explicit skip reason persistence
- `PROD-SCHED-004` sanitized failure diagnostics
- `PROD-SCHED-005` scheduler health read model

Recommended implementation direction:

- Keep scheduler-attempt evidence separate from UI-only state.
- Reuse the existing generation engine and `GenerationRun` model instead of creating a second generation workflow.
- Normalize current transient `success` responses into durable `succeeded` scheduler evidence.
- Persist enough structured data to build a manager health panel without log access.

Current gap summary:

- Durable `received` and `unauthorized` attempt evidence is not yet persisted.
- Structured skip reason codes are not yet persisted as first-class scheduler evidence.
- The app does not yet expose a dedicated scheduler health read model.
- Production verification of live scheduler firing remains outside local code and will rely on later docs and runbook work.
