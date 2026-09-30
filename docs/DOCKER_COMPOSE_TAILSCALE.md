# Docker Compose and Tailscale Deployment

This repo includes a vanilla Docker Compose stack for running Dispatch Board on an Ubuntu server behind Tailscale.

The recommended private deployment path is:

- Docker Compose builds and runs the app, PostgreSQL, migrations, scheduler, and backups.
- The app binds only to `127.0.0.1:3000` on the Ubuntu host.
- Tailscale Serve publishes the local app to your tailnet over HTTPS.
- No public Internet or LAN port is required for the app.

## Files

- `deploy/docker/compose.yaml`
  Primary Compose stack for the private Tailscale deployment.
- `deploy/docker/compose.tailscale.yaml`
  Legacy no-op override for older deploy commands. The main Compose file is already Tailscale-private by default.
- `deploy/docker/.env.example`
  Copy this to `deploy/docker/.env` on the Ubuntu server and replace placeholder secrets.
- `deploy/docker/Dockerfile`
  Builds both the production app image and a tooling image for migrations and seeding.
- `deploy/docker/scripts/run-production-scheduler.mjs`
  Calls the protected cron routes on an interval.
- `deploy/docker/scripts/backup-postgres.sh`
  Creates recurring PostgreSQL backups in the `postgres_backups` volume.

## Ubuntu Server Prerequisites

Install Docker, Docker Compose, and Tailscale on the Ubuntu server.

Confirm the server is joined to your tailnet:

```bash
tailscale status
```

Clone the repository on the server, commonly under:

```text
/opt/dispatch-board
```

## Environment

Create the server-only environment file:

```bash
cp deploy/docker/.env.example deploy/docker/.env
```

Generate strong values on the Ubuntu server:

```bash
openssl rand -hex 32
```

Use one generated value for `POSTGRES_PASSWORD` and a different generated value for `CRON_SECRET`.

Minimum required variables:

```env
POSTGRES_DB=dispatch_board
POSTGRES_USER=dispatch_app
POSTGRES_PASSWORD=replace-with-a-long-random-hex-value
CRON_SECRET=replace-with-a-different-long-random-hex-value
APP_TIMEZONE=America/Chicago
APP_VERSION=local
CRM_NEXT=REVIEW
```

Optional variables:

```env
CRON_INTERVAL_MS=900000
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
ENABLE_DEMO_DATA=false
ENABLE_SHOP_RECON_PILOT_SEED=false
```

If `CRM_NEXT` is omitted, the Docker stack opens Customer Console in the safe `REVIEW` mode. To intentionally roll CRM Next back behind the protected fallback, set:

```env
CRM_NEXT=OFF
```

## Start the Stack

From the repository root on the Ubuntu server:

```bash
docker compose --env-file deploy/docker/.env -f deploy/docker/compose.yaml up -d --build
```

Check status:

```bash
docker compose --env-file deploy/docker/.env -f deploy/docker/compose.yaml ps
```

Inspect logs:

```bash
docker compose --env-file deploy/docker/.env -f deploy/docker/compose.yaml logs -f app
```

## Tailscale Serve

After the Compose stack is healthy, publish the app through Tailscale Serve from the Ubuntu host:

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:3000
```

Then open the Tailscale HTTPS URL for that server from a device on your tailnet.

To inspect the current Serve configuration:

```bash
tailscale serve status
```

To remove the Serve configuration:

```bash
sudo tailscale serve reset
```

## GitHub Actions Deploy

The included GitHub Actions workflow deploys by joining your tailnet, SSHing to the Ubuntu server, checking out the pushed commit in the existing server clone, rebuilding the Docker images, running Prisma migrations, and restarting the Compose stack.

Create these GitHub repository secrets:

```text
TS_OAUTH_CLIENT_ID
TS_OAUTH_SECRET
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

Recommended values:

```text
DEPLOY_HOST=<server MagicDNS name or Tailscale IP>
DEPLOY_USER=<server deploy user>
```

Create this optional GitHub repository variable if your server checkout is not `/opt/Dispatch-Board`:

```text
DEPLOY_PATH=/opt/Dispatch-Board
```

The Tailscale OAuth client must be allowed to create ephemeral nodes tagged as:

```text
tag:ci
```

The workflow assumes the deploy user can run Docker commands non-interactively. Either add the deploy user to the `docker` group, or configure narrowly scoped passwordless sudo for Docker. You can verify the current user is ready on the server with one of these commands:

```bash
docker compose version
sudo -n docker compose version
```

The server checkout must be able to fetch from the GitHub repository:

```bash
cd /opt/Dispatch-Board
git fetch origin
```

## First Deploy Behavior

The stack starts PostgreSQL first, runs `prisma migrate deploy`, then starts the app. The app health check uses:

```text
/api/health
```

The scheduler waits for the app to become healthy, then calls:

```text
/api/cron/generate-board
/api/cron/evaluate-concerns
```

The scheduler sends `Authorization: Bearer <CRON_SECRET>` automatically inside the Docker network.

## Seeding Data

The seed service is behind the `tools` profile and does not run during normal deploys.

To seed intentionally:

```bash
docker compose --env-file deploy/docker/.env -f deploy/docker/compose.yaml --profile tools run --rm seed
```

The seed script is designed to be repeatable for foundation data, but do not run seeding as part of normal production updates.

## Backups

Backups are written to the Docker volume named:

```text
postgres_backups
```

The default schedule is once per day with 14 days of retention. Change these values in `deploy/docker/.env`:

```env
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

For production use, also copy backups off the server or onto a protected volume. A Docker volume alone protects against app mistakes, not host loss.

## Access Model

The app publishes only:

```text
127.0.0.1:3000:3000
```

That means other machines on the LAN cannot connect directly to port `3000`. Tailscale Serve is the intended entrypoint.
