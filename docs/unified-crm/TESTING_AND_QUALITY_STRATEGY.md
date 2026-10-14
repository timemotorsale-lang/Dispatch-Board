# Unified CRM Testing and Quality Strategy

**Program:** Dispatch Board Unified CRM Console
**Document ID:** `UCRM-QA-001`
**Status:** `UCRM-005` accepted quality contract; tests named here are requirements unless linked evidence says implemented
**Companion:** `UCRM-GOV-002` (`AGENT_OPERATING_MODEL.md`)

## 1. Quality objective

Unified CRM must be simple for frontline users because its underlying behavior is predictable, secure, observable, recoverable, and tested across real boundaries. Quality is not a final hardening phase. Each `UCRM-WP-###` defines tests and evidence before implementation.

The strategy extends the repository's existing Vitest, Playwright, Prisma, lint, typecheck, build, release-checklist, and evidence practices. It does not claim that planned Unified CRM test suites, routes, schemas, tenant controls, integrations, or AI features already exist.

## 2. Quality principles

1. Test user outcomes and domain invariants, not milestone copy or component shape.
2. Enforce permissions, tenancy, validation and audit on the server; test bypass attempts directly.
3. Prefer deterministic clocks, IDs, fixtures, policies and provider fakes.
4. Use contract tests at every cross-domain and external boundary.
5. Keep end-to-end tests few, critical, and production-shaped; place exhaustive cases lower in the pyramid.
6. A failure must be visible, recoverable, and non-destructive.
7. Every state-changing command is tested for authorization, validation, idempotency/concurrency, audit and partial failure as applicable.
8. Every implemented workspace has loading, empty, error, stale, forbidden, success and recovery coverage.
9. Optional AI is evaluated separately and cannot make the deterministic workflow unavailable.
10. Evidence is bound to a commit, environment, schema and fixture version.
11. Every user-facing milestone includes a Product Owner interactive checkpoint on a real route backed by server policy, representative repository data, and safe feature-off/fallback behavior; mock-only review cannot close the milestone.

## 3. Test pyramid and suites

Suggested ratios guide runtime and design; gates depend on risk, not a quota.

| Layer | Target emphasis | What it proves | Example planned cases |
| --- | ---: | --- | --- |
| Unit/domain | 35% | Pure invariants, lifecycle transitions, value objects, ranking and formatting | Opportunity requires owner/next action; stage exit evidence; quote version immutability |
| Policy/security unit | 15% | Role, team, record, field, action and consent decisions | Seller cannot approve own exception; restricted field redaction |
| Contract/schema | 15% | Versioned API/event/adapter/request/response compatibility | Customer link envelope; provider webhook; error taxonomy |
| Service/repository integration | 20% | Database transaction behavior, commands, projections, audit/outbox atomicity | Duplicate submission; concurrent stage move; timeline ordering |
| Component/accessibility integration | 10% | Interaction, keyboard, semantic structure and all UI states | Pipeline card move with keyboard; forbidden action explanation |
| End-to-end | 5% | A small set of critical user journeys across deployed boundaries | Lead to opportunity to quote to dispatch handoff |

### Required domain coverage

Domain tests include boundary values, invalid transitions, invariants, stable ordering, dates/timezones, ownership changes, archival, deduplication decisions, relationship cycles, stale versions and bulk-operation limits. Pure rules should have table-driven/generative cases where useful.

### Required policy coverage

Each protected command/read has an allow/deny matrix across role, team/territory, record ownership, tenant, field sensitivity, lifecycle state and consent. Tests call the server boundary directly; hidden buttons are not evidence.

### Contract coverage

Consumer and provider tests share versioned fixtures/schemas. Backward compatibility is required during the documented support window. Unknown enum values, omitted optional fields, invalid signatures, replayed events, duplicate keys, out-of-order delivery and error envelopes are covered.

### Integration coverage

Run against a real supported PostgreSQL/Prisma test database for transactional claims. Verify atomic domain write + audit/activity + outbox where required, rollback on failure, optimistic concurrency, idempotency payload conflicts, query tenant scope, uniqueness and projection reconciliation.

Mocks may isolate external providers; mocks may not prove database constraints, migrations, authorization wiring or transaction behavior.

### End-to-end critical journeys

The initial planned E2E catalog includes:

