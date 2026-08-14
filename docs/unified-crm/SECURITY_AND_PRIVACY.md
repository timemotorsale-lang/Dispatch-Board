# Unified CRM Security and Privacy Architecture

**Document ID:** `UCRM-SEC-001`
**Version:** 1.0 planning baseline
**Date:** 2026-08-14
**Status:** Target controls; documentation only; not evidence of implementation, certification, or compliance
**Applies to:** Unified CRM Console at `/crm`, CRM APIs, jobs, projections, integrations, exports, configuration, and AI assistance

---

## 1. Purpose and security posture

Unified CRM will concentrate customer identity, contact information, communications, commercial activity, employee actions, and operational relationships. The console therefore uses a deny-by-default, least-privilege, organization-scoped security model with server-side enforcement and durable accountability evidence.

Security must preserve usability: users see the actions they can take, denied actions explain the safe path without exposing restricted facts, and sensitive operations use contextual confirmation rather than permanent interface clutter.

This document defines target behavior. A control is not implemented because it appears here, in a schema, or in a test fixture.

## 2. Existing evidence and unproven targets

### 2.1 Existing repository evidence as of 2026-08-14

Repository inspection evidences shared users, password/session foundations, roles, organizations, locations, user-location access, organization-scoped domain records, server-side policy patterns, enterprise command/audit/event/outbox models, and several audited/idempotent workflows.

This is reusable foundation, not proof that `/crm` has complete authorization, isolation, field security, consent enforcement, audit coverage, secrets management, recovery, or incident controls.

### 2.2 Target controls

All `UCRM-SEC-*` requirements below remain targets until the applicable acceptance gates have executable evidence in representative environments. No claim of SOC 2, ISO 27001, PCI DSS, GLBA, HIPAA, GDPR, CCPA, or other certification/compliance is made. Applicable legal and contractual obligations require qualified review before production rollout.

## 3. Security objectives

| ID | Objective |
| --- | --- |
| `UCRM-SEC-OBJ-001` | Prevent access across organization and authorized location boundaries. |
| `UCRM-SEC-OBJ-002` | Limit records, fields, commands, exports, and integrations to authorized business purpose. |
| `UCRM-SEC-OBJ-003` | Preserve confidentiality and integrity of customer, commercial, credential, and employee data. |
| `UCRM-SEC-OBJ-004` | Make material reads, changes, approvals, exports, and administrative actions attributable and reviewable. |
| `UCRM-SEC-OBJ-005` | Enforce consent and contact restrictions before delivery is requested. |
| `UCRM-SEC-OBJ-006` | Keep core operations available and recoverable without silently weakening controls. |
| `UCRM-SEC-OBJ-007` | Prevent AI, integrations, imports, and automations from expanding authority or fabricating completion. |
| `UCRM-SEC-OBJ-008` | Minimize collection, display, replication, retention, and disclosure of personal data. |

## 4. Data inventory and classification

Every persisted field, event payload, search document, log attribute, export column, integration mapping, custom field, and AI input/output must have an owner and classification.

| Class | Examples | Default handling |
| --- | --- | --- |
| `UCRM-DATA-PUBLIC` | approved public inventory description | Normal integrity controls; no customer association unless separately classified. |
| `UCRM-DATA-INTERNAL` | pipeline names, internal operational statuses | Authenticated workforce; organization-scoped. |
| `UCRM-DATA-CONFIDENTIAL` | customer contact details, conversation content, quotes, internal notes | Need-to-know record and field controls; masked list/search projection; audited export. |
| `UCRM-DATA-RESTRICTED` | government identifiers if ever approved, finance documents, credentials, tokens, protected legal notes | Separate explicit capability, encryption/key controls, redacted logs, narrow retention, no general search or AI use by default. |
| `UCRM-DATA-SECURITY` | audit evidence, risk signals, access decisions, incident records | Security/authorized manager access; tamper-evident retention; never exposed through ordinary CRM search. |

The initial CRM should avoid storing payment-card data, bank-account credentials, full government identifiers, medical data, protected-class inferences, or authentication secrets. If a workflow requires such data, it is blocked pending a data-flow review, classification, ownership, legal basis, processor/vendor review, and a dedicated ADR.

