# Collections: User Guide

A plain-English guide for the owner. Collections helps you work past-due accounts every
day. **DealerCenter stays the official record** for balances and payments. Collections
reads a daily DealerCenter file, tells you who to call, keeps notes, and reminds you on
the dispatch board.

> Nothing in Collections takes money, disables a car or sends a letter on its own. Those
> are always a person's decision. While you're testing, every text and email is a "dry
> run": it's saved but never sent.

---

## 1. Turning it on (REVIEW mode)

Collections is controlled by switches in the server's `.env` file. Every switch starts
**OFF**, so the dispatch board looks exactly as before.

| Switch | What to set for testing | What it means |
|---|---|---|
| `COLLECTIONS_MODULE` | `REVIEW` | Only admins (General Manager or Collections Manager) see Collections |
| `COLLECTIONS_SMS_SENDING` | `DRY_RUN` | Texts are saved, never sent. REVIEW mode forces this anyway |
| `COLLECTIONS_EMAIL_SENDING` | `DRY_RUN` | Same for email |

After changing `.env`, restart the app. A **Collections** link appears at the bottom of the
left menu.

The other modes come later:
- **PILOT:** admins, plus the user IDs listed in `COLLECTIONS_PILOT_USER_IDS`;
- **LIVE:** everyone with a Collections role.

Real sending (`LIVE`) needs Twilio set up (`docs/COLLECTIONS_DEPLOY.md`) and your
attorney's answers (`docs/COLLECTIONS_OPEN_QUESTIONS.md`).

**Who can do what**
- **Admins** (General Manager, the "Collections Manager" role, or a "collections admin"
  duty) can do everything.
- **Collectors** (the "Collections" role, or a duty containing "collections") can:
  - view accounts, log contacts, record promises and plans;
  - send manual texts;
  - set flags;
  - **request** a starter disable or repo review.

  They **can't**:
  - approve a disable or repo;
  - clear flags;
  - change account types;
  - import;
  - change settings.

**First time:** open **Collections → Settings**. Fill in the pay-online link, Zelle
recipient and Advantage GPS portal link, then press **Save settings**. Your name, phone
and address are already filled in.

---

## 2. Importing the DealerCenter file (every morning)

1. In DealerCenter, export the **Active Accounts** report (Excel or CSV).
2. In Dispatch Board, open **Collections → Import** and choose the file.
3. Check the **preview**:
   - **New / Updated / Unchanged:** accounts compared with the last import.
   - **Needs review:** no matching vehicle (by stock number) or no linked customer. These
     are still imported; link them later from the account page.
   - **Missing:** accounts in the last import but not in this one, usually paid off,
     closed or repossessed. They're flagged, never deleted.
   - **Totals:** account count, total balance and bucket counts. Compare these with
     DealerCenter. Your real file should show 277 accounts and about $1,827,508.
4. Press **Confirm import**. The app then, on its own:
   - updates every account's status and bucket;
   - marks promises kept, partly kept or broken;
   - creates or closes board tasks;
   - queues reminder texts, which stay dry runs while you test.

The same file can't be imported twice. If nothing is imported by 10:00 am (Mon–Sat), an
"Import DealerCenter accounts" task appears on the board.

---

## 3. Working the queue (`Collections`)

The **queue** is today's call list, in the order to work it:
1. broken promises;
2. "customer says they paid" that no import has shown yet;
3. most days past due;
4. largest amount due.

Customers who just texted in jump to the top.

**Tabs:** All past due · Broken promises · Promises due today · Disable eligible · Repo
review · Insurance problems · Needs review · Frozen/flagged · Not in latest import.
Bankruptcy-frozen accounts only appear under *Frozen/flagged*.

**Quick actions on each row:**
- **Call:** opens your phone, then the contact log.
- **Text:** opens the text panel on the account.
- **Log:** records what happened.
- **Promise:** records a promise to pay.

On a phone the queue becomes cards with tap-to-call.

---

## 4. The account page

From top to bottom:

- **Header:** customer, vehicle (links to the dispatch board vehicle), type (Lease-to-own
  or BHPH), status, bucket, flags, and the assigned collector. Red banners show a
  bankruptcy freeze or a missing-from-import account.
- **Money:** balance, amount due, due date, payments left and the balance breakdown, with
  "Data as of" the import date.
- **Log contact:** call, text, email or in person, with the outcome and the next action
  date.
- **Promises, plans and reported payments:**
  - **Promise:** an amount and a date. It's checked automatically against the next
    imports.
  - **Payment plan:** 2–52 payments. A new plan replaces the old one.
  - **Customer says they paid:** confirmed when an import shows it. If nothing shows within
    2 days it becomes "Not found", and a "check DealerCenter" task appears. Remember to
    post Zelle and cash payments in DealerCenter.
- **Text or email:**
  - pick a template, press **Preview** (the exact text, its length, and any reason it
    can't go), then **Save (dry run)** or **Send**;
  - customers who texted STOP are blocked until you record new consent from them.
- **Insurance:**
  - upload a card photo or PDF; tick "read the card for me" to fill the form in, then
    check every field;
  - an admin marks it **verified** after checking that you're listed as lienholder;
  - "Customer has no insurance" creates a follow-up task.
- **Starter disable, repossession and letters:**
  - **Disable:** request (with how and when the customer was warned), then admin
    approval, then do it in the Advantage portal, then press **Done in portal**.
    Re-enable works the same way. A "Re-enable starter" task appears automatically when a
    payment or promise comes in after a disable.
  - **Repo:** start review, approve, then **Assign to TLC Recovery**. Then Located,
    Recovered, In storage, and an outcome: Redeemed, Returned to inventory (creates an
    inventory check-in task), or Sent to auction.
  - **Letters:** pre-repo and post-repo PDFs. They show a red **DRAFT** banner until your
    attorney's wording is pasted into Settings, and drafts can't be marked as sent.
    Certified mail needs a tracking number.
- **Flags:**
  - bankruptcy (a full freeze; clearing it needs an uploaded document);
  - attorney represented;
  - contact restricted;
  - dispute, deceased, skip;
  - do-not-repo hold.
- **Details:** phone, email, address, language, VIN, GPS serial, "GPS disclosed in
  contract", and links to the customer and vehicle records.
- **Timeline:** everything that happened, newest first.

---

## 5. Other screens

- **Accounts:** the full list, with search and sorting, 50 per page. Tick accounts to
  change their type or assign a collector in bulk. **Download CSV** exports the list.
- **Inbox:**
  - customer texts by conversation, unread first;
  - reply with a template;
  - opening a conversation marks it read;
  - numbers that don't match an account are listed separately.
- **Dashboard:**
  - tiles for today, past due by bucket, promise keep rate (30/90 days), weekly trends and
    staff activity;
  - every table downloads as CSV, and **Print this page** gives a clean printout.
- **Settings** (admins only):
  - dealership details, business hours, grace days and thresholds;
  - timing for automatic messages and the weekly limit;
  - whether collectors see all accounts or only their own;
  - repo letter wording and message templates (edit, then draft, then approve).

  Every save is versioned, with who and why.
- **Dispatch board:** Collections tasks show in the **Collections** area of the board.
  They close themselves when the reason goes away. If you complete one yourself, it stays
  done.
- **Reconciliation:** *coming in Stage 15.* It will compare the app's own ledger with
  DealerCenter, account by account, so you can see any differences before relying on it.
  This section of the guide will be filled in then.

---

## 6. Safety rules built in

- **DealerCenter is the official record** in this release. The app never changes
  DealerCenter.
- **No automation** disables a starter, assigns a repo, sends a letter, clears a flag or
  approves money.
- **Bankruptcy freeze** stops all texts, emails, disables, repo steps and letters.
  Re-enabling a starter is still allowed.
- **Never automatic, never overwritten:**
  - no customer is ever linked to an account automatically (it's only suggested);
  - imports never change an account's type.
- **History is kept:** nothing is deleted. Every change is recorded with who, when and
  why.
- **Phone numbers are masked** in server logs. Message text never appears in the board's
  activity feed.
