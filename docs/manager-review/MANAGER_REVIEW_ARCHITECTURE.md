# Manager Review Command Center Architecture

**Document:** Target architecture  
**Version:** v0.1.0 planning baseline  
**Last updated:** 2026-07-12  
**Status:** Approved direction; implementation pending  
**Parent system:** Time Motor Sales Dispatch Board

## 1. Purpose

This document defines the target architecture for evolving the existing Manager Review page into an operational command center. It preserves the current task lifecycle while adding durable review decisions, structured evidence, review SLA policies, risk signals, attention ranking, intervention workflows, and operational reporting.

The module is optimized for one outcome:

> A manager should be able to understand why an item needs attention, inspect sufficient context, make a controlled decision, and establish the next accountable action without leaving the workspace.

## 2. Current Evidence Baseline

The repository already provides:

- Next.js, React, TypeScript, PostgreSQL, and Prisma in one deployable application.
- Manager-only access policy for the review route.
- Task states including `BLOCKED`, `WAITING_ON_PARTS`, `WAITING_ON_APPROVAL`, `READY_FOR_REVIEW`, and `COMPLETED`.
- Server-side task transition validation.
- Approval-required task behavior.
- `readyForReviewAt`, `completedAt`, and `reviewedByUserId` task fields.
- Task priority, due time, workflow area, owner, vehicle reference, and customer reference.
- Checklist items, comments, activity events, and assignment recommendations.
- A live Manager Review screen with review and attention actions.

These are foundations, not proof that the target command center exists.

## 3. Architectural Position

### 3.1 Modular monolith

Manager Review remains a feature module inside the Dispatch Board modular monolith.

```text
Browser
  -> /manager-review command center
  -> Manager Review API/read boundary
  -> review, evidence, SLA, and attention services
  -> task/review repositories
  -> PostgreSQL
```

No separate microservice, queue broker, search cluster, or machine-learning platform is required for the initial rollout.

### 3.2 Shared task lifecycle, owned review decisions

The task aggregate remains authoritative for task execution state. The Manager Review module owns review policy evaluation and review decisions.

- `Task.status` says where execution currently stands.
- A review record says what was reviewed, under which policy, and why a decision was made.
- Evidence records say what proof was required, submitted, accepted, rejected, or requested.
- Attention evaluations say why the item entered a queue and how it was ranked at a point in time.

The module must not create a competing task status system.

## 4. Target Repository Boundaries

```text
docs/manager-review/
src/app/manager-review/
src/app/api/manager-review/
src/features/manager-review/
src/server/policies/manager-review.ts
src/server/repositories/manager-review-*.ts
src/server/services/manager-review-*.ts
src/server/validation/manager-review-*.ts
src/tests/unit/manager-review-*.test.ts
src/tests/integration/manager-review-*.test.ts
src/tests/e2e/manager-review-command-center.spec.ts
```

Responsibilities:

- Route composition belongs in `src/app`.
- Feature-specific presentation and client state belong in `src/features/manager-review`.
- Decisions, eligibility, ranking, SLA, and evidence rules belong in server services.
- Database access belongs in repositories.
- Authorization belongs in server policies.
- Input and domain validation belongs in validation modules.
- Algorithm constants belong in a versioned policy definition, not UI components.

## 5. Domain Model

Names below are target concepts. Exact Prisma names may be refined during the foundation slice.

### 5.1 ReviewPolicy

Defines what must be reviewed and what approval requires.

Suggested fields:

- `id`
- `code`
- `version`
- `name`
- `reviewCategory`
- `appliesToWorkflowAreas`
- `appliesToTemplateIds` where required
- `requiresManagerApproval`
- `requiredEvidenceRules`
- `slaPolicyId`
- `isActive`
- `effectiveFrom`
- `retiredAt`

Policies are versioned. Historical decisions retain the policy version used at evaluation time.

### 5.2 TaskReview

Represents one review cycle for a task.

Suggested fields:

- `id`
- `taskId`
- `cycleNumber`
- `reviewCategory`
- `state`: `PENDING`, `EVIDENCE_REQUESTED`, `DECIDED`, `CANCELLED`
- `policyCode`
- `policyVersion`
- `enteredReviewAt`
- `reviewDueAt`
- `breachedAt`
- `assignedReviewerId` optional
- `decidedAt` optional
- `createdAt`
- `updatedAt`

A returned task can create a later review cycle after corrections are resubmitted. Prior cycles remain immutable history.

### 5.3 ReviewDecision

Represents the authoritative outcome of one review cycle.

Outcomes:

- `APPROVE`
- `RETURN_TO_WORK`
- `REQUEST_EVIDENCE`
- `REASSIGN`
- `ESCALATE`

Suggested fields:

- `id`
- `taskReviewId`
- `outcome`
- `reviewerUserId`
- `reasonCode`
- `reasonNotes`
- `correctiveActions` snapshot
- `revisedDueAt` optional
- `newAssignedUserId` optional
- `decisionAt`
- `attentionEvaluationId` optional
- `recommendationFollowed` optional
- `priorTaskState`
- `resultingTaskState`
- `idempotencyKey`