- `UCRM-TST-001`: authorized user opens `/crm`, finds a customer, and sees correct Customer 360 context;
- `UCRM-TST-002`: create opportunity, assign owner/next action, advance through evidence-governed stage, and see audit timeline;
- `UCRM-TST-003`: create task/follow-up from CRM and open the authoritative Dispatch Board work item;
- `UCRM-TST-004`: create and submit a versioned quote through the permitted approval boundary;
- `UCRM-TST-005`: manager reviews pipeline/forecast evidence and drills into the source record;
- `UCRM-TST-006`: excluded user and cross-tenant actor cannot discover/read/mutate records through UI or direct request;
- `UCRM-TST-007`: provider timeout/duplicate callback recovers without duplicate activity or customer communication;
- `UCRM-TST-008`: keyboard/mobile user completes the primary daily-work loop;
- `UCRM-TST-009`: feature rollback disables CRM writes without losing authoritative Dispatch Board data.

These IDs are reserved planned cases. They become implemented only when their source and evidence are linked.

## 4. Specialized quality programs

### Accessibility

Target WCAG 2.2 AA. Automated checks supplement, not replace, manual review.

- keyboard-only operation, logical focus order, visible focus and focus restoration;
- semantic headings, landmarks, labels, descriptions and status announcements;
- accessible names/states for board cards, tables, menus, dialogs and comboboxes;
- no drag-only operation; pipeline movement has an equivalent keyboard/action workflow;
- contrast, zoom/reflow at 200% and 400%, reduced motion and high-contrast behavior;
- screen-reader checks for primary journeys and validation/error recovery;
- touch target and mobile viewport checks with no blocking horizontal overflow.

Any inaccessible critical workflow is release blocking.

### Interactive UX and usability acceptance

Interactive review is part of executable quality evidence, not a design presentation. Each user-facing packet identifies the earliest safe thin slice and provides the Product Owner a real route with a representative authorized persona and data set. The review exercises the actual read/command boundary, server policy, durable refresh behavior, loading/empty/error/forbidden states, and feature-off or existing-console fallback.

The evidence record captures route, commit, environment, persona, scenario, observed timing/click path, Product Owner disposition, and resulting decisions or defects. Mockups may precede the checkpoint, but screenshots, static prototypes, component-only stories, and local state without backend authority do not satisfy it.

The accepted user-experience and pilot targets are:

| Measure | Accepted target |
| --- | ---: |
| New user understands CRM Home | Under 1 minute |
| Authorized user finds a customer and understands the relationship | Under 10 seconds at representative target volume |
| User records a call outcome and dated next step | Under 15 seconds |
| Representative pilot journeys completed without assistance | At least 90% |
| Active opportunities with owner, stage, next action, and due time | 100% |

Timing begins from a ready interactive state and includes the complete user outcome, not merely a button acknowledgement. Representative journey definitions, personas, and operating context are versioned with the release evidence.

### Performance and scale

Each workspace packet declares budgets and representative volumes. The following are the accepted initial performance budgets and remain release targets until superseded by an approved evidence-based decision:

| Measure | Accepted initial budget |
| --- | ---: |
| Server response p95 for common CRM reads | <= 500 ms at approved representative volume |
| Server command p95 excluding external provider latency | <= 750 ms |
| CRM route LCP p75 on agreed business-device/network profile | <= 2.5 s |
| Interaction to Next Paint p75 | <= 200 ms |
| Cumulative Layout Shift p75 | <= 0.1 |
| Global search first useful result p95 | <= 1.0 s |
| Primary table/board action acknowledgement | <= 200 ms, with durable result or progress state |

Tests cover realistic customer/contact/activity/opportunity volumes, pagination, query counts/plans, bulk limits, concurrent users, hot records, export sizes and degraded dependencies. These are approved targets, not claims about current implementation performance.

The accepted service and recovery objectives are:

| Objective | Accepted target |
| --- | ---: |
| Pilot availability | At least 99.5% during the configured dealership operating schedule |
| Post-internal-release availability | At least 99.9% during the configured dealership operating schedule |
| Recovery time objective (RTO) | 2 hours |
| Recovery point objective (RPO) | 15 minutes |

Operating hours come from approved dealership configuration and are never hard-coded into tests or application rules. Availability exclusions, measurement source, observation window, and incident accounting must be stated in release evidence.

At pilot and release, the accepted integrity/safety targets are zero unauthorized disclosure, zero lost or duplicate consequential write, zero missing material audit evidence, and no open Severity 0 or Severity 1 defect.

