# Docker deployment

This guide packages the Dispatch Board as a single-host Docker Compose stack for
Ubuntu Server.

For a private deployment using Tailscale Serve instead of Caddy, use
[TAILSCALE_DEPLOYMENT.md](TAILSCALE_DEPLOYMENT.md). That variant publishes the
application only to Ubuntu's loopback interface and requires no public web ports.

The stack contains:

- Caddy as the only public service, with automatic HTTPS
- One Next.js application instance
- A protected scheduler that invokes the application cron routes every 15 minutes
- PostgreSQL with durable database storage
- A daily PostgreSQL backup service with configurable local retention
- Explicit database migration and seed jobs

## Deployment assumptions

- Ubuntu Server has Docker Engine and the Docker Compose plugin installed.
- A DNS name points to the server when the app will be accessed outside the server.
- TCP ports 80 and 443 reach the server so Caddy can obtain a public certificate.
- The repository is checked out on the server.
- Production database and scheduler secrets are different from local-development
  values.

The app uses secure session cookies in production. A real deployment therefore
needs HTTPS. Do not publish the Next.js port directly as an HTTP-only workaround.

## 1. Prepare configuration

From the repository root, enter the deployment directory:

```bash
cd deploy/docker
cp .env.example .env
chmod 600 .env
```

Generate separate URL-safe secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Edit `.env` and set:

```env
APP_DOMAIN=dispatch.example.com
APP_TIMEZONE=America/Chicago
POSTGRES_DB=dispatch_board
POSTGRES_USER=dispatch_app
POSTGRES_PASSWORD=first-generated-value
CRON_SECRET=second-generated-value
```

Use a DNS hostname in `APP_DOMAIN`, without `https://`, for a public deployment.
Caddy will obtain and renew its certificate automatically.

For a server-only smoke test, `APP_DOMAIN=localhost` is supported. Caddy will use
a locally trusted certificate inside its container, so a host-side request may
need `curl --insecure`. This is not the intended configuration for other client
devices.

## 2. Validate and build

All commands in this guide intentionally name the production environment file:

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env build
```

The application image is built with a non-secret placeholder database URL.
Runtime database credentials are supplied only when containers start.

## 3. Start the database and initialize the schema

Start PostgreSQL:

```bash
docker compose --env-file .env up -d db
```

Apply checked-in migrations:

```bash
docker compose --env-file .env run --rm migrate
```

The application can now start without seed data. If this is a brand-new internal
pilot and the development identities are intentionally required, run the
one-time seed job:

```bash
docker compose --env-file .env --profile tools run --rm seed
```

The seed creates accounts that share the documented local-only password
`dispatch123!`. Do not expose a seeded deployment to the public internet. Replace
the bootstrap identity and password workflow before treating the app as a public
production system.

## 4. Start the complete stack

```bash
docker compose --env-file .env up -d
```

Check container state:

```bash
docker compose --env-file .env ps
```

Follow application, proxy, and scheduler logs:

```bash
docker compose --env-file .env logs -f app caddy scheduler
```

The application and database have health checks. Caddy waits for the application
to report both process and database readiness before proxying requests.

## 5. Network and firewall

The Compose stack publishes only ports 80 and 443. The application and PostgreSQL
ports remain on private Docker networks.

On Ubuntu with UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

For an internal-only deployment, restrict ports 80 and 443 to the LAN or VPN
interface instead of allowing them globally.

## Scheduler behavior

The scheduler calls these protected routes:

- `/api/cron/generate-board`
- `/api/cron/evaluate-concerns`

It calls them once when the scheduler starts and every 15 minutes afterward.
Daily board generation remains timezone-aware, setting-aware, and duplicate-safe
inside the application.

Inspect scheduler output:

```bash
docker compose --env-file .env logs --tail 100 scheduler
```

After deployment, follow the scheduler verification runbook and record the first
live scheduled attempt. A successful HTTP request can still represent an
intentional application-level skip.

## Backups

The backup service creates a PostgreSQL custom-format dump immediately after it
starts and then once per configured interval. Backups are retained in the
`postgres_backups` Docker volume for 14 days by default.

List available backups:

```bash
docker compose --env-file .env exec backup sh -c 'ls -lh /backups'
```

Copy a backup off the server:

```bash
docker compose --env-file .env cp \
  backup:/backups/dispatch-board-YYYYMMDDTHHMMSSZ.dump \
  ./dispatch-board-YYYYMMDDTHHMMSSZ.dump
```

A Docker volume is not an off-server backup. Automate copying dumps to separate
storage and periodically test a restore.

### Restore procedure

Restoring replaces database state. Confirm the target server and backup file
before proceeding.

Stop application writers:

```bash
docker compose --env-file .env stop app scheduler backup
```

Copy the selected dump into the database container:

```bash
docker compose --env-file .env cp \
  ./dispatch-board-YYYYMMDDTHHMMSSZ.dump \
  db:/tmp/restore.dump
```

Restore it:

```bash
docker compose --env-file .env exec db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  /tmp/restore.dump'
```

Restart services and verify health:

```bash
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

## Updating

Back up before applying application or migration changes:

```bash
docker compose --env-file .env restart backup
docker compose --env-file .env logs --tail 20 backup
```

Then update and rebuild:

```bash
git pull --ff-only
docker compose --env-file .env build
docker compose --env-file .env run --rm migrate
docker compose --env-file .env up -d --remove-orphans
docker compose --env-file .env ps
```

Do not run the seed job during routine updates.

## Rollback considerations

Application images can be labeled through `APP_VERSION`, but a database migration
may not be backward-compatible with an older image. Preserve the pre-upgrade
database dump and review the migration before rolling application code backward.

Never use `docker compose down -v` on a live deployment. The `-v` option removes
the database, backup, and Caddy volumes.

## Useful diagnostics

Application readiness:

```bash
curl --fail --silent https://dispatch.example.com/api/health
```

Recent logs:

```bash
docker compose --env-file .env logs --tail 200 app
docker compose --env-file .env logs --tail 200 db
docker compose --env-file .env logs --tail 200 caddy
```

Migration state:

```bash
docker compose --env-file .env run --rm migrate
```

Stop containers without deleting data:

```bash
docker compose --env-file .env down
```
