# Task: DB-016 — Add app settings schema and storage

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and relevant existing files first.

## Goal

Implement DB-016: add persistent app settings storage for daily board generation.

Create the database-backed settings foundation needed for future daily generation work. The settings must store:

* Daily generation time
* Timezone
* Business days

The settings must be available to server-side code through a small repository/service helper.

## Current behavior

The app does not yet have a persistent settings model for daily generation configuration.

Daily generation will eventually need to know:

* What time the board should generate
* What timezone the app should use
* Which days count as business days

There may already be Prisma, seed, auth, roles, duties, and policy code from earlier roadmap issues. Inspect the current repo before editing.

## Desired behavior

Add a database-backed `AppSetting` model, migration, seed default, and server-side access helper.

After this issue:

* Prisma has an `AppSetting` model or equivalent existing-pattern settings model.
* The model stores `dailyGenerationTime`, `timezone`, and `businessDays`.
* Default settings are seeded idempotently.
* Server code can load the current generation settings without direct database access from feature code.
* Validation exists close to the server/helper layer so invalid settings do not leak into future generation logic.
* The work remains limited to DB-016.

## Important scope boundary

Do not implement DB-017 in this task.

Specifically, do not add:

* Settings API routes
* Manager settings UI
* Manager edit form
* Route-level settings permissions
* Full scheduled generation logic
* Board generation logic
* Task template schema
* BoardDay, Task, or GenerationRun schema

This issue is only the settings schema and server-side storage foundation.

## Implementation guidance

Start by inspecting the existing codebase and patterns:

* `prisma/schema.prisma`
* `prisma/seed.ts` or existing seed files
* `src/server/db`
* `src/server/repositories`
* `src/server/services`
* `src/server/validation`
* existing tests under `src/tests`

If Prisma or the app scaffold is missing, stop and report the blocker instead of recreating earlier roadmap issues.

### Suggested Prisma shape

Follow existing project conventions first. If there is no existing convention, prefer a simple single-row settings model.

Suggested model concept:

```prisma
enum BusinessDay {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

model AppSetting {
  id                  String        @id
  dailyGenerationTime String
  timezone            String
  businessDays        BusinessDay[]
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}
```

Use an id such as `"global"` or `"default"` through the seed/repository layer to keep this as a single app-wide settings record.

If the existing project uses UUIDs, cuid IDs, JSON settings, or a different convention, follow the existing convention while preserving the same business meaning.

### Default seed values

Add idempotent seed logic so a fresh database has one settings record.

Use these defaults unless the current repo already defines another default:

* `dailyGenerationTime`: `"09:00"`
* `timezone`: `"America/Chicago"`
* `businessDays`: Monday through Saturday

Sunday should not be included by default.

The seed must be safe to re-run without creating duplicate settings rows.

### Validation guidance

Add a small validation/normalization helper if no existing one exists.

Validate:

* `dailyGenerationTime` must be a valid 24-hour `HH:mm` string.
* `timezone` must be a non-empty string.
* `businessDays` must be a non-empty array.
* `businessDays` must contain only allowed day values.
* Duplicate business days should be removed or rejected consistently.

Do not add a new dependency just for this unless the project already uses one or there is a strong reason.

### Server access helper

Add a small repository/service layer so future generation code can load settings cleanly.

Use existing patterns. If none exist yet, create something like:

* `src/server/repositories/appSettingsRepository.ts`
* `src/server/services/appSettingsService.ts`
* `src/server/validation/appSettingsValidation.ts`

Expected behavior:

* `getAppSettings()` or `getGenerationSettings()` returns the app settings.
* If settings are missing, the helper should either create defaults or throw a clear error, depending on the repo’s established pattern.
* Prefer a safe `getOrCreateAppSettings()` helper if that matches current patterns.

Keep this server-only. Do not expose it through an API route yet.

## Constraints

* Keep the change minimal and focused on DB-016.
* Follow existing architecture and naming patterns.
* Use Prisma/PostgreSQL patterns already established in the repo.
* Do not add new dependencies unless necessary.
* Do not rewrite unrelated files.
* Do not change auth, roles, duties, board generation, task templates, activity feed, or UI.
* Do not implement DB-017.
* Preserve existing behavior.
* Add or update tests where practical.
* If a larger refactor seems necessary, stop and explain before making it.

## Tests and checks

Add tests based on what the repo currently supports.

At minimum, add unit tests for validation/default settings behavior if a test setup exists.

If database integration tests already exist, add coverage that confirms:

* The default settings record can be seeded or created.
* Re-running seed or `getOrCreateAppSettings()` does not create duplicates.
* Server code can read the stored settings.
* Invalid generation times or empty business days are rejected by validation.

Run the relevant available commands, such as:

```bash
npx prisma generate
npx prisma migrate dev --name add_app_settings
npm run lint
npm run typecheck
npm test
```

If a command cannot be run because of missing local database, missing env vars, or project setup limitations, clearly state what could not be verified and why.

## Docs

Update docs only if implementation details meaningfully differ from `docs/ARCHITECTURE.md`.

If the roadmap status is normally updated per issue, mark only DB-016 as complete after implementation and successful checks. Do not mark DB-017 or any later issue complete.

## Done when

* `AppSetting` or equivalent settings storage exists in Prisma.
* A migration exists for the settings model.
* Default settings are seeded idempotently.
* Server-side code can load the settings for future daily generation work.
* Daily generation time, timezone, and business days are represented clearly.
* Business days default to Monday through Saturday.
* No settings API or manager edit UI was added.
* Relevant tests/checks were run or skipped with a clear reason.
* The final response summarizes:

  * Files changed
  * Migration name
  * Settings fields added
  * Default seeded values
  * Tests/checks run
  * Any remaining gaps or blockers
