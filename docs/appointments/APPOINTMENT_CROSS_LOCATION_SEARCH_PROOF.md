# Appointment Cross-Location Search Proof

**Status:** Initial MVP proof included in `codex/appointment-mvp-permission-safety-suite`
**Scope:** Appointment Board read endpoint, server-side search filtering, and visible-scope reporting posture

## Implemented Evidence

- Appointment Board reads still require active schedule access for the requested location before any appointments are loaded.
- The read service defensively drops appointments whose `locationId` does not match the authorized request scope, even if an upstream repository/search bug returns them.
- Server-side appointment search runs after the appointment is projected for the actor, so masked values such as restricted phone, email, VIN, and license plate cannot be used as a side channel by viewers.
- The `/api/appointments` route accepts `search` or `q` and passes it through the same scoped read boundary.
- Current reporting snapshot utilities remain anchored to visible board scope; there is not yet an MVP cross-location reporting/export endpoint.

## Remaining Before Final Rollout

- Add explicit export/reporting authorization tests when durable appointment reporting APIs are introduced.
- Add organization-wide reporting permissions only as a separate capability, not as an implied manager or appointment-admin permission.
- Add audit events for denied privileged exports when export workflows move into MVP scope.

## Verification

Run the focused proof suite:

```bash
npm test -- appointment-read-service.test.ts appointment-read-route.test.ts appointment-reporting-snapshots.test.ts
```

Run full local confidence before merging:

```bash
npm run typecheck
npm run lint
npm test
```
