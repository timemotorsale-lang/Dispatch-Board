# M8 — Administration and resilience hardening (VEH-115–VEH-118)

This package defines the release evidence gates for disaster recovery, security,
accessibility/performance, and a controlled production pilot. The gate
functions in `src/server/inventory/enterprise-hardening-gates.ts` are pure and
provider-neutral so CI, deployment tooling, and an eventual operator console
can evaluate the same rules.

## Release sequence

1. Capture backup/restore evidence and reconcile vehicle, ledger, command, event,
   audit, and projection totals (VEH-115).
2. Attach threat-model, dependency/secret scan, authorization, tenant-isolation,
   and upload-abuse evidence (VEH-116).
3. Attach WCAG AA, responsive journey, latency, concurrency, and pagination
   evidence (VEH-117).
4. Enable one location only, observe, pause or roll back on a trigger, reconcile,
   and resume only after the gates are ready (VEH-118).

`READY` is not an automatic production approval: named owners must review and
retain the evidence, and the rollout flag remains the final activation control.
