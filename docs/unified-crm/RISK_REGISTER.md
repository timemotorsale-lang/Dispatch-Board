# Unified CRM Risk Register

**Document ID:** `UCRM-RISK-001`
**Version:** 1.0 planning baseline
**Status:** Open risks require owners and treatment before their dependent gate
**Date:** 2026-08-14

## Rating

- **Impact:** 1 negligible, 2 limited, 3 material, 4 serious, 5 critical.
- **Likelihood:** 1 rare, 2 unlikely, 3 possible, 4 likely, 5 expected.
- **Exposure:** impact multiplied by likelihood. Exposure 15–25 is High, 8–14 Medium, and 1–7 Low.

Ratings prioritize attention; they do not waive a blocking security, privacy, authority, or data-integrity gate.

## Active program risks

| ID | Risk | Impact | Likelihood | Exposure | Primary treatment | Accountable role | Trigger / evidence | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `UCRM-RSK-001` | CRM creates duplicate customer, task, appointment, vehicle, job, or activity truth | 5 | 4 | 20 High | Approved authority map, native bridges, contract tests, reconciliation | Data + Architecture | Competing status/identifier or irreconcilable count | UCRM-001–003, UCRM-039 |
| `UCRM-RSK-002` | Sample/prototype data appears as live operational information | 5 | 4 | 20 High | Capability census, fixture labeling, live-source assertions, UI source badges | Product + Quality | Production route imports sample/local arrays | UCRM-001, UCRM-010–019 |
| `UCRM-RSK-003` | Record/field/organization authorization leaks sensitive data | 5 | 3 | 15 High | Server capability policy, query scoping, masking, adversarial matrix | Security | Cross-org/role result, count, export, log, or autocomplete leak | UCRM-004, UCRM-011, UCRM-061 |
| `UCRM-RSK-004` | Parallel agents change shared contracts or files incompatibly | 4 | 4 | 16 High | Work packets, file leases, contract versions, coordinator-owned shared files | Program Coordinator | Overlapping edits, renamed enum, conflicting migration | UCRM-007 and every packet gate |
| `UCRM-RSK-005` | UI breadth outpaces operational backend again | 4 | 4 | 16 High | Vertical-slice definition of done; no frontend-only milestone closure | Architecture + Quality | Visible action without command/policy/audit evidence | Every implementation milestone |
| `UCRM-RSK-006` | Opportunity lifecycle becomes inconsistent or easy to game | 4 | 3 | 12 Medium | Evidence-based stages, explicit commands, history, required owner/next action | Opportunity Domain | Stage changes without evidence/history; active record lacks next action | UCRM-030–039 |
| `UCRM-RSK-007` | Quote or approval behavior exceeds commercial authority | 5 | 3 | 15 High | Price-source boundaries, immutable presented versions, approval policies | Product + Security | Unauthorized discount/presentation or historical rewrite | UCRM-040–045 |
| `UCRM-RSK-008` | Migration/import corrupts identity or relationships | 5 | 3 | 15 High | Preview, validation, bounded batches, provenance, reconciliation, restore rehearsal | Data + Release | Count/checksum mismatch, orphan, duplicate, wrong link | UCRM-017, UCRM-060 |
| `UCRM-RSK-009` | Retries or concurrency create duplicate actions/evidence | 4 | 3 | 12 Medium | Idempotency, optimistic concurrency, outbox, conflict responses, fault tests | Architecture + Quality | Duplicate task/quote/event or lost update | Each state-changing slice; UCRM-062 |
| `UCRM-RSK-010` | External connector failure becomes silent or destructive | 5 | 3 | 15 High | Deferred core dependency, provenance, health, retry/replay, reconciliation, kill switch | Integration | Silent sync lag, overwrite, duplicate delivery | UCRM-080–086 |
| `UCRM-RSK-011` | CRM becomes too dense and users avoid maintaining it | 4 | 4 | 16 High | Role Home, progressive disclosure, automatic capture, usability measures | Product + UX | High abandonment, slow core task, stale next actions | UCRM-010, UCRM-025, UCRM-063, pilot |
| `UCRM-RSK-012` | Metrics or recommendations are untraceable or misused | 4 | 3 | 12 Medium | Defined formulas, source/freshness, drill-through, no opaque discipline scores | Product + Quality | Dashboard cannot reproduce total or explain queue membership | UCRM-052–056 |
| `UCRM-RSK-013` | Existing red repository baseline hides CRM regressions | 4 | 3 | 12 Medium | Named baseline defect, before/after evidence, no unexplained regression, clean RC gate | Quality | Failure signature/count changes or new failure is called pre-existing | UCRM-005, UCRM-065 |
| `UCRM-RSK-014` | Scope expansion destroys the 8–10 week delivery path | 4 | 4 | 16 High | Locked internal MVP, decision register, deferred adapter and enterprise milestones | Product + Coordinator | External provider/custom builder added without approved change | Roadmap and packet entry gates |
| `UCRM-RSK-015` | Audit/activity evidence is incomplete, overexposed, or conflated | 4 | 3 | 12 Medium | Separate operational activity, immutable audit, safe metadata, correlation | Security + Architecture | Sensitive payload in feed/log or command lacks actor/reason/history | UCRM-003–004 and every command |
| `UCRM-RSK-016` | Retention, deletion, export, or consent obligations are undefined | 5 | 3 | 15 High | Data classification, policy owners, export audit, retention/hold workflow | Privacy/Security | Pilot uses real data before policy decisions | UCRM-004, UCRM-061; UCRM-DEC-005/007 |
| `UCRM-RSK-017` | Optional AI exposes data or performs unsupported actions | 5 | 3 | 15 High | Defer activation; permission-aware retrieval, citations, evaluations, confirmation, kill switch | AI + Security | Uncited claim, field leak, autonomous consequential action | UCRM-106 |
| `UCRM-RSK-018` | Route migration removes working Customers/Sales fallback too early | 4 | 3 | 12 Medium | Parallel availability, feature flags, parity matrix, rollback rehearsal | Product + Release | Navigation cutover before pilot/parity proof | UCRM-067, UCRM-073/074 |
| `UCRM-RSK-019` | Performance degrades under long timelines, search, or dashboard reads | 3 | 4 | 12 Medium | Pagination, purpose-built projections, query budgets, representative scale tests | Architecture + Quality | Budget breach, N+1, projection lag, unusable mobile load | UCRM-050–056, UCRM-064 |
| `UCRM-RSK-020` | Documentation and implementation status drift | 3 | 4 | 12 Medium | Same-slice docs update, evidence ledger, milestone status owner, drift review | Coordinator + Quality | Planned behavior described as implemented or stale owner/status | Every packet/milestone gate |

## Risk handling rules

1. High exposure does not automatically stop unrelated safe work, but the dependent milestone cannot pass without treatment or explicit authority.
2. Security/privacy Severity 0 or 1 conditions follow the stricter testing and incident rules regardless of numeric exposure.
3. New risks receive a stable unused ID; existing risks are not renumbered.
4. Closing a risk requires evidence, date, owner, and residual-risk statement. Deleting the row is prohibited.
5. An accepted residual risk must identify enabled cohort, mitigation, expiry/review date, and rollback trigger.
6. Agents encountering an unowned high risk must notify the coordinator and stop the affected irreversible or consequential work.

## Risk review cadence

- foundation gate;
- before assigning a Risk Class A work packet;
- at each milestone integration gate;
- before pilot enablement;
- during pilot defect review;
- at release-candidate and production-enablement gates;
- after a material incident, architecture decision, provider change, or scope change.
