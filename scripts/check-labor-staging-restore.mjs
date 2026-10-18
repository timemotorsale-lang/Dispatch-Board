import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const container = process.env.LABOR_STAGING_CONTAINER;
if (process.env.CI !== "true" || !/^[a-f0-9]{12,64}$/.test(container ?? "")) throw new Error("Restore verification is restricted to the disposable CI PostgreSQL service.");
function query(database, sql) {
  if (!["dispatch_board_labor_staging", "dispatch_board_labor_restore"].includes(database)) throw new Error("Only disposable labor databases may be compared.");
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "build", "-d", database, "-v", "ON_ERROR_STOP=1", "-At", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Disposable restore query failed (${result.status}).`);
  return result.stdout.trim();
}
const tables = query("dispatch_board_labor_staging", "SELECT tablename FROM pg_tables WHERE schemaname = 'labor_staging_ci' ORDER BY tablename;").split("\n").map(value => value.trim());
if (!tables.length || tables.some(table => !/^[A-Za-z0-9_]+$/.test(table))) throw new Error("Staging table inventory is unavailable or invalid.");
const required = ["Customer", "Vehicle", "RepairOrder", "RepairEstimateVersion", "RepairAuthorization", "RepairJob", "RepairJobLaborClock", "RepairJobLaborEvent", "RepairQualityInspection", "EnterpriseAuditEvent", "VehiclePolicyVersion", "ServiceDocument", "ServiceInvoice", "ServiceInvoiceEntry", "ServiceInvoiceSequence"];
if (required.some(table => !tables.includes(table))) throw new Error("Required labor recovery tables are missing.");
const statements = tables.map(table => `SELECT '${table}', count(*), md5(coalesce(string_agg(row_to_json(snapshot)::text, E'\\n' ORDER BY row_to_json(snapshot)::text), '')) FROM labor_staging_ci."${table}" AS snapshot;`).join("\n");
const original = query("dispatch_board_labor_staging", statements);
const restored = query("dispatch_board_labor_restore", statements);
if (original !== restored) throw new Error("Restored table row counts or content checksums differ from the disposable source.");
writeFileSync("test-results/labor-staging/restore-table-manifest.txt", `Exact revision: ${process.env.GITHUB_SHA}\nAll ${tables.length} table counts and row-content MD5 checksums match. Aggregate SHA-256: ${createHash("sha256").update(original).digest("hex")}\n${restored}\n`);
console.log(`PASS: ${tables.length} disposable database tables reconciled after backup restoration. This does not verify production-scale recovery, external file storage or application rollback.`);
