# Concern-to-Task Resolution Engine

## Implemented scope

DB-AUTOGENERATION-058 and the initial DB-AUTOGENERATION-059 evaluator add a deterministic, manager-controlled concern workflow to the Tasks Operations Console.

The first version supports:

- explainable keyword classification and transparent severity scoring
- versioned `TITLE_DELAY_V1` and manager-triage plans
- manager preview before any records are written
- idempotent, transaction-backed concern package creation
- durable concern cases, task links, priorities, checklist evidence, and activity events
- seven-step title-delay decomposition with due times and dependency codes
- existing assignment recommendation with active-manager fallback
- required checklist, update-field, dependency, and manager-review completion gates
- explicit manager closure with resolved outcomes, reason, and proof
- manager and cron-triggered escalation evaluation
- Tasks Console intake and recent-package visibility

## Safety boundaries

- The engine is deterministic and uses no external AI or third-party API.
- Concern package commit is manager-only.
- `reportedByUserId` is derived from the authenticated session.
- The `Idempotency-Key` header is required for commit.
- The concern, tasks, checklists, links, and activity events commit in one database transaction.
- Formal escalation does not count as resolution and cannot be used as a closed outcome.
- Daily board generation remains separate, idempotent, and preserves concern-generated tasks.

## Routes

- `POST /api/concerns/preview`
- `GET /api/concerns`
- `POST /api/concerns`
- `GET /api/concerns/:id`
- `POST /api/concerns/:id/close`
- `POST /api/concerns/escalations/evaluate`
- `GET|POST /api/cron/evaluate-concerns`

The cron evaluator uses the same `CRON_SECRET` authorization contract as daily board generation and runs every 15 minutes in `vercel.json`.

## Deferred scope

- staff-submitted concern drafts and manager acceptance
- customer/system-originated intake integrations
- editable concern blueprint administration
- organization/location ownership on the task aggregate
- automatic external DMV, title vendor, CRM, or DMS integrations
