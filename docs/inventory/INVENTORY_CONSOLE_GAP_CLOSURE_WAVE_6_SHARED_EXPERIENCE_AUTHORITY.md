# Inventory Console Gap Closure Wave 6: Shared Experience and Authority

**Branch:** `codex/inventory-console-gap-closure-wave-6-shared-experience-authority`  
**Slices:** IC-002, IC-014, IC-022, IC-024, IC-026, IC-027, IC-106  
**Repository disposition:** COMPLETE  
**Activation:** Repository only; no provider, deployment, pilot, or production activation

## Outcome

Wave 6 closes seven repository acceptance gaps without introducing a parallel inventory authority. The shared Console experience now derives workflow choices from the signed-in role and record context, builds deterministic priority queues, preserves safe return context across discovery and decisions, and exposes bounded authority administration. Existing evidence, enterprise-command, domain-approval, audit, event, and outbox services remain authoritative.

## Slice results

| Slice | Verified repository behavior |
| --- | --- |
| IC-002 | A fail-closed traceability catalog covers all 11 visible launcher workflows and the seven shared experience/authority actions. Each entry identifies its surface, authoritative record, command/query, permission, work effect, domain event, projection, and integration effect. Duplicate, missing, or incomplete mappings block conformance. |
| IC-014 | The existing evidence service is verified end to end for checksum/integrity, built-in signature scanning, fail-closed quarantine, clean-only download, restricted-access capability enforcement, access events, retention/legal hold, correction lineage, and immutable evidence linkage. |
| IC-022 | Permission-filtered discovery spans vehicle, customer, repair order, job, appointment, Part, purchase order, document, and governed work-item identifiers. Server-normalized internal return context is preserved on every result; external and protocol-relative redirects are rejected. |
| IC-024 | The Workflow Launcher is a server-derived catalog of 11 purpose-built flows. Role and context determine visibility and availability. Every choice publishes its intake, validation, confirmation, approval, created-record/task/event, and recovery contract; exact-version approvals require subject context. |
| IC-026 | Home Priority Work is deduplicated by authoritative InventoryUnit and classified into hard `P0 BLOCKED`, `P1 OVERDUE`, and `P2 WAITING` tiers. My Work and Team ownership, saved-view filtering, due/escalation facts, reason codes, next actions, and contextual routing are explicit. |
| IC-027 | Review and approval queue links now carry decision ID, expected aggregate version, policy version when applicable, and global-queue return context. The owning domain retains command authorization, material-change invalidation, and separation-of-duties enforcement. |
| IC-106 | General Managers can create or revise versioned capability grants with allow/deny effect, location and validity scope, single and cumulative amount limits, field allowlists, own-resource limits, and independent-approval requirements. Commands are idempotent, version checked, audited, evented, and outboxed. |

## Authority and safety boundaries

- The launcher never performs a generic state change. It routes to the owning purpose-built workflow.
- Queue presence never grants decision authority. The owning server command still authorizes the actor and version.
- Authority changes require General Manager access, an exact authority aggregate version, an active user, a valid organization location when scoped, a reason, and an idempotency key.
- Cumulative limits address transaction splitting; field allowlists address delegated visibility/mutation scope; independent approval prevents the same actor from satisfying both sides of a governed decision.
- Return context accepts only bounded internal application paths.
- Evidence marked detected, failed, pending, or quarantined cannot be downloaded as clean evidence.
- No live provider acknowledgement, migration deployment, policy activation, pilot result, or production readiness is inferred.

## Implementation surfaces

- `src/server/inventory-workflow-launcher/service.ts`
- `src/server/inventory-console-home/priority-work.ts`
- `src/server/inventory-console-wave6/traceability.ts`
- `src/server/inventory-governance/authority-domain.ts`
- `src/server/inventory-governance/authority-repository.ts`
- `src/server/inventory-governance/authority-service.ts`
- `src/server/vehicle-discovery/domain.ts`
- `src/server/vehicle-discovery/service.ts`
- `src/server/enterprise-command/vehicle-capabilities.ts`
- `src/app/api/admin/authority/route.ts`
- `src/features/inventory/authority-administration-panel.tsx`
- `src/tests/unit/inventory-console-gap-closure-wave-6.test.tsx`

## Conformance movement

The authoritative 121-slice audit moves from 62 repository-complete / 38 partial to 69 repository-complete / 31 partial. The 17 external-evidence-required and four decision-blocked counts are unchanged. Repository completion does not satisfy deployment, provider, accessibility, performance, recovery, pilot, or release gates.

The next dependency-ordered repository branch is `codex/inventory-console-gap-closure-wave-7-lifecycle-automation-recovery`.

## Verification gate

- Wave 6 focused tests cover launcher visibility/contracts, priority tiers/deduplication, safe return context, evidence quarantine/access, delegated authority limits, contextual decision routing, and exhaustive traceability.
- The 121-slice audit must reconcile to 69 complete, 31 partial, 17 external-evidence-required, and four decision-blocked slices.
- Typecheck, lint, Prisma validation, full tests, and production build must pass before handoff.
