import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const url = new URL(process.env.DATABASE_URL ?? "invalid:");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || (url.searchParams.get("schema") ?? "public") !== "public") throw new Error("Only the identified loopback development public database is supported.");
const migration = process.argv[2] ?? "20261030020000_autobody_estimating";
if (!["20261030020000_autobody_estimating", "20261030030000_collision_vendor_release"].includes(migration)) throw new Error("Only reviewed collision migrations are supported.");
const bin = process.env.AUTOBODY_PG_BIN ?? (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin" : "");
const executable = name => bin ? path.join(bin, name + (process.platform === "win32" ? ".exe" : "")) : name;
const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
const source = new PrismaClient();
const tables = ["User", "Customer", "Vehicle", "RepairOrder", "RepairEstimateVersion", "RepairAuthorization", "ServiceDocument", "ServiceInvoice", "InventoryUnit", "InventoryUnitCost", "MoneyEntry"];
async function manifest(client) { const result = {}; for (const table of tables) result[table] = (await client.$queryRawUnsafe(`SELECT count(*)::int AS total, md5(coalesce(string_agg(row_to_json(r)::text, E'\\n' ORDER BY row_to_json(r)::text), '')) AS checksum FROM public."${table}" r`))[0]; return result; }
function runPg(name, args, database = pgEnv.PGDATABASE) { return execFileSync(executable(name), args, { env: { ...pgEnv, PGDATABASE: database }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024, windowsHide: true }); }
function migrate(targetUrl) { execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: targetUrl }, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024, windowsHide: true }); }
let restored;
try {
  const applied = await source.$queryRawUnsafe("SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  const { readdirSync } = require("node:fs");
  const pending = readdirSync("prisma/migrations", { withFileTypes: true }).filter(item => item.isDirectory() && !applied.some(row => row.migration_name === item.name)).map(item => item.name);
  if (pending.length !== 1 || pending[0] !== migration) throw new Error("Expected only the additive autobody migration pending. Inspect local migration state before applying anything.");
  const before = await manifest(source);
  const backup = path.resolve(`tmp/database-backups/before-autobody-${Date.now()}.dump`);
  mkdirSync(path.dirname(backup), { recursive: true });
  runPg("pg_dump", ["--format=custom", "--file", backup]);
  const archive = runPg("pg_restore", ["--list", backup]);
  if (!archive.includes("TABLE DATA public Vehicle") || statSync(backup).size < 1000) throw new Error("Backup archive verification failed; source schema untouched.");
  const verificationDatabase = `dispatch_autobody_verify_${Date.now()}`;
  runPg("createdb", [verificationDatabase], "postgres");
  runPg("pg_restore", ["--exit-on-error", "--no-owner", "--dbname", verificationDatabase, backup], verificationDatabase);
  const restoredUrl = new URL(url); restoredUrl.pathname = `/${verificationDatabase}`;
  restored = new PrismaClient({ datasources: { db: { url: restoredUrl.toString() } } });
  if (JSON.stringify(await manifest(restored)) !== JSON.stringify(before)) throw new Error("Actual restore did not match the business-record manifest; source schema untouched.");
  migrate(restoredUrl.toString());
  const newTables = migration === "20261030020000_autobody_estimating" ? await restored.autobodyEstimateDraft.count() : 0;
  if (newTables !== 0 || JSON.stringify(await manifest(restored)) !== JSON.stringify(before)) throw new Error("Additive migration changed existing business records in verification.");
  let localApplied = false;
  if (process.env.AUTOBODY_APPLY_LOCAL === "after-verified-backup") {
    migrate(url.toString());
    if (JSON.stringify(await manifest(source)) !== JSON.stringify(before)) throw new Error("Local business manifest changed; preserve backup and investigate.");
    localApplied = true;
  }
  const proof = { migration, backup, backupBytes: statSync(backup).size, backupSha256: createHash("sha256").update(readFileSync(backup)).digest("hex"), actualRestoreVerified: true, verificationDatabase, localApplied, businessManifestUnchanged: true, before };
  mkdirSync("tmp/autobody", { recursive: true }); writeFileSync(`tmp/autobody/${migration}-proof.json`, JSON.stringify(proof, null, 2)); writeFileSync("tmp/autobody/database-proof.json", JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ actualRestoreVerified: true, localApplied, businessManifestUnchanged: true, verificationDatabase, backup }));
} catch (error) { console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database connection redacted]") : "Local verification failed."); process.exitCode = 1; }
finally { await restored?.$disconnect(); await source.$disconnect(); }
