# Unified CRM Foundation Traceability Matrix

**Document ID:** `UCRM-TRACE-001`
**Version:** 1.1 accepted foundation baseline
**Status:** `UCRM-009` accepted traceability gate; implementation evidence remains empty until verified work lands
**Date:** 2026-08-14

## 1. Purpose

This matrix prevents requirements from disappearing between product discussion, architecture, agent work, tests, security review, and release. Requirement IDs remain stable. Later work adds work-packet and evidence IDs without rewriting the original requirement.

## 2. Requirement-to-delivery traceability

| Requirement | Required outcome | Governing source | Primary milestones | Planned proof | Key risks |
| --- | --- | --- | --- | --- | --- |
| `UCRM-REQ-001` | Independent `/crm` console inside the shared Dispatch Board platform | Charter §§1–3; Architecture | UCRM-000, 003, 010 | Route/auth/flag/fallback tests; browser entry; no second auth/database | RSK-001, 018 |
| `UCRM-REQ-002` | Role-aware, simple, action-first daily experience | Charter §§4–6 | UCRM-010, 025, 052, 063, 068 | UCRM-TST-001/008; usability timing; keyboard/mobile proof | RSK-005, 011 |
| `UCRM-REQ-003` | One trusted customer identity and permission-filtered Customer 360 | Charter §7.1–2; Architecture | UCRM-001–002, 012–016, 020, 038 | Direct policy tests, reconciliation, UCRM-TST-001, browser role matrix | RSK-001–003 |
| `UCRM-REQ-004` | Contacts, preferences, consent, and safe communication history | Charter §7.1, §7.5; Security | UCRM-015, 020–023, 061 | Consent allow/deny tests; masking; timeline/audit refresh proof | RSK-003, 015, 016 |
| `UCRM-REQ-005` | Governed leads/opportunities and visual pipeline | Charter §7.3–4; Architecture | UCRM-030–035, 038–039 | UCRM-TST-002; lifecycle/policy/concurrency/reconciliation tests | RSK-006, 009 |
| `UCRM-REQ-006` | Customer activity, notes, tasks, promises, and next actions | Charter §7.2, §7.5–6 | UCRM-020–025, 035 | Outcome-to-refresh E2E; idempotency; visibility; overdue rules | RSK-009, 015 |
| `UCRM-REQ-007` | Native links to Tasks, Appointments, vehicles, repairs/jobs, and Dispatch | Charter §7.6; Architecture authority map | UCRM-024, 036–039 | UCRM-TST-003; contract/retry/reconciliation/cross-console proof | RSK-001, 009 |
| `UCRM-REQ-008` | Versioned quotes and controlled commercial approvals | Charter §7.7; Architecture | UCRM-040–045 | UCRM-TST-004; calculation, immutability, approval and field-mask tests | RSK-007, 015 |
| `UCRM-REQ-009` | Permission-filtered global CRM search | Charter §6 | UCRM-050–051, 061, 064 | Search relevance/latency; restricted-existence and cross-org tests | RSK-003, 019 |
| `UCRM-REQ-010` | Actionable dashboards, forecast separation, and drill-through | Charter §7.8, §9 | UCRM-052–056 | UCRM-TST-005; formula/reconciliation/freshness/override history | RSK-012, 019 |
| `UCRM-REQ-011` | Server-enforced least privilege, field protection, and audit | Charter §7.9; Security | UCRM-004, 011, every mutation, 061 | UCRM-TST-006; permission matrix; adversarial and audit tests | RSK-003, 015, 016 |
| `UCRM-REQ-012` | Reliable, idempotent, observable, and recoverable workflows | Architecture; Testing | Every mutation; UCRM-060, 062, 064–067 | Failure injection, concurrency, backup/restore, rollback rehearsal | RSK-008–010, 013 |
| `UCRM-REQ-013` | Safe imports/migrations, deduplication, provenance, and reconciliation | Charter §7.10; Data rules | UCRM-016–017, 060 | Preview/commit/rollback tests; checksums/counts; duplicate cases | RSK-001, 008 |
| `UCRM-REQ-014` | Responsive, keyboard-operable WCAG 2.2 AA target | Charter §5.6–7; Testing | Each UI slice; UCRM-063 | Automated plus manual accessibility/browser matrix; UCRM-TST-008 | RSK-011 |
| `UCRM-REQ-015` | AI remains optional, grounded, permission-safe, evaluated, and controlled | Charter §5.5, §8; Architecture/Security/Testing | UCRM-106 | AI evaluation suite, source citations, prompt-injection tests, kill switch | RSK-017 |
| `UCRM-REQ-016` | Feature-flagged rollout with Customers/Sales fallback and evidence-preserving rollback | Charter §11; Roadmap | UCRM-008, 067, 069–074 | UCRM-TST-009; flag/rollback rehearsal; post-release verification | RSK-018 |
| `UCRM-REQ-017` | Many agents collaborate without contract, file, status, or evidence drift | Agent Operating Model | UCRM-007, 009 and every packet | Lease registry, handoffs, independent reviews, evidence ledger, drift audit | RSK-004, 020 |
| `UCRM-REQ-018` | User-facing slices are reviewed interactively on real routes with policy, durable behavior, and safe fallback before milestone acceptance | Charter §9–10; Agent Operating Model; Testing | Every user-facing packet and milestone | Product Owner UX checkpoint record; route/policy/fallback proof; representative journey timing and disposition | RSK-005, 011, 018, 020 |