### Security and privacy

Security verification includes threat modeling and automated/manual abuse tests for:

- broken object-, function- and field-level authorization;
- tenant/organization isolation, including search, counts, autocomplete, exports, logs and cache keys;
- injection, XSS, CSRF, SSRF, unsafe redirects and file/document handling;
- session lifecycle, SSO/SCIM assumptions when implemented, rate limiting and brute-force resistance;
- consent/contact preferences, data minimization, retention, deletion/legal-hold conflicts and audit access;
- secrets, dependency/supply-chain, static analysis and accidental PII logging;
- bulk export/import, merge, approval, pricing/quote, impersonation and admin abuse paths;
- webhook signature, replay, ordering and idempotency controls;
- audit completeness and tamper resistance.

Risk-class-A changes receive independent adversarial review. Production customer data is never copied into ordinary test fixtures.

### Tenant isolation

Tenant isolation is a dedicated blocking suite, not merely part of permissions. If the deployment remains single-organization initially, the boundary is still designed and tested before any multi-tenant claim.

- Generate at least two tenants with colliding human-readable names and record numbers.
- Attempt cross-tenant reads/writes by ID enumeration, search, relationship expansion, report, export, attachment, timeline and batch endpoints.
- Verify database queries, cache entries, background jobs, audit, metrics and provider callbacks carry the boundary.
- Verify privileged support/admin access is explicit, time-bound, audited and absent unless contracted.
- Ensure not-found/forbidden behavior does not disclose another tenant's existence.

Any cross-tenant disclosure or mutation is Severity 0.

### Migration and data quality

Every schema/data migration is tested against:

1. fresh database creation;
2. representative previous schema with minimum, typical, maximum and malformed legacy cases;
3. forward migration and application compatibility;
4. restart/idempotency when interrupted;
5. reconciliation counts, checksums and invariants;
6. rollback where safe, otherwise forward-fix plus feature-disable/restore rehearsal;
7. duration, locks and operational impact at representative scale;
8. backup restore and post-restore reconciliation for release-critical changes.

Customer deduplication/merge requires dry-run evidence, survivor rules, relationship preservation, reversible linkage or documented recovery, and an immutable actor/reason trail. Direct production repair is forbidden outside an approved runbook.

### Failure injection and resilience

Planned fault scenarios include database timeout/deadlock, stale version, duplicate/out-of-order request, provider 429/5xx/timeout, lost acknowledgement after success, partial batch failure, outbox backlog, search/index lag, cache loss, clock skew, attachment scan failure and feature-flag/configuration error.

Tests prove:

- no duplicate customer message, opportunity, task, quote, job handoff or audit event;
- safe retry with the original idempotency/correlation identity;
- explicit stale/degraded state and useful recovery action;
- durable reconciliation/dead-letter visibility;
- circuit breaking/backoff does not hide permanent failure;
- core CRM remains usable without optional AI and non-critical providers.

### AI evaluations

AI capabilities are deferred until individually contracted. They require a versioned evaluation set and deterministic fallback before pilot.

| Evaluation dimension | Required evidence |
| --- | --- |
| Grounding | Claims cite permitted source records; unsupported statements are measured and blocked from consequential use |
| Permission safety | Prompts, retrieval and output never expose records/fields the actor cannot access |
| Action safety | Draft/recommend by default; consequential sends, merges, pricing or workflow changes require explicit human approval |
| Accuracy | Extraction, classification, prioritization and summary metrics against labeled representative cases |
| Robustness | Prompt injection, malicious content, ambiguous identity, stale context and unavailable model/provider |
| Fairness | Slice metrics for relevant protected/proxy groups; no inferred sensitive traits without approved purpose |
| Privacy | Redaction, retention, provider use and logging match approved policy |
| Operations | Model/prompt/version trace, cost/latency budgets, drift monitor, kill switch and deterministic fallback |

Evaluation thresholds belong to each AI packet and are approved before implementation. A polished anecdotal demo is not evidence. Human override and correction feedback are audited without treating user acceptance as automatic ground truth.

## 5. Fixtures and test data

All Unified CRM fixtures are synthetic, deterministic, versioned and owned by Quality/Data stewards.

