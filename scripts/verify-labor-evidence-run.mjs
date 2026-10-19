import { assertEvidenceRun } from "./lib/labor-evidence-files.mjs";

const { GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, LABOR_EVIDENCE_RUN_ID } = process.env;
if (!GH_TOKEN || !/^\d+$/.test(LABOR_EVIDENCE_RUN_ID ?? "") || !/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY ?? "")) throw new Error("A valid release evidence run ID and repository credentials are required.");
const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${LABOR_EVIDENCE_RUN_ID}`, { headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" } });
if (!response.ok) throw new Error(`Release evidence run is unavailable (${response.status}).`);
assertEvidenceRun(await response.json(), GITHUB_SHA, GITHUB_REPOSITORY);