## 5. Threat model

### 5.1 Assets

- customer identities, contact points, preferences, conversations, and relationship history;
- opportunity, quote, pricing, approval, forecast, and commercial data;
- employee identity, ownership, notes, actions, and performance-related observations;
- authentication sessions, integration credentials, webhook secrets, API keys, signing keys;
- command, audit, event, outbox, backup, import, and export evidence;
- availability and integrity of daily CRM operations.

### 5.2 Trust boundaries

1. browser to application server;
2. application route to server policy/service/repository;
3. CRM context to Customers, Inventory, Appointments, Tasks, and Activity contexts;
4. application to database, cache, search index, object storage, and job runner;
5. application to external email/calendar/SMS/phone/DMS/AI providers;
6. administrator configuration and support access;
7. import/export files and user-authored or external document content.

### 5.3 Principal threats and required mitigations

| ID | Threat | Required controls |
| --- | --- | --- |
| `UCRM-THR-001` | Cross-organization IDOR or query leakage | Derive organization server-side; organization predicate in every repository path; deny cross-org foreign keys; negative isolation tests. |
| `UCRM-THR-002` | Privilege escalation through role, owner, location, or request fields | Ignore client authority claims; centralized policy evaluation; protected admin commands; re-authentication for high-risk changes. |
| `UCRM-THR-003` | Field leakage through search, counts, exports, errors, cache, logs, or AI | Field-aware projections, response shaping, cache partitioning, safe errors, log redaction, export and AI policy checks. |
| `UCRM-THR-004` | Unauthorized or opted-out communication | Server-side consent/purpose/channel check immediately before outbox commit; suppression lists; kill switch; immutable delivery evidence. |
| `UCRM-THR-005` | Tampering, replay, duplicate commands, or stale updates | CSRF/origin protection, idempotency, request hash, expected version, signed webhooks, nonce/timestamp windows, immutable audit. |
| `UCRM-THR-006` | Injection through input, import, templates, custom fields, search, or documents | Typed validation, parameterized persistence, output encoding, safe rich-text rendering, file scanning, formula neutralization, sandboxing. |
| `UCRM-THR-007` | Session theft or fixation | secure cookie sessions, rotation, expiration, revocation, CSRF controls, transport security, anomaly monitoring. |
| `UCRM-THR-008` | Credential or token disclosure | approved secret store, envelope encryption where needed, redacted telemetry, narrow scopes, rotation and revocation. |
| `UCRM-THR-009` | Excessive export, scraping, enumeration, or insider misuse | rate/volume limits, purpose-aware capabilities, watermark/manifest where appropriate, audit, alerts, manager/security review. |
| `UCRM-THR-010` | AI prompt injection, data exfiltration, or unauthorized tool use | treat retrieved content as untrusted, permission-filter retrieval, allowlisted tools, structured outputs, deterministic command revalidation, no secret access. |
| `UCRM-THR-011` | Availability attack or provider cascade | rate limits, timeouts, circuit breakers, queues, bulkheads, backpressure, safe degraded modes, operational kill switches. |
| `UCRM-THR-012` | Backup, replica, nonproduction, or support-access leakage | encryption, environment separation, masked/synthetic nonproduction data, controlled break-glass, access logging, restore access reviews. |

Threat modeling is repeated when introducing a new integration, high-risk data class, bulk workflow, AI tool, custom-object facility, customer portal, or external sharing.

## 6. Authentication and session security

### `UCRM-SEC-AUTH-001` Shared identity

Unified CRM reuses the Dispatch Board identity and session foundation. It must not create CRM-only passwords or parallel accounts.

Target controls:

- unique individual identities; shared staff accounts prohibited;
- strong password hashing for app-owned credentials and breached-password defenses where supported;
- MFA required for administrators, security roles, exports of restricted data, integration credential management, and production break-glass; organization-wide MFA is the preferred production posture;
- SSO/OIDC/SAML and SCIM may be added through the shared platform, not CRM-specific identity forks;
- secure, HTTP-only, same-site cookies; TLS-only transport; session identifiers never in URLs;
- session rotation after login, privilege change, reauthentication, and suspicious activity;
- bounded idle and absolute lifetimes, with shorter high-risk administrative sessions;
- revocation on deactivation, password reset, material role change, suspected compromise, or organization removal;
- reauthentication or step-up authentication for credential reveal/rotation, broad export, destructive privacy action, impersonation, and security-policy change;
- login, MFA, session revocation, and recovery events are rate-limited, monitored, and audited safely.

