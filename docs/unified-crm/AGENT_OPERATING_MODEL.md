# Unified CRM Agent Operating Model

**Program:** Dispatch Board Unified CRM Console
**Document ID:** `UCRM-GOV-002`
**Status:** `UCRM-007` accepted operating contract; no CRM implementation is claimed
**Applies to:** All human and AI contributors working on Unified CRM (`UCRM`)
**Initial product boundary:** Independent `/crm` console using shared Dispatch Board identity and authoritative operational records

## 1. Purpose

This document is the collaboration contract for building Unified CRM with many agents without creating disconnected screens, duplicate sources of truth, unsafe mutations, or unverifiable completion claims. It supplements `docs/AGENTS.md`; repository-wide rules remain controlling.

The program uses parallel work only after shared contracts are accepted. Every implementation slice must remain a complete, reviewable path:

```text
approved requirement -> domain contract -> policy -> data/service -> interface -> audit -> tests -> evidence
```

Fast delivery means reducing waiting and rework, not skipping authority, security, tests, or review.

## 2. Status language

Every work packet, design, pull request, milestone, and status report must use exactly one state:

| State | Meaning |
| --- | --- |
| `PLANNED` | Desired behavior only; no implementation proof exists. |
| `CONTRACTED` | Interfaces, invariants, acceptance criteria, and ownership are approved; behavior is not necessarily built. |
| `IN_PROGRESS` | An assigned agent is changing the scoped files. |
| `IMPLEMENTED_UNVERIFIED` | Code exists, but required checks or evidence are incomplete. |
| `VERIFIED` | Required automated and manual evidence exists for the packet. |
| `PILOT` | Verified capability is enabled only for an approved cohort with monitoring and rollback. |
| `RELEASED` | The capability passed its release gate for the stated cohort. |
| `DEFERRED` | Explicitly excluded with an owner and reconsideration condition. |
| `HELD` | Progress or rollout is stopped by a recorded decision, dependency, authority, risk, or failed gate. |

Documents and UI must not use “available,” “supported,” “complete,” or “enterprise-ready” for anything below `VERIFIED`. A feature flag, mock, fixture, seed, prototype, interface, or passing component test is not production implementation.

## 3. Stable identifiers

Identifiers are never reused or renumbered:

| Artifact | Pattern | Example |
| --- | --- | --- |
| Requirement | `UCRM-REQ-###` | `UCRM-REQ-014` |
| Architecture decision | `UCRM-ADR-###` | `UCRM-ADR-003` |
| Domain contract | `UCRM-DOM-###` | `UCRM-DOM-007` |
| Security/control requirement | `UCRM-SEC-###` | `UCRM-SEC-012` |
| Work packet | `UCRM-WP-###` | `UCRM-WP-021` |
| Test/evaluation case | `UCRM-TST-###` | `UCRM-TST-106` |
| Risk | `UCRM-RSK-###` | `UCRM-RSK-004` |
| Decision or unresolved question | `UCRM-DEC-###` | `UCRM-DEC-008` |
| Defect | `UCRM-DEF-###` | `UCRM-DEF-031` |
| Evidence item | `UCRM-EVD-###` | `UCRM-EVD-055` |
| Release candidate | `UCRM-RC-YYYY-MM-DD.N` | `UCRM-RC-2026-10-09.1` |

Code, tests, commits, and evidence reference the relevant identifiers. If an item is retired, mark it superseded and link its replacement; do not recycle its number.

## 4. Roles and decision rights

One person or agent may fill several roles on a small packet, except that the author may not be the sole approver for a high-risk change.

### Accepted program authority

- The repository owner/user is the Product Owner and final business-escalation authority. Product scope, workflow meaning, commercial authority, pilot acceptance, and residual business-risk decisions return to the user when the governing documents do not already decide them.
- The root coordinating agent (`/root`) is the Program Coordinator for active multi-agent execution. It owns packet assignment, dependency order, file leases, status truth, integration sequencing, and escalation routing; it does not replace the user's business authority.
- Security, Quality, and Release review are filled by rotating independent agents named in each work packet. A rotating reviewer may not approve their own implementation and must re-evaluate evidence on the packet's exact commit.
- Domain, Architecture, Data, Integration, and UX responsibilities may be assigned per packet by the Program Coordinator. Every assignment must still name one accountable owner and required independent reviewers.
- This allocation remains binding until the user records a replacement through change control.