Decision records are append-only. Corrections create a correcting event or new decision, not a silent overwrite.

### 5.4 EvidenceRequirement and EvidenceSubmission

An evidence requirement specifies proof needed for review. A submission points to the proof provided.

Evidence types may include:

- Checklist confirmation
- Photo or attachment
- Document
- Customer-contact record
- Inspection or QC result
- Payment/funds confirmation
- Freeform note with attestation
- External reference or URL when explicitly allowed

Requirements must support required/optional state, ordering, policy version, and acceptance criteria. Submissions must capture submitter, submission time, source, review state, and reviewer response.

The first slice may reuse task checklist items where appropriate, but should not pretend a checked box is equivalent to every form of evidence.

### 5.5 ReviewSlaPolicy

Defines:

- target duration
- warning threshold
- breach threshold
- applicable business hours or calendar-time behavior
- evidence-request timer behavior
- escalation behavior
- category/risk overrides

Task execution SLA and manager review SLA are separate clocks.

### 5.6 RiskSignal

Represents a structured fact that affects attention priority.

Risk dimensions:

- `SAFETY`
- `CUSTOMER`
- `FINANCIAL`
- `DELIVERY`
- `TITLE_DOCUMENTATION`
- `COMPLIANCE`
- `REPUTATION`
- `OPERATIONAL_FLOW`

A signal has a severity, source, observed time, explanation, and active/resolved state. Signals should be derived from authoritative data or explicitly captured facts, not unsupported inference.

### 5.7 AttentionEvaluation

Stores an explainable point-in-time evaluation.

Suggested fields:

- `id`
- `subjectType`
- `subjectId`
- `engineVersion`
- `evaluatedAt`
- `eligible`
- `primaryQueue`
- `secondarySignals`
- `hardRuleCode` optional
- `score`
- `factorBreakdown`
- `explanationCodes`
- `humanExplanation`
- `sourceFingerprint`
- `expiresAt` optional

The breakdown is necessary for auditability, debugging, and later calibration.

## 6. Core Invariants

- Only eligible work enters a manager queue.
- One subject has one primary queue at an evaluation instant.
- Secondary signals may be displayed without duplicating the subject across headline totals.
- Hard critical rules outrank the numeric score.
- A score never approves, rejects, reassigns, or escalates work by itself.
- Approval-required tasks cannot bypass `READY_FOR_REVIEW` except through an authorized, reasoned override already supported by explicit policy.
- Approval is blocked when mandatory evidence is unsatisfied unless the policy permits an authorized override.
- `RETURN_TO_WORK` requires a reason, corrective direction, and revised due time.
- `REQUEST_EVIDENCE` requires a precise request and a defined timer policy.
- `REASSIGN` preserves previous ownership and reason.
- `ESCALATE` establishes an escalation owner or queue and creates an audit event.
- Every decision is idempotent and transactionally consistent with its task transition and activity event.
- Staff-facing blocker capture is not a performance penalty signal.

## 7. Service Architecture

### 7.1 Review policy service

- Resolves the applicable policy and version.
- Determines whether formal review is required.
- Resolves required evidence and permitted outcomes.

### 7.2 Evidence service

- Builds the evidence requirement set.
- Records submissions and requests.
- Evaluates completeness and acceptance.
- Explains approval blockers.

### 7.3 Review lifecycle service

- Opens a review cycle when eligible work reaches review.
- Executes decision commands.
- Coordinates task transitions, review records, activity events, and downstream readiness.
- Prevents duplicate or stale decisions.

### 7.4 Review SLA service

- Calculates warning, due, breach, pause, and escalation timestamps.
- Keeps execution deadlines distinct from review deadlines.
- Produces explainable SLA state.

### 7.5 Manager Attention Engine

- Loads authoritative candidate signals.
- Applies eligibility rules.
- Assigns one primary queue.
- Applies critical overrides.
- Calculates a bounded score.
- emits factor-level explanations.

Its formal contract is defined in [`MANAGER_ATTENTION_ENGINE.md`](MANAGER_ATTENTION_ENGINE.md).

### 7.6 Command-center read service

Returns a purpose-built read model containing:

- summary metrics
- queue counts
- ordered worklist rows
- selected workbench detail
- evidence state
- timeline
- available actions
- attention explanation
- freshness metadata

The UI should not reconstruct business rules from raw task rows.

### 7.7 Reporting service

Produces operational measures from durable events and snapshots:

- review inflow and throughput
- review age percentiles
- SLA compliance
- first-pass approval rate
- returns by reason
- evidence deficiency
- blocked time before intervention
- downstream delay attributable to review
- recommendation overrides

## 8. Command Contracts

Suggested command boundary:

```text
approveReview
returnReviewToWork
requestReviewEvidence
reassignReviewSubject
escalateReview
acknowledgeManagerIntervention
refreshAttentionEvaluation
```

