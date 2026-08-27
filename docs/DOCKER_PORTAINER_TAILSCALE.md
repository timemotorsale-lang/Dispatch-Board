# Docker, Portainer, and Tailscale Deployment

This repo includes a Portainer-ready Docker stack for running Dispatch Board on an Ubuntu server behind Tailscale.

The recommended private deployment path is:

- Portainer builds and runs the app, PostgreSQL, migrations, scheduler, and backups.
- The app binds only to `127.0.0.1:3000` on the Ubuntu host.
- Tailscale Serve publishes the local app to your tailnet over HTTPS.
- No public Internet or LAN port is required for the app.

## Files

- `deploy/docker/portainer-stack.tailscale.yaml`
  Use this as the Compose path for a Portainer Git stack.
- `deploy/docker/.env.example`
  Copy these values into Portainer's stack environment variables.
- `deploy/docker/Dockerfile`
  Builds both the production app image and a tooling image for migrations and seeding.
- `deploy/docker/scripts/run-production-scheduler.mjs`
  Calls the protected cron routes on an interval.
- `deploy/docker/scripts/backup-postgres.sh`
  Creates recurring PostgreSQL backups in the `postgres_backups` volume.

## Ubuntu Server Prerequisites

Install Docker, Portainer, and Tailscale on the Ubuntu server.

Confirm the server is joined to your tailnet:

```bash
tailscale status
```

Confirm Portainer can reach the Git repository that contains this project. For a private repository, configure the Git credentials in Portainer before creating the stack.

## Portainer Stack Setup

1. In Portainer, create a new stack from Git.
2. Set the repository URL to this repo.
3. Set the Compose path to:

```text
deploy/docker/portainer-stack.tailscale.yaml
```

4. Add environment variables from `deploy/docker/.env.example`.
5. Replace the placeholder secrets before deploying.

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
```

Optional variables:

```env
CRON_INTERVAL_MS=900000
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

## Tailscale Serve

After the Portainer stack is healthy, publish the app through Tailscale Serve from the Ubuntu host:

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

The seed service is included under the `tools` profile so it does not run on every deploy.

To seed from the Ubuntu server with Compose:

```bash
docker compose -f deploy/docker/compose.yaml --profile tools run --rm seed
```

If you prefer to seed through Portainer, duplicate the stack temporarily with the `tools` profile enabled or run a one-off console command against the tooling image.

## Backups

Backups are written to the Docker volume named:

```text
postgres_backups
```

The default schedule is once per day with 14 days of retention. Change these values in Portainer:

```env
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

For production use, also copy backups off the server or onto a protected volume. A Docker volume alone protects against app mistakes, not host loss.

## Access Model

For the Tailscale stack, the app publishes only:

```text
127.0.0.1:3000:3000
```

That means other machines on the LAN cannot connect directly to port `3000`. Tailscale Serve is the intended entrypoint.

The base `deploy/docker/compose.yaml` also includes Caddy for a public-domain deployment. Do not use that public Caddy path unless you intentionally want Internet-facing HTTPS.
