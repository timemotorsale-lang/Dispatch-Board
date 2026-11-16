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

---

## Stage 2: Database (code done, migration waiting for your backup)

**What I built**
- Added the Collections tables to `prisma/schema.prisma` (spec section 3): accounts,
  daily snapshots, import runs, contact log, promises, payment plans,
  customer-reported payments, flags, texting/email consent, message templates,
  outgoing and incoming messages, insurance, starter-disable actions, repo cases,
  letters, an audit log, settings plus settings history, daily metrics, and a link
  table that makes "one open board task per account per reason" a database rule.
- The change is **additive only**: 821 lines added, **0 existing lines changed or
  removed**. I checked the SQL offline (no database touched): 21 new tables, 29 new
  choice lists, 62 indexes, 29 links, and one new choice `COLLECTIONS` added to the
  existing task-source list. No drops, no renames.
- Existing tables only gained "back-link" lines in the schema file (Organization,
  Customer, Vehicle, Vendor, Task). Those create **no new columns** in your existing tables.
- Default settings (`src/features/collections/domain/settings.ts`): 5 grace days, $10.00
  late-fee display, thresholds 7/14/30/60, Mon-Fri 9-6, Sat 10-3, Sun closed, weekly cap 3,
  America/Chicago. The "disable warning" text can never be made automatic.
- Starter message templates (`src/features/collections/domain/default-templates.ts`):
  friendly English texts marked APPROVED (so dry-run works), plus Spanish, Somali and
  Swahili drafts marked DRAFT and "needs review by a fluent speaker". All texts are 320
  characters or fewer and include STOP; English texts end with "Reply STOP to opt out."
- `npm run collections:seed`: creates the default settings and templates once. Running
  it again creates nothing and never overwrites your edits.

**Tests:** 8 new tests (settings defaults and bad-value protection, template rules,
seed runs twice without duplicates). All Collections tests pass. Full suite: no new
failures (the same 52 pre-existing failures). Typecheck passes. Lint: only the 1
pre-existing error.

**What you need to do: back up your database before the migration.**
I have not created or applied the migration. When you say "backup done", I'll create the
migration file and then ask how you want it applied.

### Stage 2 update: migration applied to a TEST copy only

- Your PC's `dispatch_board` database doesn't match this branch: other work had already
  added 7+ migrations this branch doesn't have, and this branch has one older migration
  (`rental_custody_guards`) the database never got. Applying migrations the normal way
  would have run that unrelated one too.
- As you chose, I created a **separate test database `dispatch_board_collections`** on your
  PC. It's an exact copy of `dispatch_board`, made with a read-only backup.
- **Backup:** I couldn't find the backup file from the instructions, so I made one myself
  with a read-only `pg_dump`. It's at `C:\Users\timem\dispatch-board-backups\`, 148 MB,
  and was checked as readable (354 tables). Keep a second copy somewhere else.
- Applied **only** `20261115200000_collections_core` to the test copy. The test copy now
  has 375 tables (354 + 21 new). Your real `dispatch_board` is unchanged at 354 tables.
- Ran `npm run collections:seed` on the test copy: settings plus 26 templates per
  organization. A second run created nothing.
- This working copy's `.env` points at the test database only.
- **Later:** the Collections tables reach your real database when this branch is merged
  and deployed the normal way, after the other branches' migrations are lined up. I'll
  never do that without asking you.

### New test baseline

With the test database connected, the **full existing test suite passes: 0 failures**.
The 52 "failures" seen earlier only happened because that first run had no database.
From now on the bar is: everything passes.

---

## Stage 3: DealerCenter import (done)

**What I built**
- **File reader** (`src/features/collections/import/parse.ts`): reads `.xlsx` or `.csv`,
  trims DealerCenter's leading spaces from column names, matches them case-insensitively,
  turns dollars into whole cents, and reads dates like `11/5/2026`. Extra unknown columns
  are listed but never break the import. Missing required columns, bad numbers or dates,
  and duplicate AccountIds are reported by row number, and those rows are skipped.
- **Column map** (`import/profiles.ts`): the Active Accounts layout from spec section 4,
  plus a slot for the future "Contact & details" import. Adding columns later is a
  config change, not a database change.
- **Preview** (`import/preview.ts`): sorts every row into New / Updated / Unchanged /
  Needs review, totals the balance, counts accounts per bucket, and lists accounts that
  are **not in the file**.
- **Commit** (`server/import-service.ts`), all in **one database transaction**:
  - creates or updates each account and saves a daily snapshot;
  - **never changes the account type** (every new account starts as Lease-to-own; your
    BHPH changes survive re-imports);
  - matches vehicles by stock number, using the app's existing stock-number cleanup;
  - **suggests** a customer (from the vehicle's current owner, or a unique exact name
    match) but **never links a customer automatically**;
  - turns a DealerCenter PromiseDate into a tracked promise, only once;
  - flags missing accounts "Not in latest import" (never deletes them);
  - recalculates each account's status. DealerCenter "REPOSSESSED" wins even if the
    account says ACTIVE;
  - refuses to import the exact same file twice;
  - stores the uploaded file as a **private, restricted** document when Document
    Library storage is set up. If it isn't, the import still works without saving the file.
- **Import screen** at `/collections/import`: upload → check the preview (account count,
  total balance, buckets, problems, missing accounts, filter by New/Updated/Needs review)
  → **Confirm import** or **Cancel**. Shows recent imports. Admins only.
- **Fake test files**: `src/features/collections/tests/fixtures/active-accounts.sample.csv`
  and `.xlsx`. 30 made-up accounts covering every bucket, a repossessed row, a past
  promise date, duplicate buyer names, expired/unknown insurance, and an unknown extra
  column. To regenerate: `npx tsx scripts/collections-make-fixtures.ts`.

**How to try it (later, once the menu link exists in Stage 4):** turn on REVIEW mode, open
`/collections/import`, and upload the fake CSV. The preview should show 30 accounts.

**Tests:** 13 new unit tests (money/date reading, buckets, status order, CSV and XLSX
giving identical results, leading-space headers, missing columns, duplicates, bad values,
preview labels) and 6 new database tests (preview then commit, duplicate file refused,
account type kept on re-import, improved account goes back to Current, missing account
flagged, cancel changes nothing, failed file recorded, collector blocked). Database tests
run only when `RUN_COLLECTIONS_DB_TESTS=1` **and** the database name contains
"collections", so they can never touch your real database.
Full suite: 5,958 passed, 0 failed. Typecheck passes. Lint: only the 1 old error.

**What you need to do:** nothing yet. When we test with your real DealerCenter file, the
acceptance check is: 277 accounts, about $1,827,508 total balance, and buckets 221 / 1 /
0 / 15 / 12 / 28. That check happens on your PC; the real file is never committed.

---

