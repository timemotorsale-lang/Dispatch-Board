# UCRM-014 Customer 360 Checkpoint

**Date:** 2026-08-14

**Implementation baseline:** `0902382f`

**Branch:** `codex/unified-crm-customer-360`

**Status:** `IMPLEMENTED_UNVERIFIED`; Product Owner UCRM-UXR-1, permitted data-bearing browser review, and isolated-database proof remain pending

## Delivered boundary

- Read-only `/crm/customers/[customerId]` experience inside the approved Unified CRM console.
- Identity, owner, lifecycle status, next action, last interaction, masked phone/email, preferences, and honest source freshness are presented before secondary relationship context.
- Compact, source-owned vehicle and appointment summaries plus permission-filtered lead and concern-case lenses.
- No Customer, Lead, Case, Task, appointment, or vehicle mutation; no new schema, API, CRM truth table, note body, consent evidence, address, raw contact, export, or communication path.
- Missing, other-organization, out-of-owner-scope, merged, and archived records share one non-enumerating not-available outcome.
- CRM-list return state uses a dedicated allowlisted `crmReturnTo` parameter, avoiding collision with the shared application shell.
- Responsive semantic layout, reachable loading/restricted/unavailable/error states, keyboard-addressable source links, reduced motion, light/dark support, and 40–44px actions.

## Security and authority

- The deep route and service require the CRM shell and customer-read controls to both be in `REVIEW`; production defaults remain closed.
- Shell-off and workspace-denied paths do not call the detail service or serialize route, query, backend-reason, or customer data.
- Organization scope is derived from active `UserLocationAccess`; zero or multiple organizations fail closed.
- Management receives same-organization records. Sales and Sales Manager remain owner-only until a governed team model exists.
- Owner-scoped lead lenses require the actor to own the lead; concern-case lenses require assignment to the actor. Repository predicates and defensive service shaping both enforce this rule.
- Every organization-bearing nested relationship is independently constrained to the resolved organization.
- Task context is intentionally absent because the current Task model cannot prove organization authority.

## Automated evidence

- Independent affected verification passed 65 tests across access, policy, repository, service, adversarial, page, component, list, shell, and rollback boundaries.
- Focused ESLint and `git diff --check` passed.
- The full typecheck reaches only the documented pre-existing `src/app/api/service-close-parts/route.ts:20` union-property defect; no UCRM-014 type error was reported.
- An opt-in PostgreSQL isolation test exists with exact-ID fixtures and cleanup. It remains hermetically skipped because no isolated migrated test database was available.

## Interactive evidence

- The authenticated Advisor persona was denied at both `/crm?view=customers` and a direct `/crm/customers/[id]` URL.
- The denied detail path disclosed no route customer identifier or customer record data and returned the user to the independently permitted Advisor workspace.
- At 390×844 the denied state had no horizontal overflow and its recovery action measured 44px high.
- An authenticated Management or Sales data-bearing Customer 360 walkthrough is still required before UCRM-UXR-1 acceptance.

## Remaining gates

- Run the opt-in isolation test against an isolated, migrated PostgreSQL database.
- Complete Product Owner UCRM-UXR-1 review at desktop and mobile sizes using a permitted customer with representative relationships.
- Verify keyboard order, 200% reflow, dark mode, list-to-detail-to-list state restoration, source-link behavior, and explicit shell/read OFF rollback on the final commit.
- Do not mark UCRM-014 `VERIFIED`, merge, pilot, or enable production from this checkpoint.
