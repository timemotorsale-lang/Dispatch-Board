set -u

for command_name in curl getent jq; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required diagnostic command is unavailable: %s\n' "$command_name" >&2
    exit 1
  fi
done

printf '\nSystem DNS configuration\n'
cat /etc/resolv.conf
if command -v resolvectl >/dev/null 2>&1; then
  resolvectl dns || true
fi
printf '\nDocker Hub addresses from the system resolver\n'
getent ahostsv4 registry-1.docker.io || true

printf '\nDocker daemon proxy presence (values are not logged)\n'
if command -v docker >/dev/null 2>&1; then
  proxy_format='HTTP proxy configured: {{if .HTTPProxy}}yes{{else}}no{{end}}; HTTPS proxy configured: {{if .HTTPSProxy}}yes{{else}}no{{end}}'
  docker info --format "$proxy_format" 2>/dev/null || sudo -n docker info --format "$proxy_format" 2>/dev/null || true
fi

check_endpoint() {
  endpoint="$1"
  if response_code="$(curl --silent --show-error --connect-timeout 10 --max-time 20 --output /dev/null --write-out '%{http_code}' "$endpoint")"; then
    printf '%s: TLS verified, HTTP %s\n' "$endpoint" "$response_code"
    return 0
  fi
  printf '%s: connection or certificate verification failed\n' "$endpoint" >&2
  return 1
}

printf '\nDefault network path\n'
default_path_ok=true
check_endpoint https://registry-1.docker.io/v2/ || default_path_ok=false
check_endpoint https://auth.docker.io/ || default_path_ok=false

printf '\nIndependent DNS-over-HTTPS comparison\n'
if dns_response="$(curl --silent --show-error --fail --connect-timeout 10 --max-time 20 --header 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=registry-1.docker.io&type=A')"; then
  addresses="$(printf '%s' "$dns_response" | jq -r '.Answer[]? | select(.type == 1) | .data')"
  while IFS= read -r registry_address; do
    if ! [[ "$registry_address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      continue
    fi
    printf 'Testing independently resolved address %s with hostname verification\n' "$registry_address"
    if response_code="$(curl --silent --show-error --noproxy '*' --connect-timeout 10 --max-time 20 --resolve "registry-1.docker.io:443:$registry_address" --output /dev/null --write-out '%{http_code}' https://registry-1.docker.io/v2/)"; then
      printf 'Independent address: TLS verified, HTTP %s\n' "$response_code"
      break
    fi
  done <<< "$addresses"
else
  printf 'Independent DNS comparison is unavailable.\n' >&2
fi

printf '\nCurrent application health (read only)\n'
curl --silent --show-error --connect-timeout 5 --max-time 10 http://127.0.0.1:3000/api/health | jq '{status, revision}' || true

if [ "$default_path_ok" != true ]; then
  printf '\nThe server network requires repair before any deployment. TLS verification remains enabled.\n' >&2
  exit 1
fi

printf '\nDocker Hub TLS checks passed. No deployment, build, migration, service restart, or configuration change was performed.\n'
