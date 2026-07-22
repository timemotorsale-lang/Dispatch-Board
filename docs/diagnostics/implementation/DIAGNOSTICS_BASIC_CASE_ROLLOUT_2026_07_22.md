# Diagnostics Basic Case Rollout — July 22, 2026

**Status:** Enabled  
**Target date:** July 22, 2026  
**Scope:** Authorized diagnostic case intake, creation, assignment, queue management, and lifecycle records

## Activation

The rollout target is stored on the enterprise feature flags. `DIAGNOSTICS_MASTER` and `DIAGNOSTIC_CASES` are promoted to `GENERAL` with a 100% rollout for authorized users.

The activation allows users with the existing server-side capabilities to:

- search or add a canonical vehicle from Diagnostics intake;
- use an existing Repair Order or create the governed preliminary service context;
- create a diagnostic case;
- assign, open, and manage the case through its governed lifecycle.

## Capabilities Still Held

This activation does not promote `DIAGNOSTIC_EVIDENCE`, `DIAGNOSTIC_REASONING`, `DIAGNOSTIC_PUBLISHING`, `DIAGNOSTIC_KNOWLEDGE`, or `DIAGNOSTIC_AI`. Estimate mutation, customer or insurer submission, parts ordering, dispatch scheduling, final labor-time authority, QC closure, and autonomous diagnosis remain controlled by their existing owners and release gates.

## Operational Controls

- Managers can review or change each feature's mode and target date from `/settings/vehicle-operations`.
- Every manager-initiated change remains versioned and audit recorded.
- The master flag remains the immediate kill switch.
- Individual capabilities can be paused independently without removing existing case records.
