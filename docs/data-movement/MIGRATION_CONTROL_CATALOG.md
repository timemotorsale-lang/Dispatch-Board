# Data Migration Control Catalog

This is the completeness checklist for designing and approving data movement. Every
applicable control must have an owner and implementation phase before production use.

| Control area | Required control | Foundation | Production gate |
| --- | --- | --- | --- |
| Discovery | Source inventory, owner, extraction method, limits, freshness, legal constraints | Yes | Yes |
| Authority | System-of-record and field-family ownership | Yes | Yes |
| Scope | Entities, locations, dates, history, exclusions, dependencies | Yes | Yes |
| Contract | Versioned canonical schema, enumerations, required fields, extensions | Yes | Yes |
| Mapping | Versioned source-to-target mapping and transformations | Yes | Yes |
| Identity | Permanent IDs, source references, exact keys, scored matching, review queue | Yes | Yes |
| Quality | Format, completeness, reference, business, duplicate, and authority validation | Yes | Yes |
| Safety | Immutable landing, malware scan, encryption, retention, chain of custody | Yes | Yes |
| Preview | Creates, updates, unchanged rows, conflicts, rejects, relationships, totals | Yes | Yes |
| Approval | Role-based approval, separation of duties, stale-preview invalidation | Yes | Yes |
| Application | Domain commands, idempotency, dependency order, checkpoints, retry limits | Yes | Yes |
| Reset | Isolated rehearsal workspace, job tags, dependency-aware cleanup, reset preview | Yes | Yes |
| Rollback | Change ledger, compensating actions, protected-record checks, stop/resume | Yes | Yes |
| Replay | Immutable original, child jobs, corrected versions, affected-row selection | Yes | Yes |
| Human edits | Detect later edits and require a decision before reversal | Yes | Yes |
| Repair | Stable row keys, reason codes, correction packages, child reconciliation | Yes | Yes |
| Reconciliation | Counts, totals, identities, relationships, statuses, watermarks, sign-off | Yes | Yes |
| Cutover | Freeze window, baseline plus delta, verification, acceptance, support window | Later | Yes |
| Export | Classification, redaction, purpose, approval, snapshot, manifest, expiry, access log | Yes | Yes |
| Recurring exchange | Freshness SLA, replay protection, signatures, rate limits, pause switch | Later | Yes where used |
| Security | Least privilege, sensitive-data controls, credential references, audit, legal hold | Yes | Yes |
| Operations | Monitor, alerts, runbooks, ownership, escalation, incident response | Yes | Yes |
| Recovery | Backup, restore rehearsal, disaster recovery, evidence preservation | Later | Yes |
| Decommissioning | Read-only source period, retention, archive, access removal | Later | Yes |

## Approval questions

1. Can we reproduce the exact input, mapping, policy, and result?
2. Can we prove which records were created, changed, skipped, or rejected?
3. Can we stop and resume without duplicate effects?
4. Can we reset a rehearsal without touching legitimate later work?
5. Can we correct data without erasing original evidence?
6. Can we reconcile critical totals and obtain signed acceptance?
7. Can an operator act correctly when failure occurs at any point in the job?

