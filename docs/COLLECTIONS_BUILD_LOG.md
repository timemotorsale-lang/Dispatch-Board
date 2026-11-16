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

**Not finished:** viewing the proof file from the account page. It's stored privately in
the Document Library and listed by file name. A "view" button comes in Stage 11, along with
the other screen polish.

**What you need to do:** nothing now.
