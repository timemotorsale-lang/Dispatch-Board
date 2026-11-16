# Collections Module: Master Build Spec

**Project:** Time Motor Sales Dispatch Board (Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Vitest, Playwright)
**Module:** Collections (lease-to-own accounts; BHPH supported)
**Spec version:** 2.0, Nov 15, 2026. Version 1.0 was collections only. Version 2.0 adds the 8 upgrades, AI agents, integrations, and a full servicing ledger so the dealership can leave DealerCenter within 12 months (sections 22–28).
**Releases:** this spec covers the whole 12-month plan. Each master prompt builds **one release** (section 28). The first is Release 1.
**Branch:** `collections-module`. **Feature flag:** `COLLECTIONS_MODULE` (default `OFF`)

> This file is the single source of truth for the build. If something here conflicts with the existing code, keep the existing code working and follow the existing patterns. If something is unclear, choose the safer option and write the question down in `docs/COLLECTIONS_OPEN_QUESTIONS.md`. Do not guess about anything legal.

---

## 0. Ground rules (apply to every stage)

1. Work only on the `collections-module` branch. Commit at the end of every stage with a clear message.
2. **Never break or change existing dispatch board behavior.** Only add to it. Run the existing test suite (`npm run lint`, `npm run typecheck`, `npm test`) after each stage. All tests must pass.
3. Read `AGENTS.md` first. This project uses a newer Next.js version, so read `node_modules/next/dist/docs/` before writing Next.js code, and follow its conventions.
4. Put the new code in `src/features/collections/`, with routes under `/collections`. Follow the folder, naming and style patterns of the existing features, especially `money-resources`, `customers`, `tasks` and `vendors`.
5. **Database changes are additive only** (new tables, new nullable columns, new enum values). Never rename or drop anything. One migration per stage. **Before generating or applying any migration, stop and tell the owner to back up the database**, then continue.
6. Store money as **integer cents**. Display it as dollars.
7. Financial, contact, consent and audit history is **append-only**. Fix mistakes with a correction or reversal record, never by updating or deleting history.
8. Every query is scoped to the user's `organizationId` and checked against permissions on the server.
9. Use the existing auth/session, roles, Document Library storage, ActivityEvent, Task, Vendor, Customer and Vehicle models. Do not create parallel versions of them.
10. **No real customer data in the repo.** Tests use a fake fixture file with the same columns as the DealerCenter export (section 4). Never commit `.env` or secrets. Add new variables to `.env.example` with safe placeholder values.
11. All screens are **mobile-first** and must work at phone width (≥360px) and desktop. Follow the app's existing UI components and look. Meet the existing accessibility checks (axe).
12. Time zone: **America/Chicago** for all business logic (due dates, quiet hours, business hours).
13. Outside services (Twilio, email) are always behind their own flags. When they are off, the module runs in **dry-run mode**: it logs what it *would* send.

---

## 1. Key decisions (from the owner)

| Topic | Decision |
|---|---|
| Record of payments | **Changed in v2.0.** DealerCenter stays the official ledger **until the module proves it matches**. The module has its own full ledger from Release 1, running in **shadow**: it calculates every balance and reconciles daily against the DealerCenter import. When every account matches for 2 full monthly cycles, the owner flips `SYSTEM_OF_RECORD` from `DEALERCENTER` to `DISPATCH_BOARD` (section 26). |
| Timeline | 12 months: servicing off DealerCenter by **July 2027**; DealerCenter fully cancelled by **end of November 2027** (section 28). |
| Credit reporting | Not done today; added as a new capability after cutover (Metro 2). |
| Fees and credits | Staff can add fees and credits to any account (section 22.8). |
| Account type | DealerCenter can't do leases, so all accounts are labeled "BHPH" there. **Every imported account defaults to `LEASE_TO_OWN`.** The owner can change one or many to `BHPH`. Re-imports never overwrite the type. |
| Ownership | The customer owns the vehicle after the last payment (no buyout). |
| Process | The same collections process for lease-to-own and BHPH. |
| Users | The owner today (does everything); maybe one collector later. |
| Devices | Desktop and phone. |
| Import | DealerCenter "Active Accounts" export (.xlsx/.csv), uploaded manually every morning. |
| Grace / late fee | 5-day grace, then a $10 flat late fee (charged by DealerCenter). Both are **settings**. A Minnesota rule needs an attorney check (section 12). |
| Starter disable | Considered at **7+ days past due**. Always a manual owner decision. Sent in the Advantage GPS portal for now (no API yet). |
| Repossession | Case by case, usually **60+ days**. Repo company: **TLC Recovery**. |
| After repo | Redeemed (customer pays, gets the car back), returned to inventory, or sent to auction. |
| Texts | **Twilio** from the module (new business number, A2P 10DLC registration). Two-way inbox. |
| Email | The existing Resend setup. |
| Languages | English, Spanish, Somali, Swahili. |
| Tone | Friendly and helpful. |
| Business hours | Mon–Fri 9am–6pm, Sat 10am–3pm, closed Sun. |
| Consent | Call/text consent is in the customer contract. |
| Who to contact | The **main customer only**. References and co-buyers are never contacted automatically. |
| Payment methods | Online link, in person, phone, cash at a store, Zelle. |
| Payment plans | Yes: multi-installment catch-up plans. |
| Insurance | Track it fully and remind customers. Proof arrives as a card photo or from the insurance company. |
| Letters | Printed/PDF letters **only around repossession**. Everything else by text and email. |
| Bankruptcy | **Full freeze** of the account (section 12). |
| Attorney / stop contact | Owner decides case by case, **except** texting opt-outs (STOP), which are automatic and mandatory. |
| Hosting | A server at the dealership (existing `deploy/docker`: Caddy, Tailscale, Portainer). |

---

## 2. Roles and permissions

Reuse the existing user/role system. Add collections permissions:

| Permission | Collections Admin (owner) | Collector (future) |
|---|---|---|
| View accounts, queue, inbox | ✓ | ✓ (all accounts or assigned only, per a setting) |
| Log contacts, promises, plans, customer-reported payments | ✓ | ✓ |
| Send manual texts/emails | ✓ | ✓ |
| Change account type (Lease/BHPH) | ✓ | – |
| Set/clear flags (bankruptcy, attorney, contact restrictions) | ✓ | Set only; clearing needs Admin |
| Approve starter disable / repo assignment | ✓ | Request only |
| Import DealerCenter files | ✓ | – |
| Edit settings and templates | ✓ | – |
| Dashboard | ✓ | ✓ (own activity) |

The owner gets Collections Admin automatically when the module is turned on.

---

## 3. Data model (new Prisma models)

Match the project's naming and field conventions (`cuid()` ids, `organizationId`, `createdAt`/`updatedAt`, relation names). All `*Cents` fields are `Int`. Index every foreign key plus the common filters (organizationId + status, + daysPastDue, + nextActionAt).