- A small canonical fixture supports fast unit/component tests.
- Scenario fixtures cover roles, teams/territories, tenants, lifecycle stages, consent states, stale data, duplicates, conflicting identities, quotes, tasks, appointments, vehicles/jobs and timeline history.
- Scale fixtures generate representative and stress volumes reproducibly from a recorded seed.
- Provider fakes reproduce success, delay, rate limit, timeout, duplicate, replay, out-of-order and malformed callbacks.
- Dates use an injected clock and explicit `America/Chicago` plus UTC/DST boundary cases.
- IDs are stable within a fixture version; secrets/tokens are unmistakably fake.
- Database tests reset through supported repositories/migrations, not ad hoc state shared across parallel tests.
- Fixtures carry schema/contract version and expected authority/consent/tenant metadata.

Do not use UI mocks as backend evidence or production snapshots as fixtures. Sanitization must be proven before any exceptional production-derived dataset is approved.

## 6. Traceability and evidence

Every `UCRM-REQ-###` maps to one or more `UCRM-TST-###`, and every test maps to an `UCRM-EVD-###` result for a release candidate. The evidence ledger fields and integrity rules are defined in `UCRM-GOV-002`.

A coverage percentage alone cannot close a requirement. Coverage reports are diagnostic; branch/line thresholds may be set per package, but domain invariant, policy decision and critical journey coverage are reviewed explicitly.

Flaky tests are defects. They are quarantined only with a `UCRM-DEF-###`, owner, reason, containment, expiration and proof that the quarantine cannot hide a release-critical failure.

## 7. Quality gates

### Packet gate (`UCRM-QG-1`)

Before `VERIFIED`:

- linked requirements/contracts and acceptance/negative cases pass;
- affected domain, policy, contract, integration and UI tests pass;
- security, tenant, accessibility, performance and migration checks pass where applicable;
- lint, typecheck and relevant Vitest/Playwright suites pass;
- implementation, docs, observability and rollback expectations agree;
- each user-facing packet has a recorded interactive UX checkpoint disposition from the Product Owner using its real route/policy/fallback path;
- no new Severity 0/1 defect and no unexplained baseline regression;
- required review and evidence ledger entries are complete.

### Milestone integration gate (`UCRM-QG-2`)

- all included packets meet `UCRM-QG-1`;
- full affected regression and cross-domain contract suites pass;
- representative multi-role journey and direct API authorization matrix pass;
- schema migration/reconciliation and feature-disable path are rehearsed;
- aggregate accessibility and performance budgets pass;
- representative users can interact with the integrated live route, and no mock-only or local-state-only surface is counted as milestone completion;
- contract/drift review shows no duplicate authority or status inflation.

### Release candidate gate (`UCRM-QG-3`)

Required repository checks, adjusted only by documented baseline handling:

```text
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run db:validate
npm run build
```

Additionally:

- migrations apply to fresh and representative upgrade databases;
- risk-class-A adversarial security and tenant suites pass;
- critical accessibility/manual browser matrix passes;
- accepted usability, journey-completion, opportunity-completeness, integrity, availability, RTO and RPO evidence meets the candidate's gate;
- load, resilience, backup/restore or forward-recovery evidence meets scope;
- dependency/configuration/secrets review passes;
- release manifest links commit, schema, flags, evidence, known defects and rollback plan.

### Production enablement gate (`UCRM-QG-4`)

- approved pilot cohort, roles, training, support and business owner are named;
- monitoring, alerting, dashboards, audit access, reconciliation and incident ownership are live;
- canary/feature flags limit blast radius and have been exercised;
- rollback/disable decision thresholds and operator are named;
- no open Severity 0/1 and accepted lower defects fit the cohort;
- at least 90% of representative pilot journeys complete without assistance and Product Owner interactive review is accepted;
- first-live validation checklist and post-release observation window are scheduled.

## 8. Defect severity and disposition

| Severity | Definition | Release effect |
| --- | --- | --- |
| `S0 Critical` | Cross-tenant exposure/mutation; unauthorized sensitive action; irreversible corruption; secret exposure; material customer/commercial harm in a critical path | Stop work/release, disable affected capability, incident response; no waiver by delivery team |
| `S1 High` | Critical journey unavailable; permission bypass without demonstrated S0 impact; lost/duplicate authoritative transaction; no safe recovery; migration/rollback failure | Blocks packet, milestone and release until fixed and independently verified |
| `S2 Medium` | Important workflow impaired with safe workaround; incorrect non-authoritative display/report; significant accessibility or performance breach outside critical path | Blocks affected cohort by default; acceptance requires owner, mitigation and expiry |
| `S3 Low` | Minor usability/visual/copy issue with no material correctness, access or recovery impact | May release with owner and target milestone |