Account recovery must not reveal whether a customer or nonpublic employee identity exists. Production support cannot request or see user passwords.

## 7. Authorization model

### 7.1 Evaluation order

Authorization is a server-side intersection, not a single role check:

```text
active actor and session
  AND organization boundary
  AND active location scope where applicable
  AND capability grant
  AND record scope (own/team/assigned/shared/all)
  AND field classification
  AND command/state/purpose constraints
  AND separation-of-duties and approval rules
  AND active feature/rollout policy
```

Any explicit deny wins. Missing or stale authority fails closed. UI visibility improves usability but never grants permission.

### 7.2 Initial capability namespace

Capabilities use stable names and are narrower than job titles:

- `crm.home.view`
- `crm.work.view-own`, `crm.work.view-team`
- `crm.customer.view`, `crm.customer.manage`
- `crm.contact.restricted-view`
- `crm.note.view-internal`, `crm.note.view-restricted`, `crm.note.create`
- `crm.opportunity.view-own`, `crm.opportunity.view-team`, `crm.opportunity.manage`
- `crm.opportunity.assign`, `crm.opportunity.override`
- `crm.quote.view`, `crm.quote.create`, `crm.quote.issue`
- `crm.financial.view`, `crm.gross.view`
- `crm.approval.request`, `crm.approval.decide`
- `crm.communication.draft`, `crm.communication.send`
- `crm.forecast.submit`, `crm.forecast.override`
- `crm.search.use`, `crm.export`
- `crm.configuration.view`, `crm.configuration.manage`, `crm.configuration.publish`
- `crm.integration.view`, `crm.integration.manage`
- `crm.audit.view`, `crm.security.admin`

Roles map to capabilities through versioned policy. A role name alone is not sufficient evidence in a service or repository.

### 7.3 Record security

Record scope can depend on organization, authorized location, ownership, team, assignment, collaborator relationship, pipeline, purpose, and record state. Managers do not automatically receive unrestricted confidential or restricted fields merely because they can view a team pipeline.

Ownership changes are commands with authority checks and audit evidence. Users cannot grant themselves access by assigning a record, creating a collaborator link, changing a team, or guessing an identifier.

### 7.4 Field security

Field groups are classified and projected server-side. Examples:

- basic identity and operational summary;
- customer contact details and preferences;
- conversation content;
- internal and restricted notes;
- quote and price details;
- gross/margin and manager-only commercial data;
- finance-intent or finance-provider data;
- consent and suppression evidence;
- integration payloads and provider identifiers;
- security, audit, and AI prompt/trace material.

List, board, search, notification, export, print, API, audit viewer, AI retrieval, and analytics each require purpose-specific projections. Masking a field in a component while returning it in JSON is a security failure.

### 7.5 Separation of duties

- A requester cannot approve their own exception where policy requires independent approval.
- Approval authority is evaluated against exact subject, version, amount/impact, location, policy, and expiry.
- Integration credential administrators cannot silently grant themselves customer-record access.
- Support impersonation, if later approved, requires reason, time limit, visible banner, no credential access, and immutable audit.
- Break-glass access is time-bound, reasoned, alerted, reviewed, and cannot disable its own audit.

## 8. Organization and tenant isolation

### `UCRM-SEC-ISO-001` Present isolation unit

The existing schema demonstrates organization-scoped data. Unified CRM treats `organizationId` as the current hard isolation boundary.

Required implementation rules:

- organization context is derived from the authenticated server session/grant, never accepted as authority from a form, URL, import, or provider payload;
- every CRM-owned row, command, event, audit, outbox message, integration connection, custom definition/value, search document, cache key, job, file, and export is organization-scoped;
- repositories require organization context and include it in reads, mutations, uniqueness constraints, relationship validation, and optimistic-concurrency keys;
- foreign references are validated to the same organization before commit;
- background jobs process an explicit organization partition and cannot fall back to an unscoped query;
- caches and search indexes partition by organization and permission-relevant scope; shared cache entries contain no customer data;
- identifiers remain unguessable, but unguessability never replaces authorization;
- not-found and denied responses avoid cross-organization existence or timing disclosure;
- logs, metrics, traces, backups, exports, and dead-letter tools are access-controlled and minimize customer content.

If the product later needs a tenant containing multiple organizations, a dedicated tenant model, authority hierarchy, migration, key strategy, reporting semantics, and isolation test suite must be approved through a new ADR. Agents must not equate a future tenant with an organization informally.

### `UCRM-SEC-ISO-002` Isolation proof

Automated tests must create at least two organizations with colliding human-readable identifiers and attempt reads/writes through every API, search, export, job, integration, direct object reference, nested relation, and error path. Production-like data-access reviews verify no repository offers an unscoped CRM query.

## 9. Consent, communications, and preference enforcement

Preferred channel is not consent. A recorded phone number or email is not permission to contact.

Before any communication delivery request is committed, the server evaluates:

- organization and sending identity;
- recipient/customer/contact-point identity;
- channel and message purpose;
- applicable consent source, status, scope, effective time, expiry, and evidence;
- opt-out, suppression, quiet-hours, frequency, age/jurisdiction, and legal-hold policies where configured;
- actor capability, record access, approved template/content rules, and required approval;
- provider availability and idempotency.

An opt-out or suppression is effective immediately for future requests and wins over cadence, automation, recommendation, or AI output. Transactional and marketing purposes remain distinguishable. Manual override is prohibited unless a reviewed policy expressly authorizes the exact purpose and evidence.

Consent changes retain source, actor/system, timestamp, prior/new state, scope, evidence reference, and correlation ID. Delivery status from a provider is evidence of provider processing, not proof the person read or agreed to content.

## 10. Audit and accountability

### `UCRM-SEC-AUD-001` Audit scope

At minimum, audit:

- authentication, MFA, recovery, session revocation, and high-risk failures;
- role, capability, location, team, field-policy, and break-glass changes;
- customer merge/archive/privacy actions and restricted-field access where policy requires;
- opportunity assignment/override, stage/close/reopen, quote issue/response, approval, and forecast override;
- communication consent changes, send requests, suppression, and template publication;
- import, bulk update, export, print/download of sensitive sets;
- integration connection, credential rotation, mapping, replay, reconciliation, and dead-letter actions;
- CRM configuration, custom field/object, automation, feature flag, and retention changes;
- AI consequential-action confirmation, decision override, and policy-relevant use.

### `UCRM-SEC-AUD-002` Audit content

Audit entries include organization, location where applicable, actor/system/service identity, action, subject type/ID/version, result, reason, policy version, correlation ID, timestamp, source, and safe before/after or field-change summary. They exclude passwords, raw tokens, full restricted documents, unnecessary message bodies, and secrets.

Audit evidence is append-only through application workflows, time-synchronized, access-controlled, searchable by authorized reviewers, protected from tenant administration deletion, retained under policy, and included in backup/restore tests. Activity-feed copy is not a substitute for security audit.

## 11. Privacy lifecycle

### 11.1 Collection and purpose

- Collect only fields required for an approved workflow and stated business purpose.
- Show purpose and sensitivity in configuration and import mapping.
- Do not use CRM notes as an unrestricted dumping ground for identity, finance, health, protected-class, or credential data.
- User-authored content receives guidance, validation where feasible, and a governed correction/restriction path.
- Derived scores and recommendations retain provenance, purpose, version, and challenge/override behavior.

### 11.2 Retention and disposition

Retention is policy-driven by record class, purpose, jurisdiction, contract, and organization. Target behavior includes:

- effective-dated retention policies with approved owner and review date;
- `retentionUntil`, archive/restriction state, and legal-hold support where required;
- disposition preview and authorized approval for material deletion/anonymization;
- holds that suspend disposition without silently changing the underlying policy;
- deletion/anonymization propagated to projections, search, caches, exports under control, and processors where contractually supported;
- preservation of the minimum lawful audit/integrity evidence with sensitive payload minimized or tokenized;
- documented backup expiry behavior rather than unsafe selective backup mutation;
- verification receipts and exceptions for failed processor deletion.

No agent may implement hard-delete cascades for customer history as a convenience. Merge, correction, archive, anonymization, and erasure have different semantics.

### 11.3 Data-subject and customer requests

If legally or contractually required, access, correction, restriction, portability, and deletion requests use an identity-verified, case-based workflow with scope review, exclusions/holds, dual control for high-risk disclosure, secure delivery, deadlines, and audit. The CRM UI must not imply that a staff-level delete button satisfies a formal privacy request.

## 12. Encryption and key management

- TLS is required for browser, API, service, database, object-storage, queue, and provider transport.
- Production databases, backups, object storage, search indexes, and queue storage use provider-supported encryption at rest.
- Restricted fields and refresh/access tokens use application-level envelope encryption where the threat model requires separation from database storage.
- Keys are environment-scoped, access-controlled, versioned, rotated, monitored, and recoverable through approved key-management services.
- Key identifiers may be stored with ciphertext; plaintext keys and secrets are never stored in source, database business rows, logs, events, browser storage, or exports.
- Key rotation supports gradual re-encryption and rollback/recovery without disabling authorization or audit.
- Password hashing, message signing, and encryption use reviewed standard libraries and algorithms; custom cryptography is prohibited.

## 13. Secrets and integration credentials

- Secrets enter through an approved environment/secret manager, never `.env` commits, fixtures, screenshots, tickets, prompts, or documentation.
- Each integration receives the minimum provider scopes and separate credentials by environment and organization/connection where supported.
- The application stores credential references and encrypted tokens, not recoverable plaintext in ordinary administration views.
- Secret access is limited to the adapter at runtime, with rotation, revocation, expiry, owner, last-used, and health metadata.
- Webhook signing secrets support overlap during rotation.
- CI logs and error telemetry redact tokens, authorization headers, cookies, query secrets, and sensitive payloads.
- Suspected exposure triggers immediate revocation/rotation and incident handling; deleting a log entry is not remediation.

## 14. Application and API security

Target controls include:

- strict request schemas, size/depth/count limits, canonicalization, and allowlists;
- parameterized ORM/database access and no user-composed query fragments;
- contextual output encoding, safe rich-text renderer, and no unsafe stored HTML execution;
- CSRF protection for cookie-authenticated mutations, origin checks, and safe CORS policy;
- content security policy and secure headers appropriate to the application;
- upload type/size validation, malware scanning/quarantine, randomized object keys, authorization on every download, and no public buckets;
- rate limits by session, actor, organization, IP/risk, endpoint, and provider as appropriate;
- pagination and server-enforced maximums for lists, search, bulk actions, and exports;
- safe error envelopes and correlation IDs without stack traces, query text, record existence, or secrets;
- dependency pinning/lockfile review, vulnerability scanning, provenance checks, and timely patch policy;
- server-side URL allowlists and egress controls for webhooks, previews, enrichment, and AI to reduce SSRF and exfiltration risk.

## 15. Imports, exports, search, and analytics

### Imports

Imports require file quarantine/scanning, organization binding, mapping preview, data classification, duplicate detection, row validation, authorization, dry run, bounded batch size, idempotency, per-row receipts, and reversible correction where domain semantics permit. CSV/spreadsheet formula injection is neutralized on both import preview and later export.

### Exports

Exports are purpose- and field-aware commands, not unrestricted database downloads. They require explicit filters, row/field preview, volume limits, step-up or approval for broad/restricted sets, asynchronous secure generation, short-lived single-purpose downloads, audit, retention/expiry, and revocation. Exports never include secrets, hidden fields, or another organization's data.

### Search and analytics

Search documents and analytical projections store only approved fields, preserve organization partition and classification, recheck authorization at query/open time, and support correction/deletion propagation. Restricted-field values must not leak through snippets, facets, autocomplete, counts, embeddings, or timing.