## Stage 4: Accounts and queue (done)

**What I built**
- **Collections in the main menu**, shown only when `COLLECTIONS_MODULE` is not OFF and you
  have a Collections permission. The browser can't read server switches, so the server now
  passes one optional yes/no value to the menu. This added 23 lines to existing layout files
  (`src/app/(app)/layout.tsx`, `src/components/layout/app-shell.tsx`, `app-sidebar.tsx`,
  `app-topbar.tsx`, `navigation.ts`). The value defaults to "no", so **with the switch OFF,
  every menu is exactly as before**.
- **Queue** (`/collections`): today's worklist. Order: unread customer texts → broken
  promises → reported payments not found → most days past due → largest amount due.
  Tabs: All past due, Broken promises, Promises due today, Disable eligible, Repo review,
  Insurance problems, Needs review, Frozen/flagged, Not in latest import (with counts).
  Bankruptcy-frozen accounts appear only under Frozen/flagged. Filters: bucket, type, status,
  plus search by name, deal #, stock # or phone. On a phone it shows cards; **Call** opens
  the dialer and then the contact log. A banner reminds you if today's file isn't imported.
- **Accounts** (`/collections/accounts`): searchable, sortable table, 50 per page. Select
  several to **change type** (with a reason) or **assign a collector**. **Export CSV** has
  formula-injection protection.
- **Account page** (`/collections/accounts/[id]`): header (customer, vehicle link, type,
  status, bucket, flags, collector), money panel ("Data as of …"), **Log a contact**,
  **Flags** (set/clear), **Contact details** (phone, email, address, language, VIN, GPS
  serial, "GPS disclosed in contract"), **Link the customer** (confirm the suggestion or
  search), **Account type**, **Not in latest import** (paid off / closed / still active),
  and a full **timeline**.
- Rules enforced on the server:
  - collectors can set flags but only admins clear them;
  - **clearing bankruptcy requires a reason and an uploaded document** (PDF/JPEG/PNG,
    stored privately);
  - attorney flags need the attorney's name, and contact restrictions need a scope;
  - every change writes an audit event;
  - other companies' accounts are invisible;
  - the "collectors see assigned accounts only" setting works.

**How to try it (after turning on REVIEW mode, see the user guide in Stage 11):**
Collections → Import the fake file → Queue → open an account → log a call → set a Dispute flag.

**Tests:** 7 new unit tests (queue order, unread-text priority, frozen accounts hidden,
tabs, search, CSV safety) and 8 new database tests (queue order and counts, logging a
contact, bankruptcy freeze and its clearing rules, type change needs admin, bulk type
change, contact edit with phone check, other company blocked, assigned-only visibility).
Full suite: 5,963 passed. 2 existing tests (`crm-next-pages`, `shop-recon-workflow`)
timed out at 5 seconds during the full run but **pass when run on their own**. They're
timing-flaky under load and weren't affected by this work.
Typecheck passes. Lint: only the 1 old error.

**What you need to do:** nothing yet.

---

## Stage 5: Promises, payment plans and reported payments (done)

**What I built**
- **Account page → "Promises, payment plans and reported payments"** (the Promise button
  in the queue jumps here):
  - **Record a promise** (amount + date). This also logs a "promise made" contact.
  - **Payment plan**: 2 to 52 payments with dates and amounts, plus a reason. A new plan
    replaces the old one, and any open one-off promise is replaced too.
  - **Customer says they already paid**: amount, method (online, in person, phone, cash at
    store, Zelle, other), date, and reference number. For Zelle/cash/other it reminds you
    to post the payment in DealerCenter.
  - Cancel a promise, plan or reported payment (with a reason). Nothing is ever deleted.
  - None of these are allowed on a bankruptcy-frozen account.
- **Automatic resolution** (`domain/resolution.ts`, `server/promise-service.ts`), run after
  each committed import (and by the daily job in Stage 6):
  - **Kept**: by the promised date + 1 day (a setting), a newer import shows days past due
    went down, or the amount due dropped by at least the promised amount, or a confirmed
    reported payment covers it.
  - **Partially kept**: it dropped, but by less.
  - **Broken**: nothing changed by the deadline. It is never marked broken while a
    reported payment is still waiting for confirmation.
  - **Plans**: any broken or partly kept payment breaks the plan; all kept completes it.
  - **Reported payments**: confirmed when a later import shows it. If nothing shows within
    2 days (a setting), it becomes "Not found" so you can check DealerCenter.
  - Running it twice changes nothing the second time.
- **Bug found and fixed by the tests:** dates were being read in UTC instead of Chicago time.
  After about 6 pm, that made the next morning's import look "too early" to count.

**Tests:** 17 new unit tests (kept / partial / broken, grace days, same-day imports ignored,
pending reported payments pause "broken", plan rules and validation) and 6 new database
tests (record → kept on next import, broken after deadline, plan replaces promises and
breaks, reported payment confirmed vs not found, frozen account refused). All 20
Collections database tests pass. Full suite: 5,979 passed. 3 existing tests timed out
under load and pass on their own (same flaky-timeout issue as Stage 4).

**What you need to do:** nothing yet.

---

## Stage 6: Automations and dispatch board tasks (done)

**What I built**
- **The automations** (`server/automations.ts`) run right after every committed import, and
  from a new scheduled job, `/api/cron/collections`, protected by `CRON_SECRET` like the
  app's other jobs. The scheduled job is safe to call every 15 minutes. Each day, Monday to
  Saturday, it does two things:
  - after 9:15 am Chicago time (a setting), it runs the full automations once;
  - after 10:00 am (a setting), it checks for the import reminder.

  The automations follow these steps:
  1. Recalculate every account's status and bucket.
  2. Resolve promises, plans and reported payments (from Stage 5).
  3. Work out insurance status from the latest record: expired, expiring within 14 days,
     missing, or unknown. Insurance screens come in Stage 8.
  4. Create and close dispatch board tasks (details below).
  5. Automatic messages. This step is reserved; it gets filled in Stage 7.
  6. Save the day's numbers (counts and dollars per bucket, promises made, kept, partly
     kept and broken, disabled starters, repo and insurance counts) for the dashboard. Post
     one summary to the board's activity feed, such as "Collections: 2 broken promises,
     3 disable reviews."
  7. If nothing was imported by 10:00 am, create an **"Import DealerCenter accounts"** task
     for the Collections admin. It closes by itself once a file is imported.
