# AE-9 — Approved Policy Baseline and Incremental Implementation Handoff

**Status:** Prepared; blocked on authorized approval execution

## Purpose

Freeze the exact authorized policy baseline, preserve all changes/deferrals, and hand only named eligible slices to future technical design and incremental implementation.

## Required baseline manifest

```text
approvalResolutionId
workflowVersion and effective scope
source document versions/checksums
130 decision dispositions and conditions
approved roles, authorities, limits and backups
approved evidence/source/freshness/retention rules
approved clocks, escalations and degraded behavior
approved slice eligibility and exclusions
open gaps, owners, safe defaults and expiry/review dates
tabletop and acceptance evidence
implementation, pilot and activation authorities
monitoring, pause, rollback, resume and supersession rules
```

## Separate authorization states

| State | Meaning |
| --- | --- |
| `POLICY_APPROVED` | Exact policy is adopted for stated scope; does not authorize code |
| `DESIGN_AUTHORIZED` | Named slice may be technically specified |
| `IMPLEMENTATION_AUTHORIZED` | Named slice/version may be built and tested |
| `SHADOW_AUTHORIZED` | Implemented version may evaluate without operational effect |
| `PILOT_AUTHORIZED` | Named cohort/version/time window may operate under defined authority |
| `ACTIVATION_AUTHORIZED` | Named slice/version may become active after separate gate |

No state implies the next state.

## Sequential build contract

Every handoff requires: approved policy; domain/state design; persistence/versioning; server permissions/commands; events/audit/evidence/idempotency; integrations/reconciliation; staff/manager UX; failure/degraded states; automated scenarios; tabletop; shadow; manager-confirmed pilot; outcome review; rollback rehearsal; separate activation.

## First boundary

The first possible implementation remains **authoritative acquisition through an accepted Receipt and Custody handoff**. Slices 2-9 remain inactive until predecessor handoffs and their own approval gates pass.

## Current result

No approved baseline can be frozen. All 130 decisions remain `OPEN`; every slice remains `NO-GO FOR CODE`, pilot and activation.
