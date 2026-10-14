# Vehicle Operations SLO, Backup, Retention, and Incident Policy

**Milestone:** `VEH-007`  
**Policy version:** 1.0  
**Effective date:** 2026-07-13  
**Status:** Approved target baseline; targets are not production achievements until monitoring and drill evidence exists  
**Accountable owner:** General Manager  
**Operational owner:** Security and Operations Owner  
**Architecture:** [`../INVENTORY_ENTERPRISE_ARCHITECTURE.md`](../INVENTORY_ENTERPRISE_ARCHITECTURE.md)  
**Threat model:** [`VEHICLE_OPERATIONS_THREAT_MODEL.md`](VEHICLE_OPERATIONS_THREAT_MODEL.md)

## 1. Purpose

Define how available, fast, fresh, durable, recoverable, retained, monitored, and supportable the Vehicle Operations Console must be. This policy also defines incident severity, notification, response, recovery, review, and evidence.

NIST SP 800-61 Revision 3 treats incident response as part of broader cybersecurity risk management across Govern, Identify, Protect, Detect, Respond, and Recover ([NIST announcement and publication](https://www.nist.gov/news-events/news/2025/04/nist-revises-sp-800-61-incident-response-recommendations-and-considerations)). This policy adopts that lifecycle without claiming NIST compliance.

## 2. Service boundaries

### Critical user journeys

1. Authenticate and load authorized workspace.
2. Find a vehicle by VIN, stock, customer, or operational reference.
3. Read current vehicle/inventory/shop/parts state and freshness.
4. Submit a valid operational command exactly once.
5. Retrieve accepted command/audit evidence.
6. Load manager exceptions and critical work.
7. Run protected background lifecycle/SLA/projection processing.
8. Restore canonical records and rebuild projections.

The current `/vehicles` prototype is not yet an SLO-covered production service. A journey enters coverage only when its live vertical slice is approved for production.

### Service window

- SLO reporting uses the configured operating hours of covered locations, including Saturday where configured.
- Twenty-four-hour automated jobs and integrations have a separate continuous measurement window.
- Approved maintenance is reported separately but still included in customer-impact reporting; it is not used to hide poor availability.
- Client internet/device failure and an unavailable external provider are attributed separately, while the console's degraded-state behavior remains in scope.

## 3. Service-level indicators and objectives

| Code | Indicator | Measurement | Initial objective | Window | Owner |
| --- | --- | --- | --- | --- | --- |
| `SLO-AVAIL-01` | Covered journey availability | Good eligible journey attempts / eligible journey attempts | 99.9% during service window | Rolling 30 days | SO |
| `SLO-READ-01` | Read latency | p95 server duration for normal authorized filtered reads | ≤ 500 ms | Rolling 7/30 days | APP |
| `SLO-CMD-01` | Command latency | p95 accepted/rejected command duration excluding disclosed external wait | ≤ 800 ms | Rolling 7/30 days | APP |
| `SLO-CMD-02` | Accepted command durability | Accepted commands recoverable with matching command/event/audit evidence | 100%; zero acknowledged loss | Continuous/monthly | SO |
| `SLO-IDEM-01` | Duplicate-safe command execution | Same idempotency key/payload produces no duplicate business effect | 100% | Continuous/monthly | APP |
| `SLO-PROJ-01` | Critical projection freshness | Current time minus latest applicable event checkpoint | 99% ≤ 60 seconds; 100% visibly labeled when stale | Rolling 30 days | SO |
| `SLO-JOB-01` | Critical job completion | Successful by policy deadline / due critical runs | 99.5% | Rolling 30 days | SO |
| `SLO-INT-01` | Integration visibility | Failed/stale exchange is detected and visible with owner | 99% within 5 minutes of internal detection opportunity | Rolling 30 days | SO |
| `SLO-BACKUP-01` | Backup success | Verified scheduled backups / scheduled backups | 100% or incident declared | Monthly | SO |
| `SLO-RESTORE-01` | Recovery point objective | Maximum accepted data lost at declared recovery point | ≤ 15 minutes | Per exercise/incident | SO |
| `SLO-RESTORE-02` | Recovery time objective | Declaration to restored critical read/command service | ≤ 4 hours | Per exercise/incident | GM/SO |

### Measurement rules

- Synthetic, server, database, job, and projection telemetry use synchronized timestamps and correlation IDs.
- Health checks must validate a meaningful dependency; process-up alone is not availability.
- Authentication failures caused by invalid credentials are not availability failures; auth service errors are.
- Authorization denials are successful service responses when correct; accidental denials are defects/incidents.
- Timeouts, uncaught errors, corrupt/empty successful responses, and misleading fresh-state responses are bad events.
- Low traffic does not excuse missing synthetic checks for critical journeys.

## 4. Error budgets and release response

The availability error budget is `1 - SLO`. At 99.9% over a 30-day continuously measured period this is approximately 43 minutes; service-window reporting calculates the exact eligible minutes.

| Budget state | Condition | Required action |
| --- | --- | --- |
| Healthy | < 50% consumed at halfway point and no critical integrity/security breach | Normal incremental delivery |
| Watch | ≥ 50% consumed or burn rate predicts breach | Reliability review; risky releases require operational owner approval |
| Exhausted | SLO breached or budget fully consumed | Pause nonessential feature rollout; prioritize causes and recovery |
| Integrity override | Any acknowledged command loss, cross-tenant exposure, unreconciled ledger corruption, or failed restore | Immediate incident regardless of availability budget |

No team may trade security, data integrity, or audit completeness for latency/availability target attainment.

## 5. Observability policy

Every live slice requires:

- structured logs with event name, safe actor/service reference, organization/location scope where allowed, correlation, command/job ID, outcome, duration, and reason code
- metrics for request rate, error, latency, saturation, job outcome, retry, dead letter, projection lag, database health, and integration freshness
- traces across web/API, service, repository, job, and adapter boundaries for sampled/error traffic
- dashboards for critical journeys and SLOs
- actionable alerts containing impact, scope, first checks, runbook, owner, and recent deployment/config context
- redaction/allowlisting consistent with the threat-model classification

An alert without an owner and response action is not production-ready. A dashboard number must identify its source and last update.

## 6. Backup and recovery policy

### Recovery objectives

- **RPO:** 15 minutes or better for canonical transactional data after the first live vehicle command.
- **RTO:** 4 hours or better for critical authenticated read and command capability.
- **Projection recovery:** projections may be rebuilt from canonical events/records and must visibly report lag until caught up.
- **Media/document recovery:** provider-specific objective must be approved before live C2/C3 uploads; metadata and evidence relationships follow the database RPO.

### Required backup topology

The production design must target the CISA-described 3-2-1 principle: three copies, two media/failure domains, and one offsite copy ([CISA backup guidance](https://www.cisa.gov/sites/default/files/publications/data_backup_options.pdf)). Managed-service equivalents are acceptable when independence and restore access are demonstrated.

| Copy/control | Minimum requirement |
| --- | --- |
| Primary | Production database with managed durability and point-in-time recovery capability |
| Recovery copy | Encrypted continuous/PITR or equivalent covering the 15-minute RPO |
| Independent copy | Encrypted scheduled backup in a separate account/project or protected failure domain with deletion protection/immutability where supported |
| Offsite/provider separation | At least one recoverable copy not dependent on the primary runtime credentials/failure domain |
| Keys/credentials | Recovery access protected, rotated, documented, and available through tested break-glass procedure |

### Schedule and retention

| Backup artifact | Frequency | Minimum retention |
| --- | --- | --- |
| Point-in-time recovery stream | Continuous/provider-supported | 35 days |
| Full logical/managed snapshot | Daily | 35 days |
| Protected weekly recovery copy | Weekly | 13 weeks |
| Protected month-end recovery copy | Monthly | 13 months |
| Pre-high-risk migration backup | Before migration/deployment | Through validation plus 35 days |

Final provider topology is an M1 architecture decision. A backup job reporting success is insufficient; recoverability must be proven.

### Restore verification

- Daily automated backup success and age check.
- Monthly restore of a representative backup into an isolated environment with schema/integrity checks.
- Quarterly full recovery exercise measuring RPO/RTO and reconciling canonical vehicles, commands, domain events, audit, parts ledgers when present, and projections.
- Annual or material-architecture-change disaster exercise including identity, secrets, application deployment, database, jobs, media metadata, and integration degradation.
- Restore environments are isolated, access-controlled, logged, and destroyed after evidence retention.

### Recovery order

1. Contain the incident and protect evidence.
2. Establish trusted identity, secrets, networking, and runtime.
3. Restore canonical transactional database.
4. Validate schema, command/event/audit continuity, tenant boundaries, counts, and checksums.
5. Restore/reconnect media metadata and essential document access.
6. Rebuild projections and queues from canonical checkpoints.
7. Enable reads, then controlled commands, then integrations/background automation.
8. Reconcile downstream systems and communicate recovery status.

## 7. Retention and disposal policy

These are initial application retention defaults, not legal advice. The Office Manager and General Manager must apply longer statutory, contractual, insurer, lender, tax, warranty, litigation-hold, or regulatory periods where required. Legal hold always suspends automated disposal.

| Record class | Default minimum after terminal/last activity | Disposition rule | Owner |
| --- | --- | --- | --- |
| Canonical vehicle identity and non-sensitive milestone history | 10 years | Archive; preserve identity/lineage required to interpret retained records | VPO |
| Inventory acquisition, appraisal approval, sale/disposition, cost and authority evidence | 7 years | Controlled archive/disposal after reconciliation and hold check | GM/OM |
| Repair orders, estimates, authorizations, labor, QC, comeback, warranty history | 7 years after RO close | Controlled archive/disposal; vehicle service summary may require longer lineage | SM/OM |
| Parts purchase orders, receipts, adjustments, ledger and credits | 7 years | Preserve balancing/reversal lineage; no partial ledger deletion | PM/OM |
| Title, identity, signature, registration, and delivery documents | 7 years after transaction or longer approved requirement | C3 controlled archive; verified disposal | OM |
| Customer interactions and consent history | 3 years after relationship/activity unless linked record requires longer | Preserve proof of consent/revocation for applicable period | SA/OM |
| Domain events, command ledger, material audit events | 7 years | Append-only archive; hold overrides disposal | SO |
| Routine application logs | 90 days searchable + 365 days protected archive | Redacted; security incident evidence promoted to incident record | SO |
| Security/authentication logs | 365 days | Restricted archive; longer if incident/contract requires | SO |
| Job attempts, projection checkpoints, integration delivery metadata | 13 months | Payload content minimized; material business event retained in owning record | SO |
| Generated operational exports | 7 days by default, maximum 30 unless approved | Auto-expire; source records remain authoritative | Data owner |
| Imports/staging payloads | 30 days after successful reconciliation | Quarantine failures; dispose after approval/evidence | DATA |
| Decision/calibration outcomes and KPI snapshots | 7 years for material decisions; 3 years for routine aggregates | Retain formula/policy/catalog version and lineage | VPO/DATA |
| Incident records and evidence | 7 years after closure | Restricted; preserve chain and access history | SO |

### Disposal controls

- Disposal is policy-driven, reviewable, idempotent, and logged with record counts and policy version.
- Referenced audit/ledger/event lineage cannot be orphaned.
- Disposal failures create an owned exception; they do not silently skip.
- Backups expire through their backup schedule; selective deletion from immutable backup is not promised. Restored data must reapply current disposal/hold policy before normal use.
- Lower environments, exports, support bundles, and restored copies follow equal or shorter approved retention.

## 8. Incident severity

| Severity | Definition/examples | Acknowledge target | Coordination target | Update cadence |
| --- | --- | --- | --- | --- |
| `SEV-1 Critical` | Active cross-tenant/C3 disclosure, credential compromise with material access, acknowledged command/data loss, ledger corruption, unsafe release path, widespread outage, restore failure during disaster | 15 minutes during coverage/on-call | Incident lead and GM engaged within 30 minutes | Every 30 minutes or material change |
| `SEV-2 High` | Major workflow unavailable, contained sensitive exposure, critical job/projection stale, material integration corruption risk, severe performance for many users | 30 minutes during coverage | Lead and affected owner within 60 minutes | Hourly |
| `SEV-3 Medium` | Limited workflow/user/location impact with workaround, noncritical data delay, repeated recoverable job failure | 4 business hours | Owner assigned same business day | Daily/business-agreed |
| `SEV-4 Low` | Minor defect, cosmetic issue, low-risk alert, documentation gap | 2 business days | Backlog owner assigned | At material status change |

Severity may increase based on safety, data class, number of records/users/locations, duration, malicious intent, regulatory/contractual duty, or uncertainty. When uncertain between two levels, start at the higher severity until scoped.

## 9. Incident roles

| Role | Responsibility |
| --- | --- |
| Incident Lead | Owns coordination, severity, decisions, timeline, handoffs, and closure recommendation |
| Technical Lead | Diagnoses, contains, preserves evidence, restores, and validates technical state |
| Business Lead | Defines operational impact, workarounds, safety/customer priority, and business validation |
| Communications Lead | Provides approved internal/customer/partner/provider updates and preserves message record |
| Scribe | Maintains timestamps, facts, hypotheses, commands, evidence, decisions, and action items |
| Executive/Risk Owner | Accepts material risk, disaster declaration, major customer/business action, and final closure |

One person may hold multiple roles for a limited incident, but Incident Lead and Scribe responsibilities must remain explicit. Suspected fraud or insider activity restricts participation and preserves independent review.

## 10. Incident lifecycle

### Prepare and detect

- Maintain contacts, on-call coverage, runbooks, asset/integration inventory, access, backups, and exercises.
- Alert on journey failure, error-budget burn, auth abuse, permission anomaly, backup failure, job/dead-letter growth, projection lag, reconciliation mismatch, and suspicious export.

### Triage and declare

- Open an incident ID and immutable timeline.
- Record reporter, detection, scope, data classification, affected organizations/locations, current evidence, severity, and owners.
- Separate confirmed facts from hypotheses; preserve logs/snapshots before destructive remediation.

### Contain and eradicate

- Disable feature/integration/account/token or place workflow in read-only/degraded state as appropriate.
- Do not delete evidence, rewrite audit history, or run broad data repair without approved plan and backup.
- Rotate credentials, patch/configure, isolate malicious input, and validate affected boundaries.

### Recover

- Use controlled recovery order and two-person review for material repair/restore commands.
- Reconcile counts, states, ledgers, commands/events/audit, and external handoffs before declaring normal operation.
- Monitor heightened signals and communicate residual risk/workarounds.

### Close and improve

- Business and technical owners approve closure criteria.
- SEV-1/2 receive a blameless post-incident review within 5 business days; SEV-3 when recurring/material.
- Record contributing conditions, detection/recovery gaps, customer/data impact, timeline, evidence, actions, owners, due dates, and policy/runbook/test changes.
- Track actions to completion; closure of the incident does not close unfinished corrective work.

## 11. Communication and external obligations

- Only authorized leadership/communications roles make customer, provider, law-enforcement, insurer, regulator, or public statements.
- Messages state known impact, actions, workaround, next update, and contact; speculation and sensitive security detail are excluded.
- Legal/contractual notification requirements must be evaluated by the accountable business/legal owner; this policy does not define jurisdiction-specific breach deadlines.
- Provider incidents retain case ID, contacts, status, evidence, data authority, and reconciliation plan.

## 12. Required runbooks

Before the associated capability reaches production, create and exercise:

1. authentication/session compromise
2. suspected cross-tenant or sensitive-document access
3. database outage and point-in-time restore
4. bad migration or deployment rollback
5. stuck outbox/job/projection and replay
6. parts ledger or financial reconciliation mismatch
7. external integration corruption/outage and disablement
8. malicious upload or leaked export
9. accidental high-impact command and controlled reversal
10. unavailable customer communication/payment provider

## 13. Review and evidence

- SLO/error-budget review: monthly after first live slice.
- Backup success: daily automated and monthly owner review.
- Access and service-account review: quarterly.
- Retention/disposal execution review: quarterly.
- Incident/contact/runbook tabletop: semiannual.
- Full restore/DR: quarterly restore, annual disaster exercise, and after material topology change.
- Policy review: annual and after SEV-1/2, material audit finding, or architecture/provider change.

Evidence includes timestamped reports, participating roles, environment, backup ID, recovery point, start/end, reconciliation queries/results, gaps, corrective tasks, and approval.

## 14. Acceptance evidence

`VEH-007` is satisfied because this policy defines:

- measurable availability, latency, durability, idempotency, freshness, job, backup, RPO, and RTO objectives
- calculation, service window, error budget, observability, and release response
- backup topology, schedule, retention, recovery order, and restore exercises
- record retention/disposal defaults and legal-hold boundary
- severity, acknowledgement, coordination, roles, lifecycle, communication, runbooks, review, and evidence
- the explicit rule that targets are not claimed as achieved until monitored and exercised

