import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { validateInventoryConsoleProgram } from "@/server/program-integration-validation/conformance";

const root = process.cwd(), ignored = new Set([".codex-runtime", ".git", ".next", "node_modules"]);
function walk(directory: string, paths: string[] = []) { for (const entry of readdirSync(directory, { withFileTypes: true })) { if (ignored.has(entry.name)) continue; const absolute = resolve(directory, entry.name); if (entry.isDirectory()) walk(absolute, paths); else paths.push(relative(root, absolute).replaceAll("\\", "/")); } return paths; }
function fixture() {
  const paths = new Set(walk(root)), sources = ["src/app/(app)/vehicles/inventory/page.tsx", "src/features/inventory/inventory-console-home.tsx", "src/features/inventory/inventory-lifecycle-landing.tsx", "src/features/inventory/shop-recon-landing.tsx", "src/features/inventory/governance-administration-workspace.tsx", "src/features/inventory/integration-ecosystem-workspace.tsx"];
  return { paths, schema: readFileSync(resolve(root, "prisma/schema.prisma"), "utf8"), navigationSources: Object.fromEntries(sources.map((path) => [path, readFileSync(resolve(root, path), "utf8")])) };
}

describe("Inventory Console R0-R12 program integration validation", () => {
  it("conforms across 13 releases, 13 milestones, 121 slices, and eight journeys", () => {
    const report = validateInventoryConsoleProgram(fixture());
    expect(report.repositoryDisposition).toBe("CONFORMS");
    expect(report.operationalDisposition).toBe("EVIDENCE_REQUIRED");
    expect(report.releases).toHaveLength(13);
    expect(report.releases.flatMap((release) => release.slices)).toHaveLength(121);
    expect(report.journeys).toHaveLength(8);
    expect(report.checks.filter((check) => check.disposition === "PASS")).toHaveLength(8);
  }, 30000);

  it("fails closed when a required API boundary disappears", () => {
    const input = fixture(); input.paths.delete("src/app/api/integrations/route.ts");
    const report = validateInventoryConsoleProgram(input);
    expect(report.repositoryDisposition).toBe("BLOCKED");
    expect(report.blockers.some((blocker) => blocker.includes("/api/integrations"))).toBe(true);
  });

  it("blocks a parallel canonical aggregate", () => {
    const input = fixture(); input.schema += "\nmodel InventoryUnit { id String @id }\n";
    const report = validateInventoryConsoleProgram(input);
    expect(report.repositoryDisposition).toBe("BLOCKED");
    expect(report.blockers.some((blocker) => blocker.includes("InventoryUnit occurs 2 times"))).toBe(true);
  });

  it("fails when a required cross-workspace handoff is removed", () => {
    const input = fixture(), source = "src/features/inventory/inventory-console-home.tsx"; input.navigationSources[source] = input.navigationSources[source].replaceAll("/vehicles/parts-operations", "/removed-parts-route");
    const report = validateInventoryConsoleProgram(input);
    expect(report.repositoryDisposition).toBe("BLOCKED");
    expect(report.blockers.some((blocker) => blocker.includes("/vehicles/parts-operations"))).toBe(true);
  });
});
