import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { auditInventoryConsoleVerticalSlices } from "../src/server/program-integration-validation/vertical-slice-audit";

const root = resolve(import.meta.dirname, ".."), ignored = new Set([".git", ".next", "node_modules"]);
function walk(directory: string, paths: string[] = []) { for (const entry of readdirSync(directory, { withFileTypes: true })) { if (ignored.has(entry.name)) continue; const absolute = resolve(directory, entry.name); if (entry.isDirectory()) walk(absolute, paths); else paths.push(relative(root, absolute).replaceAll("\\", "/")); } return paths; }
const report = auditInventoryConsoleVerticalSlices(readFileSync(resolve(root, "docs/inventory/INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md"), "utf8"), new Set(walk(root)));
const safe = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else if (process.argv.includes("--markdown")) {
  console.log("| Slice | Release / Milestone | Classification | Acceptance unit | Remaining gap |");
  console.log("| --- | --- | --- | --- | --- |");
  for (const row of report.rows) console.log(`| ${row.id} | ${row.release} / ${row.milestone} | ${row.status} | ${safe(row.title)} | ${safe(row.remainingGap)} |`);
} else {
  console.log(`Inventory Console vertical-slice conformance audit · ${report.contractVersion}`);
  console.log(`Disposition: ${report.disposition} · completion claim: ${report.completionClaim}`);
  for (const [status, count] of Object.entries(report.counts)) console.log(`${status.padEnd(30)} ${count}`);
  for (const blocker of report.blockers) console.log(`BLOCKER ${blocker}`);
  console.log("Use --markdown for the full 121-row ledger or --json for machine-readable evidence.");
}
if (report.disposition === "BLOCKED") process.exitCode = 1;
