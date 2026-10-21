import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
describe("general production deployment safeguards", () => {
  it("requires explicit manual approval on main and successful exact-revision main CI", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("confirm_deployment:");
    expect(workflow).toContain("default: false");
    expect(workflow).toContain("github.ref == 'refs/heads/main' && inputs.confirm_deployment");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("Require successful CI for this revision");
    expect(workflow).toContain('.head_sha == env.RELEASE_SHA and .head_branch == "main" and .event == "push" and .name == "CI" and .conclusion == "success"');
  });
  it("retains production preflight, rollback image, verified backup and revision health checks", () => {
    for (const check of ["Validate deployment secrets", "fail_preflight", "Retained rollback image", "verify-postgres-restore.sh", "compose run --rm -T migrate", "verify-tailscale-serve.sh", '.status == "ok" and .revision == $revision']) expect(workflow).toContain(check);
    expect(workflow).toContain("check:purchase-import-release");
  });
  it("does not require the removed Labor Pilot manifest, reviewer or twelve-gate checker", () => {
    for (const removed of ["labor_evidence_run_id", "LABOR_EVIDENCE_RUN_ID", "labor-release-evidence", "check:labor-pilot-release", "verify-labor-evidence-run"]) expect(workflow).not.toContain(removed);
    expect(JSON.parse(readFileSync("package.json", "utf8")).scripts).not.toHaveProperty("check:labor-pilot-release");
    for (const removed of [".github/workflows/labor-release-evidence.yml", "src/lib/labor-pilot-release.ts", "scripts/check-labor-pilot-release.ts"]) expect(existsSync(removed)).toBe(false);
    expect(existsSync(".github/workflows/labor-catalog-staging.yml")).toBe(true);
  });
});