### 3.1 CollectionAccount (one per contract)
- `organizationId`, `externalAccountId` (DealerCenter AccountId, unique per org), `dealNumber`, `contractDate`
- `accountType` enum `LEASE_TO_OWN | BHPH` (default LEASE_TO_OWN; **never overwritten by imports**)
- `customerId` → Customer (nullable until matched), `vehicleId` → Vehicle (nullable until matched)
- `buyerNameRaw`, `vehicleDescriptionRaw`, `stockNumberRaw` (as imported)
- `status` enum `CURRENT | GRACE | PAST_DUE | PROMISE_ACTIVE | PLAN_ACTIVE | DISABLE_ELIGIBLE | STARTER_DISABLED | REPO_REVIEW | REPO_ASSIGNED | REPOSSESSED | REDEEMED | BANKRUPTCY_FROZEN | PAID_OFF | CLOSED` (derived from the latest snapshot plus workflow state; recalculated, never typed by hand except through the actions in sections 6–11)
- `paymentAmountCents`, `paymentFrequency` enum `WEEKLY | BIWEEKLY | SEMIMONTHLY | MONTHLY | UNKNOWN` (nullable/UNKNOWN until the contact/detail import)
- `assignedCollectorUserId` (default: owner)
- Optional contact fields, empty until the second import or manual entry: `primaryPhone`, `primaryEmail`, `mailingAddress`, `preferredLanguage` enum `EN | ES | SO | SW` (default EN), `vin`
- GPS: `gpsProvider` (default "Advantage GPS"), `gpsDeviceSerial`, `gpsDisclosedInContract` (Boolean?, Minnesota disclosure)
- Consent: `consentSource` (default "CONTRACT"), `consentDate` (default = contractDate)
- `nextActionAt`, `lastContactAt`, `lastImportedAt`, `archivedAt`

### 3.2 CollectionAccountSnapshot (one per account per import; append-only)
- `accountId`, `importRunId`, `asOfDate`
- Balances in cents: `downCents`, `principalCents`, `interestCents`, `otherCents`, `lateCents`, `sideNoteCents`, `creditCents`, `totalBalanceCents`, `amountDueCents` (= TotalPaymentDueAmount)
- `paymentDueDate`, `daysPastDue`, `paymentsRemaining`, `promiseDateFromDms`
- `dmsAccountStatus`, `dmsRepoStatus`, `dmsInsuranceStatus`, `dmsAutopayStatus`, `dmsCollectorName`, `dmsLenderType`
- `bucket` enum `CURRENT | GRACE_1_5 | LATE_6_14 | D15_30 | D31_60 | D61_PLUS`

### 3.3 CollectionsImportRun
- File name, file hash (prevents importing the same file twice), uploaded by, started/finished, `asOfDate` (from the file name or chosen by the user), row counts (total, created, updated, unchanged, needs review, errors), error details JSON, status `PREVIEW | COMMITTED | FAILED | CANCELLED`
- Store the uploaded file in restricted Document Library storage (not in the repo, not public).

### 3.4 CollectionContactAttempt (append-only)
- `accountId`, `userId`, `occurredAt`, `channel` enum `CALL_OUT | CALL_IN | TEXT_OUT | TEXT_IN | EMAIL_OUT | EMAIL_IN | IN_PERSON | LETTER | VOICEMAIL`
- `outcome` enum `NO_ANSWER | LEFT_MESSAGE | SPOKE_WITH_CUSTOMER | WRONG_NUMBER | DISCONNECTED | PROMISE_MADE | PLAN_MADE | PAYMENT_REPORTED | REFUSED | DISPUTE | HARDSHIP | REQUESTED_NO_CONTACT | ATTORNEY_REFERRED | BANKRUPTCY_REPORTED | OTHER`
- `notes`, `contactPoint` (number/email used), `messageId` (if linked to a message)

### 3.5 PaymentPromise
- `accountId`, `promisedAmountCents`, `promisedDate`, `takenByUserId`, `source` (`MANUAL | IMPORTED_FROM_DMS | PLAN_INSTALLMENT`), `planId?`, `installmentNumber?`
- `status` `OPEN | KEPT | PARTIALLY_KEPT | BROKEN | CANCELLED | SUPERSEDED`, `resolvedAt`, `resolutionNote`

### 3.6 PaymentPlan
- `accountId`, `createdByUserId`, `reason`, `status` `ACTIVE | COMPLETED | BROKEN | CANCELLED`, `totalCatchUpCents`
- Has many PaymentPromise installments (date + amount).

### 3.7 CustomerReportedPayment
- `accountId`, `reportedAt`, `method` `ONLINE | IN_PERSON | PHONE | CASH_AT_STORE | ZELLE | OTHER`, `amountCents`, `paidDate`, `referenceNumber`, `notes`, `enteredByUserId`
- `status` `PENDING_CONFIRMATION | CONFIRMED_BY_IMPORT | NOT_FOUND | CANCELLED`
- Confirmed automatically when a later snapshot shows the amount due went down or days past due improved by at least the reported amount; otherwise it's flagged `NOT_FOUND` after 2 days (setting) for review. Reminder for the owner: post Zelle and other outside payments in DealerCenter.

### 3.8 CollectionFlag (append-only set/clear history; the current state is derived)
- `accountId`, `type` `BANKRUPTCY | ATTORNEY_REPRESENTED | CONTACT_RESTRICTED | DISPUTE | DECEASED | SKIP | DO_NOT_REPO_REVIEW_HOLD`
- For `CONTACT_RESTRICTED`: `scope` `NO_TEXT | NO_CALL | NO_EMAIL | NO_CONTACT | ATTORNEY_ONLY`
- For `ATTORNEY_REPRESENTED`: attorney name, firm, phone, email
- For `BANKRUPTCY`: chapter, case number, filing date, court
- `setByUserId`, `setAt`, `setReason`, `clearedByUserId`, `clearedAt`, `clearReason`, `clearDocumentId` (required to clear BANKRUPTCY)

### 3.9 Messaging
- **ContactConsent** (append-only): `accountId`, `channel` `SMS | EMAIL | VOICE`, `address` (E.164 phone / email), `status` `GRANTED | REVOKED`, `source` `CONTRACT | VERBAL | WRITTEN | KEYWORD_START | KEYWORD_STOP | OWNER_ENTRY`, `evidence`, `recordedAt`, `recordedByUserId?`
- **MessageTemplate**: `key` (see 8.4), `channel`, `language`, `subject?`, `body` with merge fields, `status` `DRAFT | APPROVED` (only APPROVED templates send automatically; non-English templates start as DRAFT until a fluent speaker approves them), versioned and append-only
- **OutboundMessage**: `accountId`, `channel`, `to`, `templateKey?`, `language`, `renderedBody`, `status` `QUEUED | DRY_RUN | SENT | DELIVERED | FAILED | BLOCKED`, `blockedReason`, `providerMessageId`, `automationRuleKey?`, `sentByUserId?`, timestamps
- **InboundMessage**: `accountId?` (matched by phone), `from`, `body`, `media` (stored in Document Library), `receivedAt`, `providerMessageId`, `readAt`, `readByUserId`

### 3.10 InsuranceRecord (append-only versions)
- `accountId`, `carrier`, `policyNumber`, `effectiveDate`, `expirationDate`, `lienholderListed` (Boolean), `proofDocumentId` (Document Library, restricted), `source` `CARD_PHOTO | INSURER_DOCUMENT | PHONE | DMS_IMPORT`, `verifiedByUserId`, `verifiedAt`, `status` `VERIFIED | EXPIRING_SOON | EXPIRED | MISSING | UNKNOWN`

### 3.11 StarterDisableAction (append-only)
- `accountId`, `action` `DISABLE | ENABLE`, `requestedByUserId`, `approvedByUserId`, `approvedAt`, `reason`
- `warningMethod` `TEXT | CALL | DEVICE_BEEP | NONE`, `warningSentAt`, `warningMessageId?`
- `performedInPortalAt` (owner confirms it was done in the Advantage portal), `deviceSerial`, `notes`

