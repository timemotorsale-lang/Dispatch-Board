/**
 * Prepares a fake company for the Collections browser tests (src/tests/e2e/collections.spec.ts).
 *
 * SAFETY: refuses to run unless DATABASE_URL is a local database whose name contains
 * "collections" (the separate test copy). It never touches the real database.
 * Creates: a fake organization + location, an admin ("General Manager") and a collector
 * ("Collections" role), browser sessions for both, and imports the 30 fake sample accounts.
 * Writes the session tokens to tmp/collections/browser-fixture.json (git-ignored).
 *
 * Run: npx tsx scripts/collections-e2e-fixture.ts
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "@/server/auth/session";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { chicagoToday } from "@/features/collections/domain/money-dates";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://missing/none");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.includes("collections")) {
    throw new Error("Refusing to run: DATABASE_URL must be the local Collections test database.");
  }
  process.env.COLLECTIONS_MODULE ||= "LIVE";
  const suffix = randomUUID().slice(0, 8);
  const organizationId = `coll-e2e-org-${suffix}`;
  await prisma.organization.create({ data: { id: organizationId, name: `Collections browser test ${suffix}`, code: organizationId } });
  const location = await prisma.location.create({ data: { id: `coll-e2e-loc-${suffix}`, organizationId, code: `coll-e2e-${suffix}`, name: "Collections browser test", city: "Test", region: "MN", timezone: "America/Chicago" } });
  const role = async (name: string) => prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  const makeUser = async (kind: "admin" | "collector", roleName: string, displayName: string) => {
    const id = `coll-e2e-${kind}-${suffix}`;
    await prisma.user.create({ data: { id, name: displayName, email: `${id}@example.test`, passwordHash: "browser-test-only" } });
    await prisma.userRole.create({ data: { userId: id, roleId: (await role(roleName)).id } });
    await prisma.userLocationAccess.create({ data: { userId: id, locationId: location.id, validFrom: new Date("2020-01-01") } });
    const token = createSessionToken();
    await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: id, expiresAt: createSessionExpiry() } });
    return { id, token };
  };
  const admin = await makeUser("admin", "General Manager", "Test Owner");
  const collector = await makeUser("collector", "Collections", "Test Collector");
  const owner: AuthenticatedUser = { id: admin.id, name: "Test Owner", email: `${admin.id}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
  const bytes = new Uint8Array(readFileSync(join(process.cwd(), "src", "features", "collections", "tests", "fixtures", "active-accounts.sample.csv")));
  const preview = await previewCollectionsImport(owner, { fileName: "Active Accounts sample.csv", bytes, asOfDate: chicagoToday() });
  await afterImportCommitted(owner, await commitCollectionsImport(owner, preview.runId));
  const account = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId, externalAccountId: "FAKE-1017" } });
  await prisma.collectionAccount.update({ where: { id: account.id }, data: { primaryPhone: `+1612${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`, assignedCollectorUserId: collector.id } });
  mkdirSync("tmp/collections", { recursive: true });
  writeFileSync("tmp/collections/browser-fixture.json", JSON.stringify({ organizationId, adminToken: admin.token, collectorToken: collector.token, accountId: account.id }, null, 2));
  console.log(`Collections browser fixture ready (${organizationId}).`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