- **Board tasks** (`domain/tasks.ts`, `server/task-sync.ts`):

  | Reason | Task | Priority |
  |---|---|---|
  | Broken or partly kept promise or plan payment | Call customer: broken promise | High |
  | 7 days past due, starter not already disabled | Starter-disable review | High |
  | 14 days | 2-week follow-up | Medium |
  | 30 days | 30-day account review | High |
  | 60 days | Repo review | Critical |
  | Insurance expired or missing | Get proof of insurance | Medium |
  | Reported payment not found | Check reported payment in DealerCenter | High |
  | Payment or arrangement after a disable | Re-enable starter | Critical |
  | Repo assigned or located | Repo: TLC Recovery | High |
  | Bankruptcy flag | Bankruptcy: review with attorney | High |

  - Every task is in the **Collections** area of the board. It goes to the account's
    collector, or to the Collections admin when no collector is set. It links back to the
    account page.
  - **One open task per account per reason.** The database enforces this.
  - **Tasks close themselves with a note when the reason goes away.** Examples: a later
    import shows the account caught up, a new promise is made after a broken one, or the
    starter is re-enabled. You'll see "Collections closed this task automatically: …" in
    the activity feed.
  - **If you complete a task yourself, it stays done.** It isn't created again until the
    reason happens again, for example the account falls behind again after catching up.
  - Changes on the account page (flags, promises, plans) update that account's tasks right
    away.
- **Choices I made (tell me if you want them different):**
  - **Only one days-past-due task at a time:** the highest level reached. A 75-day account
    gets "Repo review", not all four tasks. Otherwise your first import would put about
    100 tasks on the board.
  - **Bankruptcy:** a bankruptcy flag closes all other tasks on that account and leaves
    only "Bankruptcy: review with attorney" (spec section 12).
  - **Deceased:** a deceased flag pauses all of that account's tasks.
  - **Repo hold:** the "do not repo, review hold" flag skips the repo review.
  - **Unknown insurance:** an account with no insurance on file at all counts as "unknown"
    and doesn't get a task. Only expired, or explicitly marked missing, does. Otherwise all
    277 accounts would get an insurance task on day one.
  - **Privacy:** task titles show the customer name and deal number, but never dollar
    amounts, because everyone can see the board.
- **Safety:** no automation disables a starter, assigns a repo, sends a letter or clears a
  flag. Tasks only remind a person to decide. While the switch is OFF, the scheduled job
  does nothing. If the automations fail after an import, the import stays saved, and the
  next scheduled run catches the tasks up.

**How to try it (test database):** import the sample file at `/collections/import`. Then
open the dispatch board and look at the Collections area. Run the import again with an
account caught up, and its task closes itself.

**Tests:**
- 13 new unit tests: which tasks each situation creates, insurance status, Mon–Sat timing in
  Chicago time (including daylight saving), and the summary wording.
- 9 new database tests:
  - one task per account per reason;
  - running twice creates nothing;
  - the daily numbers and the summary;
  - a task completed by a person stays done;
  - a caught-up import closes the task with a note;
  - bankruptcy leaves only the attorney review;
  - a new promise closes the broken-promise task;
  - the import reminder is created once and closes after an import;
  - the job does nothing while OFF.
- All 99 Collections tests pass. Typecheck is clean. Full suite: 5,995 passed, 0 failed.
  Lint: only the 1 existing error that was there before.

**What you need to do (before going LIVE, not now):** tell the scheduler to call
`/api/cron/collections`. On Vercel that means adding it to `vercel.json`, every 15 minutes
like `generate-board`. I haven't changed `vercel.json`, because that changes your
deployment; I'll ask you first.

---

## Stage 7: Texts, email and the Inbox (done, all in test mode)

**What I built**
- **Text or email from the account page** (the "Text" button in the queue jumps here):
  - pick a template or write your own, then press **Preview**;
  - the preview shows the exact message in the customer's language, the character count
    (320 max), and any reason it can't be sent;
  - English is used, with a warning, when the customer's language has no approved template.
- **Send rules, checked on the server for every message** (`domain/messaging.ts`). A blocked
  message is still saved, with its reason, so you can see it on the timeline. A message is
  blocked when:
  - the account has a bankruptcy freeze, or a contact restriction (no text / no email / no
    contact / attorney only);
  - the customer has an attorney: automatic messages stop, and a manual message needs a
    written reason;
  - the customer texted STOP: texts stay blocked until an admin records **new consent from
    the customer** (who, when, how). Contract consent counts until then;
  - a deceased flag is set: it pauses automatic messages;
  - details are missing, for example the dealership phone or pay-online link isn't in
    Settings yet: the message is blocked and names what's missing;
  - an account has had 3 automatic messages in 7 days: more are blocked. Manual messages
    still go, with a warning.

  Automatic messages wait in a queue outside business hours (Mon–Fri 9–6, Sat 10–3,
  Chicago) and outside 8 am–9 pm.
