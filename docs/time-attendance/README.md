# Time & Attendance Program

**Console:** Time & Attendance  
**Primary workspace:** Time Cards  
**Route:** `/time-attendance`  
**Target:** Deployable Minnesota MVP with enterprise-safe foundations  
**Foundation baseline:** 2026-07-23  
**Implementation status:** Program documentation and executable policy foundation started; persistence, APIs, console UI, and production rollout are not yet implemented

## Purpose

Time & Attendance is a first-class console inside the Command Control Center. It captures attendance evidence, evaluates approved policies, routes exceptions, obtains employee and manager attestations, locks pay periods, and produces governed payroll handoffs.

It is not a payroll tax engine, benefits system, disciplinary-monitoring system, protected-leave case-management system, or replacement for qualified legal and payroll review.

## Day-one outcome

The MVP is usable when an approved Minnesota employee population can:

1. clock in and out;
2. record meal periods;
3. review and request correction of time;
4. request ordinary time off and Minnesota ESST without exposing unnecessary private details;
5. receive deterministic break and overtime exceptions;
6. attest to a completed card;
7. move through manager approval and pay-period lock;
8. produce a reproducible, acknowledged payroll export; and
9. reconstruct every material input, policy version, calculation, correction, approval, and export.

## Non-negotiable boundaries

- Raw time events are append-only. Corrections supersede; they do not erase.
- Attendance time and work allocation are separate facts that reconcile.
- The server owns calculations, transitions, permissions, and export readiness.
- Policies are organization-scoped, jurisdiction-aware, versioned, effective-dated, source-linked, and test-backed.
- Unsupported classification, jurisdiction, collective-bargaining, minor, prevailing-wage, or special-industry cases fail closed to `POLICY_REVIEW_REQUIRED`.
- The MVP records exact time. Payroll rounding is disabled until separately approved and validated.
- The application does not create a break that was not recorded or attested.
- Corrections after attestation reopen the card; corrections after lock use a controlled reopen command.
- A payroll export is a governed batch with idempotency, totals, content hash, acknowledgment, and reconciliation.
- Legal and payroll-owner approval is a production release gate.

## Foundation documents

| Document | Authority |
| --- | --- |
| [PRODUCT_AND_SCOPE.md](PRODUCT_AND_SCOPE.md) | Day-one users, product boundary, time-off ownership, MVP scope, and non-goals |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Bounded context, components, data ownership, enterprise transaction path, and integration boundaries |
| [LEGAL_POLICY_BASELINE.md](LEGAL_POLICY_BASELINE.md) | Official-source register, Minnesota/federal baseline, legal assumptions, and validation gates |
| [RULES_AND_ALGORITHMS.md](RULES_AND_ALGORITHMS.md) | Deterministic calculations, reason codes, invariants, and fail-closed behavior |
| [WORKFLOWS_AND_PERMISSIONS.md](WORKFLOWS_AND_PERMISSIONS.md) | Time card, correction, absence, approval, close, export, and recovery workflows |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Codex-sized milestones, dependencies, exit criteria, rollout, and deferred enterprise work |
| [TEST_RELEASE_AND_OPERATIONS.md](TEST_RELEASE_AND_OPERATIONS.md) | Golden cases, security/reliability verification, parallel payroll pilot, release gate, and operations |

## Source of truth order

When sources conflict, use this order:

1. Applicable law and regulation.
2. Approved legal interpretation recorded for the organization and employee profile.
3. Approved collective-bargaining agreement or more protective local requirement.
4. Approved company policy when it is lawful and at least as protective.
5. This program documentation.
6. UI copy or mockups.

The engine must not resolve a conflict by silently selecting the cheaper or less protective outcome.

## Initial release assumptions

The initial production cohort is intentionally narrow:

- Minnesota work location;
- `America/Chicago` location timezone;
- adult employees;
- hourly, non-exempt employees with recorded FLSA/MFLSA coverage;
- no union or collective-bargaining override;
- no prevailing-wage assignment;
- no minor-hours rule;
- no special public-safety, health-care, agricultural, interstate motor-carrier, or other unvalidated exemption;
- payroll remains the authority for rates, taxes, deductions, and final payment.

Employees outside the validated cohort may exist in the directory, but their cards cannot become payroll-ready until an approved policy profile exists.

## Program gates

| Gate | Required evidence |
| --- | --- |
| TA-G0 Foundation | Product boundary, architecture, sources, rules, workflows, permissions, roadmap, golden cases |
| TA-G1 Persistence | Additive migration, rollback plan, tenant/location constraints, immutable event and audit contracts |
| TA-G2 Calculation | Versioned policy resolution, deterministic calculations, replay, DST and overnight proof |
| TA-G3 Workflow | Capture, correction, attestation, manager review, lock/reopen, time-off, and exception workflows |
| TA-G4 Payroll | Export mapping, idempotency, acknowledgment, rejection, reconciliation, and controlled correction |
| TA-G5 Pilot | Representative parallel-payroll evidence, security review, training, restore proof, rollback drill |
| TA-G6 Production | Legal/payroll/product approval, monitored rollout, support ownership, first-live reconciliation |

## Current non-claims

This foundation does not yet claim:

- production time capture;
- a deployed database migration;
- complete coverage of every Minnesota or federal employment rule;
- legal advice or legal certification;
- payroll calculation or payment;
- protected-leave adjudication;
- manager or employee notifications;
- mobile offline capture;
- a live `/time-attendance` page.

