# UCRM-012/013 Customer Truth Checkpoint

**Date:** 2026-08-14

**Implementation baseline:** `04bce384`

**Branch:** `codex/unified-crm-customer-truth`

**Status:** UCRM-012 and UCRM-013 `IMPLEMENTED_UNVERIFIED`; isolated PostgreSQL proof is complete, while UCRM-UXR-1 Product Owner disposition and final browser acceptance remain pending

## Delivered boundary

- Real, read-only `/crm?view=customers` experience inside the approved Unified CRM shell.
- Canonical reads from the existing `Customer` and `CustomerContactPoint` tables; no CRM customer table, schema change, migration, or write path.
- Server-derived organization scope from active `UserLocationAccess` grants. Zero or multiple organizations fail closed until a governed organization selector exists.
- Management organization scope and Sales/Sales Manager owner-only scope. The Sales UI omits impossible owner choices and server code clamps the request to `mine`.
- Unconditional list masking for phone and email, including managers; raw contact values, organization IDs, internal merge keys, addresses, consent evidence, and other sensitive fields do not enter the read model.
- Active-by-default search by name/customer number, status and owner filters, stable cursor pagination, source/read freshness, loading, empty, filtered-empty, restricted, unavailable, error, and recovery presentations.
- Semantic desktop table and mobile cards, same-tab links to the existing Customers record, and an unchanged `/customers` fallback.
- Independent customer-read control `UNIFIED_CRM_CUSTOMER_READ_MODE=OFF|REVIEW`; production defaults off independently of the shell.

## Automated evidence

- 123 focused and affected tests passed across customer validation, policy, repository predicates, service shaping/masking, page access, component states, shell access, navigation, rollback, existing Customer reads, service intake, and CRM rollout.
- 2026-08-26 refresh: opt-in PostgreSQL isolation proof passed against the migrated local PostgreSQL database. The test creates two exact-ID organizations with colliding customer identity/contact values, proves organization and owner scoping, proves raw contact values stay out of the read model, and performs exact-ID cleanup.
- 2026-08-26 refresh command: `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-customer-isolation.test.ts src/tests/integration/unified-crm-customer-360-isolation.test.ts` completed with 2 files and 2 tests passing.
- Independent Quality review added seven adversarial tests for two-organization query isolation through a fake Prisma boundary, cursor scoping, every Sales owner-filter intersection, raw-field absence, shell-off no-serialization, loading semantics, list states, and semantic landmarks.
- Focused ESLint passed with zero warnings.
- Prisma schema validation passed.
- `git diff --check` passed after documentation whitespace cleanup.
- Full typecheck reaches only the documented pre-existing `src/app/api/service-close-parts/route.ts:20` union-property error; no new CRM type error was reported.

## Interactive browser evidence

- Authenticated Sales user opened the real customer route with both review controls enabled.
- Desktop 1440×900 and mobile 390×844 rendered without horizontal overflow.
- Mobile retained one-column search/status execution, source/freshness, fallback, and 44px-oriented actions.
- Keyboard-addressable search was submitted and produced URL state `view=customers&q=...&status=active&owner=mine` with the correct filtered-empty recovery.
- Sales did not receive organization-wide or unassigned owner controls.
- Browser console inspection returned no warnings or errors during the checkpoint.
- The available Sales account had no owned active customer records, so the real empty and filtered-empty states were exercised; a data-bearing row/card walkthrough remains pending.

## Security and rollback disposition

- No tested cross-organization query, raw-contact serialization, shell-off serialization, owner-scope, or pagination defect was found.
- Both the shell and customer-read control fail closed in production by default. Turning off the customer read returns an honest unavailable experience while `/customers` remains available.
- The slice adds no command, customer mutation, audit mutation, communication, export, import, or destructive rollback requirement.
- Team-wide Sales Manager behavior remains deferred because no accepted team-membership authority exists; owner-only is intentionally safer and must not be described as team scope.

## Remaining gates

- Complete Product Owner UCRM-UXR-1 review, including a data-bearing permitted list at desktop/mobile and requested refinements.
- Capture a denied persona and explicit customer-read-OFF browser walkthrough on the final commit baseline.
- Do not mark UCRM-012 or UCRM-013 `VERIFIED` until the named Product Owner and final browser evidence is complete.
- Do not merge, pilot, or enable production from this checkpoint without Product Owner review.