- **Automatic messages**, run with the daily automations and only when sending isn't OFF:

  | Message | When it goes |
  |---|---|
  | Due soon | 2 days before the due date (email if there's no mobile number) |
  | Past due | day 1 past due |
  | Late fee | day 6 past due |
  | Promise reminder | the day before a promise or plan payment |
  | Insurance needed | first request, then every 7 days, 3 times at most |

  Each one is created only once, so re-running creates nothing twice. Messages waiting for
  opening time go out on the next scheduled run, for example Saturday at 10:00. The
  starter-disable warning is never automatic.
- **Incoming texts** (`/api/collections/sms/inbound`, plus `/sms/status` for delivery
  updates):
  - Twilio's signature is checked on every request; anything unsigned is rejected, and
    requests are rate-limited;
  - **STOP** (and "stop texting me"-style phrases in English, Spanish, Somali and Swahili)
    is recorded at once and gets one confirmation;
  - **START** turns texts back on; **HELP** replies with your name and phone;
  - a new text shows in the board's activity feed (without the message itself) and moves
    the account to the top of the queue;
  - photos are noted on the message; saving one as an insurance card comes in Stage 8.
- **Inbox** (`/collections/inbox`): conversations by account, plus unknown numbers. Unread
  ones come first. You can reply with a template, and opening a thread marks it read.
- **First import:** it now creates the default settings and templates automatically, if
  they're missing.
- **Connectors:** the Twilio and Resend connectors use plain `fetch`, so no new packages.
- **`docs/COLLECTIONS_DEPLOY.md`:** how to set up Twilio and Resend, and how to expose
  **only** the two text webhooks through Caddy or Tailscale, never the whole app.

**Safety:** nothing real was sent while building or testing.
- **REVIEW mode always turns sending into a dry run**, even if someone sets sending to
  LIVE. The tests check that no network call is made.
- Phone numbers are masked in logs.

**How to try it (REVIEW mode):**
1. Put your dealership phone and pay-online link in the settings. The Settings screen comes
   in Stage 10; until then, the defaults leave these blank, so messages show "Missing
   details".
2. Add a phone number on an account, then Preview, then "Save (dry run)". It appears on
   the timeline as "Text dry run".

**Tests:** 18 new unit tests:
- STOP/START/HELP in 4 languages, without false alarms such as "can you stop by";
- templates and first names;
- every send rule;
- quiet hours, including Saturday and the weekend;
- the Twilio signature check, the Twilio request format, missing setup, and the rate limit.

7 new database tests:
- REVIEW turns LIVE into a dry run, with no network call;
- OFF blocks with a reason;
- STOP blocks, sends a confirmation and ignores duplicates, and START allows texts again;
- unsigned webhooks get 403 and signed ones are accepted;
- inbox unread and mark-read;
- automatic messages are created once, wait for Saturday 10:00, and then dry-run;
- a bankruptcy freeze blocks texts.

All 124 Collections tests pass. Full suite: 6,013 passed, 0 failed. Typecheck clean; lint shows only the existing error.
- **Bug found and fixed:** the Inbox list came up empty for admins because of a database
  filter mistake.

**What you need to do (before PILOT/LIVE, not now):**
- finish Twilio A2P 10DLC registration;
- choose how to expose the two webhooks (`docs/COLLECTIONS_DEPLOY.md`);
- have a fluent speaker review the Spanish, Somali and Swahili templates;
- confirm with the Minnesota attorney that the contract consent covers automated texts
  (open question 5).

---

## Stage 8: Insurance (done)

**What I built**
- **Insurance panel on the account page.** It shows the current status:
  - **Verified**;
  - **Not verified yet**;
  - **Expiring soon** (within 14 days, a setting);
  - **Expired** or **Missing**;
  - **Nothing on file**.

  Below the status it shows the carrier, policy number, dates, whether the dealership is
  listed as lienholder, the proof file, and who verified it and when. DealerCenter's
  insurance column is shown for reference only.
- **Add proof:** upload a card photo or insurer document (PDF, JPEG or PNG), or use a photo
  the customer texted in. With "Read the card for me" ticked:
  - the app reads the card on your own server, with the text reader the app already has,
    so nothing goes to an outside service;
  - it fills in the carrier, policy number, dates and lienholder;
  - it only fills in the form, so you check each field and press Save. If it's unsure, it
    leaves the field empty or adds a note such as "dates were guessed, check them".
- **Verify (admins only):** tick "the dealership is listed as lienholder and the dates are
  right", then mark it verified. Proof must be uploaded first, and an expired policy can't
  be verified.
- **Customer has no insurance:** marks it missing, with a note.
- **History is kept:** every change saves a new version. Nothing is overwritten.
- **Automatic follow-up:**
  - expired or missing insurance creates a "Get proof of insurance" task on the board, and
    the automatic "insurance needed" text from Stage 7;
  - saving current insurance closes the task right away;
  - the queue's **Insurance problems** tab now works out "expired" and "expiring soon" from
    the dates, so a policy that expires tonight shows up tomorrow without anyone touching
    it.
- **Texted photos:** a photo the customer texts can be saved to the account as proof with
  one click, once real texting is on. It only downloads from Twilio's own address. In
  REVIEW mode it explains that this needs live texting.

**How to try it (REVIEW mode):**
1. Open any account and go to Insurance.
2. Upload a picture of a sample card.
3. Check the filled-in fields, then press Save.
4. As the owner, tick the lienholder box and press "Mark verified".

Uploads need the app's private Document Library storage set up, as with every other upload
in the app.

**Tests:**
- 6 new unit tests:
  - reading a card: carrier, policy, dates, and your dealership as lienholder;
  - another lienholder name isn't mistaken for yours;
  - unlabeled dates are guessed and flagged;
  - unreadable text leaves fields empty;
  - date formats;
  - the photo-link safety check.
- 6 new database tests:
  - expired insurance creates a task and shows in the queue tab;
  - new insurance closes the task and stays "not verified";
  - verifying needs the lienholder check, is admin-only, and keeps history;
  - "missing" creates the task again;
  - bad dates and someone else's file are refused;
  - texted photos aren't downloaded while texting is off.
- All 136 Collections tests pass. Full suite: 6,019 passed, 0 failed. Typecheck and
  Collections lint are clean.

**Not finished:** viewing the proof file from the account page (added in Stage 9).
the Document Library and listed by file name. A "view" button comes in Stage 11, along with
the other screen polish.

**What you need to do:** nothing now.

---

## Stage 9: Starter disable, repossession and repo letters (done)

**What I built:** a new panel on the account page, "Starter disable, repossession and
letters." **Every step is a person's decision.** The automations only remind you with board
tasks. Nothing ever disables a starter, assigns a repo or mails a letter by itself.

**Starter (Advantage GPS), done by hand in the Advantage portal**
1. **Request a disable.** Anyone working Collections can request one.
   - Before you request, it shows a summary: days past due, amount due, last contact, open
     promises and insurance.
   - You must say how the customer was warned (text, call, device beep, or none) and when.
   - "None" shows a caution to check Minnesota notice rules, and needs a reason.
   - It warns if the contract isn't marked as disclosing the GPS starter interrupt, or if
     the account is below the 7-day review point.
2. **Approve (admins only).** The app then shows the portal link and the device serial.
   - Optional: **Send warning text**. It uses the "disable warning" template, with the
     normal send rules. In test mode it's only a dry run, and the app says not to count it
     as the warning.
3. Disable it in the Advantage portal, tick "I disabled it", then press **Done in portal**.
   - The account shows **Starter disabled**, and the disable-review task closes.
4. **Re-enable:** a promise, plan or payment recorded after a disable, a customer who
   redeems the car, or the account catching up, creates a **"Re-enable starter"** task.
   Re-enabling follows the same steps without a warning, and closes that task.
5. **The Advantage connector is built "manual only"** (`AdvantageGpsClient`). A real API
   can be plugged in later without changing the screens, and a person still approves every
   step.

**Repossession with TLC Recovery**
- **Start a repo review.** Anyone working Collections can start one, with a reason.
- **Approve (admins only).**
- **Assign to TLC Recovery.**
  - The first time, this adds TLC Recovery to your Vendors list, under "Collections /
    repossession"; it's reused after that.
  - A "Repo: TLC Recovery" task goes on the board, and each status update is posted as a
    comment on that task.
- **Status:** Located, then Recovered, then In storage. You can record the storage
  location, repo and storage fees, and personal property left in the car.
- **Outcome:**
  - **Redeemed:** the account goes back to its DealerCenter status, and a re-enable task
    appears if the starter is off.
  - **Returned to inventory:** an inventory check-in/recon task goes on the board, linked to
    the vehicle. Existing inventory features are not changed.
  - **Sent to auction.**
- **Cancel** with a reason, for example "paid in full".

**Repo letters**
- **Generate** a pre-repo or post-repo notice as a PDF, saved privately to the account.
- **Until your attorney's wording is in Settings, every letter has a big red "DRAFT –
  attorney-approved wording required" banner.** Draft letters can't be recorded as sent.
  The box for pasting the approved wording comes in Stage 10.
- **Record how it was sent:** certified mail (tracking number required), first class, hand
  delivered or email. The letter list works as a checklist.

**Bankruptcy freeze** blocks disables, every repo step except cancel, and letters.
Re-enabling a starter is still allowed.

**Also new:** proof files and letters now open from the account page, through a private
link that only staff who can see the account can use.

**How to try it (test database):** open a 7+ day account, such as FAKE-1013 from the sample
file. Request a disable, approve it, then press "Done in portal". Then record a promise and
watch for the "Re-enable starter" task. Try a repo on a 60+ day account.

**Tests:**
- 4 new unit tests:
  - a draft vs approved letter PDF;
  - filling letter fields;
  - the manual GPS client never claims it did anything;
  - re-enable after redemption.
- 6 new database tests:
  - the full disable flow, with its required steps and warnings;
  - a promise after a disable creates the re-enable task, and re-enabling closes it;
  - collectors can request but not approve;
  - the full repo flow to "returned to inventory", with one TLC vendor reused;
  - bankruptcy blocks disable, repo and letters;
  - a draft letter can't be marked sent, and certified mail needs a tracking number.
- All 146 Collections tests pass. Full suite: 6,023 passed, 0 failed. Typecheck and
  Collections lint are clean.

**What you need to do (before LIVE, not now):**
- ask your Minnesota attorney about notice requirements before a starter disable and
  before and after a repossession (open question 4);
- get the wording for the two letters;
- add the Advantage portal link and TLC Recovery's contact details (in Vendors) when
  convenient.

---

## Stage 10: Dashboard and Settings (done)

**Dashboard** (`/collections/dashboard`)
- **Tiles**, most of which link to the matching queue tab:
  - accounts and total balance;
  - past due (count and $);
  - broken promises today;
  - disable eligible and starters disabled;
  - repo review, repo assigned, and repo recovered or in storage;
  - insurance problems;
  - unread texts;
  - last import.
- **Past due by bucket:** accounts, amount due and balance per bucket, with simple bars.
- **Promises:** made, kept, partly kept and broken over the last 30 and 90 days, with the
  keep rate.
- **Weekly trends** from the saved daily numbers: past-due %, $ past due, and 31–60 and 61+
  accounts. Small line charts, with "Show the numbers" underneath.
- **Activity:** contacts logged and texts/emails per staff member per day, for the last 14
  days.
- **CSV download** for every table, and a **Print this page** button. The print layout hides
  buttons and menus.
- No new chart package: plain, accessible charts with the numbers always shown as text.

**Settings** (`/collections/settings`, admins only)
- **Dealership details:** name, phone, address, pay-online link, Zelle recipient, Advantage
  portal link, cash-at-store instructions. **Fill these in first.** Texts and letters use
  them, and messages are blocked while they're blank.
- **Business hours** for each day, plus the customer texting window (8 am–9 pm).
- **Days and thresholds:**
  - grace days, the late-fee amount shown, the four review thresholds, promise grace days,
    the reported-payment window, and insurance "expiring soon" days;
  - the daily automation time and the import reminder time;
  - whether collectors see all accounts or only their own.
- **Automatic messages:** on/off and timing for each one, the weekly limit, and languages
  offered. The disable warning can never be turned into an automatic message.
- **Repo letter wording:** paste in your attorney's approved text. Letters stop showing the
  DRAFT banner only after that.
- **Message templates:**
  - edit and preview with sample details;
  - every edit saves a new **draft version**, and approving it makes it live;
  - **while a draft waits, the last approved version keeps being sent**, so editing never
    pauses messages;
  - texts must include the STOP line, fit 320 characters with long real details, and use
    only known merge fields;
  - Spanish, Somali and Swahili need a "fluent speaker reviewed this" tick before approval.
- **Change history:**
  - every save records who changed what and why, as a new numbered version;
  - if someone else saved in the meantime, you're asked to reload, so nobody overwrites
    another person's changes;
  - changing grace days or thresholds re-sorts the accounts right away.
- The **Dashboard** and **Settings** menu links are now live. Only Reconciliation still says
  "coming soon".

**How to try it:**
1. Open Settings, fill in the dealership phone and pay-online link, and Save.
2. Open an account and preview a text: the "missing details" warning is gone.
3. Open the Dashboard.

**Tests:**
- 8 new unit tests: keep rate, weekly trend grouping, safe CSV, settings checks (thresholds
  going up, hours, links, numbers), and template checks (STOP line, length with real
  details, unknown fields, email subject).
- 5 new database tests:
  - dashboard numbers add up;
  - saving settings records history, refuses stale edits, and re-sorts buckets;
  - Settings is admin-only;
  - a draft template doesn't replace the approved one until it's approved;
  - translations need the fluent-speaker tick.
- All 159 Collections tests pass. Full suite: 6,031 passed, 0 failed. Typecheck and
  Collections lint are clean.

**What you need to do:** fill in the dealership details in Settings (in the test preview
now, and on the real system once Collections goes live there).

---

## Stage 11: Hardening, browser tests, accessibility and the user guide (done)

**Browser tests** (`src/tests/e2e/collections.spec.ts`), run in a real browser (Edge) against
the test database:
- **Every screen** (Queue, Repo tab, Accounts, an account page, Inbox, Import, Dashboard,
  Settings):
  - loads with no page errors;
  - passes the automatic **accessibility check** (axe, WCAG 2.1 AA);
  - has **no sideways scrolling at phone width** (390 px). A screenshot is saved at desktop
    and phone width.
- **An admin works an account:**
  - records a promise;
  - previews the past-due text (it ends with "Reply STOP to opt out");
  - saves Settings;
  - downloads the dashboard CSV.
- **A collector:**
  - can work the queue and accounts;
  - doesn't see Settings or Import in the menu, and gets "not found" or "not allowed" if
    they try;
  - sees no "Approve" or "Mark verified" buttons.
- **Signed-out visitors** get nothing, and **unsigned text webhooks** are refused (403).

**Problems the browser tests found, all fixed:**
1. **Table headings and small gray text** were slightly too faint for the accessibility
   standard (4.36:1, where 4.5:1 is needed). Collections now uses a darker gray. The rest of
   the app is unchanged.
2. **The Dashboard pushed the page sideways on a phone.** Wide tables now scroll inside
   their own box.
3. **The Collections page frame added a second "main" landmark** inside the app's own,
   which confuses screen readers. It's now an ordinary section.
4. **The Dashboard's "Insurance problems" tile disagreed with the queue tab** (0 vs 3). The
   tile ignored DealerCenter's insurance column when nothing was on file in Collections.
   Both now use the same rule, and a test checks they match.
5. **Collectors saw Import and Settings links** they can't open. The Collections menu now
   shows only the links each person can use.

**Permission review:**
- All 19 Collections web routes check the on/off switch and who is signed in.
- Every route that changes something also checks the request came from the app itself.
- The text webhooks check Twilio's signature, and the scheduled job checks the cron
  secret.
- All 7 pages check permission on the server, and every action checks it again.
- Collectors can't import, change settings, clear flags, change account types, verify
  insurance, or approve disables and repos.

**Docs:**
- **`docs/COLLECTIONS_USER_GUIDE.md`:** how to turn Collections on in REVIEW mode, the
  morning import, working the queue, every screen, and the built-in safety rules.
  Reconciliation is marked "coming in Stage 15".
- **`docs/COLLECTIONS_OPEN_QUESTIONS.md`:** questions 8–11 added: the pay-online link and
  Zelle recipient, one days-past-due task at a time, insurance with nothing on file, and
  the timing of the disable warning.

**How to run the browser tests yourself (test database only):**
```
npx tsx scripts/collections-e2e-fixture.ts
```
Start a test server with `COLLECTIONS_MODULE=LIVE`, `COLLECTIONS_SMS_SENDING=DRY_RUN`, `PORT=3100`, then:
```
RUN_COLLECTIONS_BROWSER=1 PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test src/tests/e2e/collections.spec.ts
```
- The fixture script refuses to run unless the database is the local test copy.
- The login tokens it creates are saved in `tmp/collections/`, which git ignores.
- Only one Next.js dev server can run per folder. Stop the preview before starting the
  test server.

**Test results:**
- **4 of 4** browser tests pass.
- All 160 Collections tests pass, including the 59 database tests.
- Full suite: 6,032 passed, 0 failed.
- Typecheck is clean, and lint shows only the 1 error that was there before Collections.

### Where things stand after Stages 1–11 (the Collections core)

The core of Collections is complete and tested:
- import;
- queue and accounts;
- promises, plans and reported payments;
- automatic board tasks and messages (dry run);
- inbox and STOP handling;
- insurance;
- starter disable and repo, with letters;
- dashboard and settings.

Every new switch defaults to OFF, so the dispatch board looks exactly as before.

**Next:** Release 1 continues with stages 12–16 (spec section 28.1): upgrades, integration
adapters, the ledger, migration import and Reconciliation, and final hardening. Stages 12
and 14 need database changes, so I'll stop and ask you to back up first.

**What you need to do:** nothing new for this stage. The owner to-do lists (spec sections 21
and 27) and the open questions still stand.

---

## Stage 12: Upgrades (done; database change applied to the test copy only)

**Backups first.** At your request I backed up both databases before this stage, and checked
that both backups read back correctly. They're in `C:\Users\timem\dispatch-board-backups\`:
- `dispatch_board-before-stage12-20261116-0722.dump`
- `dispatch_board_collections-before-stage12-20261116-0722.dump`

**Database change** (`prisma/migrations/20261116120000_collections_upgrades`):
- **Purely additive:** 9 new tables, 3 new optional columns, and 6 new lists of choices.
  Nothing existing is renamed, changed or removed.
- **Where it went:** applied to the test database `dispatch_board_collections` only. **Your real
  database isn't touched.** It gets these tables later, through the normal merge and deploy,
  with your approval.

**What I built**
1. **Playbook** (`/collections/playbook`, admins only):
   - **Stage by stage:** one place that shows, for each stage (Current, Grace, 6–14, 15–30,
     31–60, 61+), which text goes out on which day and which task or review is created.
   - **Editing:** you can switch each step on or off and change its day. Every save is a new
     version with who and why, and older versions can be restored.
   - **Seeded:** the **"Standard" playbook** is created from today's rules, so nothing
     behaves differently until you change it.
   - **Who reads it:** the automations now take their review days, text timing and task
     switches from the active playbook. Settings links there.
   - **Safety rules can't be edited here:** send rules, quiet hours, STOP, the bankruptcy
     freeze, human-only actions, and the never-automatic disable warning. Switching off a
     review falls back to the next lower one, so an account isn't left with no follow-up.
2. **Risk score and "Do this next"** (on every account page, and **Order: highest risk first**
   in the queue):
   - **The score:** 0–100, from days past due, getting further behind, missed payments,
     broken promises, being hard to reach, insurance, possible skip, and a new account. Every
     point is listed with its reason, and the points per factor are settings.
   - **One recommended action with its reason,** for example "Call today: promise broken
     yesterday, answered 3 of last 4 calls".
   - **When it's saved:** once per account per day; running it again the same day updates
     that day's row.
3. **Extensions, deferrals and due-date changes:**
   - **Anyone can request** one. It's checked against the rules: at least 6 months old, at
     most 2 a year, no open promise. All three are settings.
   - **The owner approves or declines.** Approving a request that breaks the rules needs a
     written reason.
   - **Approval** puts a **"Post in DealerCenter"** task on the board; marking it applied
     closes the task.
4. **Possible skip and the skip-trace checklist:**
   - **Raised automatically when:** there's been no conversation for 14 days (a setting)
     while past due; the phone is disconnected or a wrong number; mail came back; or the GPS
     shows no signal.
   - **A person always decides:** **confirm** sets the Skip flag, and **dismiss** keeps it
     quiet for the same 14 days.
   - **The checklist** covers references, new phone or address, GPS, a vendor search, and the
     employer.
5. **Charge-off and recovery:**
   - **After a repo is sold or returned to inventory:** record the sale price and costs. The
     app works out the **deficiency or surplus** and reminds you to check Minnesota notice
     rules with your attorney.
   - **Charge-off:** anyone can request it; **the owner approves**. Before 120 days past due
     (a setting) it needs a written reason. Approval creates a DealerCenter task.
   - **Recovery payments** are tracked afterwards.
6. **YES and PAID text replies:**
   - **YES** confirms the customer's next promise (within 7 days) and thanks them.
   - **PAID** records a "customer says they paid", once a day, and the next imports confirm
     it.
   - **A customer who had texted STOP** and replies YES is re-subscribed instead (the
     carriers' rule).
   - **The default promise-reminder text** now ends "Reply YES to confirm". Your organization's
     existing template stays as it is until you edit it in Settings.
7. **Fees and credits:**
   - **The kinds:** repo, storage, returned-payment and other fees; late-fee waivers; goodwill
     and other credits.
   - **Approval:** **all need the owner's approval by default** (the amount limit is a
     setting).
   - **The process:** approve, then post it in DealerCenter (a board task), then mark it
     posted. The next imports **confirm** it automatically, or **flag** it after 2 days if
     DealerCenter never shows it.
8. **Dashboard: deeper measures:**
   - contact rate and right-party contact rate;
   - average days to first contact;
   - promises kept and broken %;
   - **roll rates** between buckets (30 days ago vs today) and cure rate;
   - cure rate after an extension;
   - charge-off rate, net loss and recovery %.

   Roll rates need imports from 30+ days ago.

**Problem the tests found, fixed:** with a "do-not-repo" hold, a 70-day account got no
follow-up at all. It now falls back to the 30-day review, as before.

**Tests:**
- 14 new unit tests:
  - playbook (Standard = today's rules, guardrails, validation, fallback, stage layout);
  - risk score and "Do this next";
  - extension rules, skip signals, deficiency, fee/credit matching, roll rates;
  - YES/PAID in 4 languages.
- 7 new database tests:
  - a playbook change closes tasks that no longer apply, refuses a stale edit, and restores;
  - one risk score per account per day;
  - the extension override, and a DealerCenter task the sync leaves alone;
  - skip alert raise, dismiss and confirm;
  - charge-off approval and recovery;
  - a fee confirmed by the next import, and a credit flagged when never seen;
  - YES and PAID.
- **All 181 Collections tests pass.**
- **Full suite:** 6,044 passed. 2 existing tests (appointment scheduling, shop recon) timed out
  under full-suite load and pass on their own. That's the same flaky-timeout issue noted
  earlier, and those tests don't touch Collections.
- Typecheck and Collections lint are clean.

**What you need to do:**
- **Fee amounts:** confirm the Minnesota limits on repo, storage and returned-payment fees,
  and on any deficiency, with your attorney (open questions 1 and 4).
- **Default fee amounts:** set them in Settings once you know them.
- **Playbook:** look it over and adjust if you'd like.

---

## Stage 13: Integration adapters (done; no database change)

**What I built** (`src/features/collections/server/integrations/`)
- **One standard "plug" for each outside service** in spec section 24, so a real vendor can be
  connected later without changing any screens:
  - payment processing (+ PayNearMe cash);
  - bankruptcy alerts (Epiq AACER);
  - the FCC reassigned-numbers check;
  - insurance verification (Axle);
  - the Advantage GPS API;
  - certified mail and address checks (Lob);
  - the repossession network (RDN);
  - business phone (click-to-call);
  - e-signature;
  - skip tracing;
  - the DealerCenter API.
- **Each has its own switch**, `COLLECTIONS_INTEGRATION_…` = OFF, TEST or LIVE, already in
  `.env.example`:
  - **every switch defaults to OFF;**
  - **in Release 1, LIVE is held at TEST.** Only built-in fake versions run, and nothing
    contacts a real vendor;
  - OFF refuses with the **manual way** to do the job instead, for example "Use the Advantage
    portal, then press Done in portal".
- **Fake (TEST) versions** of all 11, with predictable results, including the unhappy cases:
  - payments: an amount ending in 13 cents is declined;
  - reassigned numbers: a number ending in 0000 is reassigned;
  - insurance: a policy with "LAPSED" in it is lapsed;
  - bankruptcy: a name with "BKTEST" in it is a match;
  - mail: an address with "UNDELIVERABLE" in it fails.
- **Safety checks on every call**, built into the plug itself:
  - **money** (charge, ACH, refund) needs a named person and a recorded approval;
  - **starter disable/enable** needs an owner-approved starter request, and a bankruptcy
    freeze blocks disabling;
  - **skip-trace searches** must record a permissible purpose;
  - **mail, repo assignments and e-signature** need a named person;
  - automations and AI can't do any of these;
  - bankruptcy matches are only **proposals**: a person sets the flag.
- **Call log:** every call is saved in the audit history with the operation, mode, success,
  time taken and any error. **Customer details sent to the vendor are never logged.**
- **Integrations page** (`/collections/integrations`, admins only), with one card per service:
  - its switch and when it's planned to go live;
  - what it does and the manual way;
  - calls and failures in the last 30 days, and the last error;
  - a **"test call"** button that only works in TEST mode and uses harmless sample data.

**How to try it:**
1. Open Collections, then Integrations. Everything shows **OFF**.
2. To try one, set its switch to TEST in the `.env` file, for example
   `COLLECTIONS_INTEGRATION_PAYMENTS=TEST`.
3. Restart the app, then press its test button.

**Tests:** 9 new tests:
- switches default to OFF, LIVE is held at TEST, and everything is OFF with the module off;
- all 11 integrations have a manual fallback;
- the fakes' happy and unhappy paths;
- OFF refuses and shows the manual way;
- TEST calls are logged without customer details, and no network call is ever made;
- money needs a person and an approval;
- the GPS plug needs an owner-approved request and respects the bankruptcy freeze;
- skip trace needs a permissible purpose;
- the health page counts calls and failures, test calls run only in TEST mode, and the page
  is admin-only.

All 190 Collections tests pass. Full suite: 6,049 passed, 0 failed. Typecheck and Collections
lint are clean.

**What you need to do:** nothing now. When you open accounts with these vendors (spec sections 21
and 27), each one gets its real connection in a later release.

---

## Stage 14: Servicing ledger (done; database change applied to the test copy only)

**Backups first:** I made fresh backups of both databases and checked they read back
correctly (`...-before-stage14-20261116-0829.dump` in `C:\Users\timem\dispatch-board-backups\`).
Then you confirmed "backup done".

**Database change** (`prisma/migrations/20261116140000_collections_ledger`):
- **Purely additive:** 5 new tables and 6 new lists of choices. Nothing existing is renamed,
  changed or removed.
- **Where it went:** applied only to the test database `dispatch_board_collections`. **Your real
  database isn't touched.**

**What I built**
- **The tables** (spec 25.1–25.3):
  - **servicing contract:** one per account. Fixed-payment or simple-interest; weekly,
    every 2 weeks, twice a month or monthly; payment, count, dates, APR, side note;
  - **payment schedule versions:** never edited; a change makes a new version with a reason
    and an approver;
  - **ledger transactions:** never edited. Corrections are reversals, and re-posting the same
    import row is ignored;
  - **allocations:** how each payment was split, kept for receipts.
- **The engine** (`domain/ledger.ts`):
  - **Due dates:**
    - weekly and every 2 weeks;
    - monthly, with short months clamped, so Jan 31 becomes Feb 28;
    - twice a month, 15 days apart.
    - Optional: move weekend and holiday due dates to the next business day. This is a
      setting, off by default.
  - **Schedules:**
    - fixed-payment: equal payments, with the last one making the exact total;
    - simple-interest: interest by actual days, and the last payment clears the balance.
  - **Replay:** every number is **recalculated from the entries every time**, never typed in.
    That covers the total balance, past-due amount, days past due, payment due now, fees, late
    fees, principal and interest to the day, unapplied money, charge-off and recovery.
  - **Payment order** (a setting): fees, then late fees, then past-due payments (oldest
    first), then the current payment, then principal.
  - **Fixed-payment:** extra money pays ahead.
  - **Simple-interest:** extra money goes to principal and shortens the loan.
  - **Reversals and returned payments** cancel the original completely. Everything is
    replayed, so later payments are re-split correctly. A returned-payment fee is a separate
    entry.
  - **Opening balance** (for accounts moved over from DealerCenter in Stage 15) treats the
    earlier payments as made.
- **Rules when posting:** reversals, returned payments, adjustments, waivers, credits and
  charge-offs need an approver and a written reason. A payment can't be reversed twice.
  **Only admins** can create contracts or post entries.
- **Account page → "Servicing ledger (shadow)":**
  - the contract, its schedule, balances, and every entry with how it was split;
  - an admin form to enter a contract by hand, to try it out;
  - **a clear note that DealerCenter is still the official record.** Nothing here charges
    the customer or changes DealerCenter.

**A bug the tests found, fixed:** on a simple-interest loan, paying the full payoff amount left
the future payments showing as owed, so it never said "paid off". Once principal and interest
are both zero, the loan is now done.

**How to try it:**
1. Open an account and expand "Servicing ledger (shadow)".
2. Create a contract (for example 10 weekly payments of $100).
3. Post a payment and see how it's split.
4. Post a "Returned payment" against it and watch the balance come back.

**Tests:**
- **29 new engine tests:**
  - due dates for all four frequencies, plus the weekend/holiday rule;
  - fixed-payment and simple-interest schedules, and impossible terms;
  - fixed-payment replay: current, past due, fee/late-fee/oldest-first order, partial
    payments, paying ahead, overpayment, a custom payment order;
  - reversals and returned payments, including later payments re-split, a returned-payment
    fee, a bad reversal, and same answer in any order;
  - simple-interest: interest before principal, paying late costs more, extra principal,
    payoff to the day, reversal;
  - biweekly and semimonthly contracts paid to zero;
  - waivers, credits, adjustments, side notes, charge-off and recovery, opening balance, and
    future-dated entries.
- **6 new database tests:**
  - the contract and schedule;
  - a payment's split stored and recalculated;
  - a returned payment that needs a reason, can't happen twice and restores the balance, with
    nothing deleted;
  - the same import row posted only once;
  - an adjustment without an approver refused;
  - a reschedule makes schedule version 2;
  - admins only.
- **All 225 Collections tests pass.**
- **Full suite:** 6,078 passed, 0 failed.
- Typecheck and Collections lint are clean.

**What you need to do (before the ledger can ever become the official record, not now):**
- **Your accountant** confirms:
  - the payment order;
  - how simple interest is calculated (actual/365, rounded at each payment);
  - Minnesota sales tax on lease-to-own payments.
- **Your attorney** confirms the late-fee rules.

These are already in the open questions.

---

## Stage 15: DealerCenter history import, shadow posting and Reconciliation (done; no database change)

**What I built**
1. **History import** (on the Reconciliation page, admins only). It loads DealerCenter's
   history into the shadow ledger:
   - **Contracts file:**
     - **What's needed:** payment amount, frequency, number of payments and first due date.
       Simple-interest loans also need the APR and amount financed.
     - **The result:** each matching account gets a servicing contract and payment schedule.
       Accounts that already have one are left alone.
   - **Payment history file** (optional):
     - payments, late fees, fees, waivers, payoffs and returned payments;
     - a returned payment is linked to the earlier payment it cancels;
     - "Returned Check Fee" counts as a fee, not a returned payment.
   - **Or opening balances:** start every contract from the latest DealerCenter import, using
     its balance, late fees and other fees.
   - **Built to be configurable:**
     - **Flexible columns:** each field recognizes several likely column names, and if
       DealerCenter calls a column something else, you pick the right column from a list.
       DealerCenter's exact export format still needs confirming, so nothing about it is
       hard-coded.
     - **Check first:** "Check file" shows what would happen and changes nothing.
     - **Safe to re-run:** importing the same file again adds nothing twice.
2. **Daily shadow posting:** after each DealerCenter import, the app compares it with the
   import before it:
   - a higher late-fee balance means a late fee;
   - a higher "other" balance means a fee;
   - a lower total balance (after those fees) means a payment.

   These entries are marked "Inferred from the DealerCenter import", and each import is posted
   only once. Importing the real payment history is more exact, so inference only covers
   imports after it.
3. **Reconciliation** (`/collections/reconciliation`, the last "coming soon" link, now live):
   - **The check:** for every account with a contract, the app's ledger as of the import date
     is compared with DealerCenter's **balance, amount due, days past due and late fees**.
     Up to 1 cent of rounding is allowed.
   - **Likely cause, in plain English:**
     - "days past due off by one: DealerCenter may count the due date";
     - "due dates differ: check the frequency and first due date";
     - "amount due differs by one payment";
     - "DealerCenter charged a late fee the ledger doesn't have";
     - "payments were inferred; importing the history would be more exact".
   - **Filters:** differences, matched, no contract yet, all.
   - **Match rate by day:** saved after every import.
   - **Owner notes** on any difference.
   - **The switch-over check** from the spec: 60 days of daily matching, every difference
     either fixed or explained, every account with a contract. **The official record stays
     locked to DealerCenter in Release 1**, even when the check passes.
4. **Automations:** each import and the daily run do shadow posting, then reconciliation,
   whenever any contracts exist.

**Problem the tests found, fixed:** "Returned Check Fee" was being read as a returned payment.

**How to try it (test database):**
1. Open Collections, then Reconciliation, then "Load DealerCenter history".
2. Upload a contracts CSV and press "Check file". Fix any columns, then Import.
3. Press "Load opening balances", then "Check again now".
4. Accounts whose contract matches DealerCenter show as Matched; the rest show their
   differences with a likely cause.

**Tests:**
- 2 new unit tests: reading frequencies, methods, rates and transaction types, and the
  plain-English causes.
- 5 new database tests:
  - contracts file checked first, a column mapped by hand, unknown accounts and frequencies
    reported, and a re-import adding nothing;
  - payment history imported once, with the returned payment linked and its fee charged;
  - opening balances: one account matches DealerCenter exactly, and another shows "due dates
    differ" with the same balance; the daily match rate is saved and the switch-over stays
    locked;
  - the next day's import posts the inferred $150 payment exactly once and stays matched;
  - owner notes, and collectors can't import.
- All 232 Collections tests pass.
- Full suite: 6,079 passed. 1 existing test (CRM pages) timed out under full-suite load and
  passes on its own (18 of 18); it's the known flaky-timeout test.
- Typecheck and Collections lint are clean.

**What you need to do:**
- **Get DealerCenter's full data export** (contracts, payment history, notes; spec section 27
  item 2), then load it here.
- **Once loaded, check the differences:** the likely causes show which settings to adjust,
  for example the payment order or how days past due are counted.