Every command should include:

- authenticated actor
- subject/review identifier
- expected version or equivalent concurrency guard
- idempotency key
- outcome-specific reason and fields
- optional attention-evaluation identifier shown to the manager

Commands validate authority, current state, evidence gates, policy version, stale writes, and required fields before entering one transaction.

## 9. Read Model And API Direction

Candidate endpoints:

```text
GET  /api/manager-review/command-center
GET  /api/manager-review/items/:reviewId
POST /api/manager-review/items/:reviewId/approve
POST /api/manager-review/items/:reviewId/return
POST /api/manager-review/items/:reviewId/request-evidence
POST /api/manager-review/items/:reviewId/reassign
POST /api/manager-review/items/:reviewId/escalate
```

The exact route shape may follow existing task API conventions, but decision semantics should be explicit rather than encoded as generic status patches.

Read responses include `evaluatedAt` and `engineVersion`. Write responses return the authoritative resulting state and the next selected item where useful.

## 10. Permission Architecture

Initial roles:

- Staff may submit work, evidence, responses, and blockers for work they are authorized to update.
- Managers may view the Command Center and execute standard decisions.
- Only explicitly authorized roles may use policy overrides or high-risk escalation closure.
- The server checks all authority regardless of hidden UI controls.

Later granular permissions may include:

- view review queues
- approve by category
- override evidence gate
- reassign across departments
- escalate
- administer policies and weights
- view aggregate trend reporting

## 11. Event And Audit Architecture

Material events include:

- review opened
- review became at risk or breached
- evidence submitted
- evidence requested, accepted, or rejected
- review approved
- work returned
- owner reassigned
- item escalated
- recommendation overridden
- review policy overridden
- downstream work released

Activity events support operational visibility. Review decisions and evaluation snapshots support authoritative audit and explanation. Neither substitutes for the other.

## 12. Frontend Architecture

### 12.1 Desktop command center

```text
Header and command actions
Executive action summary
Review-health strip
Queue rail | ordered worklist | persistent workbench
Operational trend section
```

### 12.2 Workbench requirements

The selected workbench should show:

- requested outcome and definition of done
- owner, due time, review SLA, category, and risk
- checklist and evidence state
- related vehicle, customer, concern, project, or appointment context
- blockers and dependencies
- prior review cycles
- activity timeline
- system recommendation and explanation
- available actions based on server policy

### 12.3 Interaction rules

- Selecting a row updates the workbench without route loss.
- Decision actions remain visible while reviewing.
- After a decision, selection advances predictably to the next item.
- Counts update from authoritative server state.
- Loading, empty, error, stale-data, conflict, and permission states are explicit.
- Keyboard flow and accessibility are first-class requirements.
- Mobile prioritizes queue selection, essential context, and safe decisions rather than reproducing desktop density.

## 13. Reliability And Performance

- Use transactions for decision plus task transition plus audit.
- Use idempotency protection for retried decisions.
- Reject stale commands safely.
- Recompute attention evaluations on relevant events and on bounded scheduled refresh; do not require continuous global rescoring.
- Add indexes based on measured queue queries.
- Prefer paginated or cursor-based worklists once volume requires them.
- Keep the last trustworthy read visible during non-destructive refresh failure and clearly label staleness.
- Record engine version and factor snapshot for reproducibility.

## 14. Architecture Decisions

### ADR-MR-001: Manager Review is an integrated module

It shares task, user, board, activity, and app-shell foundations and is not a separate deployment.

### ADR-MR-002: Review decisions are first-class records

Generic task status changes are insufficient for reasons, evidence, repeated cycles, SLA, and reporting.

### ADR-MR-003: The engine recommends attention; the manager decides

The engine may rank and explain. It cannot silently perform high-impact review outcomes.

### ADR-MR-004: Hard policy rules precede numeric scoring

Safety, compliance, title, or similarly critical facts cannot be diluted by weighted averages.

### ADR-MR-005: Evaluation is deterministic and versioned

The same input and policy version must produce the same queue, score, and explanation.

### ADR-MR-006: One primary queue prevents count inflation

Secondary signals remain visible but do not create duplicate headline items.

### ADR-MR-007: Evidence is structured

Checklist completion, attachments, documents, and attestations have distinct semantics.

### ADR-MR-008: Execution SLA and review SLA are separate

Completion time and management decision time measure different operational responsibilities.

### ADR-MR-009: Operational review is not performance evaluation

Aggregate operational data may inform later coaching, but daily queue ranking must not covertly score employees.

### ADR-MR-010: Additive vertical slices preserve the working board

Schema and workflow changes remain compatible until the new command boundary is proven.

## 15. Architecture Gate

Architecture is ready for implementation when stakeholders approve:

- review categories and required-review policy
- risk taxonomy and critical overrides
- evidence semantics
- all five decision outcomes
- review SLA and evidence-request timer behavior
- queue taxonomy and primary-queue precedence
- permission and override rules
- success metrics
