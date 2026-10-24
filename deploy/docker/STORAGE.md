# Production storage safeguards

The October 2026 incident was caused by release/build accumulation on the system filesystem. The root volume has been expanded to 200 GiB (approximately 197 GiB usable); this does not replace retention controls.

## Deployment policy

- Require 30 GiB available and less than 85% usage on the checkout, root, Docker root, containerd, and Compose volume filesystems before building. These are conservative initial budgets, not an exact build-size prediction; increase them if build/backup measurements grow.
- Recheck for at least 10 GiB and less than 90% usage after building, before backup verification/migrations. Existing verified-backup and health gates remain mandatory.
- Warn in deployment output at 75% usage. This is not continuous monitoring or an external alert subscription; configure an approved monitoring destination separately for proactive 75%/85% alerts between deployments.
- Serialize workflow deployments with a host lock. Do not run manual Docker builds/pruning concurrently with deployment.
- Rotate logs for every Compose service with the local driver, 10 MB per file, three files per container. Settings take effect when containers are recreated during deployment, not immediately on existing containers. Portainer and other non-project services are outside this policy.

## Conservative release retention

After internal and public release health checks succeed, the guard records the previous healthy release and new release in the deployment user's `~/.local/state/dispatch-board-storage/releases.json`. Keep this ledger private and persistent; never reconstruct it from arbitrary image timestamps.

Preserve the current release and two most recently recorded verified rollback releases. Only expire SHA-tagged images in `dispatch-board-app`, `dispatch-board-tooling`, and `dispatch-board-website-review` that are in the verified ledger, outside the protected set, at least seven days old, and not referenced by ANY running or stopped container. Shared image IDs with protected releases are also preserved. Removal is tag-specific without force. Legacy releases not in the ledger, arbitrary tags, untagged images, other repositories, containers, volumes, and backups are never removed by the guard. Legacy images and failed-release artifacts therefore need a separate reviewed cleanup plan; automatic retention does not immediately recover all historical space.

Cache maintenance runs only after successful health checks using `docker builder prune --all --force --keep-storage 6GB`. This is a target for reclaimable unused cache, not a hard cap on shared/in-use layers or a periodic daemon GC configuration. It does not prune images, containers, or volumes. Failed deployments preserve rollback images; cache may need separately authorized cleanup if repeated failures accumulate.

Manual read-only commands from the checkout:

```sh
python3 deploy/docker/scripts/storage-guard.py check
python3 deploy/docker/scripts/storage-guard.py plan --revision FULL_CURRENT_SHA
```

The guard reads Docker metadata without dumping container environment values. It uses noninteractive Docker access and fails closed on missing privileges, malformed ledgers, missing mounts, failed health checks, or inspection errors. `plan` does not delete anything, but may create its ledger directory/lock file. Maintenance requires the verified previous and current SHAs and must be run only within the serialized deployment flow.

## Image-size changes

Clean the npm download cache in the SAME dependency-install layer so it is not retained in final or tooling images. Declare runtime release metadata AFTER dependency installation so changing a release SHA does not invalidate the large runtime dependency layer. Remove Next build caches before copying build artifacts into runtime images. Exclude worktrees, all alternate Next output folders, local application data, temporary files, and nested node_modules from the Docker build context. Retain OCR, antivirus, Prisma, PDF dependencies, and runtime package versions; standalone runtime conversion needs separate functional verification.

The existing daily database backup job already retains 14 days by default and removes aged daily dumps only after a new dump succeeds. Pre-release restore-drill snapshots previously had no retention. The restore drill now removes only `import-pre-release-*.dump` files older than 14 days, and only AFTER a newly created snapshot passes restore and evidence-checksum verification. A failed drill deletes no old backups; the new verified snapshot remains. This policy first takes effect during deployment; no existing backups were removed while preparing this change. Off-server backup verification, broader integrity checks, monitoring delivery, daemon-level GC, and historical-image cleanup remain separate operational work.

## Validation

```sh
python3 -m unittest discover -s deploy/docker/tests -p 'test_*.py' -v
```

Deploy only after CI passes. No daemon restart is required for these repository changes; container recreation and new images occur only when the approved deployment runs. Source changes alone do not activate production safeguards.
