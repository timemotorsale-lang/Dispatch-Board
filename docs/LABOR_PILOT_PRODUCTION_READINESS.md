# Connected labor pilot: production readiness

## Status: feature-specific review notes, not a global deployment gate

The twelve-gate readiness checker and mandatory Labor Release Evidence workflow have been removed at the owner's request. These labor review notes do not block unrelated production releases. Deployment still requires explicit manual confirmation on `main`, successful CI for that revision, production preflight, a verified database backup/restore, migration success and health/revision checks. Existing in-app customer authorization, QC, qualification and catalog-policy approvals remain unchanged.

The approved brake and steering/suspension baselines now have an opt-in connected explorer. The existing guide stays the default. No deployment, production migration, rollout activation, customer approval, shop policy activation or labor-standard publication was performed.

## Review entry points

- `/diagnostics/labor-guide?experience=explorer`: use a selected real vehicle and repair order; this selector feeds the existing saved workspace and estimate services. The **Existing labor guide** link returns to the default experience. Vehicle intake and customer intake remain the existing flows.
- `/diagnostics/labor-evidence`: manager-only, latest 200 persisted repair jobs, canonical catalog identity, planned versus measured technician minutes, QC and study exclusion reasons. Job links provide traceability.
- `/diagnostics/labor-readiness`: manager-only read-only policy and rollout checks. A fallback $125 rate does not constitute an approved versioned shop policy.
- `/prototype/repair-explorer`: isolated preview remains separate. Its browser drafts and illustrative values are not automatically imported into real estimates.

Only brakes and steering/suspension are enabled in the connected selector. The other ten systems now have expanded shared review definitions and a six-group matrix at `/prototype/repair-coverage`; independent shop approval remains pending. Neither these two approved coverage baselines nor the full catalog is represented as exhaustive or vehicle-specific OEM labor data. Diagram aids are generic identification aids, not repair instructions or confirmed fitment. See `docs/LIGHT_DUTY_CATALOG_EXPANSION.md`.

## Connected workflow and safety boundaries

1. Select the actual vehicle/RO and work scope. Search and visual selection resolve to canonical operation identities; front-left/right scope is preserved.
2. Review the inherited shop rate, required parts prices, fitment, tax source, labor source, conditions, configuration, brake/steering procedure and verification requirements. Existing server validation remains authoritative.
3. Present a versioned estimate through the existing planning service. Selection/presentation never authorizes work or creates an executable job automatically.
4. Record a real customer's exact line-level decision through the existing authorization workflow. Job creation, dispatch and clock START/RESUME recheck the latest authorization. Superseded/revoked decisions do not authorize work.
5. Dispatch through existing qualifications/procedure/parts gates. Technicians use the existing persistent clock. Staff cannot submit another technician's events; only managers correct minutes. Reverse chronology, future events and negative accumulated totals are rejected. Corrections do not reopen completed tasks.
6. Finish with evidence and QC handoff; perform existing QC and release checks. The old completion shortcut no longer fabricates a one-cent estimate or internal customer approval: it requires genuinely authorized labor.
7. Review centrally stored actual labor. Planned time is never used as measured time. Unfinished, unmapped, unconfigured, reworked, missing-finish-event, post-QC-corrected or truncated histories are excluded from study readiness. Multiple technicians contribute technician-minutes, not vehicle elapsed time. Study eligibility is not a statistically validated standard, fair-pay standard or independent quality certification.

No schema migration or second timer was added. Saved quotes retain their recorded amounts; switching experience does not reprice historical work.

## Verification available in this change

- Isolated browser fixture exercises the real console and canonical catalog through brake/steering selection, required parts pricing, staff reviews, persisted-draft request and estimate presentation. It checks narrow-screen behavior, browser errors and accessibility in the explorer region. HTTP is mocked: this is **not** proof of real database persistence, customer delivery or staging execution.
- Focused tests cover canonical/scoped identity, authorization, clock chronology, evidence exclusions, manager/technician boundaries and the safe completion shortcut.
- The 2026-10-17 expanded-controls final regression run passed 4,670 tests with 32 conditional skips; the earlier task-reassignment failure was cleared by intervening branch fixes. A heavily parallel local run timed out in an unrelated claims-route test; a limited-parallelism full run passed without modifying that test. Additional catalog containment/resource tests and isolated PostgreSQL/authenticated-browser evidence cover the new controls, but do not supply complete business acceptance or operator signoff.
- Local typecheck, schema validation and the isolated production build passed; dependency audit reported zero vulnerabilities. Windows Prisma regeneration encountered the active development engine lock and continued using the existing generated client. Regenerate successfully in a clean staging/release environment before signoff. Type/build results must be attached for the exact committed release revision; a local check never substitutes for staging and recovery proof.
- CI runs both isolated browser fixtures as a required job. Manual production promotion requires successful exact-revision main CI, not a separate Labor Pilot manifest, twelve-gate checker or independent-review evidence run. Deployment checks do not supply customer authorization or activate catalog policies.

## Feature-specific acceptance guidance

When changing labor workflows, review the affected intake, estimate, authorization, dispatch, clock, parts, QC and closeout paths with the relevant staff. Verify role/location boundaries and preserve historical amounts. Use isolated staging and recovery rehearsals where useful; retain honest results without inventing reviewer approvals or treating synthetic tests as real customer decisions.

Catalog enablement remains a separate business decision through existing in-app policies. Deployment does not validate provisional labor hours, approve tax treatment or enable all systems. Prefer a manager-controlled brake/steering pilot and review scope, personnel, equipment and procedures before enabling expanded systems. See `LABOR_CATALOG_STAGING_AND_APPROVALS.md` for optional staging and the general manual deployment sequence.
