# Time & Attendance CCC Console UI Source of Truth

## Approval status

The Time & Attendance console mockup was approved for adoption as the official UI direction for the MVP. The console belongs on the CCC board as its own enterprise console, not inside the Dispatch console.

## Product intent

Time & Attendance must start as a day-one usable MVP while preserving enterprise scale potential. The first interface should make the most important work visible immediately:

- staff can understand their current time-card status;
- managers can see exceptions before payroll;
- staff-specific meal policies are visible and explainable;
- legal and payroll-sensitive outcomes are handled as review workflows, not silent automatic edits;
- the system records exact time and keeps policy interpretation separate from the source punch trail.

## Approved first-page layout

The first implemented page is `/time-attendance` and is launched from CCC Home. It uses the approved mockup structure:

1. Enterprise hero showing this is a CCC board console.
2. Workspace tabs for Today, My Time, Manager Review, Policies, and Payroll Handoff.
3. KPI strip for paid time, regular time, overtime, and ESST accrual.
4. Employee time-card preview with shift, policy, total span, meal time, paid time, and readiness.
5. Punch timeline showing exact recorded events and policy interpretation.
6. Team status list for board-level visibility.
7. Manager review rail for meal exceptions, corrections, payroll blocks, policy profiles, and exceptions.
8. Honest MVP note identifying which areas are preview/read-model-backed until live persistence and commands are connected.

## MVP behavior contract

- The page may use sample review data until live read models are connected.
- Sample totals should be produced from the same calculation foundation used by the time-card engine where practical.
- The UI must not imply that payroll export, live clock actions, or production approval workflows are active before those workflows are implemented.
- “Exact time” remains the UI and calculation baseline. Rounding or grace rules must not be presented as the default legal posture.
- Short, missed, interrupted, or unclear meal periods must be routed to review instead of being silently deducted or ignored.

## Enterprise direction

The approved MVP shell must be able to grow into:

- employee clock, meal, attestation, and correction workflows;
- manager exception review, correction, approval, and bulk readiness queues;
- time-off requests and leave administration;
- pay-period lock, payroll export, reconciliation, and reopen controls;
- audit, retention, privacy, role access, and source-version evidence;
- multi-location, multi-policy, and future payroll-provider integration.

This document governs the first UI implementation unless replaced by a later explicitly approved source-of-truth document.
