# Connected labor pilot: production readiness

## Status: HOLD — review implementation, not a deployment approval

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
- Focused tests cover canonical/scoped identity, authorization, clock chronology, evidence exclusions, manager/technician boundaries, safe completion shortcut and fail-closed release evidence.
- The latest expansion regression run reported 4,645 passed, 31 skipped and one failure: task reassignment metadata in `task-activity-events.test.ts`. This remains an unresolved release blocker. Transmission concern classification was tightened and tested as part of the larger catalog's diagnosis-first search; the unrelated activity implementation was not changed to force a green run.
- Local typecheck, schema validation and the isolated production build passed; dependency audit reported zero vulnerabilities. Windows Prisma regeneration encountered the active development engine lock and continued using the existing generated client. Regenerate successfully in a clean staging/release environment before signoff. Type/build results must be attached for the exact committed release revision; a local check never substitutes for staging and recovery proof.
- CI now runs on pull requests and requires an isolated browser fixture before the existing deployment job. This does not supply customer authorization or replace release-owner approval.

## Required operator proof before a pilot release

Copy `docs/labor-pilot-release-evidence.example.json` to an operator-owned evidence location. Do not overwrite the template with secrets or pretend evidence. Record the exact clean committed revision, distinct staging/production origins, current UTC timestamp and independently reviewed artifacts. Run `npm run check:labor-pilot-release -- <evidence.json>` from the repository. The command verifies file hashes, revision, freshness, all twelve gates and clean worktree; it never deploys. Reviewer names are human attestations, not cryptographic identity verification. The release owner must verify the reviewers and artifact content. No CI deployment currently invokes this manual promotion checker automatically.

For each gate record the evidence file, SHA-256, reviewer and PASS only after the proof actually exists:

| Gate | Required proof |
| --- | --- |
| production-build | Clean install and production build of the exact candidate revision. |
| full-tests | Green full regression run; disposition and rerun of the remaining task-activity failure. |
| browser-workflow | Real isolated staging users, new/existing customer and vehicle intake, refresh/session persistence, estimate revisions, concurrent edits and error/retry behavior; also desktop/mobile checks. |
| authorization-and-qc | Partial approval, refusal, revocation, new estimate revision, attempted stale job/dispatch/start, authorized execution, paused/resumed clocks, parts holds, failed/rework/passed QC and release refusal until requirements pass. Verify persisted records and audit history, not screenshots alone. |
| permissions | Advisor, technician, manager and denied user; cross-technician attempts, qualification expiry, role/location boundaries and direct API refusal. |
| rate-policy | Administrator approves the versioned $125/hour starting policy through existing settings. Ordinary staff inherit it; historical estimates remain unchanged. Do not activate a policy as part of this code change. |
| parts-and-tax-policy | Owner/accountant verifies actual applicable tax jurisdiction, taxable categories, fees, parts markup and rounding. The requested 7% is a shop input, not a verified legal tax determination. |
| staging-upgrade | Disposable, nonproduction database/files/environment. Record migration status and upgrade from the deployed version; do not confuse fresh CI migrations with an upgrade rehearsal. This change adds no migration. |
| backup-restore | Restore a verified backup into a separate isolated target. Reconcile customers, vehicles, ROs, estimates, decisions, jobs, clocks, QC, audit records and document/evidence file storage. Existing file-focused restore checks alone are insufficient. Record counts/checksums and recovery time. Never restore over live data. |
| rollback | Rehearse previous application revision plus compatible schema/data. New catalog-linked records must remain readable; switching back to legacy UI alone does not undo safety service changes. Document forward repair for any incompatible future migration. |
| monitoring-alerts | Prove alerts for failed saves/authorization, dispatch/clock errors, background services, storage and backup failures; name an on-call owner and escalation path. |
| operator-training | Owner-approved scope, advisor/technician/QC walkthrough, provisional-time labeling, correction/rework handling, fallback and support instructions. |

Start with a manager-controlled brake/steering pilot, not all systems at once. Expand only after genuine workload evidence and staff signoff. Complete independent shop reviews of the ten implemented expansion baselines using the six-group coverage matrix, configuration/safety/overlap/parts/diagnostic reviews and tests before enabling them in the connected selector. A failed or missing gate means **HOLD**.
