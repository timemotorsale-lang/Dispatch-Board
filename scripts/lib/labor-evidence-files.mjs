import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export function evidencePath(root, relative) {
  if (typeof relative !== "string" || !relative || relative.length > 240 || relative.includes("\\") || relative.includes(":") || relative.split("/").some(segment => !segment || segment === "." || segment === "..")) throw new Error("Evidence paths must be bounded relative file paths without traversal.");
  const target = path.resolve(root, relative);
  const boundary = path.resolve(root) + path.sep;
  if (!target.startsWith(boundary)) throw new Error("Evidence must remain inside its bundle.");
  return target;
}

export function readEvidenceArtifact(root, relative) {
  const target = evidencePath(root, relative);
  const boundary = realpathSync(root) + path.sep;
  const resolved = realpathSync(target);
  const metadata = lstatSync(target);
  if (!resolved.startsWith(boundary) || metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > 2 * 1024 * 1024) throw new Error("Evidence must be a regular file within the bundle, no larger than 2 MiB.");
  return readFileSync(target);
}

export function assertEvidenceRun(run, revision, repository) {
  if (!/^[0-9a-f]{40}$/i.test(revision) || run.head_sha !== revision || run.head_branch !== "main" || run.head_repository?.full_name !== repository || run.event !== "workflow_dispatch" || run.path !== ".github/workflows/labor-release-evidence.yml" || run.conclusion !== "success" || run.status !== "completed") throw new Error("Release evidence must come from a successful main-branch Labor Release Evidence review of this exact revision.");
}
