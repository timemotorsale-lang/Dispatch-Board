#!/bin/sh
set -eu
revision="${1:-}"
test "${IMPORT_ROLLBACK_APPROVED:-}" = "true"
test "${#revision}" = 40
case "$revision" in *[!a-f0-9]*) echo "Use a verified previous release SHA." >&2; exit 1 ;; esac
cd "${DEPLOY_PATH:-/opt/Dispatch-Board}"
docker image inspect "dispatch-board-app:$revision" >/dev/null
export APP_VERSION="$revision" RELEASE_SHA="$revision"
# Restore application images only; never reverse migrations or overwrite current business data.
docker compose --env-file deploy/docker/.env -f deploy/docker/compose.yaml -f deploy/docker/compose.tailscale.yaml up -d --no-build --no-deps app scheduler
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 10 http://127.0.0.1:3000/api/health | jq -e --arg revision "$revision" '.status == "ok" and .revision == $revision' >/dev/null; then
    echo "Previous application release verified: $revision"
    exit 0
  fi
  sleep 3
done
echo "Rollback health verification failed. Escalate to the release owner." >&2
exit 1
