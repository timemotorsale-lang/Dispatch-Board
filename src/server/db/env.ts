export function getDatabaseUrl() {
  return process.env.DATABASE_URL;
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}