## 3. Initial critical journey coverage

| Test ID | Journey | Requirements | First eligible milestone | Evidence ID |
| --- | --- | --- | --- | --- |
| `UCRM-TST-001` | Open CRM, find customer, understand Customer 360 | REQ-001–004 | UCRM-014 | Not yet created |
| `UCRM-TST-002` | Create and govern opportunity through pipeline | REQ-005–006, 011–012 | UCRM-039 | Not yet created |
| `UCRM-TST-003` | Create linked task/appointment/dispatch work | REQ-006–007, 012 | UCRM-039 | Not yet created |
| `UCRM-TST-004` | Draft, version, present, and approve/deny quote | REQ-008, 011–012 | UCRM-045 | Not yet created |
| `UCRM-TST-005` | Manager reviews reconciled dashboard and drills to records | REQ-010–012 | UCRM-056 | Not yet created |
| `UCRM-TST-006` | Excluded and cross-organization actors fail safely | REQ-003–004, 009, 011 | UCRM-061 | Not yet created |
| `UCRM-TST-007` | Provider timeout/replay does not duplicate a side effect | REQ-004, 012 | UCRM-081 or later | Not yet created |
| `UCRM-TST-008` | Keyboard/mobile user completes the daily work loop | REQ-002, 014 | UCRM-063 | Not yet created |
| `UCRM-TST-009` | Disable CRM writes and fall back without evidence loss | REQ-012, 016 | UCRM-067 | Not yet created |

Each user-facing test journey also supplies the interactive evidence required by `UCRM-REQ-018`; a mock, screenshot, component-only render, or local-state-only prototype cannot populate its evidence field.

## 4. Evidence completion rules

For a requirement to be `VERIFIED`:

- all linked required milestones must be verified or explicitly not applicable with accepted reasoning;
- each planned proof must have one or more `UCRM-EVD-###` records tied to an exact commit and environment;
- allow and deny paths must be represented where authority applies;
- UI proof cannot substitute for server, transaction, migration, security, or reconciliation proof;
- an aggregate metric must reproduce from its drill-through records;
- known limitations and deferred portions remain explicit;
- evidence is rerun when a contract, schema, permission, or material implementation changes.

## 5. Foundation completion ledger

| Foundation item | Required document/evidence | Current state |
| --- | --- | --- |
| UCRM-000 Product boundary | Product charter and approval record | `CONTRACTED`; Product Owner approval recorded |
| UCRM-001 Current state/source ownership | Evidence baseline plus fresh capability census | `CONTRACTED`; baseline and authority map accepted; fresh census required before source-adapter work |
| UCRM-002 Domain/data contract | Architecture canonical model and accepted lifecycle decisions | `CONTRACTED`; accepted contract, no implementation claim |
| UCRM-003 Application architecture | Architecture document and ADR acceptance | `CONTRACTED`; ADR-001–020 accepted, no runtime claim |
| UCRM-004 Security/privacy | Security document, threat model, owners, open decisions | `CONTRACTED`; approved policy defaults, no implemented-control claim |
| UCRM-005 Testing/evidence | Testing strategy and baseline defect registry | `CONTRACTED`; known baseline defect blocks clean RC, not reversible groundwork |
| UCRM-006 SLO/success criteria | Approved values and owners | `CONTRACTED`; UX, pilot completion, opportunity completeness, integrity, availability, RTO/RPO and performance targets recorded |
| UCRM-007 Agent execution | Agent operating model and coordinator/lease registry | `CONTRACTED`; user is Product Owner/business escalation, `/root` coordinates, independent Security/Quality/Release agents rotate per packet |
| UCRM-008 Feature/rollback | Architecture/roadmap contract and authority | `CONTRACTED`; authority and triggers accepted, implementation and rehearsal pending |
| UCRM-009 Traceability gate | This matrix, decision register, risk register, index | `CONTRACTED`; future implementation evidence remains empty until verified work lands |
