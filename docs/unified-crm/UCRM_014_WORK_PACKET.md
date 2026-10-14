# UCRM-014 Customer 360 Work Packet

**Date:** 2026-08-14

**Branch:** `codex/unified-crm-customer-360`

**Base:** stacked on `codex/unified-crm-customer-truth` at `1f7d78e0`

**Status:** IN PROGRESS — isolated implementation; not approved for merge, pilot, production, or writes

## Outcome

Deliver the first real, read-only Customer 360 overview at `/crm/customers/[customerId]`. A permitted user can move from the CRM customer list to one clear relationship overview, understand identity, owner, status, masked contact context, last/next action, and source-owned relationship signals, then continue safely in the authoritative Customers or owning source console.

## User journey

1. Open a permitted customer from `/crm?view=customers`.
2. Land on one overview with identity, owner, status, and next action first.
3. Review masked contact hints and concise relationship/source context without encountering edit controls or a tab maze.
4. Open a governed source record when deeper source-owned work is required.
5. Return to the CRM Customers list through a safe local return target or browser Back.

## Scope and non-goals

- Existing `Customer` and related owning-domain records remain authoritative.
- No CRM customer table, schema change, migration, command, audit mutation, create/edit control, merge behavior, communication, export, or duplicate-resolution workflow.
- Contact values remain masked on this slice. Sensitive reveal and controlled edit remain later milestones.
- Existing leads and cases are permission-filtered read-only lenses; UCRM-014 does not create a second lead or case lifecycle.
- No KPI wall, deep tab navigation, synthetic live-looking data, or frontend-only permission rule.

## Parallel work packets and leases

### UCRM-WP-014A — backend/security read boundary (Risk A)

Owner: Architecture/Security agent. Independent reviewer: Quality agent.

Leased paths:

- `src/server/unified-crm/customer-360-contract.ts`
- `src/server/policies/unified-crm-customer-360.ts`
- `src/server/repositories/unified-crm-customer-360-repository.ts`
- `src/server/services/unified-crm-customer-360-service.ts`
- matching focused backend tests

Required behavior: reuse server-derived organization membership and CRM customer capability; apply organization plus record scope in the repository query; make missing, other-organization, and out-of-scope records indistinguishable; mask list/detail contact DTOs; exclude raw notes, address, consent evidence, finance, retention, duplicate, and internal organization fields; expose honest source/freshness; fail closed when the read control is off or organization scope is absent/ambiguous.

### UCRM-WP-014B — Customer 360 experience (Risk B)

Owner: UX agent. Independent reviewer: Quality agent.

Leased paths:

- `src/app/(app)/crm/customers/[customerId]/page.tsx`
- `src/app/(app)/crm/customers/[customerId]/loading.tsx`
- `src/features/unified-crm/unified-crm-customer-360.tsx`
- `src/features/unified-crm/unified-crm-customer-360.module.css`
- minimal CRM customer-list source-link adjustment
- matching focused page/component tests

Required behavior: one simple overview; clear safe return; identity/owner/status/next action first; masked contacts; source/read freshness; concise relationship, lead, and case lenses; semantic responsive layout; loading, safe not-found, merged, archived, restricted, unavailable, and error states; no edit/New control or fake success.

### UCRM-WP-014Q — independent quality/security evidence

Owner: Quality agent. Test files only.

Required evidence: allow/deny role matrix, Sales owner scope, two-organization collision isolation, identical safe outcome for missing/other-org/out-of-scope identifiers, raw-field absence, nested relation constraints, archived/merged outcomes, read-off no serialization, route/component states, safe return navigation, semantic landmarks, desktop/mobile/keyboard browser plan, and affected list/shell/source-console regressions.

### UCRM-WP-014C — coordination/integration

Owner: `/root` coordinator.

Leased paths: this work packet, evidence/status documents, branch integration, cross-packet fixes that are explicitly reassigned, browser evidence, commits, and push.

## Traceability

- Requirements: UCRM-REQ-003, 004, 011, 014, 016, 018.
- Risks: UCRM-RISK-001, 002, 003, 005, 011, 015, 018, 019, 020.
- Parent milestones: UCRM-011–013.
- UX checkpoint: UCRM-UXR-1.

## Exit gate

UCRM-014 remains `IMPLEMENTED_UNVERIFIED` until automated checks, independent review, authenticated desktop/mobile browser proof, and Product Owner UCRM-UXR-1 disposition exist. A data-bearing permitted Customer 360 view is required for UX acceptance. The stacked branch stops before merge.