Security severity may be raised after impact analysis. Reclassification and acceptance require evidence and named Quality/Product/Security authority as applicable. Defects are never hidden by narrowing a test after failure unless the contract itself is formally changed.

## 9. Known baseline handling

The repository may have failures unrelated to a Unified CRM packet. They do not authorize adding more failures or calling a red build green. The recorded `service-close-parts` typecheck defect blocks a clean release candidate; it does not block documentation, contract work, fixtures, read-only analysis, or other reversible groundwork that proves it does not worsen the baseline.

Before the first implementation packet, record a baseline with date, commit, environment, exact commands, results, and existing defect IDs. For each proposed change:

1. Run the relevant baseline command before or otherwise reproduce the known failure at the base commit.
2. Run it again after the change with equivalent environment.
3. Prove the failure signature/count is unchanged and unrelated.
4. Link a named owner and target resolution; do not use “pre-existing” without evidence.
5. Run focused CRM checks that pass fully.

A new, expanded, intermittent, or differently located failure is a regression until proven otherwise. `UCRM-QG-3` requires the recorded baseline defect to be repaired and the applicable full suite to be clean. No waiver may convert that known red baseline into a clean Unified CRM release candidate. Reversible groundwork may proceed with before/after evidence. No waiver is permitted for S0/S1 or tenant/security gates.

## 10. Release, rollout and rollback

### Release strategy

Release vertical capabilities behind server-enforced feature controls to synthetic/internal users, then a named pilot, then broader cohorts. Read enablement and write enablement are separate when useful. Flags must not bypass policy or produce incompatible persisted data.

Each `UCRM-RC-*` has an immutable manifest containing commit, migrations, contract/fixture versions, enabled packets, cohort, configuration, evidence, known defects, monitoring and rollback owner.

### Rollback hierarchy

1. Stop/disable the affected write or provider integration.
2. Preserve reads and evidence when safe; prevent further inconsistent state.
3. Roll back application code only when compatible with applied schema/contracts.
4. Prefer backward-compatible expand/migrate/contract database changes; use forward repair when destructive down migration would risk data.
5. Reconcile outbox, provider ledger, audit and authoritative record counts before re-enable.
6. Restore from backup only under the approved runbook, then prove reconciliation and account for writes after the restore point.

Rollback is not “redeploy an old commit.” It is a rehearsed business/data recovery outcome. Every critical packet defines rollback triggers such as authorization anomaly, duplicate communication/transaction, migration reconciliation mismatch, error/latency threshold, queue backlog or unexplained data drift.

### First-live proof

During the scheduled observation window, record route and command health, permission denials, audit completeness, queue/outbox/provider reconciliation, latency/error budgets, user-blocking defects and rollback readiness. A successful page load alone is not production proof.

## 11. Planned test repository shape

This is a target convention, not a claim that the directories exist:

```text
src/tests/
  unit/unified-crm/
  integration/unified-crm/
  contract/unified-crm/
  security/unified-crm/
  accessibility/unified-crm/
  performance/unified-crm/
  migration/unified-crm/
  resilience/unified-crm/
  ai-evals/unified-crm/
  e2e/unified-crm/
  support/unified-crm/
```

Follow existing repository conventions where a different placement is already established. Do not reorganize unrelated tests simply to match this target.

## 12. Quality definition of release-ready

Unified CRM is release-ready for a stated cohort only when:

- every enabled capability is `VERIFIED` and mapped from requirement to evidence;
- critical journeys succeed and forbidden journeys fail safely at the server boundary;
- customer identity, opportunity, quote, activity and dispatch/job linkage reconcile to authoritative sources;
- tenant/privacy/security, accessibility, performance, migration and resilience gates pass;
- visible UI behavior matches actual backend authority and provider state;
- operators can detect, disable, reconcile and recover the feature;
- open defects, limitations and deferred capabilities are explicit;
- Product, Domain, Security, Quality and Release owners approve the evidence appropriate to risk.

“No known bugs” means no known defects in the tested scope at a specific candidate; it is not a guarantee of defect-free software. The program's stronger commitment is that critical risks are prevented and tested, failures are contained and visible, and recovery is rehearsed before broad release.
