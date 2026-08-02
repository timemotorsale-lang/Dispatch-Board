# Inventory-to-Frontline Pilot Runbook

## Pilot scope

Pilot the vehicle-specific lifecycle at one authorized dealership location with trained inventory, recon, parts, QC, title, and release staff. The application is the workflow system of record; carrier, title-agency, listing, DMS, accounting, OEM recall, and other provider actions remain external unless their integration health explicitly says otherwise.

## Staff journey

1. Find or add the canonical vehicle by VIN. Use a documented non-VIN exception only when the vehicle genuinely has no VIN.
2. Establish the governed acquisition case and Inventory Unit. The acquisition workspace returns directly to Receiving & Initial QC.
3. Complete every receiving checklist decision, attach governed Vehicle 360 evidence, review NHTSA safety intelligence, and record custody, odometer, keys, condition, and disposition.
4. Create the inventory-recon Repair Order from the vehicle plan. On return, approve the exact scope and amount.
5. Execute Repair Order and Parts work in their authoritative workspaces, return to the vehicle plan, and run the completion recheck.
6. Complete independent Final Recon QC. Record failed QC instead of passing a critical exception.
7. Clear title/document readiness or record a governed hold. Verify merchandising and publication reconciliation or record a publication exception.
8. Complete independent frontline release and then record physical, internal, and digital availability. Any mismatch remains blocked until reconciled.

## Daily controls

- Review active, blocked, overdue, and frontline-ready totals at the start and end of each shift.
- Confirm every active vehicle has one owner, location, future target, and explicit next action.
- Review controlled holds by owning domain and due time; correct evidence in the source workspace before reopening.
- Run or confirm the scheduled Inventory-to-Frontline escalation evaluation. It is versioned and idempotent.
- Check command durability, outbox delivery, and projection freshness in **Administration → Vehicle Operations → Rollout & health**.
- Treat NHTSA model-level campaigns as **Potentially applicable—verify by VIN**. Do not record them as open VIN-specific recalls without authoritative VIN verification.

## Pilot entry criteria

- Authorized pilot users and one independent QC/release reviewer are active.
- Inventory Unit, Repair Order, Parts, QC, Vehicle 360 evidence, and NHTSA safety screens are reachable from a pilot vehicle.
- Cron authorization is configured for the overdue escalation endpoint.
- A rollback owner and incident channel are assigned.
- A test vehicle completes the happy path and the receiving concern, failed QC, title hold, publication exception, and post-release mismatch paths.

## Stop conditions

Pause new pilot starts if canonical duplicates are created, evidence cannot be retrieved, optimistic-version conflicts repeat after refresh, outbox delivery is unhealthy, permission boundaries fail, release can be performed by the workflow owner, or a critical safety/title exception advances as passed.

Existing active work should remain visible and recoverable. Do not delete or rewrite lifecycle history; use controlled holds, correction re-entry, alternate disposition, or non-destructive reversal.

## Evidence to retain before merge or wider rollout

- Test and type-check results for the release candidate.
- Screenshots or recordings of one complete happy path and each critical exception path.
- Pilot vehicle IDs, workflow IDs, command correlation IDs, and responsible staff.
- Daily counts for active, blocked, overdue, frontline-ready, failed QC, title holds, publication exceptions, and post-release mismatches.
- Sign-off from Inventory, Shop, Parts, QC, Title, and the release authority.