## 16. AI security and privacy

AI providers and models are external processors unless deployment evidence establishes otherwise. Before use, document approved data classes, purpose, region, retention/training terms, subprocessors, security controls, deletion, and outage behavior.

Mandatory controls:

- permission-filtered retrieval and field redaction before model input;
- data minimization and no secrets, credentials, unrestricted finance documents, or cross-organization context;
- untrusted retrieved text cannot alter system policy or authorize tools;
- allowlisted tools with typed arguments, narrow capabilities, timeouts, and deterministic server revalidation;
- structured output validation and clear separation of quoted source facts, extracted candidates, and generated suggestions;
- citations/provenance, freshness, uncertainty, model/prompt/policy version where material;
- human preview and explicit confirmation before any consequential command;
- no autonomous communication, merge, consent change, price/term/approval, credit/eligibility, inventory reservation, contract, or retention action;
- organization-scoped abuse monitoring and kill switch;
- evaluation for hallucination, prompt injection, sensitive-data leakage, authorization bypass, biased treatment, and unsafe automation before rollout.

AI prompt/response logging is minimized and classified. General telemetry must not retain complete customer conversations merely for debugging.

## 17. Logging, monitoring, and detection

Security telemetry records events and identifiers necessary for detection without duplicating customer content. Target alerts cover:

- repeated authentication, authorization, CSRF, signature, or isolation failures;
- unusual restricted-record access, searches, enumeration, exports, downloads, or after-hours activity;
- role/capability, retention, consent, integration, secret, and security-policy changes;
- outbox backlog, dead letters, replay spikes, duplicate commands, webhook failures, and projection drift;
- audit write failure, clock anomaly, log-pipeline outage, and backup/restore failure;
- AI policy rejection, prompt-injection signals, abnormal tool attempts, or cross-record retrieval anomalies.

Alert access is restricted; alert payloads use references instead of full sensitive data. Detection rules have owners, thresholds, playbooks, tests, and periodic review.

## 18. Incident response and support access

The production program must maintain an incident plan with severity, ownership, contact paths, evidence preservation, containment, credential revocation, customer/legal notification decision support, recovery, and post-incident corrective actions.

Required capabilities:

- organization-, integration-, communication-, AI-, automation-, export-, and write-level kill switches;
- session and token revocation;
- protected forensic/audit export for authorized responders;
- documented vendor escalation and processor incident paths;
- status communication that does not disclose customer or security-sensitive detail;
- tabletop exercises before broad production use and after material architecture changes;
- time-bound support and break-glass access with approval, visible state, immutable audit, and retrospective review.

Incident recovery never uses unaudited direct production edits when a governed correction/replay path can preserve evidence.

## 19. Backup, continuity, and recovery

- Define and approve recovery time and recovery point objectives before production release.
- Back up authoritative database state, encrypted integration/configuration state, audit evidence, and required object storage according to classification.
- Encrypt backups, separate access from application administration, prevent ordinary tenant deletion, and monitor success/expiry.
- Restore rehearsals use an isolated environment and verify organization isolation, record counts, command/audit/event/outbox correlation, attachments, configuration versions, search/projection rebuild, and revoked credentials.
- Restored integrations and communications remain disabled until credentials, cursors, duplicate-delivery risk, consent state, and reconciliation are reviewed.
- Disaster recovery does not weaken authorization, retention holds, or audit integrity.

## 20. Secure SDLC and agent rules

Every implementation slice must include a security statement covering data classes, trust boundaries, capabilities, record/field rules, validation, audit, failure behavior, and tests.

Required development controls:

- threat-model review for new trust boundaries or high-risk workflows;
- peer review for auth, policy, crypto, secret, consent, export, tenant-scoping, integration, and AI changes;
- static analysis, secret scanning, dependency and license review, lockfile integrity, and build/test gates;
- unit tests for policy decisions and validation;
- integration tests that exercise real repository scoping, transaction rollback, idempotency, and audit;
- browser tests for safe denied states and absence of sensitive fields in responses;
- fuzz/property tests for parsers, imports, custom filters, and authorization combinations where risk warrants;
- no real customer data or production credentials in development, fixtures, recordings, screenshots, prompts, or test artifacts;
- migrations reviewed for organization scope, indexes, foreign keys, defaults, backfill safety, rollback/forward-fix, retention, and field classification;
- production changes through reviewed, reproducible deployment with feature flags and rollback controls.

