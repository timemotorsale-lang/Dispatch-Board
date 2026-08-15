# UCRM-021 Manual Contact Outcome Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `aa4a62a9+working`

**Branch:** `codex/unified-crm-console`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL proof remain pending

## Delivered boundary

- Customer 360 now contains a hardened manual contact outcome command path through the existing interaction form and `/api/crm/v1/customers/[customerId]/interactions` route.
- The slice records manual relationship touchpoints only. It does not send email, text, or any external message.
- Supported contact dimensions remain bounded to the current approved command shape:
  - channel,
  - direction,
  - canonical-consent evaluation,
  - summary,
  - optional outcome,
  - optional next step,
  - occurred time,
  - optional next-action time,
  - idempotency key.

## Security and authority

- Blank and oversized customer IDs now fail closed as `INVALID_INTERACTION_COMMAND`.
- Exact customer authorization is now resolved before idempotency replay is checked.
- Outbound `PHONE`, `TEXT`, and `EMAIL` outcomes now require positive canonical consent from the customer’s authoritative contact-point data; the client-provided consent claim is no longer sufficient by itself.
- Replay is bound to the same authorized customer subject and fails closed if a key belongs to another customer.
- Unknown backend failures are masked by the route, while typed interaction errors retain their approved status mappings.

## Quality and correctness improvements

- Duplicate replay remains supported, but its snapshot is now defensively validated before reuse.
- Route validation errors now map to HTTP 400 rather than being treated like unknown 500 failures.
- The UI now uses clearer non-sending language, better disclosure semantics, disabled form state during submit, and distinct success/error status roles.

## Automated evidence

- Focused integrated verification passed:
  - `src/tests/unit/unified-crm-customer-interaction-service.test.ts`
  - `src/tests/unit/unified-crm-customer-interaction-repository.test.ts`
  - `src/tests/unit/unified-crm-customer-interaction-route.test.ts`
  - `src/tests/unit/unified-crm-customer-interaction-form.test.tsx`
- Result: 4 files, 18 tests passed on the working baseline.
- Focused ESLint passed on the changed TypeScript and TSX files.

## Remaining gates

- Authenticated browser proof is still required for keyboard/mobile review of the manual contact outcome flow.
- Isolated PostgreSQL proof is still required before this slice can be promoted beyond `IMPLEMENTED_UNVERIFIED`.
- UCRM-021 is not yet `VERIFIED`, merged, piloted, or production-enabled from this checkpoint.
