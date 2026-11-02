import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Never run workflow fixtures in an existing schema, even on a local server.
const original = new URL(process.env.DATABASE_URL || "postgresql://invalid/");
if (!["localhost", "127.0.0.1", "[::1]"].includes(original.hostname) || !["postgresql:", "postgres:"].includes(original.protocol) || original.pathname === "/") throw new Error("Configure a loopback PostgreSQL development database. This check refuses remote databases.");
const schema = `pipeline_it_${randomUUID().replaceAll("-", "")}`;
if (!/^pipeline_it_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid isolated schema name.");
const testUrl = new URL(original); testUrl.searchParams.set("schema", schema);
const env = { ...process.env, DATABASE_URL: testUrl.toString(), RUN_PIPELINE_DATABASE: "1", CRM_NEXT: "DOGFOOD", DOCUMENT_LIBRARY_ORGANIZATION_ID: "org-time-motor-sales" };
const admin = new PrismaClient();
let created = false;
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
  const setup = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env, encoding: "utf8" });
  if (setup.status !== 0) throw new Error("Isolated pipeline schema setup failed. Verify the generated client and Prisma schema before retrying.");
  console.log("Created an empty isolated pipeline schema; existing records are outside the test scope.");
  const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/tests/integration/crm-pipeline-operations.test.ts"], { env, stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
  console.log("Removed this check's isolated schema.");
}
