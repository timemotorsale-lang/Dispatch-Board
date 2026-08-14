# UCRM-012/013 Customer Truth Work Packet

**Date:** 2026-08-14  
**Branch:** `codex/unified-crm-customer-truth`  
**Status:** IN PROGRESS — isolated implementation; not approved for merge, pilot, production, or writes

## Outcome

Deliver the first real-data Unified CRM experience: an organization-scoped, permission-filtered, read-only customer list inside `/crm?view=customers`. `Customer` and `CustomerContactPoint` remain authoritative in the existing Customers domain. The existing `/customers` console remains available as fallback and is not changed or retired.

## Accepted UX defaults

- Show active, unmerged, unarchived customers by default.
- Mask contact data on every list row, including for managers.
- Order actionable/recent records first, with a stable identifier tie-breaker.
- Open the governed existing customer record in the same tab.
- Use explicit submit for search; filters and pagination remain URL-addressable.

## Work packets and leases

### UCRM-WP-012 — authoritative read boundary (Risk A)

Owner: Architecture/Security agent. Independent reviewer: Quality agent.

Leased paths:

- `src/server/unified-crm/customer-read-contract.ts`
- `src/server/repositories/unified-crm-customer-read-repository.ts`
- `src/server/policies/unified-crm-customer-read.ts`
- `src/server/validation/unified-crm-customer-read.ts`
- `src/server/services/unified-crm-customer-read-service.ts`
- matching focused server tests

Required behavior: derive organization scope from current server-side user grants; apply organization and role/owner scope in the repository query; exclude merged and archived records; never accept client organization authority; return only masked contact DTOs; fail closed for no or ambiguous organization scope; expose source and freshness metadata.

### UCRM-WP-013 — customer list experience (Risk B)

Owner: UX agent. Independent reviewer: Quality agent.

Leased paths:

- `src/features/unified-crm/unified-crm-customer-list.tsx`
- `src/features/unified-crm/unified-crm-customer-list.module.css`
- `src/app/(app)/crm/page.tsx`
- `src/features/unified-crm/unified-crm-shell.tsx`
- `src/features/unified-crm/unified-crm-shell.module.css` only if integration requires it
- matching focused component/page tests

Required behavior: real Customers view only; one search experience; status and owner filters; result count and source freshness; accessible desktop table and mobile cards; loading, empty, filtered-empty, stale, restricted, unavailable, and error states; retry and existing Customers fallback; no writes, bulk actions, fake success, or Customer 360 claim.

### UCRM-WP-012Q — independent evidence review

Owner: Quality agent. No implementation-file edits while reviewing.

Required evidence: capability denial, missing/inactive/ambiguous organization denial, two-organization collision isolation, owner scope, masked payload, query validation, pagination stability, all list states, keyboard semantics, responsive behavior, explicit flag-off fallback, focused regression tests, lint, diff check, and documented pre-existing full-typecheck baseline.

## Contract boundary

- Requirement IDs: UCRM-REQ-003, UCRM-REQ-011, UCRM-REQ-014, UCRM-REQ-016, UCRM-REQ-018.
- Risk IDs: UCRM-RISK-001, 002, 003, 005, 011, 018, 019, 020.
- No schema or migration changes.
- No customer/contact writes, audit mutations, exports, raw contact response fields, or external communication.
- Production read control fails closed independently of the shell.
- UCRM-014 Customer 360 remains a later slice.

## Exit gate

This packet may be marked implementation-complete only after an independent review and automated evidence pass. UCRM-013 and UCRM-UXR-1 remain unverified until the Product Owner reviews the live browser experience. The branch must stop before merge.
