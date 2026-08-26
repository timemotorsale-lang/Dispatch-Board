# UCRM-061 Security Verification Evidence

## Scope

UCRM-061 adds a manager-only security verification gate for Unified CRM.

## Implementation

- Added a security verification service and API at `/api/crm/v1/security-verification`.
- Records pass evidence for organization isolation, RBAC/capabilities, field masking, IDOR controls, and input safety.
- Records explicit named holds for CSRF/session review, export controls, log/secret review, dependency scan, and abuse/rate-limit proof.
- Keeps the gate honest by returning `HELD` while any named hold remains.

## Controls

- Non-management CRM workspaces are denied.
- Holds must include an owner.
- The gate does not imply release approval while held checks remain.

## Verification

- `npx vitest run src/tests/unit/unified-crm-security-verification-service.test.ts src/tests/unit/unified-crm-security-verification-route.test.ts` passed 4 tests.
- `npx eslint ... --max-warnings=0` passed for the security verification contract, service, route, and tests.
- `npx tsc --noEmit` filtered to source/test paths produced only the existing unrelated baseline errors in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- Named holds require release-candidate security tooling or manual security review evidence before UCRM-069 go/no-go.