### 3.12 RepossessionCase
- `accountId`, `vendorId` → existing Vendor (TLC Recovery, type `COLLECTIONS_REPOSSESSION`), `taskId` → dispatch board Task
- `status` `REVIEW | APPROVED | ASSIGNED | LOCATED | RECOVERED | IN_STORAGE | REDEEMED | RETURNED_TO_INVENTORY | SENT_TO_AUCTION | CANCELLED` (history kept in CollectionAccountEvent)
- `assignedAt`, `recoveredAt`, `storageLocation`, `storageFeeCents`, `repoFeeCents`, `personalPropertyNotes`, `outcomeAt`, `outcomeNotes`
- Linked letters (CollectionLetter)

### 3.13 CollectionLetter
- `accountId`, `repoCaseId?`, `templateKey` `PRE_REPO_NOTICE | POST_REPO_NOTICE | OTHER`, `generatedDocumentId` (PDF in Document Library), `sentMethod` `FIRST_CLASS | CERTIFIED | HAND_DELIVERED | EMAIL`, `certifiedTrackingNumber`, `sentAt`, `generatedByUserId`

### 3.14 CollectionAccountEvent (append-only audit log)
- `accountId`, `type` (status change, type change, flag set/clear, assignment, import update, disable/enable, repo status, letter, settings-driven automation, correction), `before` JSON, `after` JSON, `userId?` (null = system), `reason`, `occurredAt`

### 3.15 CollectionsSetting (one row per organization; versioned changes go to CollectionAccountEvent or a settings-history table)
See section 15 for the fields.

### 3.16 CollectionsDailyMetric (for trends)
- One row per org per import date: counts and cents per bucket, total balance, promises made/kept/broken, disable count, repo counts, insurance counts. Written when an import is committed.

---

## 4. DealerCenter import

**File:** "Active Accounts" export (.xlsx or .csv), one sheet. Column names have **leading spaces**, so trim them. Match columns by trimmed name, case-insensitive; ignore unknown extra columns (log them) so future columns don't break the importer.

