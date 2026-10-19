import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { evaluateLaborPilotRelease, type LaborReleaseEvidence } from "../src/lib/labor-pilot-release";
import { readEvidenceArtifact } from "./lib/labor-evidence-files.mjs";

const file = process.argv[2];
if (!file) { console.error("Usage: npx tsx scripts/check-labor-pilot-release.ts <evidence.json>. Missing staging, recovery, policy or owner evidence means HOLD."); process.exitCode = 1; }
else {
  try {
    const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const evidence = JSON.parse(readFileSync(file, "utf8")) as LaborReleaseEvidence;
    const result = evaluateLaborPilotRelease(evidence, revision);
    for (const [gate, item] of Object.entries(evidence.gates ?? {})) {
      if (!item) continue;
      try {
        const artifact = readEvidenceArtifact(path.dirname(file), item.artifact);
        if (createHash("sha256").update(artifact).digest("hex") !== item.sha256) result.blockers.push(`ARTIFACT_CHECKSUM_${gate}`);
      } catch { result.blockers.push(`ARTIFACT_UNAVAILABLE_${gate}`); }
    }
    if (result.blockers.length) result.status = "HOLD";
    const changes = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
    if (changes) { result.status = "HOLD"; result.blockers.push("UNCOMMITTED_RELEASE_CHANGES"); }
    console.log(JSON.stringify(result, null, 2));
    if (result.blockers.length) process.exitCode = 1;
  } catch (error) { console.error(error instanceof Error ? error.message : "Release evidence unavailable."); process.exitCode = 1; }
}
