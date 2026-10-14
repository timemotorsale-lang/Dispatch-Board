# Inventory Console Gap Closure — Wave 4 Governance Operations

**Branch:** `codex/inventory-console-gap-closure-wave-4-governance-operations`  
**Dependency:** Wave 3 domain workflows, merged in `main`  
**Scope:** governed reporting, controlled export, operational recovery, privacy and support workflows  
**Repository completion change:** 56 to 60 complete slices  
**Activation:** no provider acknowledgement, evidence deletion, deployment, or pilot claim

## Outcome

Wave 4 closes IC-103, IC-104, IC-108, and IC-109 through a durable `InventoryGovernanceRecord` aggregate and immutable versioned events. The new `/administration/governance-operations` workspace provides purpose-built report/restatement, export, incident recovery, and privacy/support forms without becoming a generic domain workflow engine.

## Closed contracts

- **IC-103 — Reports and governed KPI facts:** closed-period facts retain definition, cohort, cutoff, period, content hash and source rows. Restatements reference the original snapshot, preserve the prior hash, and require independent General Manager approval.
- **IC-104 — Controlled exports:** only allowlisted resources and fields can be exported. Requests require a reason, authorized location cohort, cutoff, 1–500 row limit, watermark, content hash, 24-hour expiry and General Manager authority. Creation and authenticated download are immutable events.
- **IC-108 — Background operations:** incidents carry severity, affected record, owner, reason, status, version and resolution evidence. Only a General Manager can move a real dead-letter back to the internal outbox; this does not claim provider delivery.
- **IC-109 — Retention, privacy and support:** cases carry kind, subject, owner, runbook reference, reason and resolution. Deletion review requires a different General Manager and only authorizes the evidence service; the console never deletes evidence.

## Authority and truth boundaries

- Report restatement and deletion approval require a different General Manager from the requester.
- Export download rechecks General Manager authority and expiry.
- Retry is limited to an existing `DEAD_LETTER` message and resets it to internal `PENDING`; acknowledgement remains unknown until an owning adapter records it.
- Governance records are idempotent and optimistic-versioned. Every accepted transition has immutable actor, reason, correlation and snapshot evidence.
- The source-controlled migration is not applied by this branch.

## Verification

- Domain and service tests cover export allowlists/limits, closed reporting periods, privacy kinds, hashes, expiry, rendering and schema/migration evidence.
- Prisma schema validation, TypeScript and focused ESLint pass.
- Full regression passes: 222 test files and 1,251 tests.
- Production build passes with 155 generated routes, including the governance workspace and both governance APIs.
- The 121-slice audit reconciles at 60 complete, 40 partial, 17 external-evidence-required and 4 decision-blocked.

## Stop boundary

Wave 4 does not activate print, external delivery, provider acknowledgement, evidence deletion, production runbooks, training, deployment or pilot evidence. Capability/delegation administration remains partial under IC-106 and should not be inferred from the read projection.