| Role | Accountable for | Must not do alone |
| --- | --- | --- |
| Program Coordinator | Packet registry, sequencing, owners, dependency graph, integration order, status truth, escalation | Approve their own high-risk implementation |
| Product/Workflow Owner | User outcomes, vocabulary, scope, acceptance scenarios, usability intent | Invent security or data authority |
| Domain Steward | Customer, contact, opportunity, activity, task, quote, job/dispatch, and relationship invariants | Change another domain's contract without review |
| Architecture Steward | Module boundaries, dependency direction, shared-platform reuse, ADRs, performance budgets | Approve business policy on behalf of its owner |
| UX/Accessibility Steward | Navigation, interaction contracts, states, responsive behavior, WCAG 2.2 AA evidence | Treat mockups as implemented behavior |
| Data Steward | Canonical identity, ownership, schema, migrations, deduplication, lineage, retention | Create competing customer/job sources of truth |
| Security/Privacy Steward | Threat model, least privilege, tenant isolation, consent, audit, secrets and abuse cases | Defer a release-blocking control without recorded acceptance |
| Integration Steward | External adapters, idempotency, reconciliation, sync health, failure recovery | Allow an external system to silently overwrite authoritative data |
| Quality Steward | Test plan, traceability, evidence ledger, defect triage, release recommendation | Waive their own unverified result |
| Implementation Agent | One approved packet, scoped code, tests, evidence and handoff | Expand scope or modify locked files implicitly |
| Independent Reviewer | Contract conformance, correctness, security, tests, maintainability and drift | Review by reading only the summary |
| Release Manager | Candidate manifest, migration rehearsal, feature flags, rollout, monitoring, rollback | Release with an open blocking gate |

### Risk-based review

`UCRM-RSK-CLASS-A` changes require Architecture, Security, Quality, and affected Domain approval. These include authentication/authorization, tenant scope, customer identity merging, consent, audit retention, pricing/quote authority, migrations with destructive potential, bulk actions, external writeback, AI actions, and release/rollback mechanisms.

`UCRM-RSK-CLASS-B` changes require affected Domain and Quality approval. These include ordinary workflows, read models, search, reporting, and non-destructive integrations.

`UCRM-RSK-CLASS-C` changes require one independent reviewer. These include documentation, copy, isolated visual polish, and tests that do not alter contracts.

The work-packet registry is the assignment and lease record. The Program Coordinator reviews active leases and dependencies at every agent dispatch/handoff and conducts a cross-packet integration and drift review at least once per active build day and at every milestone gate.

## 5. Ownership boundaries

The coordinator maintains a living ownership map before concurrent implementation begins.

| Boundary | Unified CRM authority | Shared authority that CRM consumes |
| --- | --- | --- |
| CRM shell and navigation | `/crm` experience, CRM preferences, CRM work queues | Authentication, role-aware app shell |
| Customer 360 lens | CRM projections and interaction experience | Canonical customer/contact identity and operational links |
| Opportunities/pipeline | CRM opportunity lifecycle, ownership, next action, stage evidence | Customer, inventory, appointment, task, document and job identifiers |
| Activities/conversations | CRM activity commands and timeline projection where approved | Shared audit/activity infrastructure; provider delivery truth |
| Quotes | CRM quote/scenario versions and approval workflow where contracted | Product, inventory, pricing and downstream transaction authorities |
| Dispatch/job linkage | Relationship, handoff and read projection | Dispatch/service/job lifecycle remains source-owned |
| Analytics | CRM semantic definitions and projections | Source facts remain owned by their producing domains |

No agent may add a duplicate persisted status merely to make a screen easier to build. Cross-domain state is linked or projected. Any proposed new authority requires a `UCRM-ADR-###` and affected stewards' approval.

## 6. Work packets

All agent work starts from a registered `UCRM-WP-###`. A valid packet contains:

```text
ID and title
Status and risk class
User outcome and excluded scope
Linked requirements, decisions, risks and domain contracts
Authoritative records and allowed mutation boundaries
Inputs/outputs, API/event/schema contracts and version
Server-side policies and audit events
UX states: loading, empty, error, stale, forbidden, success, recovery
Interactive UX checkpoint: route, representative persona/data, actions to review, policy proof, fallback/flag-off behavior, Product Owner disposition
Accessibility and performance budgets
Test cases and required evidence
Owned files/directories and shared files requested
Dependencies and consumers
Rollout flag, migration and rollback expectations
Named implementer, reviewers and handoff recipient
Definition of done
```

A packet is not ready for assignment if ownership, authority, acceptance criteria, failure behavior, or security rules are ambiguous.

### Packet sizing

- Prefer one user-observable vertical slice completed in one to three working days.
- Split packets that touch more than one high-risk authority boundary.
- Do not assign “build the CRM,” an entire console, or a frontend-only placeholder as a packet.
- Contract-only and research packets must say explicitly that they activate no behavior.

## 7. Contract-first sequencing

The coordinator enforces this sequence:

1. Product owner approves user outcome, vocabulary, exclusions, and acceptance scenario.
2. Domain and Data stewards identify authoritative records, invariants, lifecycle, and ownership.
3. Architecture and Integration stewards version input/output, event, API, and error contracts.
4. Security steward attaches policy, privacy, tenant, audit, and abuse controls.
5. UX steward specifies interaction and all reliability/accessibility states.
6. Quality steward maps requirements to tests and evidence before code begins.
7. Coordinator declares the packet `CONTRACTED`, assigns ownership, and opens its file lease.
8. Implementation proceeds behind a safe boundary or feature flag when required.
9. Independent review verifies behavior against the contract and repository patterns.
10. Quality steward closes evidence gaps; coordinator alone advances packet status.

For every user-facing slice, an interactive UX checkpoint occurs as soon as a thin end-to-end path is safe to run and again before milestone acceptance. The Product Owner must be able to open the real application route and exercise representative behavior. The checkpoint must use the real read/command boundary, server policy, durable or intentionally seeded repository data, loading/error/forbidden states, and feature-off/fallback behavior. A static mockup may support discussion, but a mock-only, component-only, or local-state-only demonstration cannot complete a milestone.

The coordinator records checkpoint feedback as accepted, revision required, or explicitly deferred, links it to the packet, and routes material workflow changes back through contracts before further parallel implementation.

Consumers may build against a contracted versioned interface, not an unreviewed draft. Breaking changes create a new contract version and a consumer migration plan.

## 8. File ownership, leases, and shared-file protocol

Because agents share one worktree, coordination is mandatory even when Git branches are used.

- Before editing, the coordinator records each packet's exact file/directories as an exclusive lease.
- Only one active packet may own a file. Directory leases should be narrow.
- Files frequently shared across domains—Prisma schema, migrations, app navigation, package manifests, global styles, common policies, generated clients, and central indexes—are coordinator-controlled.
- An agent needing a leased/shared file sends a change proposal with exact symbols or migration intent; the coordinator assigns an integration packet or sequences the edit.
- Agents inspect `git status` before work and before handoff. Unrelated changes are preserved.
- Agents do not revert, reformat, rename, or “clean up” files outside their lease.
- Generated output is changed only through its approved generator and is committed only when repository policy requires it.
- A lease ends only after the handoff is accepted, abandoned changes are accounted for, and status is updated.

For a collision, both agents stop editing the file. The coordinator chooses sequencing, contract revision, or a dedicated integration owner; agents do not race to resolve it.

## 9. Branch and commit rules

- Foundation branch: `codex/unified-crm-console-foundation`.
- Implementation branches use `codex/ucrm-<packet-id>-<short-name>` unless the coordinator documents another convention.
- One branch has one primary packet. Closely coupled sub-packets may share a branch only with coordinator approval.
- Rebase/merge policy is chosen by the repository owner; agents never rewrite published shared history without explicit approval.
- Commits are focused, pass applicable local checks, and reference packet IDs, for example: `feat(crm): add opportunity ownership policy [UCRM-WP-021]`.
- Schema migrations, generated artifacts, fixtures, implementation, and verification may be separate commits when that improves review or rollback.
- No secrets, personal customer data, local databases, screenshots containing sensitive data, caches, or unexplained generated output are committed.
- Agents do not merge or push unless their packet grants that authority.

## 10. Drift and conflict prevention

The following are program invariants:

1. One glossary and one canonical data/authority map.
2. One versioned contract per boundary; no copied local variants.
3. Server policy is authoritative; UI visibility is not authorization.
4. Every active opportunity has one owner and a dated next action, unless a contracted lifecycle state explicitly exempts it.
5. Important state changes emit durable audit/activity evidence.
6. External synchronization is idempotent, observable, reconcilable, and never silently lossy.
7. Optional AI cannot be required for deterministic core workflows.
8. A visible action is live, clearly disabled with a reason, or explicitly labeled as prototype-only outside staff production flow.
9. Documentation status is updated with the implementation slice; planned features are never described as built.
10. Shared Dispatch Board sources remain authoritative unless an approved ADR changes ownership.

The coordinator runs a contract/drift review at each milestone: packet graph, file leases, contract versions, schema authority, terminology, status claims, open risks, evidence, and deferred scope.

## 11. Handoff protocol

An implementation handoff must contain:

- packet ID, final state, branch and commit(s);
- concise outcome and explicit non-outcomes;
- files changed and contracts introduced/consumed;
- migration, feature-flag, configuration and rollback notes;
- commands run with pass/fail counts and environment;
- evidence IDs and locations;
- open defects, risks, assumptions, and known baseline failures;
- security/privacy consequences;
- manual verification steps and screenshots only when free of sensitive data;
- interactive UX checkpoint route, persona, Product Owner disposition, and resulting decisions;
- next consumer and any required sequencing.

