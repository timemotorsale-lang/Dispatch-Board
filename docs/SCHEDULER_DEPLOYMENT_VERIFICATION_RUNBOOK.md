# Scheduler Deployment Verification Runbook

**Document:** Scheduler deployment verification runbook  
**Purpose:** Validate autonomous board generation in a real deployment without relying on tribal knowledge  
**Last updated:** 2026-07-08

---

## 1. What this runbook proves

Use this runbook to verify that production or staging autonomous board generation is actually ready.

This runbook helps an operator prove:

- the app can receive scheduled requests at `/api/cron/generate-board`
- the request is authorized with `CRON_SECRET`
- the app generation settings are valid
- scheduled requests skip for the right reasons before the configured generation time
- scheduled requests succeed after the configured local generation time
- the manager-facing board health surface reflects what really happened
- manual retry is still available if the scheduled path needs help

This runbook does **not** claim production validation is complete by itself. It defines the exact steps and evidence needed to make that claim.

---

## 2. Required prerequisites

Before you validate the scheduler, confirm all of these are true:

1. The current deployment includes the scheduler route `/api/cron/generate-board`.
2. The app runtime has `CRON_SECRET` configured.
3. The hosting scheduler is enabled and points to `/api/cron/generate-board`.
4. The hosting scheduler can send one of the supported secret headers.
5. App settings have a valid timezone, valid `dailyGenerationTime`, and at least one enabled business day.
6. A manager can access the board page and see the scheduler health panel.

Use the manager health panel as the primary in-app proof surface. Use the [scheduler verification contract](C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_VERIFICATION_CONTRACT.md) as the meaning baseline for all states.

---

## 3. Where `CRON_SECRET` must exist

`CRON_SECRET` has two jobs:

1. It must exist in the **app runtime** so the route can validate scheduled requests.
2. The **scheduler caller** must send the same secret in a supported header.

If either side is missing or mismatched:

- the request will reach the route
- the route will record unauthorized scheduler evidence
- the board will not auto-generate from that hit

Do not record or paste the real secret into tickets, docs, or screenshots.

---

## 4. Supported authorization header shapes

The scheduled route accepts either of these:

```http
Authorization: Bearer <CRON_SECRET>
```

or

```http
x-cron-secret: <CRON_SECRET>
```

Only one is required. Do not send both unless your deployment standard already does that intentionally.

---

## 5. Expected route path and scheduler cadence

Expected route path:

- `/api/cron/generate-board`

Expected scheduler behavior in this repo:

- the checked-in Vercel schedule pings every 15 minutes
- the route itself decides whether to skip or generate
- the route is duplicate-safe and idempotent for the same board date

Why the scheduler runs every 15 minutes instead of once per day:

- the true generation time is controlled in app settings
- the route evaluates timezone, business day, and configured local generation time at runtime
- later pings can skip cleanly after a successful generation already exists

---

## 6. Expected behavior before and after generation time

Use the configured app timezone and `dailyGenerationTime` as the source of truth.

Before the configured local generation time:

- scheduled requests may appear
- the expected state is usually `skipped`
- the usual reason is `BEFORE_GENERATION_TIME`
- manager action is normally **not** required

On a non-business day:

- scheduled requests may appear
- the expected state is `skipped`
- the reason is `NON_BUSINESS_DAY`
- manager action is normally **not** required

After the configured local generation time on an enabled business day:

- at least one scheduled request should be recorded
- the request should be authorized
- the board should either generate successfully or surface an explicit attention state

If the board already exists from a successful run:

- later scheduler pings may record `ALREADY_GENERATED`
- this is normal

---

## 7. Safe manual validation procedure

Use this only when you need to validate the entrypoint directly and you are allowed to test the deployed route.

### Option A: Validate before generation time

Use this when you want a low-risk proof that:

- the route is reachable
- the request is authorized
- the app records scheduled evidence
- the scheduler path skips for the right reason

Expected result:

- response status should be `200`
- response body status should usually be `skipped`
- the board health panel should show scheduled evidence with a safe skip message

### Option B: Validate after generation time

Use this when you are intentionally proving the first live autonomous run path.

Expected result:

- response status should be `200` for `success` or `skipped`
- response status should be `500` only for real failure
- the board health panel should update to show the latest scheduled attempt

### Example request

Bearer header:

```bash
curl -X POST "https://<deployment-host>/api/cron/generate-board" ^
  -H "Authorization: Bearer <CRON_SECRET>"
```

Secret header:

```bash
curl -X POST "https://<deployment-host>/api/cron/generate-board" ^
  -H "x-cron-secret: <CRON_SECRET>"
```

Use a production-safe host and only perform this test when your deployment owner agrees it is appropriate.

---

## 8. What healthy evidence looks like in the app

Open the manager board for the board date being validated.

Healthy autonomous generation should show:

- scheduler health status is `Healthy`
- latest scheduled attempt is visible
- latest scheduled attempt is authorized
- board generation state is `Board generated`
- last success points to the scheduled run
- readiness checks do not show configuration attention

Expected evidence after a good first real run:

1. A scheduled attempt appears for the board date.
2. The attempt is not unauthorized.
3. The attempt is not skipped for the wrong reason.
4. The board exists after the configured local generation time.
5. The health panel shows the same story the operator observed.

---

## 9. What common states mean and what to do next

### Unauthorized scheduled request

Meaning:

- the route was reached
- the scheduler caller was not trusted

Most likely next checks:

1. Confirm `CRON_SECRET` exists in the deployment runtime.
2. Confirm the scheduler sends the same secret.
3. Confirm the header name is one of the supported shapes.

### Skipped because before generation time

Meaning:

- the scheduler fired correctly
- the local configured generation time has not arrived yet

Next step:

- wait until after the configured local generation time

### Skipped because non-business day

Meaning:

- the scheduler fired correctly
- the board date is not enabled in business-day settings

Next step:

- no action unless the day should have been enabled

### Skipped because already generated

Meaning:

- the autonomous path is behaving safely
- the board already exists from an earlier successful run

Next step:

- no action unless you are investigating an unexpected duplicate trigger

### Skipped because configuration is missing or invalid

Meaning:

- the app can tell something required is not usable

Next step:

1. Review `CRON_SECRET`
2. Review timezone
3. Review `dailyGenerationTime`
4. Review enabled business days

### Failed scheduled request

Meaning:

- the autonomous path reached an operational failure

Next step:

1. Read the manager-safe failure message in the board health panel.
2. Confirm readiness checks are not showing configuration gaps.
3. Use manual retry if the board is needed immediately and retry is marked safe.
4. Open a follow-up issue with the manager-safe evidence attached.

### No scheduled evidence after expected run window

Meaning:

- the app expected the scheduler to have fired by now
- no scheduled request has been recorded for that board date

Next step:

1. Confirm the host scheduler is enabled.
2. Confirm the route path is correct.
3. Confirm the deployment being viewed is the deployment the scheduler is targeting.

---

## 10. First production-day evidence to capture

Capture these for the first live autonomous validation:

1. Deployment host used for validation
2. Board date being validated
3. App timezone and configured generation time
4. Screenshot of the manager scheduler health panel after the validation window
5. The latest scheduled attempt status and timestamp
6. Whether the request was authorized
7. Whether the board generated, skipped, or failed
8. Whether manual retry was available if needed
9. Any unauthorized attempts seen on the same date

Store that evidence using the first-live validation workflow in [docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md](C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md).

---

## 11. Release readiness tie-in

Do not call autonomous generation production-ready until:

1. This runbook has been followed
2. The evidence has been recorded
3. The release checklist scheduler proof gate has been checked off

Use [docs/RELEASE_CHECKLIST.md](C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/RELEASE_CHECKLIST.md) as the release gate record.
