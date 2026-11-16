# Collections Module: Build Log

A plain-English diary of the Release 1 build (spec: `docs/COLLECTIONS_SPEC.md` v2.0).

## Where the work lives

- Git branch: `collections-module`.
- Folder: `Dispatch Board/.worktrees/collections-module`. This is a **separate working
  copy** of your project. Your main `Dispatch Board` folder had 43 files with
  unfinished edits from another tool on branch `codex/enterprise-general-refinement`;
  working in a separate copy keeps those edits untouched and out of these commits.
- The branch starts from the latest commit on `codex/enterprise-general-refinement`
  (`5ecef9f9`), not from `main`.
- This copy has its own `.env` that points at **no real database** on purpose. Nothing
  here can change your real data until you choose to run a migration yourself.

## Starting point (before any Collections code)

Checks run on the untouched branch in this copy:

| Check | Result before Collections |
|---|---|
| `npm run typecheck` | passes |
| `npm run lint` | **1 existing error** in `src/app/(repair-preview)/prototype/inventory-intake/page.tsx` (uses `<a>` instead of `<Link>`). Not touched, because fixing it changes an existing feature. |
| `npm test` | **52 existing failing tests in 16 files** (1060 files pass). Most need a live database (`PrismaClientInitializationError`); a few time-attendance tests fail on permission checks. Not caused by this work. |

From here on, "tests pass" means: **all new Collections tests pass, and no test that
passed before now fails.**

---

## Stage 1: Setup (done)

**What I built**
- Copied the spec into `docs/COLLECTIONS_SPEC.md`.
- **Switches** (`src/features/collections/config/flags.ts`). All default to OFF:
  - `COLLECTIONS_MODULE` = OFF / REVIEW / PILOT / LIVE. Anything misspelled counts as OFF.
  - `COLLECTIONS_SMS_SENDING` and `COLLECTIONS_EMAIL_SENDING` = OFF / DRY_RUN / LIVE.
    In REVIEW mode a LIVE setting is automatically downgraded to DRY_RUN.
  - `SYSTEM_OF_RECORD` is **locked to DEALERCENTER** in Release 1, whatever `.env` says.
  - `COLLECTIONS_AI` (kill switch for future AI agents), default OFF.
  - Integration switches (`COLLECTIONS_INTEGRATION_*`), and in Release 1 LIVE is capped at TEST.
- **Permissions** (`src/features/collections/config/permissions.ts`), using your existing
  roles and duties (no new user system):
  - **Collections Admin** = General Manager role, "Collections Manager" role, or a
    "Collections admin" duty. You (the owner) are covered automatically.
  - **Collector** = "Collections" role or any duty containing "collections". Collectors
    can't import, change account type, clear flags, approve disables/repos, change
    settings, or approve money (spec section 2).
  - When the module is OFF, every permission check answers "no".
- Added all new settings to `.env.example` with safe placeholder values and comments.
- Started `docs/COLLECTIONS_OPEN_QUESTIONS.md` with the Minnesota attorney questions.

**How to try it:** nothing to see yet. The module is OFF and invisible.

**Tests:** 12 new tests (switch defaults, REVIEW forcing dry-run, system-of-record lock,
role rules). All pass. Typecheck passes. Lint: no new problems (only the 1 existing error).

**What you need to do:** nothing yet.
