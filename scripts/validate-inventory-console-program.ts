import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { validateInventoryConsoleProgram } from "../src/server/program-integration-validation/conformance";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([".git", ".next", "node_modules"]);
function walk(directory: string, paths: string[] = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, paths); else paths.push(relative(root, absolute).replaceAll("\\", "/"));
  }
  return paths;
}

const paths = new Set(walk(root));
const navigationFiles = ["src/app/(app)/vehicles/inventory/page.tsx", "src/features/inventory/inventory-console-home.tsx", "src/features/inventory/inventory-lifecycle-landing.tsx", "src/features/inventory/shop-recon-landing.tsx", "src/features/inventory/governance-administration-workspace.tsx", "src/features/inventory/integration-ecosystem-workspace.tsx"];
const navigationSources = Object.fromEntries(navigationFiles.filter((path) => paths.has(path)).map((path) => [path, readFileSync(resolve(root, path), "utf8")]));
const report = validateInventoryConsoleProgram({ paths, schema: readFileSync(resolve(root, "prisma/schema.prisma"), "utf8"), navigationSources });

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Inventory Console program integration validation · ${report.contractVersion}`);
  console.log(`Repository: ${report.repositoryDisposition} · Operational: ${report.operationalDisposition}`);
  for (const check of report.checks) {
    console.log(`${check.disposition.padEnd(17)} ${check.code} · ${check.title}`);
    for (const detail of check.details) console.log(`  - ${detail}`);
  }
}
if (report.repositoryDisposition === "BLOCKED") process.exitCode = 1;
