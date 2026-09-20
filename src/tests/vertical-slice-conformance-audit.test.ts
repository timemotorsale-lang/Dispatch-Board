import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { auditInventoryConsoleVerticalSlices, getVerticalSliceClassificationIndex } from "@/server/program-integration-validation/vertical-slice-audit";

const root = process.cwd(), ignored = new Set([".git", ".next", "node_modules"]);
function walk(directory: string, paths: string[] = []) { for (const entry of readdirSync(directory, { withFileTypes: true })) { if (ignored.has(entry.name)) continue; const absolute = resolve(directory, entry.name); if (entry.isDirectory()) walk(absolute, paths); else paths.push(relative(root, absolute).replaceAll("\\", "/")); } return paths; }
const milestones = () => readFileSync(resolve(root, "docs/inventory/INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md"), "utf8");

describe("Inventory Console 121-slice conformance audit", () => {
  it("classifies every planned slice without claiming operational completion", () => {
    const report = auditInventoryConsoleVerticalSlices(milestones(), new Set(walk(root)));
    expect(report.disposition).toBe("AUDITED");
    expect(report.completionClaim).toBe("REPOSITORY_ONLY");
    expect(report.rows).toHaveLength(121);
    expect(report.counts).toEqual({ COMPLETE: 69, PARTIAL: 31, NOT_STARTED: 0, EXTERNAL_EVIDENCE_REQUIRED: 17, BLOCKED_BY_DECISION: 4 });
    expect(report.rows.every((row) => row.evidenceReferences.length === 2 && row.remainingGap.length > 20 && row.nextAction.length > 20)).toBe(true);
  }, 30000);

  it("preserves representative repository, external, and decision classifications", () => {
    const report = auditInventoryConsoleVerticalSlices(milestones(), new Set(walk(root))), byId = new Map(report.rows.map((row) => [row.id, row]));
    expect(byId.get("IC-012")?.status).toBe("COMPLETE");
    expect(byId.get("IC-023")?.status).toBe("COMPLETE");
    expect(byId.get("IC-025")?.status).toBe("COMPLETE");
    for (const id of ["IC-002", "IC-014", "IC-022", "IC-024", "IC-026", "IC-027", "IC-106"]) expect(byId.get(id)?.status).toBe("COMPLETE");
    for (const id of ["IC-031", "IC-032", "IC-034", "IC-035", "IC-036", "IC-037"]) expect(byId.get(id)?.status).toBe("COMPLETE");
    for (const id of ["IC-058", "IC-067", "IC-068", "IC-098"]) expect(byId.get(id)?.status).toBe("COMPLETE");
    for (const id of ["IC-103", "IC-104", "IC-108", "IC-109"]) expect(byId.get(id)?.status).toBe("COMPLETE");
    for (const id of ["IC-111", "IC-119"]) expect(byId.get(id)?.status).toBe("COMPLETE");
    expect(byId.get("IC-113")?.status).toBe("EXTERNAL_EVIDENCE_REQUIRED");
    expect(byId.get("IC-110")?.status).toBe("BLOCKED_BY_DECISION");
    expect(byId.get("IC-129")?.remainingGap).toMatch(/No eight-dimension/);
  }, 30000);

  it("fails closed if a milestone row or release evidence document disappears", () => {
    const markdown = milestones().replace(/^\| IC-089 .*\r?\n/m, ""), paths = new Set(walk(root)); paths.delete("docs/inventory/R9_DISPOSITION_WHOLESALE_IMPLEMENTATION.md");
    const report = auditInventoryConsoleVerticalSlices(markdown, paths);
    expect(report.disposition).toBe("BLOCKED");
    expect(report.blockers).toEqual(expect.arrayContaining([expect.stringContaining("parsed 120"), expect.stringContaining("missing IC-089"), expect.stringContaining("IC-090 evidence document is missing")]));
  });

  it("publishes a runtime-safe classification index for the manager workspace", () => {
    const index = getVerticalSliceClassificationIndex();
    expect(index.slices).toHaveLength(121);
    expect(index.counts.COMPLETE + index.counts.PARTIAL + index.counts.EXTERNAL_EVIDENCE_REQUIRED + index.counts.BLOCKED_BY_DECISION).toBe(121);
  });
});
