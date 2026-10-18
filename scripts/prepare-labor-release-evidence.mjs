import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { evidencePath } from "./lib/labor-evidence-files.mjs";

const output = process.argv[2];
if (!output) throw new Error("An empty output directory is required.");
mkdirSync(output, { recursive: false });
const evidence = JSON.parse(process.env.LABOR_EVIDENCE_JSON ?? "null");
const artifacts = JSON.parse(process.env.LABOR_ARTIFACTS_JSON ?? "null");
if (!evidence || typeof evidence !== "object" || !artifacts || typeof artifacts !== "object" || Array.isArray(artifacts) || Object.keys(artifacts).length > 30) throw new Error("Provide the reviewed evidence manifest and at most 30 text artifacts.");
let bytes = 0;
for (const [relative, contents] of Object.entries(artifacts)) {
  const destination = evidencePath(output, relative);
  if (relative === "evidence.json" || typeof contents !== "string" || Buffer.byteLength(contents) > 2 * 1024 * 1024) throw new Error("Invalid or oversized evidence artifact.");
  bytes += Buffer.byteLength(contents);
  if (bytes > 20 * 1024 * 1024) throw new Error("Evidence bundle exceeds 20 MiB.");
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, contents, { flag: "wx" });
}
writeFileSync(path.join(output, "evidence.json"), JSON.stringify(evidence, null, 2), { flag: "wx" });
