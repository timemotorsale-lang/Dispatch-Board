#!/usr/bin/env bash
set -euo pipefail

key_file="deploy/docker/website-review.env"
if [ -L "$key_file" ]; then
  echo "Private preview key file must not be a symbolic link." >&2
  exit 1
fi
if [ ! -f "$key_file" ]; then
  command -v openssl >/dev/null 2>&1 || { echo "OpenSSL is required for private preview setup." >&2; exit 1; }
  (umask 077; set -C; printf 'DEALERSHIP_REVIEW_KEY=%s\n' "$(openssl rand -hex 32)" > "$key_file")
fi
if [ ! -r "$key_file" ] || [ -L "$key_file" ]; then
  echo "Private preview key file is not a readable regular file." >&2
  exit 1
fi
DEALERSHIP_REVIEW_KEY="$(sed -n 's/^DEALERSHIP_REVIEW_KEY=//p' "$key_file")"
if ! printf '%s' "$DEALERSHIP_REVIEW_KEY" | grep -Eq '^[a-f0-9]{64}$'; then
  echo "Private preview key is invalid." >&2
  exit 1
fi
chmod 600 "$key_file"
export DEALERSHIP_REVIEW_KEY
export DEALERSHIP_HOSTED_REVIEW_ENABLED=true
export DEALERSHIP_REVIEW_ORIGIN=https://dispatch-board.tail0d2437.ts.net
echo "Private website review configured behind the manager-authenticated staff gateway."
