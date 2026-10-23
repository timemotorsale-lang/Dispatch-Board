# Private hosted design review

## Boundary

The customer preview is a separately built production-mode container on an internal-only Docker network. It has no published port, production database URL, provider credentials, or live inventory feed. Only the staff app shares its dedicated network. No public proxy or Tailscale route is added.

`/website-review` on the existing private staff origin is the review gateway. Every page, asset, and preview API request requires an active manager or existing delegated-manager sign-in. Unauthorized staff cannot load assets directly. Mutation requests must match the configured HTTPS staff origin.

The gateway strips staff cookies, Authorization, and untrusted gateway headers. Only the isolated synthetic preview cookie is passed. A server-only random key authenticates each hop; the preview rejects direct requests without it. It is never included in client configuration. Responses are private/no-store.

## Review experience

Website Console offers Open Website Preview pointing to `/website-review` when explicitly enabled. It works from devices that already have access to the private staff site and a permitted sign-in. Ordinary production mode still disables sample data. Hosted review requires its separate flag, sample-data flag, and a configured server key; these never enable live accounts, payments, staff intake, or document uploads.

Use fictitious information only. Preview requests are session-isolated and are not delivered to staff. Preview SQLite storage is a separate disposable Docker volume, not a production customer database. Configuring an approved public website URL retires the preview link automatically. Disabling hosted review or removing its key makes the gateway fail closed.

## Deployment

Deploy Production must run only after successful main-push CI for the exact revision. It retains existing rollback image, database backup/restore verification, migration gates, and staff health checks. It additionally builds the isolated customer preview and checks its release revision on the internal network.

The setup helper creates `deploy/docker/website-review.env` on the server with mode 0600, preserving an existing valid key. The file is excluded from Git and Docker build contexts. The helper exports configuration only to the deployment process; no secret is logged. Subsequent manual Compose operations must source the helper in the same shell and select the website-review profile to keep review active.

No domain purchase, public DNS change, network exposure, finance activation, or production customer-data import is part of this release.

## Verification

Anonymous gateway requests redirect to staff login; unauthorized staff receive 403. Direct backend access without gateway proof and cross-origin mutations must fail. Staff credentials must not reach the preview. Navigation, native search, assets, and preview API requests must retain the `/website-review` prefix. Server revision must match the approved release before reporting deployment success. Authenticated phone/camera acceptance remains required after actual deployment.
