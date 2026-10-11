# Purchase Import Release and Operations

Purchase imports save reviewed acquisition drafts, not financial approvals. Promotion is blocked until security, scanner health, recovery, and staff acceptance pass for the exact release revision.

## Production Setup

Configure `IMPORT_OPERATIONS_ACTOR_EMAIL` with an active staff account that has the existing intake, evidence, and acquisition management functions at every monitored location. Configure `IMPORT_ALERT_WEBHOOK_URL` with an approved HTTPS alert receiver. It receives aggregate location counts, never source documents or VINs. Delivery failures surface in scheduler logs and retry on the next cycle; operations must monitor scheduler errors too.

The app and release tooling install ClamAV. The signatures service updates the shared signature volume. Imports fail closed when scanning fails or signatures are older than seven days. Promotion verifies both a clean file and the harmless EICAR detection test through the engine. Never enable the development baseline in production.

Create the protected, server-local `deploy/docker/import-release-approval.json` from the example only after checks pass. Use named reviewers, dated evidence references, and the exact 40-character release SHA. Protect the file through the existing production approval process; it is an evidence gate, not a substitute for independent human review. Missing, failed, stale, or wrong-version evidence blocks promotion.

## Acceptance Checks

1. In staging, import representative auction invoices, bills of sale, DealerCenter CSV, XLSX, and scanned PDFs. Compare every extracted value to the original. Record field accuracy and mismatches by source; do not assign a claimed accuracy percentage without this corpus. Financial discrepancies must prevent allocation until corrected.
2. Exercise authorized, unauthorized, reassigned, revoked, inactive, and cross-location staff accounts through the real API. Verify unauthorized source download and draft allocation are rejected.
3. Retry duplicates and simultaneous saves. Exactly one allocation should succeed; the other must be idempotent or require refreshed review. Test interrupted reads and interrupted saves separately.
4. Run 20-file and 500-row batches, concurrent staff uploads, and scanner outages on staging infrastructure. Record latency, memory, throughput, errors, and the staff queue outcome. Parser-only synthetic benchmarks do not count as production capacity proof.
5. Test keyboard-only upload, review, consent, save, retry, and reassignment; check screen-reader labels and focus. Automated axe and mobile checks supplement, but do not replace, staff accessibility acceptance.
6. Verify intake, inventory details, photos/media, and dealership/customer repair paths after deployment. Creation or acquisition imports must not force repair-only workflows into acquisition.

## Recovery

The organization-wide database admission lock allows at most two scanning, extraction, or draft-save jobs with active leases. Batches read sequentially. Busy requests must be retried after active work finishes; expired leases do not permanently occupy capacity. This protects the scanner from concurrent uploads but is not a substitute for target-infrastructure capacity testing.

The deployment performs a custom-format database backup and restores it into a separate disposable database before migrations. It verifies original purchase source checksums and retains the dump. Live data is never overwritten by the drill. The deployment retains the prior application image under its release SHA.

Practice `IMPORT_ROLLBACK_APPROVED=true sh deploy/docker/scripts/rollback-import-release.sh PREVIOUS_SHA` in staging, using an operator with Docker access. This changes app and scheduler images only, checks the health revision, and leaves migrations and business data intact. Confirm prior code supports the additive schema before approving rollback. Do not prune the last known-good image. Database restoration to live production is a separate, explicitly approved incident operation.

For a failed read, retry the stored source. For an interrupted save, inspect the vehicle draft, source checksum, purchase reference, and allocation audit before retrying. Do not upload again blindly or delete the original record. Undo is limited to unchanged, unconfirmed drafts with no posted costs or downstream work. Other corrections require an authorized compensating revision and accounting review, never deletion of financial history.

## Retention and Incidents

Original unallocated sources retain the existing 30-day period; linked purchase evidence retains seven years. `IMPORT_RETENTION_CLEANUP_ENABLED` stays false until the dealership approves those periods. Opt-in cleanup retires expired unlinked terminal-source bytes only, preserving audit metadata. Legal holds, diagnostic links, vehicle links, and active/imported jobs block cleanup. Text snapshots in audit history follow the wider audit policy and are not erased by source cleanup.

Failed/quarantined jobs updated within 24 hours and expired processing leases trigger aggregate alerts. Unchanged alerts are suppressed for one day. The operations owner reviews the queue, resolves scanner/delivery incidents, and documents partial-save reconciliation. A missing owner, revoked permissions, or failed webhook causes the cron check to fail; do not treat that as a healthy monitor.

## Current Release Gate

The patched DeepmergeTS override is regression-tested through Prisma validation. The braces advisory has no published patched version and remains a security blocker; do not force a framework downgrade or suppress the audit. Production scanner execution, real-document accuracy, staff acceptance, restore/rollback drills, capacity, and alert delivery need results from the target environment before signing the approval file. Implementation alone does not satisfy these checks.

References: [ClamAV scanning](https://docs.clamav.net/manual/Usage/Scanning.html), [ClamAV command options](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamscan.1.in), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [DeepmergeTS advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
