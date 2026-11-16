/**
 * Shared setup for Collections database tests.
 * Safety: refuses to run unless DATABASE_URL is a loopback database whose name contains
 * "collections" (for example dispatch_board_collections). It can never touch the real database.
 * Run with: RUN_COLLECTIONS_DB_TESTS=1 npx vitest run src/tests/integration/collections
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

export const RUN_COLLECTIONS_DB = process.env.RUN_COLLECTIONS_DB_TESTS === "1";

export function assertCollectionsTestDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://missing/none");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.includes("collections")) {
    throw new Error("Collections database tests require a separate local database whose name contains 'collections'.");
  }
}

export function fixtureBytes(name: string) {
  return new Uint8Array(readFileSync(join(process.cwd(), "src", "features", "collections", "tests", "fixtures", name)));
}

export function csvWith(edit: (rows: string[][]) => string[][]) {
  const text = new TextDecoder().decode(fixtureBytes("active-accounts.sample.csv"));
  const [header, ...rest] = text.trim().split("\n");
  const parse = (line: string) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map(cell => cell.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')).slice(0, header.split(",").length);
  const rows = edit(rest.map(parse));
  const escape = (value: string) => /[",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return new TextEncoder().encode([header, ...rows.map(row => row.map(escape).join(","))].join("\n") + "\n");
}

export async function createCollectionsTestOrg() {
  assertCollectionsTestDatabase();
  process.env.COLLECTIONS_MODULE = "REVIEW";
  const suffix = randomUUID().slice(0, 8);
  const organizationId = `coll-org-${suffix}`;
  await prisma.organization.create({ data: { id: organizationId, name: `Collections test ${suffix}`, code: organizationId } });
  const location = await prisma.location.create({ data: { id: `coll-loc-${suffix}`, organizationId, code: `coll-${suffix}`, name: "Collections test", city: "Test", region: "MN", timezone: "America/Chicago" } });
  const ownerId = `coll-owner-${suffix}`;
  await prisma.user.create({ data: { id: ownerId, name: "Test Owner", email: `${ownerId}@example.test`, passwordHash: "isolated-test-only" } });
  await prisma.userLocationAccess.create({ data: { userId: ownerId, locationId: location.id, validFrom: new Date("2020-01-01") } });
  const owner: AuthenticatedUser = { id: ownerId, name: "Test Owner", email: `${ownerId}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
  return { organizationId, owner, suffix, locationId: location.id };
}
