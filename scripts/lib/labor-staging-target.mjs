export function assertLaborStagingTarget(value) {
  const target = new URL(value);
  const allowedParameters = ["schema", "connection_limit", "pool_timeout", "connect_timeout", "sslmode"];
  if (!["postgres:", "postgresql:"].includes(target.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !/^labor_staging_[a-z0-9_]{1,49}$/.test(target.searchParams.get("schema") ?? "") || [...target.searchParams.keys()].some(key => !allowedParameters.includes(key) || target.searchParams.getAll(key).length !== 1)) throw new Error("Labor staging requires an explicit loopback PostgreSQL connection and a dedicated labor_staging_* schema without connection overrides.");
  return target;
}
