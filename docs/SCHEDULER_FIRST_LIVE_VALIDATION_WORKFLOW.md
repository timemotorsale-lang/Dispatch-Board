# First Live Scheduler Validation Workflow

**Document:** First live scheduler validation workflow  
**Purpose:** Give an operator a repeatable way to prove the first real autonomous board-generation run  
**Last updated:** 2026-07-08

---

## 1. Scope

This workflow is for the **first real deployed validation** of autonomous board generation.

This document is intentionally different from the deployment runbook:

- the [deployment runbook](C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md) explains how to validate the setup
- this workflow explains how to **record and prove** the first live result

If you do not have deployment access, do not mark this workflow complete. In that case, the repo is only **implementation-ready for validation**.

---

## 2. What must be proven

The first live validation should prove all of these:

1. The scheduler fired.
2. The request was authorized.
3. The run was not silently skipped for the wrong reason.
4. The board generated successfully after the configured local generation time.
5. The manager health surface reflected the real result.
6. Manual retry remained available if needed.

---

## 3. Recommended execution order

### Step 1: Prepare the validation window

Record:

- deployment host
- deployment environment
- board date being validated
- configured timezone
- configured generation time
- enabled business days

Confirm the board date is an enabled business day.

### Step 2: Check readiness before the run window

Before the configured local generation time:

- open the manager board
- confirm scheduler readiness checks do not show obvious configuration gaps
- confirm the health panel is visible

If the panel already shows unauthorized traffic or missing readiness prerequisites, stop and fix those first.

### Step 3: Observe the first live result after generation time

After the configured local generation time:

- refresh the board
- capture the latest scheduled attempt
- capture the board generation state
- capture any unauthorized summary if present

### Step 4: Record whether the outcome was acceptable

Acceptable first-live outcomes:

- `succeeded`
- `skipped` for a clearly expected reason such as `ALREADY_GENERATED` after a prior successful proof on the same date

Not acceptable for first-live proof:

- `unauthorized`
- `failed`
- `CONFIGURATION_MISSING`
- `CONFIGURATION_INVALID`
- no scheduled evidence after the expected run window

### Step 5: Record manual retry availability

If the scheduled path needed attention:

- confirm whether the manager health surface showed retry as safe
- if a manual retry was used, record whether it succeeded, failed, or skipped

Do not treat manual retry success as proof that autonomous generation itself was healthy. It only proves the fallback path worked.

---

## 4. Evidence record template

Fill this section in during the first live validation.

```md
# First Live Scheduler Validation Record

- Validation date:
- Operator:
- Environment:
- Deployment host:
- Board date evaluated:
- App timezone:
- Configured generation time:
- Enabled business days:

## Readiness before run

- CRON_SECRET check:
- Generation timezone check:
- Generation time check:
- Business days check:
- Scheduled evidence check before run window:

## First live scheduled evidence

- Latest scheduled attempt timestamp:
- Latest scheduled attempt state:
- Authorization outcome:
- Skip reason code if any:
- Failure code if any:
- Manager message:

## Board outcome

- Board generation state:
- Board generated at:
- Last success source:
- Last failure source if any:

## Health panel proof

- Screenshot captured: yes/no
- Health status shown:
- Guidance shown:
- Unauthorized summary present: yes/no
- Retry shown as safe: yes/no

## Manual retry if used

- Manual retry used: yes/no
- Manual retry outcome:
- Manual retry notes:

## Final assessment

- Autonomous generation verified: yes/no
- If no, blocking reason:
- Follow-up issue or incident:
```

---

## 5. How to classify the result

### Mark "Autonomous generation verified: yes"

Only if all are true:

- scheduled evidence exists
- the request was authorized
- the post-time outcome is acceptable
- the board health panel matched the real result

### Mark "Autonomous generation verified: no"

If any of these happened:

- unauthorized request
- no scheduled evidence after the expected run window
- configuration missing or invalid
- failed scheduled attempt
- board health panel did not reflect the real outcome

---

## 6. What to attach to a release record

Attach:

1. The filled evidence record
2. A screenshot of the manager health panel
3. The scheduler state observed
4. Any follow-up issue ID if the result was not clean

The release checklist should only be checked off after that evidence exists.

---

## 7. Current repo status

As of this workflow document:

- the repo contains scheduler evidence persistence
- the repo contains manager scheduler health and readiness UI
- the repo contains a deployment verification runbook
- the repo contains release-gate documentation
- the repo does **not** by itself prove that production has already been validated

That means the repo is **ready for a real operator to perform the first live validation**, but the live validation still has to be observed and recorded.