The receiving reviewer reproduces risk-proportionate evidence rather than accepting the summary. A rejected handoff returns to `IN_PROGRESS` with actionable findings.

## 12. Evidence ledger

The Quality Steward maintains an append-only logical ledger, initially documentation-backed and later tool-backed. Each `UCRM-EVD-###` records:

| Field | Required content |
| --- | --- |
| Identity | Evidence ID, timestamp, packet, requirement/test IDs |
| Provenance | Commit SHA, branch, environment, schema/fixture version |
| Action | Exact command, scenario, review, scan, or measurement |
| Result | Pass/fail, counts, metrics, relevant sanitized output |
| Scope | What the evidence proves and explicitly does not prove |
| Custodian | Producing agent and independent reviewer when required |
| Integrity | Durable artifact location or CI/run identifier |
| Exceptions | Linked defect, waiver, expiry, owner and mitigation |

Evidence cannot be copied from an earlier commit to satisfy a changed behavior. Flaky reruns include every attempt; agents may not report only the successful attempt.

## 13. Escalation and decision handling

Stop and escalate when work would:

- change a source-of-truth boundary, public contract, security control, tenant rule, consent rule, or pricing authority;
- require destructive migration, production data access, a new dependency/provider, secret, elevated permission, or external write;
- exceed the packet's scope or file lease;
- conflict with an accepted requirement, ADR, or another active packet;
- expose sensitive data or reveal a possible security incident;
- require waiving a release gate or accepting a severity 0/1 defect.

Record the issue as `UCRM-DEC-###` or `UCRM-RSK-###` with options, evidence, recommended choice, decision owner, due condition, and affected packets. Agents may continue independent safe work, but must not infer authority. Security incidents follow the repository/operator incident path immediately and are not delayed for ordinary governance.

## 14. Review model

Reviews evaluate the diff and executable behavior against the packet, not general code aesthetics.

1. **Author review:** scope, edge cases, validation, policies, audit, tests, UI states, docs.
2. **Contract review:** affected steward confirms inputs, outputs, authority, vocabulary and version.
3. **Risk review:** Security/Data/Integration review where risk class requires it.
4. **Quality review:** traceability and evidence completeness.
5. **Integration review:** coordinator checks conflicts, consumer compatibility and milestone status.

Review findings use `UCRM-DEF-###` for product defects and reference file/line or scenario. A reviewer does not add unrelated implementation to the author's packet.

## 15. Agent definition of done

A packet may become `VERIFIED` only when all applicable statements are true:

- The contracted user outcome works end to end using authoritative or intentionally versioned test data.
- Acceptance criteria and negative/abuse cases are proven by linked tests.
- Server validation, authorization, tenant scope, audit and idempotency are enforced where relevant.
- Loading, empty, error, stale, forbidden, success and recovery experiences exist.
- Accessibility, responsiveness and performance budgets pass for the changed surface.
- Every user-facing slice has passed its required interactive UX checkpoint on a real route with server policy and safe fallback; mock-only evidence is insufficient.
- Migrations apply on fresh and representative upgrade data and have a proven recovery path.
- Observability identifies failures without logging secrets or unnecessary personal data.
- No visible action misrepresents its availability or authority.
- All applicable repository checks pass, or a pre-existing baseline exception is linked and proven unchanged.
- Diff contains only leased files and expected generated/migration artifacts.
- Documentation and status language distinguish planned, implemented, verified and released.
- Evidence ledger and handoff are complete; required independent reviewers approve.
- Feature enablement, rollout, monitoring and rollback ownership are named.

Passing tests alone does not satisfy done. Unverified implementation remains `IMPLEMENTED_UNVERIFIED` and cannot be used as a dependency that assumes released behavior.

## 16. Initial planned agent topology

This topology is `PLANNED`; it does not imply agents are currently running or capabilities are implemented.

```text
Program Coordinator
|-- Product + Workflow
|-- Architecture + Contracts
|-- UX + Accessibility
|-- Customer/Identity Domain
|-- Opportunity/Pipeline Domain
|-- Activity/Communication Domain
|-- Quote/Commercial Domain
|-- Dispatch/Job Integration
|-- Data + Migration
|-- Security + Privacy
|-- Quality + Evaluation
`-- Release + Operations
```

Parallel agents operate beneath this contract. The user is Product Owner and business escalation authority; the root agent coordinates integration; rotating independent Security, Quality, and Release agents are assigned per packet. Stewards control domain decisions, Quality controls evidence sufficiency, and Release controls enablement. No role may convert incomplete work into a completion claim by changing documentation alone.