| Column | Maps to |
|---|---|
| AccountId | `externalAccountId` (**match key**) |
| DealDate | `contractDate` |
| DealNumber | `dealNumber` |
| BuyerName | `buyerNameRaw`; used to *suggest* a Customer match only |
| VehicleYearMakeModel | `vehicleDescriptionRaw` |
| VehicleStockNumber | `stockNumberRaw`; **match to `Vehicle.stockNumber`** (use the existing normalization) |
| RepoStatus | snapshot `dmsRepoStatus` (REPOSSESSED → account REPOSSESSED even if AccountStatus = ACTIVE) |
| AccountStatus | snapshot `dmsAccountStatus` |
| InsuranceStatus | snapshot `dmsInsuranceStatus` (reference only; module InsuranceRecord wins) |
| AutopayStatus | snapshot `dmsAutopayStatus` |
| CollectorName | snapshot `dmsCollectorName` (empty today) |
| LenderType, LenderName | snapshot `dmsLenderType`; **ignored for account type** |
| BalanceDownAmount, BalancePrincipalAmount, BalanceInterestAmount, BalanceOtherAmount, BalanceLateAmount, BalanceSideNoteAmount, BalanceCreditAmount, TotalBalanceAmount | snapshot cents fields |
| PaymentDueDate | snapshot `paymentDueDate` |
| PromiseDate | snapshot `promiseDateFromDms`; if present and there's no matching open promise → create a PaymentPromise (source IMPORTED_FROM_DMS, amount = amountDue) |
| DaysPastDue | snapshot `daysPastDue` |
| PaymentAmount | account `paymentAmountCents` |
| TotalPaymentDueAmount | snapshot `amountDueCents` (includes the upcoming payment on current accounts, so it's **not** "past due") |
| RemainingPayment | snapshot `paymentsRemaining` |

**Flow:** upload → validate (required columns present, dates and numbers parse, no duplicate AccountIds) → **preview screen** (new / updated / unchanged / needs review, plus totals: account count and total balance) → owner confirms → commit in a single database transaction → run the automations (section 7).

**Matching:** Vehicle by stock number (exact after normalization). Customer: if the matched vehicle has a current customer link, suggest that customer; otherwise suggest by name. **Never auto-link a customer by name alone.** Unmatched rows are imported and listed in "Needs review" for linking later.

**Accounts missing from a new import:** flag them "Not in latest import" (likely paid off, closed or repossessed in DealerCenter) and ask the owner to confirm the new status. Never delete them.

**Second import (later):** a "Contact & details" import (phone, email, address, language, VIN, payment frequency, last payment date/amount, GPS serial), matched on AccountId or DealNumber. Build the importer so a second column-mapping profile can be added through configuration, without a database change. Contact info can also be entered by hand on the account page.

**Acceptance check:** importing the owner's real file must show **277 accounts and a total balance of about $1,827,508**, and bucket counts of 221 current, 1 grace, 0 at 6–14, 15 at 15–30, 12 at 31–60, 28 at 61+. (The owner checks this locally; the real file is never committed.)

---

## 5. Buckets and statuses

- Buckets from `daysPastDue`: Current (0), Grace (1–5), Late (6–14), 15–30, 31–60, 61+. The grace length is a setting (default 5).
- Workflow thresholds (settings): **disable review at 7**, **2-week follow-up at 14**, **30-day review at 30**, **repo review at 60**.
- Status precedence (highest wins): BANKRUPTCY_FROZEN → REPOSSESSED/REDEEMED (repo case) → REPO_ASSIGNED → REPO_REVIEW → STARTER_DISABLED → DISABLE_ELIGIBLE → PLAN_ACTIVE → PROMISE_ACTIVE → PAST_DUE → GRACE → CURRENT. PAID_OFF/CLOSED come from the owner's confirmation of accounts missing from an import.

---

## 6. Daily collections queue and account workflow

### 6.1 Queue (`/collections`)
- The worklist for today. Sort order: **(1) broken promises/plan installments, (2) customer-reported payments not found, (3) days past due (high to low), (4) amount due (high to low)**. Frozen accounts are excluded (shown in their own tab).
- Tabs/filters: All past due, Broken promises, Promises due today, Disable eligible, Repo review, Insurance problems, Needs review (import), Frozen/flagged, Not in latest import. Filter by bucket, type, collector, status; search by name, deal #, stock #, phone.
- Each row: customer, vehicle, deal #, days past due, amount due, last contact, next action, flags (icons), plus quick actions (Call, Text, Log contact, Promise).
- Phone layout: card list, with tap-to-call (`tel:`) that opens the contact log afterward.

### 6.2 Account detail (`/collections/accounts/[id]`)
- Header: customer, vehicle (link to the dispatch board vehicle), type, status, bucket, flags, assigned collector.
- Money panel (from the latest snapshot): total balance, amount due, late fees, due date, payments remaining, balance breakdown, plus a "Data as of <import date>" note.
- Timeline (newest first): contacts, messages in and out, promises, plans, reported payments, flags, disable actions, repo events, letters, insurance updates, imports that changed something.
- Actions: Log contact · Send text/email (template picker, preview in the customer's language, consent and quiet-hour check) · Record promise · Create payment plan · Customer reported payment · Set/clear flag · Change account type · Insurance (add/verify proof) · Request/approve starter disable/enable · Start repo review/assign to TLC · Generate letter · Edit contact info / GPS serial.

### 6.3 Promises and plans
- A promise is **kept** if, by `promisedDate + 1 day` (setting), a newer snapshot shows days past due reduced or amount due reduced by ≥ the promised amount (or a CONFIRMED customer-reported payment covers it). **Partially kept** if it's reduced by less, which creates a follow-up item. **Broken** otherwise. An imported DMS promise date is treated the same way.
- A plan's status follows its installments: any broken installment → plan BROKEN (owner can re-plan, which supersedes the old one); all kept → COMPLETED.
- While a customer-reported payment is PENDING_CONFIRMATION, the broken-promise automation waits for that account.

---

## 7. Automations (run after each committed import, and on a daily schedule at 9:15 am Mon–Sat)

Use the project's existing scheduled-job pattern (`/api/cron/...` protected by `CRON_SECRET`, or the existing worker scripts). Jobs must be **idempotent**: running twice creates nothing twice.

1. Recalculate status/bucket for every account from its latest snapshot.
2. Resolve promises, plan installments and customer-reported payments (section 6.3).
3. Update insurance status (expiring within 14 days = EXPIRING_SOON; past expiration = EXPIRED; nothing on file = MISSING/UNKNOWN).
4. **Create dispatch board tasks** (WorkflowArea `COLLECTIONS`, assigned to the account's collector, linked to the account, one open task per account per reason; auto-closed with a note when the reason is resolved by a later import):

| Trigger | Task title | Priority |
|---|---|---|
| Promise or plan installment broken | Call customer: broken promise | HIGH |
| Reached 7 DPD (not frozen, not already disabled) | Starter-disable review | HIGH |
| Reached 14 DPD | 2-week follow-up | MEDIUM |
| Reached 30 DPD | 30-day account review | HIGH |
| Reached 60 DPD | Repo review | CRITICAL |
| Insurance EXPIRED or MISSING | Get proof of insurance | MEDIUM |
| Customer-reported payment NOT_FOUND | Check reported payment in DealerCenter | HIGH |
| Payment/arrangement after a disable | Re-enable starter | CRITICAL |
| Repo assigned to TLC | Repo: TLC Recovery (status updates on the task) | HIGH |

5. Queue automatic messages (section 8.3).
6. Write CollectionsDailyMetric and post a summary ActivityEvent ("Collections: 12 broken promises, 3 disable reviews…").
7. If no import has been committed today by 10:00 am Mon–Sat, show a banner and create a "Import DealerCenter accounts" task for the owner.

**No automation ever disables a starter, assigns a repo, sends a letter or clears a flag.** Those are always human actions.

---

## 8. Messaging (Twilio texts + Resend email)

### 8.1 Setup
- New env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM_NUMBER`), `COLLECTIONS_SMS_SENDING=OFF|DRY_RUN|LIVE` (default OFF), `COLLECTIONS_EMAIL_SENDING=OFF|DRY_RUN|LIVE` (default OFF), `COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL`.
- Use Twilio's official Node SDK if it can be installed. Otherwise use its REST API with `fetch`.
- **Inbound webhook** `POST /api/collections/sms/inbound` and **status webhook** `POST /api/collections/sms/status`: verify Twilio's request signature, reject everything else. These are the only routes that need to be reachable from the internet. Document how to expose just these paths through the existing Caddy/Tailscale setup (e.g., Tailscale Funnel or a Caddy route on a public domain) in `docs/COLLECTIONS_DEPLOY.md`. Do not expose the rest of the app.
- Email: reuse the existing Resend email sender and `AUTH_EMAIL_FROM`/reply-to patterns, with a collections-specific from/reply-to setting.

### 8.2 Send rules (checked on the server for every message, manual or automatic; a blocked message is saved with status BLOCKED and a reason)
1. Account not BANKRUPTCY_FROZEN, and no CONTACT_RESTRICTED scope blocking the channel. If ATTORNEY_REPRESENTED is set, block messages to the customer unless the owner overrides **manually** with a reason (never automatically).
2. SMS needs a phone number with current consent GRANTED (contract consent counts) and no REVOKED record after it.
3. **STOP keywords** (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, OPTOUT, plus "stop texting"-style phrases in all 4 languages) → record REVOKED consent immediately and send one confirmation. START/UNSTOP → GRANTED again. HELP → send the business name and phone. The owner cannot re-enable texting without a new recorded consent from the customer.
4. Automatic messages only go out **within business hours** (Mon–Fri 9–6, Sat 10–3, America/Chicago) **and** 8am–9pm in the customer's local time (assume America/Chicago if unknown). Outside those hours they wait in the queue.
5. Frequency cap: at most **3 automatic messages per account per 7 days** (setting). Manual messages don't count but show a warning above the cap.
6. Only the main customer's contact points. Never co-buyers or references.
7. Use the account's `preferredLanguage`. If that template isn't APPROVED, fall back to English and flag it.
8. No account details in the message beyond what the template allows (no full balances in texts by default; show the payment amount and due date only).

### 8.3 Automatic message rules (each can be turned on/off and retimed in Settings)

| Rule key | When | Channel |
|---|---|---|
| `DUE_SOON` | 2 days before `paymentDueDate` (current accounts) | SMS, email fallback |
| `PAST_DUE_DAY1` | Day 1 past due | SMS |
| `PAST_DUE_LATE_FEE` | Day 6 past due (late fee day) | SMS |
| `PROMISE_REMINDER` | 1 day before a promise or plan installment | SMS |
| `INSURANCE_NEEDED` | Insurance EXPIRED or MISSING (then every 7 days, max 3) | SMS + email |
| `DISABLE_WARNING` | **Not automatic.** Pre-filled when the owner marks the account for disable review; the owner reviews and sends it, and it's recorded as the disable warning | SMS |

### 8.4 Templates
- Merge fields: `{firstName}`, `{paymentAmount}`, `{dueDate}`, `{promiseAmount}`, `{promiseDate}`, `{dealershipName}`, `{dealershipPhone}`, `{businessHours}`, `{payOnlineUrl}`, `{zelleRecipient}`, `{inPersonAddress}`.
- Seed **friendly, helpful English drafts** for every rule key (set to APPROVED for English so dry-run works), plus Spanish, Somali and Swahili **drafts in DRAFT status**, clearly marked "needs review by a fluent speaker." Every text ends with "Reply STOP to opt out." Keep SMS bodies ≤ 320 characters.
- Example (DUE_SOON, EN): "Hi {firstName}, this is {dealershipName}. Friendly reminder: your payment of {paymentAmount} is due {dueDate}. Pay online at {payOnlineUrl}, by Zelle to {zelleRecipient}, or stop by. Questions? Call {dealershipPhone}. Reply STOP to opt out."

### 8.5 Inbox (`/collections/inbox`)
- Threads by account (and unmatched numbers), unread counts, reply box with template insert, attachments shown (insurance card photos can be saved to the account's insurance record in one click).
- New inbound message → in-app notification for the assigned collector + ActivityEvent + the account moves to the top of the queue.

---

## 9. Insurance

- The account's insurance panel shows the current status, carrier, policy, dates, lienholder listed, and the proof document.
- Add proof: upload a photo/PDF or pick a texted image from the inbox. **Optional OCR prefill** using the existing `tesseract.js` (the owner confirms each field; OCR never saves on its own).
- Verify: the owner marks it VERIFIED with a check that the lienholder is listed.
- Queue tab "Insurance problems" and a dashboard tile. Messages via `INSURANCE_NEEDED`.

---

## 10. GPS and starter disable (manual until the Advantage GPS API is available)

- The account stores `gpsDeviceSerial` and `gpsDisclosedInContract`. A button opens the Advantage GPS portal (URL is a setting) in a new tab.
- At 7+ DPD the account shows **Disable eligible** and gets a review task.
- **Request/approve disable** dialog: shows a summary (DPD, amount due, last contact, open promises, insurance); requires the warning method (Text / Call / Device beep / None) and date; if **None**, shows a caution ("Check Minnesota notice requirements with your attorney") and requires a reason; **blocked entirely if BANKRUPTCY_FROZEN**; warns if `gpsDisclosedInContract` is not true. Then the owner disables in the Advantage portal and clicks **"Done in portal"** to record it. The status becomes STARTER_DISABLED.
- Enable: same flow (no warning needed). The "Re-enable starter" task is created automatically when a payment, promise or plan is recorded on a disabled account.
- Design an `AdvantageGpsClient` interface (locate, disable, enable, status) with a **manual implementation** now, so a real API can be plugged in later without changing the screens.

---

## 11. Repossession (TLC Recovery) and letters

- At 60+ DPD: Repo review task and status. The owner can approve and **assign to TLC Recovery** (create the Vendor record if missing, using the existing Vendors feature). This creates a RepossessionCase and a dispatch board task, and statuses are updated by the owner: Assigned → Located → Recovered → In storage → outcome (Redeemed / Returned to inventory / Sent to auction).
- **Returned to inventory:** link to the dispatch board Vehicle and create an inventory/recon task using existing inventory patterns (no changes to existing inventory logic).
- **Redeemed:** close the case, set the account back to its import-driven status, and create a "Re-enable starter" task if needed.
- Repo assignment is **blocked if BANKRUPTCY_FROZEN**.
- **Letters (repo-related only):** `PRE_REPO_NOTICE` and `POST_REPO_NOTICE` PDF templates generated with the existing `pdf-lib`, filled from the account, with a large **"DRAFT – attorney-approved wording required"** placeholder until the owner pastes in approved text through Settings → Templates. Record the send method and certified tracking number. A letter checklist on each repo case tracks which notices were sent and when.

---

## 12. Flags, freezes and legal guardrails

- **Bankruptcy = full freeze:** no automatic or manual texts/emails, no automatic tasks except "Bankruptcy: review with attorney," and no disable, repo or letter actions. A banner shows on the account. **Clearing requires a reason and an uploaded document** (relief-from-stay order, dismissal, discharge, or attorney note). Background: courts have applied the automatic stay to leased and rent-to-own vehicles, including starter disables. The owner will confirm the procedure with a bankruptcy attorney.
- **Attorney represented:** stores the attorney's contact. Automatic messages stop; manual contact needs an override with a reason.
- **Contact restricted:** the owner picks the scope (no text / no call / no email / no contact / attorney only); enforced everywhere.
- **Dispute, deceased, skip:** shown and filterable; deceased pauses all automation.
- **Minnesota items, which the owner must review with a Minnesota attorney before LIVE (collected in `docs/COLLECTIONS_OPEN_QUESTIONS.md`):**
  1. Late fee: Minn. Stat. § 53C.08 subd. 1(c) allows a delinquency charge only on an installment in arrears ≥ 10 days, capped at 5% of the installment or $5, whichever is greater. The current practice ($10 after 5 days) needs review. The module only displays fees; DealerCenter charges them. Grace days and fee amount are settings.
  2. GPS starter-interrupt disclosure in the contract (§ 53C.08 subd. 1a) shows on the account as "GPS disclosed in contract."
  3. Whether lease-to-own deals where the customer owns after the last payment are treated as retail installment contracts (§ 53C.01).
  4. Required notices before and after repossession, and starter-disable notice rules.
  5. Whether the contract's call/text consent covers automated texts.

---

## 13. Dashboard (`/collections/dashboard`)

- Tiles: total accounts, total balance, accounts past due (count / $ amount due), broken promises today, disable eligible, starter disabled, repo review/assigned/in storage, insurance problems, unread messages, last import time.
- **Past-due by bucket:** a bar chart of count and $ per bucket.
- **Promises:** made, kept, partially kept, broken (last 30 / 90 days) and keep rate.
- **Trends:** weekly line of past-due %, $ past due, and counts in 31–60 and 61+, from CollectionsDailyMetric.
- **Activity:** contacts and messages per day, per collector.
- CSV export for every table; printable view.
- Use the app's existing chart approach if it has one. Otherwise use simple, accessible SVG/HTML charts with no new heavy dependency.

---

## 14. Screens and navigation

- Add **Collections** to the main navigation (only when the flag isn't OFF and the user has a collections permission): Queue · Inbox · Accounts · Dashboard · Import · Settings.
- Routes: `/collections`, `/collections/inbox`, `/collections/accounts`, `/collections/accounts/[id]`, `/collections/dashboard`, `/collections/import`, `/collections/settings`.
- **Accounts list:** a full searchable, sortable table (paged, 50/page), bulk select → change type (Lease/BHPH), assign collector, export CSV.
- Every page has empty states, loading states and helpful error messages in plain English.

---

## 15. Settings (`/collections/settings`, admin only; every change is audited)

- Dealership info: name (default "Time Motor Sales"), phone, address, Advantage GPS portal URL, pay-online URL, Zelle recipient, cash-at-store instructions.
- Business hours (default Mon–Fri 9–6, Sat 10–3, Sun closed) and time zone (America/Chicago).
- Grace days (5), late fee display amount ($10.00), thresholds (disable 7, follow-up 14, review 30, repo 60), promise grace (1 day), reported-payment confirmation window (2 days), insurance expiring-soon days (14).
- Message rules: on/off and timing per rule, weekly cap (3), languages enabled.
- Templates: edit, preview, approve (versioned).
- Collector visibility: all accounts vs. assigned only.

---

## 16. Feature flags and environment variables

- `COLLECTIONS_MODULE=OFF|REVIEW|PILOT|LIVE` (default OFF). OFF: no routes, nav, jobs or webhooks. REVIEW: visible to admins only, all messaging forced to DRY_RUN. PILOT: admins plus listed users; messaging per its own flag. LIVE: everyone with permission.
- `COLLECTIONS_SMS_SENDING`, `COLLECTIONS_EMAIL_SENDING` = OFF|DRY_RUN|LIVE (default OFF).
- Twilio variables as in 8.1. Add all of them to `.env.example` with comments.

---

## 17. Security, privacy and audit

- Server-side permission checks on every route, action and API.
- Customer data stays in the database and restricted Document Library storage; no customer data in logs (mask phones as `***-***-1234` in logs).
- Every state-changing action writes a CollectionAccountEvent (who, what, before/after, why).
- Webhooks verify Twilio signatures and are rate-limited.
- Uploaded import files and documents are private and never served publicly.
- Follow the project's existing approach for sessions and MFA (FTC Safeguards Rule: protect customer financial information).

---

## 18. Testing and acceptance

- **Unit (Vitest):** bucket math, status precedence, promise/plan resolution (kept/partial/broken), reported-payment confirmation, send-rule checks (consent, STOP, quiet hours, business hours, cap, flags, bankruptcy), template rendering in all languages, import parsing (leading-space headers, dates, money → cents, duplicate rows, unknown columns), idempotent automations.
- **Integration:** import → snapshots → tasks created once; a re-import with improvements auto-closes tasks; an account missing from an import is flagged; type changes survive re-imports.
- **E2E (Playwright, using fake data):** import preview and commit; work the queue on a phone-size screen; log a call and record a promise; create a plan; send a dry-run text; receive a simulated inbound STOP (texting blocked afterward); request and approve a starter disable (blocked when bankruptcy is set); assign a repo to TLC and move it to Returned to inventory; dashboard loads with correct totals; accessibility (axe) passes on all new pages.
- **Fake fixture:** `src/features/collections/tests/fixtures/active-accounts.sample.xlsx` (and .csv) with the exact DealerCenter column names (leading spaces included), about 30 made-up accounts covering every bucket, a REPOSSESSED row, a past promise date, duplicate buyer names, and expired/unknown insurance.
- `npm run lint`, `npm run typecheck`, `npm test` and the new E2E tests all pass, and existing tests still pass.

---

## 19. Release 1 build stages (do them in order, inside one run; commit after each)

> Stages 1–11 below are the collections core. Release 1 then continues with stages 12–16 (section 28), in the same run.

1. **Setup:** create the branch, add this spec to `docs/`, read the project, write `docs/COLLECTIONS_BUILD_LOG.md` (a running plain-English log), and add flags/env vars and permissions.
2. **Database:** all models in section 3 in one additive migration. *Stop and remind the owner to back up first.* Seed default settings and English templates (DRAFT for other languages) via an idempotent script `npm run collections:seed`.
3. **Import:** parser, preview, commit, matching, needs-review, missing-account handling, fake fixtures and tests.
4. **Accounts and queue:** accounts list, account detail, queue with tabs/filters, contact log, flags, type change, contact info edit.
5. **Promises, plans, reported payments**, plus the resolution logic and tests.
6. **Automations and dispatch board tasks:** scheduled job, idempotent task creation and auto-close, daily metrics, missing-import reminder.
7. **Messaging:** templates, send rules, dry-run, Twilio client, webhooks with signature checks, STOP handling, inbox, email via Resend, automatic message rules, and `docs/COLLECTIONS_DEPLOY.md`.
8. **Insurance:** records, proof upload, inbox-to-insurance, optional OCR prefill, statuses and tasks.
9. **GPS/starter disable and repo:** disable/enable flow, Advantage client interface (manual), TLC repo cases, outcomes, inventory link, letters with placeholder wording.
10. **Dashboard and settings.**
11. **Hardening:** full test pass, accessibility, phone-width review of every screen, permission review, `docs/COLLECTIONS_USER_GUIDE.md` (plain-English how-to for the owner), `docs/COLLECTIONS_OPEN_QUESTIONS.md`, and a final summary in the build log.

At the end of every stage, update the build log with: what was built, how to try it, test results, and anything the owner must do.

---

## 20. Out of scope (whole plan)

- AI voice calls and automated dialers/robocalls (section 23).
- Any agent or integration that disables a starter, assigns a repo, sends a legal letter, clears a flag or approves money without a person.
- Changing DealerCenter data.
- Inventory, sales, title and tax replacement are **separate workstreams** with their own specs (section 28, Release 5). This spec only covers servicing and collections.
- New ideas raised during the year go to `docs/POST_EXIT_IDEAS.md`, not into the current release.

---

## 21. Owner to-do list (outside the code)

1. **Back up the database** before the migration in stage 2.
2. **Minnesota dealer attorney:** review section 12 items 1–5 and provide approved pre-/post-repossession letter wording.
3. **Bankruptcy attorney:** confirm the bankruptcy freeze and unfreeze procedure.
4. **Twilio:** create an account, buy a local number, complete A2P 10DLC brand and campaign registration (use case: account notifications / customer care), then add the keys to `.env`.
5. **Fluent speakers** review the Spanish, Somali and Swahili templates.
6. **DealerCenter:** find a report with customer phone, email, address, VIN and payment frequency for the second import.
7. **Advantage GPS (800-553-7031):** ask for dealer API documentation.
8. **TLC Recovery:** ask whether they take assignments through a repo platform (e.g., RDN).

---

# PART 2 (v2.0): Enterprise upgrades, AI agents, integrations, servicing ledger, DealerCenter exit

## 22. Enterprise upgrades

### 22.1 Editable playbooks
- A **Playbook** screen (admin) where the owner edits, per delinquency stage (Current, Grace, 6–14, 15–30, 31–60, 61+), the ordered steps: which message rule fires on which day, which board task is created, which review is due. Stored as versioned JSON rules (`CollectionsPlaybook`, append-only versions, one active).
- The automations in section 7 read their days, tasks and messages **from the active playbook**, not from hard-coded constants. The defaults in sections 5, 7 and 8.3 become the seeded "Standard" playbook.
- Guardrails (section 8.2, 12) can never be edited from a playbook.

### 22.2 Risk score and next best action
- `CollectionRiskScore` (nightly, append-only): 0–100 with its **factors stored** (days past due trend, payments in last 90 days vs scheduled, broken promises in last 90 days, contact success rate, insurance status, possible-skip signals, account age). Weights are settings. Rule-based and explainable, no black box.
- "**Do this next**" box on every account: one recommended action with its reason (for example: "Call today: promise broken yesterday, answered 3 of last 4 calls"). The queue can sort by score.

### 22.3 Extensions and due-date changes
- `ExtensionRequest`: type (extension, deferral, due-date change), requested terms, reason, eligibility check result, status (REQUESTED, APPROVED, DECLINED, APPLIED), approver.
- Eligibility rules are settings (for example: account at least 6 months old, max 2 extensions per 12 months, no extension while a promise is open). Ineligible requests can still be approved by the owner with a reason.
- Before cutover: an approved extension creates a "Post in DealerCenter" task. After cutover: it creates a new schedule version in the ledger (section 25).
- Track cure rate after extension on the dashboard.

### 22.4 Deeper KPIs (dashboard additions)
- Contact rate, right-party contact rate, time to first contact after going past due, promises made/kept/broken %, broken-promise %, **roll rates** between buckets (month over month), cure rate, extension cure rate, charge-off rate, net loss, recovery %. All from `CollectionsDailyMetric` plus ledger data.

### 22.5 Skip tracing and early warning
- "Possible skip" flag, raised automatically when: no right-party contact in X days (setting, default 14) while past due, phone marked disconnected/wrong number, GPS tamper or no GPS signal, mail returned. Owner confirms or dismisses.
- Skip-trace checklist on the account (references reviewed, new phone/address found, GPS checked, skip-trace vendor search run). Results logged.

### 22.6 Charge-off and recovery
- After repo outcome SENT_TO_AUCTION or RETURNED_TO_INVENTORY: record sale price, repo/storage/auction costs, **deficiency** (or surplus) per Minnesota rules (attorney to confirm the notices required).
- Charge-off decision (owner approval) at a setting threshold; charged-off accounts stay tracked for recovery payments.
- Before cutover these are tracked in the module and posted in DealerCenter by task; after cutover they are ledger transactions.

### 22.7 Customer self-service
- Release 1: texts that let a customer **confirm a promise** ("Reply YES to confirm $200 on Friday") and reply **PAID** (creates a CustomerReportedPayment for review).
- Release 3: full **customer portal** (section 25.8).

### 22.8 Account fees and credits
- `AccountAdjustment`: type (REPO_FEE, STORAGE_FEE, RETURNED_PAYMENT_FEE, OTHER_FEE, LATE_FEE_WAIVER, GOODWILL_CREDIT, OTHER_CREDIT), amount (cents), reason, optional document, entered by, status.
- **Approval:** adjustments above a setting amount need the owner's approval (owner to decide the threshold; default: all fees and credits need approval).
- Before cutover: statuses PENDING_APPROVAL → APPROVED → POSTED_IN_DMS (task done) → CONFIRMED_BY_IMPORT (matched against DealerCenter Other/Late/Credit balances; flagged if unmatched after 2 days).
- After cutover: an approved adjustment becomes a ledger transaction directly.
- Fee types and default amounts are settings; amounts must stay within Minnesota limits (attorney review).

## 23. AI agents

### 23.1 Ground rules
- Autonomy levels per agent: `OFF | SUGGEST | DRAFT | AUTO`, plus a global kill switch `COLLECTIONS_AI=OFF|SUGGEST|DRAFT|AUTO` (the lower of the two wins).
- **Never, at any level:** disable/enable a starter, assign a repo, send a legal letter, clear a flag, change account type, approve fees/credits/adjustments/extensions, offer terms outside the playbook, give legal advice, place AI voice calls (FCC treats AI voices as "artificial" under the TCPA).
- Every agent output goes through the **same guardrail engine** as staff actions (section 8.2, 12). STOP replies are handled by code before any agent sees them.
- Every run logged in `AgentRun` (agent, trigger, input summary, output, prompt version, model, tokens, approval decision, approver, timestamps).
- Least data: agents get only the fields they need (never SSN digits, date of birth or ID numbers). The AI provider must not train on the data.

### 23.2 The eight agents

| Agent | Trigger | Output | Start level | Max level |
|---|---|---|---|---|
| Morning Briefing | After import commit | Day plan: top accounts in order with reasons, overnight changes, promises due, new risks | SUGGEST | SUGGEST |
| Inbox Triage | Each inbound message | Intent (promise, says paid, dispute, hardship, insurance proof, wrong number, angry, bankruptcy/lawyer mention), extracted amounts/dates, pre-filled form proposal | DRAFT | AUTO **only** to pause automations on a bankruptcy/lawyer mention |
| Message Writer | Staff opens a message | Personal, friendly draft in the customer's language, built on approved templates | DRAFT | DRAFT |
| Call Assistant | Before/after a call | Pre-call brief with playbook limits; post-call contact log + draft promise/plan from typed or dictated notes | DRAFT | DRAFT |
| Document Reader | Photo/file arrives | Fields from insurance cards, insurer letters, payment screenshots, pre-filled for review | DRAFT | DRAFT |
| Risk and Next Action | Nightly | Plain-words explanation of the risk score, possible-skip signals, the "Do this next" text | SUGGEST | SUGGEST |
| Reconciliation | After import | Matches reported payments, adjustments and (in shadow) ledger vs DealerCenter; flags mismatches | SUGGEST | AUTO **only** to mark exact matches confirmed |
| Performance Coach | Weekly | KPI review, message A/B results, tone and contact-frequency check, proposed playbook changes | SUGGEST | SUGGEST |

### 23.3 Build notes
- An `AgentRunner` service with one module per agent, each with a typed input, a typed output schema (validated), and tools that are permission-checked server functions (read account, create draft, propose form). Agents never write to the database directly; they create `AgentSuggestion` rows that a person approves.
- **AI inbox** screen: all pending suggestions, approve/edit/reject in one click; rejected ones ask for a quick reason (feeds the Coach).
- Model provider through an adapter (default: Claude API) behind `AI_PROVIDER` and `AI_API_KEY` env vars; daily token budget setting; graceful "AI unavailable" fallback (the module works fully without AI).
- **Message A/B testing:** two approved versions of a template split 50/50 among eligible accounts; results tracked; the owner promotes the winner.
- Evals: a fixed set of fake inbound messages and accounts with expected classifications; run in CI; a prompt change must not lower the score.
- Rollout: Shadow (2 weeks, owner-only view) → Assist (all DRAFT, one month) → narrow AUTO for the two allowed tasks.

## 24. Integrations (adapters with on/off switches)

Every integration is built as an **adapter** behind a common interface, with its own switch `OFF | TEST | LIVE` (default OFF), keys in `.env`, a manual fallback screen, call logging, and an **Integrations health** page. In Release 1, build the adapter interfaces and fake/test implementations; real connections go live as accounts are opened.

| # | Integration | Adapter | Release live |
|---|---|---|---|
| 1 | Payment processing (DealerCenter's processor before cutover; chosen processor after) + PayNearMe cash | `PaymentProcessor` (charge card, ACH debit, autopay schedule, text-to-pay link, refund, webhooks for settle/return) | R2 test, R3 live |
| 2 | Epiq AACER bankruptcy alerts | `BankruptcyMonitor` (submit portfolio, daily matches → auto BANKRUPTCY flag **proposal** + automatic pause of automations) | R2 |
| 3 | FCC Reassigned Numbers Database | `ReassignedNumberCheck` (monthly query per number; results stored for safe harbor; texts blocked for reassigned numbers) | R2 |
| 4 | Axle insurance verification | `InsuranceVerifier` (verify, monitor, lapse webhook → InsuranceRecord) | R2 |
| 5 | Advantage GPS API | `AdvantageGpsClient` (locate, disable, enable, status, tamper webhook) replacing the manual implementation; disable/enable still owner-approved | R2 (when API access granted) |
| 6 | Lob certified mail + address verification | `MailSender` (letter PDF → certified mail, tracking webhooks onto CollectionLetter) | R4 |
| 7 | RDN repossession network | `RepoNetwork` (send assignment, receive status/docs updates onto RepossessionCase) | R4 (if TLC uses RDN) |
| 8 | Business phone (Twilio Voice / RingCentral / Dialpad) | `PhoneSystem` (click-to-call, call events, recording link → contact log) | R4 |
| 9 | E-signature (DocuSign / Dropbox Sign) | `ESign` (send plan/extension agreement, signed webhook → document stored) | R4 |
| 10 | Skip tracing (TLOxp / Accurint, or via RDN) | `SkipTrace` (search request/results with permissible-purpose logging) | R4 |
| 11 | Claude API, error monitoring, uptime, encrypted offsite backups | infra | R1 (backups and monitoring), R2 (AI) |
| 12 | DealerCenter API (if granted) | `DmsSource` (replaces file import; same mapping) | when available |

## 25. Servicing ledger

All models append-only where marked, money in cents, every change audited. In Release 1 the ledger runs in **shadow** (`SYSTEM_OF_RECORD=DEALERCENTER`).

### 25.1 Contracts
- `ServicingContract` (one per CollectionAccount): type (LEASE_TO_OWN | BHPH), calculation method (`FIXED_PAYMENT` precomputed | `SIMPLE_INTEREST` daily accrual), cash price, down payment, side notes, fees, amount financed / total of payments, APR (if any), payment amount, frequency (WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY), number of payments, first due date, contract date, ownership-transfer rule (owns after last payment).
- Contracts are created from the deal (later, from the dispatch board's sales feature) or, in shadow, reconstructed from the DealerCenter migration export.

### 25.2 Schedules
- `PaymentSchedule` versions (append-only) with `ScheduledInstallment` rows (due date, amount, principal/interest split where relevant). Due-date changes, extensions and deferrals create a new version with a reason and approver (section 22.3). Holiday/weekend rule is a setting.

### 25.3 Ledger transactions (append-only)
- `LedgerTransaction`: type (PAYMENT, PAYMENT_REVERSAL, RETURNED_PAYMENT, LATE_FEE, LATE_FEE_WAIVER, FEE, CREDIT, ADJUSTMENT, PAYOFF, CHARGE_OFF, RECOVERY, REPO_EXPENSE, SALE_PROCEEDS, SIDE_NOTE_PAYMENT, OPENING_BALANCE), amount, effective date, posted date, source (cash drawer, processor, Zelle, money order, import, system), reference number, entered by, approved by (required for reversals, adjustments, waivers, charge-offs).
- `LedgerAllocation`: how each payment was split. Default order (setting): fees → late fees → past-due installments (oldest first) → current installment → principal. Shown on the account and on receipts.
- Balances, amount past due and days past due are **calculated from the ledger**, never stored as editable numbers.

### 25.4 Taking payments
- Cash drawer per user/day with opening/closing count; printed, texted or emailed **receipts** (PDF via pdf-lib) with allocation.
- Processor payments (card, ACH, autopay, text-to-pay link) post automatically from settlement webhooks; returned ACH creates RETURNED_PAYMENT + optional fee + task.
- Zelle and money orders posted by hand with a reference number.
- **Daily close:** drawer + processor deposits + manual payments balanced; differences need a reason; the day locks.

### 25.5 Late fees
- Automatic assessment from settings (grace days, amount, % cap, minimum days in arrears, one per installment), set to whatever the Minnesota attorney confirms. Waivers need approval.

### 25.6 Payoffs and paid-in-full
- Payoff quote with a good-through date (PDF, logged). On payoff: PAID_OFF status, paid-in-full letter, **title/lien release task**, GPS device removal task.

### 25.7 Statements
- Monthly statements (PDF; email or text link) with transactions, balance, next due date and payment options.

### 25.8 Customer portal (Release 3)
- Separate customer login (phone/email + one-time code), balance and history, statements, make a payment, set up autopay, upload insurance proof, update contact info. Mobile-first, in the 4 languages (approved translations only).

### 25.9 Credit reporting (Release 4)
- Monthly **Metro 2** file generation for accounts in good standing and delinquent; account status codes and payment history profile from the ledger; pre-file **accuracy checks** (balance, status, dates) with an exceptions report the owner reviews before sending.
- **Disputes:** intake (from bureaus via the reporting vendor/e-OSCAR, and direct from customers), investigation task, deadline countdown, correction file, audit trail. Reporting starts only after cutover is stable and furnisher agreements are signed; build behind `CREDIT_REPORTING=OFF`.

### 25.10 Accounting
- Daily journal entries (cash, receivable, fees, interest/lease income, charge-offs, recoveries) exported to **QuickBooks** (file export first; API later). Chart-of-accounts mapping is a setting (accountant to provide). Month-end close locks the period; changes after close go into the next period.
- Sales tax on lease-to-own payments: **accountant to confirm** the Minnesota rule before the ledger goes live; the ledger supports a tax line per payment.

### 25.11 Repo and charge-off accounting
- Repo expenses, sale proceeds, deficiency/surplus, charge-off and later recoveries are ledger transactions (section 22.6).

## 26. Shadow ledger, parallel run and cutover

- `SYSTEM_OF_RECORD=DEALERCENTER|DISPATCH_BOARD` (setting, admin only, change audited, requires typing a confirmation phrase).
- **Migration import** (one-time, plus re-runnable): DealerCenter full export of contracts, payment history and notes → ServicingContract, schedules, `OPENING_BALANCE` + historical transactions. Unmatched or unexplained differences listed for review.
- **Shadow mode** (DEALERCENTER is record): every import also posts the DealerCenter-reported payments into the shadow ledger; the module recalculates balances and **reconciles** each account (total balance, amount due, days past due, late fees) against the import.
- **Reconciliation screen:** per account: DealerCenter value, module value, difference, likely cause; filters for "all matched", "differences"; history of match rate per day.
- **Cutover gate (enforced by the software):** switch allowed only when every active account matched on every daily import for the last 2 full monthly cycles, or each exception has an owner note.
- **After cutover:** imports stop (kept read-only for history); payments are taken in the module; "Post in DealerCenter" tasks stop; extensions, fees and credits post straight to the ledger; customer-notice templates for the change (new payment link, portal, statements); 30-day overlap where old payment methods are still accepted and posted by hand.

## 27. Added owner to-do list (v2.0)

1. Decide the fee/credit approval threshold (default: approve all).
2. DealerCenter: full data export (contracts, payment history, notes), notice period to cancel, and whether its processor can post to us.
3. Choose the payment processor for after cutover.
4. Accountant: Minnesota sales tax on lease-to-own payments; QuickBooks chart-of-accounts mapping.
5. Minnesota attorney: late fees, payoff and paid-in-full letters, deficiency notices, extension agreements, AI agents tab, repo notices.
6. Credit reporting: choose a Metro 2 reporting vendor; start bureau furnisher applications.
7. Decide where the ledger database lives (dealership server vs managed cloud) and test backups monthly.
8. Vendor calls from section 24 (AACER, RND database registration, Axle, Advantage GPS API, Lob, RDN via TLC, phone system, e-signature, skip tracing).

## 28. Releases (12-month plan)

| Release | Months | Builds | Gate to the next release |
|---|---|---|---|
| **R1: Build** | Dec 2026 – Mar 2027 | Collections core (stages 1–11); upgrades 22.1–22.8; integration adapters with test implementations (24); ledger models, migration import, shadow posting and reconciliation screen (25.1–25.3, 26); monitoring and backups | Opening balances load and every account reconciles with DealerCenter |
| **R2: Parallel run** | Apr – Jun 2027 | Payment taking (25.4), late fees (25.5), payoffs (25.6), statements (25.7), daily close, accounting export (25.10); processor in TEST; AI agents (23) in shadow then assist; AACER, reassigned-number check, Axle, Advantage API live | All accounts match for 2 monthly cycles; attorney and accountant sign-off |
| **R3: Cutover** | Jul 2027 | Cutover tooling (26), processor LIVE, customer portal (25.8), customer notices, 30-day overlap | First month closed cleanly in the module |
| **R4: Stabilize** | Aug – Sep 2027 | Credit reporting and disputes (25.9); Lob, RDN, phone system, e-signature, skip tracing; AI agents narrow AUTO | Bureaus accept the first file |
| **R5: Full exit** | Oct – Nov 2027 | Separate specs: inventory, sales/deal paperwork, title, registration and sales tax move to the dispatch board; DealerCenter cancelled | DealerCenter off |

### 28.1 Release 1: additional stages (after stages 1–11 of section 19, same run)
12. **Upgrades:** playbooks (22.1) with the Standard playbook seeded from current rules; risk score and "Do this next" (22.2); extension requests (22.3); KPI additions (22.4); possible-skip flag and checklist (22.5); charge-off/recovery tracking (22.6); promise-confirm and PAID replies (22.7); fees and credits (22.8).
13. **Integration adapters (24):** interfaces, OFF/TEST/LIVE switches, fake implementations for tests, Integrations health page. No real vendor calls.
14. **Ledger models (25.1–25.3)** in one additive migration (stop for backup first), allocation engine with thorough unit tests (all four payment frequencies, fixed-payment and simple-interest, reversals, returned payments).
15. **Migration import and shadow reconciliation (26):** DealerCenter history import (mapping to be confirmed once the owner gets the full export; build it configurable), shadow posting from daily imports, Reconciliation screen, `SYSTEM_OF_RECORD` setting locked to DEALERCENTER in R1.
16. **Hardening for R1:** full test pass, phone-width review, permission review, update `docs/COLLECTIONS_USER_GUIDE.md` and the build log, and list anything needed for R2 in `docs/COLLECTIONS_OPEN_QUESTIONS.md`.
