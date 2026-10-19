import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertEvidenceRun, evidencePath, readEvidenceArtifact } from "../../../scripts/lib/labor-evidence-files.mjs";

describe("labor release artifact boundaries", () => {
  it("rejects absolute, ambiguous and traversal artifact references", () => {
    const root = path.join(tmpdir(), "labor-evidence");
    for (const reference of ["../secrets", "/etc/passwd", "C:/secrets", "proof\\file", "proof//file", "./file", "proof/../file", ""]) expect(() => evidencePath(root, reference)).toThrow();
    expect(evidencePath(root, "proof/test.log")).toBe(path.join(root, "proof", "test.log"));
  });
  it("reads bounded regular evidence files only", () => {
    const root = mkdtempSync(path.join(tmpdir(), "labor-evidence-test-"));
    mkdirSync(path.join(root, "proof"));
    writeFileSync(path.join(root, "proof", "test.log"), "actual captured proof");
    expect(readEvidenceArtifact(root, "proof/test.log").toString()).toBe("actual captured proof");
    expect(() => readEvidenceArtifact(root, "proof")).toThrow();
    writeFileSync(path.join(root, "large.log"), Buffer.alloc(2 * 1024 * 1024 + 1));
    expect(() => readEvidenceArtifact(root, "large.log")).toThrow("2 MiB");
  });
  it("requires exact revision, repository, workflow and successful manual main review", () => {
    const revision = "a".repeat(40), repository = "timemotorsale-lang/Dispatch-Board";
    const run = { head_sha: revision, head_branch: "main", head_repository: { full_name: repository }, event: "workflow_dispatch", path: ".github/workflows/labor-release-evidence.yml", conclusion: "success", status: "completed" };
    expect(() => assertEvidenceRun(run, revision, repository)).not.toThrow();
    for (const patch of [{ head_sha: "b".repeat(40) }, { head_branch: "feature" }, { event: "pull_request" }, { path: ".github/workflows/deploy.yml" }, { conclusion: "failure" }, { status: "in_progress" }, { head_repository: { full_name: "fork/Dispatch-Board" } }]) expect(() => assertEvidenceRun({ ...run, ...patch }, revision, repository)).toThrow();
  });
});
