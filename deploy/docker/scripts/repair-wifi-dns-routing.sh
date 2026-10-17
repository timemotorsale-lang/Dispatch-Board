set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  printf 'Run this DNS-only repair from an administrator terminal with sudo. No changes were made.\n' >&2
  exit 1
fi

for command_name in networkctl resolvectl curl awk; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Required command is missing: %s\n' "$command_name" >&2
    exit 1
  }
done

if ! networkctl status wlp1s0 --no-pager | grep -q '/run/systemd/network/10-netplan-wlp1s0.network'; then
  printf 'The Wi-Fi network configuration changed; review it before applying this repair.\n' >&2
  exit 1
fi

if ! networkctl status eno1 --no-pager | grep -q 'routable'; then
  printf 'The working wired connection is unavailable; refusing to change DNS routing.\n' >&2
  exit 1
fi

dropin_directory=/etc/systemd/network/10-netplan-wlp1s0.network.d
dropin_path="$dropin_directory/90-dispatch-dns-routing.conf"
if [ -e "$dropin_path" ]; then
  printf 'Repair configuration already exists at %s; review it instead of overwriting.\n' "$dropin_path" >&2
  exit 1
fi

previous_dns_default_route="$(resolvectl default-route wlp1s0 | awk '{ print $NF }')"
case "$previous_dns_default_route" in
  yes|no) ;;
  *)
    printf 'Unable to determine the previous Wi-Fi DNS default route; no changes were made.\n' >&2
    exit 1
    ;;
esac

rollback() {
  printf 'Verification failed; reverting the newly created DNS routing override.\n' >&2
  rm -f "$dropin_path"
  networkctl reload || true
  resolvectl default-route wlp1s0 "$previous_dns_default_route" || true
  resolvectl flush-caches || true
}

install -d -m 755 "$dropin_directory"
printf '[Network]\nDNSDefaultRoute=no\n' > "$dropin_path"
chmod 644 "$dropin_path"
trap rollback ERR
networkctl reload
resolvectl default-route wlp1s0 no
resolvectl flush-caches

for endpoint in https://registry-1.docker.io/v2/ https://auth.docker.io/; do
  response_code="$(curl --silent --show-error --connect-timeout 10 --max-time 20 --output /dev/null --write-out '%{http_code}' "$endpoint")"
  printf '%s: TLS verified, HTTP %s\n' "$endpoint" "$response_code"
done

trap - ERR
printf 'Persistent Wi-Fi DNS default routing disabled. Wired DNS and Tailscale split DNS remain available. No deployment, Docker restart, or database change was performed.\n'
printf 'Rollback: remove %s, reload networkctl, and flush resolver caches.\n' "$dropin_path"