Agents must not weaken a policy or add a bypass merely to make a test pass. Any required exception becomes an explicit reviewed policy/ADR with expiry and compensating controls.

## 21. Security acceptance gates

No CRM milestone may be called production-ready until all applicable gates pass with retained evidence.

| Gate | Required evidence |
| --- | --- |
| `UCRM-SEC-GATE-001` Inventory | Data-flow diagram, field inventory, classification, owner, purpose, processor, retention, and legal review flags. |
| `UCRM-SEC-GATE-002` Threat model | Reviewed threats, trust boundaries, mitigations, residual risks, and owners for the delivered slice. |
| `UCRM-SEC-GATE-003` Authentication | Session, revocation, timeout, fixation, CSRF, step-up, and high-risk account tests pass. |
| `UCRM-SEC-GATE-004` Organization isolation | Positive and negative two-organization tests pass across API, nested relations, search, cache, export, jobs, integrations, errors, and IDs. |
| `UCRM-SEC-GATE-005` Authorization | Capability/record/field/state/purpose/separation matrix is tested server-side; hidden fields are absent from serialized responses. |
| `UCRM-SEC-GATE-006` Consent | Opt-out, suppression, purpose/channel, quiet-hours/frequency where configured, race, retry, and provider-failure tests prove fail-closed delivery. |
| `UCRM-SEC-GATE-007` Audit | Required events are complete, correlated, immutable through app paths, redacted, access-controlled, searchable, and restored successfully. |
| `UCRM-SEC-GATE-008` Input/output safety | Injection, stored XSS, upload, formula, SSRF, pagination, size, rate, and safe-error tests pass. |
| `UCRM-SEC-GATE-009` Secrets and encryption | No secret scan findings; transport/storage/key/rotation evidence and least-scope provider credentials are reviewed. |
| `UCRM-SEC-GATE-010` Privacy lifecycle | Retention, hold, correction, archive, anonymization/deletion, projection propagation, processor exception, and backup-expiry behavior are tested. |
| `UCRM-SEC-GATE-011` Integration | Signature, replay, idempotency, conflict, rate-limit, dead-letter, reconciliation, credential revocation, and kill-switch tests pass. |
| `UCRM-SEC-GATE-012` AI | Permission leakage, prompt injection, unsupported claim, sensitive input, tool authority, confirmation, outage fallback, and kill-switch evaluations pass. |
| `UCRM-SEC-GATE-013` Resilience | Backup restore, RTO/RPO rehearsal, dependency outage, queue backlog, degraded mode, and incident tabletop evidence is accepted. |
| `UCRM-SEC-GATE-014` Verification | Static/dependency/secret scans, focused automated suites, accessibility/security browser review, and risk-based penetration testing have no unresolved release blocker. |
| `UCRM-SEC-GATE-015` Operational ownership | Control owners, alert routes, runbooks, support boundaries, vendor contacts, review cadence, and residual-risk acceptance are documented. |

## 22. Release blockers

The following block release of the affected capability:

- any proven cross-organization read or write path;
- client-controlled organization or privilege context;
- restricted fields returned to an unauthorized client, search index, export, log, or AI context;
- a communication path that can bypass consent/suppression or duplicate a send on retry;
- material mutation without authorization, expected-version/idempotency controls where required, or audit evidence;
- secrets in source, logs, browser state, fixtures, documentation, or general database fields;
- unresolved critical/high exploitable vulnerability without approved time-bound risk treatment;
- untested restore or inability to revoke sessions/integration credentials and disable consequential automation;
- production use of real customer data in an unapproved processor or nonproduction environment;
- documentation that presents planned controls as implemented evidence.

Security exceptions require named owner, business justification, affected organizations/data, compensating controls, expiry, monitoring, and explicit approval. Exceptions cannot waive organization isolation, credential protection, or the prohibition on unaudited consequential actions.
