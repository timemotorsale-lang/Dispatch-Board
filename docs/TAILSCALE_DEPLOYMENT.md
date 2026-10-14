# Private deployment with Tailscale

This is the preferred Docker deployment for a private Dispatch Board installation
on Ubuntu Server. Tailscale Serve provides the trusted HTTPS endpoint, while
Docker publishes Next.js only to `127.0.0.1` on the Ubuntu host.

The resulting path is:

```text
Authorized tailnet device
  -> Tailscale encrypted network
  -> Tailscale Serve HTTPS
  -> 127.0.0.1:3000
  -> Dispatch Board container
  -> private Docker network
  -> PostgreSQL container
```

Caddy is disabled in this mode. Ports 80, 443, 3000, and 5432 do not need to be
opened on the server's public or LAN interfaces.

## 1. Join the Ubuntu server to Tailscale

Install Tailscale using the current official Ubuntu instructions, then join the
tailnet:

```bash
sudo tailscale up --hostname=dispatch-board
```

The command displays an authentication URL when interactive authorization is
required. `dispatch-board` is a suggested stable, non-sensitive machine name;
choose a different name if it conflicts with an existing tailnet device.

Keep MagicDNS enabled. Tailscale derives the full `*.ts.net` hostname after the
server joins, so it is not necessary to know the hostname in advance.

## 2. Configure the application

From the repository root, enter the deployment directory:

```bash
cd deploy/docker
cp .env.example .env
chmod 600 .env
```

Generate two separate secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Edit `.env` and replace `POSTGRES_PASSWORD` and `CRON_SECRET` with the
generated values. `APP_DOMAIN` is unused by the Tailscale override and can remain
unchanged.

## 3. Validate and build the Tailscale stack

Use both Compose files for every lifecycle command:

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  config --quiet
```

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  build
```

## 4. Initialize and start

Start PostgreSQL and apply migrations:

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  up -d db
```

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  run --rm migrate
```

For a brand-new internal pilot that intentionally needs the bootstrap identities,
run the seed job once:

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  --profile tools run --rm seed
```

The seed identities share the local-only password `dispatch123!`. Limit access
through Tailscale grants and replace the bootstrap credential workflow before
expanding access.

Start the complete stack:

```bash
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f compose.tailscale.yaml \
  up -d
```

Confirm that the app is healthy and bound only to loopback:

```bash
curl --fail http://127.0.0.1:3000/api/health
```

```bash
sudo ss -lntp | grep 3000
```

The listener should show `127.0.0.1:3000`, not `0.0.0.0:3000`.

## 5. Enable the private HTTPS endpoint

Configure Tailscale Serve to proxy the loopback port:

```bash
sudo tailscale serve --bg 3000
```

If tailnet HTTPS is not enabled yet, Tailscale provides a consent link. Enabling
HTTPS publishes the non-sensitive machine name and tailnet DNS suffix to public
certificate-transparency logs, but it does not make the application public.

Inspect the assigned URL:

```bash
sudo tailscale serve status
```

The output includes a URL resembling:

```text
https://dispatch-board.example-tailnet.ts.net
```

Only devices and users authorized by the tailnet policy can reach that address.
Use Tailscale Serve, not Tailscale Funnel; Funnel would make the service public.

## 6. Firewall posture

The application does not require inbound public web ports. Keep the normal
Tailscale-required outbound connectivity and retain only the administrative
inbound access you intentionally use.

If SSH is also restricted to Tailscale, verify a working Tailscale SSH or VPN SSH
session before changing UFW rules. Do not lock out the server's recovery path.

The Compose override provides the main application safeguard: Docker maps port
3000 only to `127.0.0.1`, and PostgreSQL has no host port mapping.

## 7. Routine operations

Define a temporary shell helper for the current session:

```bash
dc='docker compose --env-file .env -f compose.yaml -f compose.tailscale.yaml'
```

Then:

```bash
$dc ps
$dc logs -f app scheduler
$dc restart backup
```

For an update:

```bash
git pull --ff-only
$dc build
$dc run --rm migrate
$dc up -d --remove-orphans
$dc ps
```

The backup and restore procedures in
[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) apply unchanged; include both
Compose files, or use the `dc` helper, when running those commands.

## 8. Verification

From another authorized Tailscale device:

1. Open the HTTPS URL shown by `tailscale serve status`.
2. Confirm the browser reports a valid certificate.
3. Confirm login and logout.
4. Confirm the health endpoint returns `{"status":"ok"}`.
5. Review scheduler logs and follow the scheduler first-live validation workflow.

Tailscale access rules should grant the smallest practical user or group set
access to this server. VPN membership alone should not automatically imply that
every tailnet user needs Dispatch Board access.
