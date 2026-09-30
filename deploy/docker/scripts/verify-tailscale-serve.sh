#!/usr/bin/env bash
set -euo pipefail

env_file="${DISPATCH_BOARD_DEPLOY_ENV_FILE:-deploy/docker/.env}"
if [ -f "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi

if [ "${DISPATCH_BOARD_TAILSCALE_SERVE_CHECK:-true}" != "true" ]; then
  echo "Tailscale Serve check skipped by DISPATCH_BOARD_TAILSCALE_SERVE_CHECK."
  exit 0
fi

target="${TAILSCALE_SERVE_TARGET:-http://127.0.0.1:3000}"
https_port="${TAILSCALE_SERVE_HTTPS_PORT:-443}"

if ! command -v tailscale >/dev/null 2>&1; then
  echo "Tailscale is not installed on this host. Install and join Tailscale before exposing Dispatch Board." >&2
  exit 1
fi

if ! tailscale status >/dev/null 2>&1; then
  echo "This host is not connected to Tailscale. Run 'tailscale up' before exposing Dispatch Board." >&2
  exit 1
fi

if ! curl -fsS --max-time 10 "${target%/}/api/health" >/dev/null; then
  echo "Dispatch Board is not healthy at ${target}. Tailscale Serve was not changed." >&2
  exit 1
fi

serve_status="$(tailscale serve status 2>&1 || true)"
route_context="$(printf '%s\n' "$serve_status" | grep -F -B 4 -A 2 "$target" || true)"
if [ "$https_port" = "443" ]; then
  # Tailscale omits the default HTTPS port from status output.
  port_is_served="$(printf '%s\n' "$route_context" | grep -E '^https://[^[:space:]]+' || true)"
else
  port_is_served="$(printf '%s\n' "$route_context" | grep -F ":$https_port" || true)"
fi

if [ -n "$route_context" ] && [ -n "$port_is_served" ]; then
  echo "Tailscale Serve is already routing HTTPS port ${https_port} to ${target}."
  exit 0
fi

if [ "${DISPATCH_BOARD_TAILSCALE_SERVE_AUTOCONFIGURE:-true}" != "true" ]; then
  echo "Tailscale Serve is not routing HTTPS port ${https_port} to ${target}." >&2
  printf '%s\n' "$serve_status" >&2
  echo "Run: sudo tailscale serve --bg --https=${https_port} ${target}" >&2
  exit 1
fi

if tailscale serve --bg --https="${https_port}" "$target" >/dev/null 2>&1; then
  echo "Configured Tailscale Serve for HTTPS port ${https_port} -> ${target}."
elif sudo -n tailscale serve --bg --https="${https_port}" "$target" >/dev/null 2>&1; then
  echo "Configured Tailscale Serve with sudo for HTTPS port ${https_port} -> ${target}."
else
  echo "Could not configure Tailscale Serve non-interactively." >&2
  printf '%s\n' "$serve_status" >&2
  echo "Run on the server: sudo tailscale serve --bg --https=${https_port} ${target}" >&2
  exit 1
fi

tailscale serve status
