# Task: Implement v0.2.0 — Identity, Roles, and Permissions

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEFAULT_PROMPT.md`, and relevant existing source files first.

## Goal

Implement **v0.2.0 — Identity, roles, and permissions** for the Time Motor Sales Dispatch Board.

This milestone should create the foundation that all later workflows depend on:

* User modeling
* Session/auth persistence
* Login/logout
* Login UI
* Protected routes
* Role modeling
* Duty modeling
* User-role assignments
* User-duty assignments
* Server-side permission helpers
* Auth and permission tests

This work corresponds to roadmap items **DB-008 through DB-015**.

## Current behavior

The project foundation should already exist from v0.1.0:

* Next.js + TypeScript app scaffold
* Prisma/PostgreSQL baseline
* Repository structure
* App shell / protected-app placeholder
* Basic lint, typecheck, and test setup
* Setup docs

There is not yet a complete identity, role, duty, or permission system.

If the v0.1.0 foundation is missing or incomplete, stop and report what prerequisite is missing before implementing v0.2.0.

## Desired behavior

After this milestone:

1. Seeded users can log in and log out.
2. Private app routes are protected from unauthenticated access.
3. Users have one or more roles.
4. Users can have direct duties.
5. Roles can have default duties, or an equivalent structure that supports role-based default duties later.
6. Day-one roles exist in seed data:

   * General Manager
   * Inventory Manager
   * Mechanic
   * Salesperson
   * Office Manager
   * Marketing/Advertisement Manager
   * Collections
7. Server-side policy helpers exist for manager-only and staff self-service actions.
8. Permission rules are reusable by later APIs and services.
9. Tests cover login basics, route protection, and core manager/staff permission behavior.

## Implementation scope

Implement the following roadmap items:

### DB-008 — Add user and session schema

Create or update Prisma models for:

* `User`
* `Session`, or the equivalent session persistence required by the chosen auth approach
* `Role`
* `Duty`
* `UserRole`
* `UserDuty`
* Role default duty assignment, such as `RoleDuty`, if needed to support role-based default duties cleanly

User fields should include at minimum:

* `id`
* `name`
* `email`
* `passwordHash` or auth-provider equivalent
* `isActive`
* `createdAt`
* `updatedAt`

Use a unique constraint for active user emails if practical within the current Prisma/database setup.

Do not store plain-text passwords.

Prefer existing project dependencies. If password hashing requires a new dependency, explain why. If practical, use Node built-in crypto utilities instead of adding a new package.

### DB-009 — Implement login and logout endpoints

Add login/logout behavior using the existing project architecture.

Preferred API surface, unless the current app structure clearly favors server actions:

* `POST /api/auth/login`
* `POST /api/auth/logout`
* `GET /api/auth/me`

Requirements:

* Login verifies email and password.
* Login rejects inactive users.
* Login creates a secure server-side session or equivalent.
* Logout clears the session.
* `me` returns the authenticated user with role/duty summary, excluding sensitive fields.
* Auth errors should be clear but should not leak whether the email or password was specifically wrong.

Use secure cookie settings appropriate for local development and production:

* HTTP-only
* SameSite protection
* Secure in production
* Reasonable expiration

### DB-010 — Build login page and auth form flow

Create the login page and form flow.

Requirements:

* Users can enter email and password.
* Successful login redirects into the authenticated app area.
* Failed login shows a clear user-facing error.
* Loading/submitting state is visible.
* The form should be simple, responsive, and consistent with the existing app shell.
* Do not over-polish; keep this milestone focused on identity and permissions.

### DB-011 — Add session-aware route protection

Protect authenticated app routes.

Requirements:

* Unauthenticated users cannot access private routes.
* Unauthenticated users are redirected to login.
* Authenticated users are not trapped on the login page after successful login.
* Route protection should be server-side where practical.
* Do not rely only on client-side hiding.

Follow the existing route structure from v0.1.0. If the route grouping is not clear, choose a simple structure and document it.

### DB-012 — Add roles schema and seed data

Seed the day-one roles:

* General Manager
* Inventory Manager
* Mechanic
* Salesperson
* Office Manager
* Marketing/Advertisement Manager
* Collections

Seed at least:

* One manager user
* Several staff users across the day-one roles

Use fake local-development users only. Do not seed real customer data, production credentials, or sensitive dealership records.

Document the local development login credentials in `docs/SETUP.md` or the appropriate setup document.

### DB-013 — Add duties and user-role assignments

Model duties and user assignments.

Requirements:

* A user can have multiple roles.
* A user can have custom direct duties.
* Roles can support default duties, either through a `RoleDuty` join model or an equivalent clean approach.
* Seed realistic starter duties for the MVP areas:

  * Inventory
  * Advertising
  * Marketing
  * Sales
  * Mechanic / shop
  * Office/admin
  * General manager review

Do not implement full daily board generation in this milestone. Only create the identity, role, and duty foundation needed for later generation.

### DB-014 — Implement server-side policy helpers

Create reusable permission helpers in the server-side policy layer.

Preferred location:

* `src/server/policies`

Add helpers for at least:

* Require authenticated user
* Determine whether a user is a manager
* Manager-only actions
* Staff self-service actions
* Whether a staff user can update their own assigned work
* Whether a manager can manage users, roles, duties, assignments, settings, and review workflows
* Whether a user can view the full board

Important rule:

UI may hide unavailable actions, but server-side policies must be the source of truth.

If task models do not exist yet, make task-related policy helpers pure and future-ready by accepting minimal inputs such as:

* actor user
* assigned user id
* requires manager approval flag
* requested action

Do not create the full task workflow in this milestone.

### DB-015 — Add auth and permission tests

Add or update tests using the existing project test setup.

Cover at minimum:

* Valid seeded user can log in.
* Invalid credentials fail.
* Inactive user cannot log in.
* Logout clears the session.
* Unauthenticated user cannot access protected routes.
* Authenticated user can access protected routes.
* Manager policy allows manager-only actions.
* Staff policy rejects manager-only actions.
* Staff can pass self-service checks for their own work.
* Staff cannot pass self-service checks for another staff member’s work.
* Multiple roles per user are supported.
* Direct user duties are supported.

If browser-level tests are not practical yet, add unit/integration tests around the available auth and policy layers and clearly explain what was not tested.

## Constraints

* Keep the change minimal and scoped to v0.2.0.
* Follow the existing architecture and source layout.
* Do not rewrite unrelated files.
* Do not implement daily board generation yet.
* Do not implement full task board workflow yet.
* Do not implement activity feed yet.
* Do not implement assignment recommendation logic yet, except for any role/duty fields needed later.
* Do not add third-party integrations.
* Do not add payroll, HR, timeclock, CRM, DealerCenter, Asana, SMS, email, or Google Workspace functionality.
* Keep business rules and permission checks server-side.
* Do not commit `.env` files, local databases, secrets, real passwords, generated caches, or build artifacts.
* Add dependencies only if necessary and explain why.
* Preserve existing tests and behavior from v0.1.0.

## Implementation guidance

Before coding:

1. Inspect the current repository structure.
2. Confirm which v0.1.0 pieces already exist.
3. Identify the relevant files for Prisma schema, seed data, auth/server code, route structure, login UI, tests, and setup docs.
4. Briefly plan the implementation in small steps.
5. Then implement the smallest complete vertical slice for v0.2.0.

Suggested implementation order:

1. Schema and migrations for user/session/role/duty relationships.
2. Seed data for manager, staff, roles, and starter duties.
3. Password hashing/session helpers.
4. Login/logout/me endpoints or server actions.
5. Login page and form behavior.
6. Route protection.
7. Server-side policy helpers.
8. Tests.
9. Documentation updates.

## Done when

* Prisma schema includes the needed identity, role, duty, and session models.
* Migrations are created and work against a fresh local database.
* Seed data creates usable local development users, roles, and duties.
* A seeded manager user can log in and log out.
* A seeded staff user can log in and log out.
* Bad credentials show a clear failure message.
* Protected routes reject unauthenticated users.
* Server-side permission helpers exist and are reusable by later milestones.
* Manager-only permissions are enforced by policy helpers.
* Staff self-service boundaries are enforced by policy helpers.
* Tests cover auth, route protection, and core permission rules.
* Relevant lint/typecheck/test commands pass, or any skipped checks are clearly explained.
* `docs/SETUP.md`, `README.md`, or other relevant docs are updated with local auth setup and seed login instructions.
* `docs/ARCHITECTURE.md` is updated only if implementation meaningfully differs from the planned architecture.
* No unrelated files are changed.
* Summarize:

  * Files changed
  * Behavior added
  * Tests run
  * Any commands that failed or were skipped
  * Any remaining follow-up work for v0.3.0
