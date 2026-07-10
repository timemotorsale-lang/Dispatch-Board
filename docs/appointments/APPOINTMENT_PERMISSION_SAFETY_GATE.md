# Appointment Permission Safety Gate

**Status:** Initial MVP safety gate implemented on `codex/appointment-permission-safety-gate`  
**Scope:** Appointment Board command and read-model permission evidence

## Implemented Evidence

- The command boundary now proves participant, viewer, and appointment-admin-only actors cannot mutate live appointments.
- Denied live-appointment mutation attempts create no appointment command ledger entry.
- Owners can submit eligible owned-appointment commands, but cannot run manager-only transfer or warning override commands.
- Managers can submit eligible appointment commands only when they also have location-level appointment management authority.
- Appointment administrator configuration identity does not imply live appointment mutation authority.
- Existing read-model tests prove participant and viewer visibility is masked and non-mutating while manager and owner detail remains available.
- Cross-location search proof now confirms scoped reads discard upstream cross-location records and search only matches fields visible to the actor.
- Existing server policy tests keep approval, ownership transfer, and warning override actions manager-only.

## MVP Boundary

The day-one board should treat permissions as server-authored. UI controls can hide, disable, or explain unavailable actions, but the reusable command policy remains the final gate for every appointment mutation.

## Remaining Before Final Rollout

- Add direct-route or API smoke evidence that a viewer cannot access restricted appointment detail outside the normal board flow.
- Add explicit system-action evidence for automation beyond draft handoff once automated live appointment mutations are enabled.
- Add role-aware helper copy for disabled board actions so users understand whether an action is unavailable because of role, appointment state, blockers, or MVP deferral.

## Verification

Run the focused safety-gate suite:

```bash
npm test -- policies.test.ts appointment-command-service.test.ts appointment-read-service.test.ts appointment-read-route.test.ts
```

Run full local confidence before merging:

```bash
npm run typecheck
npm run lint
npm test
```
