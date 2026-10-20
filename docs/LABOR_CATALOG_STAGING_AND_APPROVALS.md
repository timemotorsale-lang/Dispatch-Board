# Expanded labor catalog: approval and staging runbook

## Scope and release boundary

The ten-system catalog has implementation controls, not blanket shop approval. No policy is created or activated by installing this change. Existing saved estimate amounts are not rewritten. The 1,080 expanded operations retain provisional, internally authored hours; neither tests nor a system activation validate OEM applicability, licensed labor times or measured standards.

This runbook covers the six audit follow-ups: per-job parts attribution, enforceable execution requirements, independent per-system activation, subsystem/overlap scope, browser CI/release evidence, and isolated staging/recovery preparation. Real workload acceptance, independent business decisions and production promotion remain explicit operator work.

## 1. Review and activate one system at a time

1. Review `/prototype/repair-coverage` and each system's operations, including the configuration checklist, included package operations, exclusions, conditional work and verification requirements. All 73 expanded subsystem groups have a specific checklist. Confirm supplied assembly contents and vehicle-specific overlap; the conservative package rules are not a complete OEM overlap engine.
2. Record actual technician qualifications and current procedures through existing Shop Operations administration. Expanded jobs use `CATALOG_<GROUP_ID>` work types with hyphens replaced by underscores, for example `CATALOG_EV_BATTERY`. Every expanded operation requires `CATALOG_<SYSTEM_ID>` skill and `SERVICE_INFORMATION` equipment capability. Specialist profiles add internal qualification/equipment/bay codes such as `HV_PLATFORM_QUALIFIED`, `REFRIGERANT_SERVICE`, `RESTRAINT_SYSTEMS`, `ADAS_PLATFORM_QUALIFIED` and `BODY_REPAIR_SPECIALIST`.
3. Record capability codes on resources using the existing attributes object, for example `{"catalogCapabilities":["HV_CONTROLLED_AREA"]}` on a service bay. A resource's exact code also declares that capability. Several uniquely coded bays may declare the same capability. Free-text resource names or matching fragments do not satisfy expanded execution requirements. Equipment declarations and qualification codes are internal controls, not proof of external certification. Existing resource-management access controls remain authoritative.
4. Open manager-only `/settings/labor-catalog`. Choose the system, supply detailed shop scope and personnel/equipment/referral review references, explicitly attest to the complete scope, and propose either enablement or a hold. Supply a reason of at least ten characters.
5. Create the draft, validate its scope, have a different authorized manager approve it, then activate the reviewed version. This uses the existing audited vehicle-policy workflow and its capability/rollout checks. If `CUSTOMER_LIFECYCLE` mutations are disabled or the actor lacks policy capability, activation stays blocked; this change never switches those flags automatically.
6. Reload `/diagnostics/labor-guide?experience=explorer`. Only brakes, steering/suspension and systems with a current independently approved active scope become selectable. Approval binds the catalog version and a SHA-256 fingerprint of operation definitions, requirements, package scope and checklists. A changed fingerprint, disabled policy, expired effective period or failed approval lookup holds the affected system. Historical estimates remain unchanged.

To withdraw a system, create and independently activate a new policy with enablement unchecked. Its activation supersedes the earlier policy and blocks new jobs, dispatch and START/RESUME. An already running clock may still be paused/finished so actual history is not lost; this does not authorize new work. Existing work requiring an expired/mismatched procedure or unavailable bay/tool must be reviewed and redispatched. `/diagnostics/labor-readiness` displays current per-system approval counts but does not grant release approval.

## 2. Review multi-job parts assignments

Official part estimate lines now preserve `laborLineKey`; moving a part between jobs invalidates the exact-work review digest. The guide writes the same stable labor key into unassigned demand references. Job creation allocates each active demand only to its uniquely identified approved labor line, independent of line order. Legacy exact descriptions are accepted only when unique; a single approved labor line retains the earlier fallback.

Ambiguous references, parts linked to unapproved labor, unlinked multi-job part lines or new demands targeting an existing job fail before creating any additional jobs. Reconcile those assignments in the Parts workspace or create individually reviewed jobs. Linked demands already assigned to another job are never taken. Expanded jobs with a parts/material allowance remain parts-required even when no demand was created; zero demands or incomplete/released reservations cannot become a ready clock start.

The server derives catalog qualifications, canonical work type and bay/tool requirements even if a caller or historical job supplies empty arrays. Dispatch checks them; START/RESUME recheck active system approval, current technician qualifications, parts reservations, the assigned current procedure and active allocated equipment at the dispatch location, in addition to exact-version customer authorization.

## 3. Run isolated staging

### Local rehearsal

Provide `LABOR_STAGING_DATABASE_URL` explicitly as a loopback PostgreSQL URL with a new dedicated `labor_staging_*` schema, and set `LABOR_STAGING_CONFIRM=isolated`. Do not use `public` or a production host. Connection override/duplicate query parameters are rejected. Run:

```text
node scripts/run-labor-catalog-staging.mjs
```

The runner applies candidate migrations only to that schema, seeds synthetic accounts, runs actual PostgreSQL policy/clock guard tests, and starts a separate Next server at `http://127.0.0.1:3200` for the authenticated browser test. It never selects the development database automatically. Synthetic records remain in the isolated schema for inspection; cleanup requires an administrator to verify that exact schema. The existing localhost:3000 preview is not the staging target.

