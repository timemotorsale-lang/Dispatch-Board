# Appointment Permission Safety Gate

**Status:** Initial MVP safety gate implemented through `codex/appointment-direct-detail-permission-proof`
**Scope:** Appointment Board command and read-model permission evidence

## Implemented Evidence

- The command boundary now proves participant, viewer, and appointment-admin-only actors cannot mutate live appointments.
- Denied live-appointment mutation attempts create no appointment command ledger entry.
- Owners can submit eligible owned-appointment commands, but cannot run manager-only transfer or warning override commands.
- Managers can submit eligible appointment commands only when they also have location-level appointment management authority.
- Appointment administrator configuration identity does not imply live appointment mutation authority.
- Existing read-model tests prove participant and viewer visibility is masked and non-mutating while manager and owner detail remains available.
- Direct appointment detail access now uses the same read projection as the board, so participant and viewer direct lookups remain masked.
- Direct detail access returns the same safe not-available response for missing appointments and users without schedule access.
- Appointment administrator identity alone does not grant direct appointment detail access.
- System-action automation proof now confirms task automation cannot execute a rule unless the active rule's purpose explicitly allows the incoming trigger.
- Misconfigured automation rules are recorded for review instead of creating draft appointments or attempting live appointment actions.
- Existing server policy tests keep approval, ownership transfer, and warning override actions manager-only.

## MVP Boundary

The day-one board should treat permissions as server-authored. UI controls can hide, disable, or explain unavailable actions, but the reusable command policy remains the final gate for every appointment mutation.

## Remaining Before Final Rollout

- Add cross-location search/reporting leakage coverage when those appointment surfaces move into MVP scope.
- Add role-aware helper copy for disabled board actions so users understand whether an action is unavailable because of role, appointment state, blockers, or MVP deferral.

## Verification

Run the focused safety-gate suite:

```bash
npm test -- policies.test.ts appointment-command-service.test.ts appointment-read-service.test.ts appointment-read-detail-route.test.ts task-appointment-automation-service.test.ts
```

Run full local confidence before merging:

```bash
npm run typecheck
npm run lint
npm test
```
