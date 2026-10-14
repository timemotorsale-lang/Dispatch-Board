# Progressive Integration Roadmap

## Philosophy

Integrations should be learned, used, and trusted progressively. The first goal is not to automate everything. The first goal is to make daily work easier while keeping staff in control and keeping Dispatch Board as the operational source of truth.

Start with simple integrations that are:

- useful every day;
- easy for staff to understand;
- low-risk if unavailable;
- reversible without data cleanup;
- visible in audit/source context;
- not allowed to silently create, update, send, post, or close business records.

## Maturity Ladder

| Level | Name | What it can do | What it cannot do yet | Good first examples |
| --- | --- | --- | --- | --- |
| 0 | Documented boundary | Describe provider, purpose, data, owner, and risk | Connect to provider | provider intake, source authority |
| 1 | Safe link/reference | Open provider page or show manual instructions | Read provider data automatically | link to existing DMS, email, Drive folder, carrier portal |
| 2 | Read-only lookup | Pull or display provider data | Write back, sync, or mark work complete | calendar visibility, document packet list, vendor availability |
| 3 | Manual import/export | Staff imports or exports bounded files | Background sync or automatic merge | CSV lead import, document packet export, report download |
| 4 | Draft-only action | Prepare a message, task, appointment, document, or packet | Send or post without human confirmation | email draft, appointment draft, claim packet draft |
| 5 | Human-confirmed write | Staff reviews exact change and confirms provider action | Background automation | send SMS, create calendar event, upload document |
| 6 | Supervised sync | Sync bounded facts with conflict review | Resolve risky conflicts automatically | delivery status, appointment status, document signature status |
| 7 | Trusted automation | Automate narrow proven workflows with monitoring | Expand scope without a new review | reminder sends, webhook status updates, reconciliation jobs |

No provider should skip levels. A provider may stop at a lower level permanently if that is enough to help operations.

## Recommended First Integrations

### 1. Document packet reference

Purpose: make it easier to find customer, vehicle, claim, or repair documents.

Starting level: safe link/reference or read-only lookup.

Why it is a good first step:

- daily operational value;
- no customer communication;
- no financial posting;
- no automatic record mutation;
- easy manual fallback.

Initial behavior:

- show where the document packet lives;
- list packet status if safely available;
- let staff open the source;
- keep Dispatch Board checklist completion manual.

### 2. Calendar visibility

Purpose: help staff see appointments and avoid missed commitments.

Starting level: read-only lookup.

Why it is a good first step:

- high daily value;
- simple user mental model;
- safe if read-only;
- existing appointment domain can remain authoritative.

Initial behavior:

- read visible events or availability;
- show source freshness;
- do not create, move, cancel, or confirm appointments automatically.

### 3. Vendor or carrier status lookup

Purpose: reduce phone chasing for parts, warranty, insurance, transport, or outside vendors.

Starting level: safe link/reference or read-only lookup.

Why it is a good first step:

- supports existing staff work;
- provider is advisory;
- failures do not corrupt internal records.

Initial behavior:

- show provider/source link;
- show last checked time;
- allow staff to record the outcome manually.

### 4. Message draft assistance

Purpose: prepare customer/vendor follow-up without automatically sending.

Starting level: draft-only action.

Why it comes after lookup:

- touches customer communication;
- requires consent/suppression checks;
- still safe because staff approves before send.

Initial behavior:

- generate or stage a draft;
- show source facts used;
- require staff edit/review;
- no automatic send.

## Complexity Gates

Move to the next level only when:

- staff uses the current level regularly;
- manual fallback is clear;
- provider errors are understandable;
- audit/source evidence is visible;
- permissions and organization scope are tested;
- no duplicate or conflicting records are being created;
- the business can explain what should happen during outage, stale data, or mismatch.

## Daily Operations First Backlog

Suggested first backlog order:

1. Integration dashboard/readiness page.
2. Document packet reference.
3. Calendar read-only visibility.
4. Vendor/carrier source links and status lookup.
5. Draft-only customer/vendor message workflow.
6. Human-confirmed calendar event creation.
7. Human-confirmed document upload or packet completion.
8. Supervised delivery/status sync.

This order deliberately avoids payment posting, accounting mutation, automatic customer messaging, broad DMS sync, and autonomous AI actions until the team has mastered simpler integrations.

## Stop Conditions

Pause a provider if:

- staff cannot explain what the integration is doing;
- source data is stale or confusing;
- duplicate customers, vehicles, appointments, tasks, or documents appear;
- provider errors are hidden from users;
- manual fallback is unclear;
- any credential, consent, organization-scope, or audit concern appears.

The right response is to pause, simplify, and return to the previous level.