The PostgreSQL test persists draft/independent approval/activation/hold transitions and retry receipts; rejects self-approval and changed-request replay; exercises missing qualifications, actual dispatch resource holds/reassignment, parts reservations, real START/PAUSE events, a revoked authorization and a superseding system hold. It seeds clearly labeled synthetic prior-dispatch/customer decisions and does **not** prove customer delivery, real shop dispatch acceptance, QC completion or an actual personnel/equipment review.

The browser test uses real login/session storage and API/database reads, checks unauthenticated/ordinary staff refusal, renders the manager approval page and expanded EV review catalog. Browser fixtures separately cover selection/presentation UI, all ten systems, package conflict/saved-work behavior, mobile and accessibility; their mocked HTTP does not count as live workflow acceptance.

Captured logs and the browser screenshot are under ignored `test-results/labor-staging/`. Playwright output uses a subdirectory so it cannot erase the proof logs. No screenshot/log is automatically promoted to shop approval or owner signoff.

### GitHub upgrade and restore rehearsal

Once the reviewed workflow is available on the repository's default branch, run **Labor Catalog Staging** on the selected candidate revision. Supply the exact 40-character revision actually deployed as `baseline_revision`. A newly added workflow may not be dispatchable from a feature branch until it exists on the default branch; the local isolated runner is available before then.

The workflow uses a disposable PostgreSQL 17 service. It applies the deployed baseline's migrations, then candidate migrations and the isolated tests. It takes a database backup, restores it into a second disposable database, and compares every table's row counts and ordered row-content checksums, including customer/vehicle/RO/estimate/decision/job/clock/QC/audit tables. The workflow uploads `labor-staging-proof-<revision>` even after a failure when logs exist. No production connection or secret is used.

The restore manifest serializes explicit composite rows, including tables with JSON columns named `snapshot` or matching the SQL alias. Regression tests cover alias collisions, non-JSON field changes, restored values and empty tables. A failed comparison or verifier error keeps recovery evidence on HOLD; do not substitute an unverified PASS. `RUN_RESTORE_MANIFEST_DB_TESTS=1` runs the database regression only against a disposable loopback `compliance_review_` database.

This workflow is implemented but must be run on GitHub for the committed candidate. A local fresh-schema run is not an upgrade from the deployed revision. Disposable synthetic-data restoration does not establish production-scale recovery time, external document/evidence file restoration or application/schema rollback compatibility. Those remain separate recorded operator rehearsals.

## 4. Complete the remaining acceptance proof

Use the twelve gates in `LABOR_PILOT_PRODUCTION_READINESS.md`. Independently verify real staged intake, full/partial/declined/revoked decisions, estimate revisions, safe job/dispatch retries, required equipment and expired qualifications, parts holds, START/PAUSE/RESUME/FINISH/corrections, failed/rework/passed QC and release refusal until all requirements pass. Include actual role/location boundaries, historical amount preservation and audit reconciliation. The synthetic database test does not substitute for this end-to-end business acceptance.

Rehearse the prior application revision against compatible restored schema/data. Verify external file recovery, monitoring/alerts and named on-call response. Obtain genuine rate and parts/tax policy decisions and advisor/technician/QC training signoffs. Do not enter PASS or invent reviewers for incomplete work. No labor-hour validation is inferred from a synthetic clock.

## 5. Publish reviewed evidence and manually promote

1. Configure the GitHub environment `labor-pilot-release-review` with required independent reviewers and prevent self-review; restrict it to `main`. Review the existing `production` environment's reviewers/branch restrictions too. Workflow files cannot establish those account-level protections. Do not treat an auto-created unprotected environment as an independent approval.
2. Obtain green exact-revision main CI, including both browser fixtures. Complete staging/recovery/operator proof for that clean committed revision. Copy the evidence example into an operator-owned location; keep customer information and secrets out of artifacts.
3. Run **Labor Release Evidence** on the exact `main` revision. Supply `evidence_json` and `artifacts_json`, a JSON object mapping safe relative filenames to their reviewed text contents. These are treated as data, never shell commands. Text proof may contain immutable CI/staging artifact references, their hashes and the reviewer’s reconciliation; reviewers must inspect the referenced source evidence, not merely trust a sentence saying PASS. Large/binary artifacts stay in their original restricted artifact store and are referenced by the reviewed records. GitHub's workflow input-size limit also applies.
4. The checker requires exact revision, seven-day freshness, different staging/production hosts, independent owner/reviewer names, all twelve passing gates, matching artifact hashes and a clean worktree. Files must be regular bounded files inside the bundle; traversal/outside symlinks are rejected. Names remain human attestations, not cryptographic identity verification. The protected environment and release owner must verify actual reviewers and content.
5. Only after that workflow succeeds, select **Deploy Production** on the same `main` revision, supply its `labor_evidence_run_id` and explicitly confirm deployment. Before contacting production, it verifies the review run's workflow path, successful manual main-branch origin, repository and exact revision; downloads only its expected artifact; reruns evidence validation; and retains the successful-main-CI gate. The existing production backup/restore, manual environment and health/revision checks remain in force.

Artifacts expire after seven days and the checker rechecks freshness at deployment; rerun genuine evidence review when stale. Missing evidence or an unrelated/failed/old review means HOLD. None of these workflows is launched, and no system/rate policy or production deployment is activated, merely by implementing this change.
