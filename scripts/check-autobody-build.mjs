import nextEnv from "@next/env";
import { readFileSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import path from "node:path";
nextEnv.loadEnvConfig(process.cwd());
const proof = JSON.parse(readFileSync("tmp/autobody/database-proof.json", "utf8")), url = new URL(process.env.DATABASE_URL ?? "invalid:");
if (!proof.actualRestoreVerified || !/^dispatch_autobody_verify_\d+$/.test(proof.verificationDatabase) || !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Build verification requires the restored isolated database.");
url.pathname = `/${proof.verificationDatabase}`;
const root = process.cwd(), revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
let buildRoot;
if (existsSync("tmp/autobody/build-result.json")) {
  const prior = JSON.parse(readFileSync("tmp/autobody/build-result.json", "utf8")), candidate = path.resolve(prior.buildRoot ?? "");
  if (candidate.startsWith(path.resolve("tmp/autobody") + path.sep + "build-") && existsSync(path.join(candidate, ".git"))) {
    const current = execFileSync("git", ["-C", candidate, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
    const edits = execFileSync("git", ["-C", candidate, "diff", "--name-only"], { encoding: "utf8", windowsHide: true }).trim().split(/\r?\n/).filter(Boolean);
    if (current === prior.revision && edits.every(file => ["next-env.d.ts", "tsconfig.json", "AGENTS.md"].includes(file))) {
      try { if (current !== revision) execFileSync("git", ["-C", candidate, "switch", "--detach", revision], { stdio: "pipe", windowsHide: true }); buildRoot = candidate; } catch { }
    }
  }
}
if (!buildRoot) {
  buildRoot = path.resolve(`tmp/autobody/build-${revision.slice(0, 8)}-${Date.now()}`);
  execFileSync("git", ["worktree", "add", "--detach", buildRoot, revision], { stdio: "pipe", windowsHide: true });
  symlinkSync(path.join(root, "node_modules"), path.join(buildRoot, "node_modules"), "junction");
}
const result = spawnSync(process.execPath, ["--max-old-space-size=8192", path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"], { cwd: buildRoot, env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`, DATABASE_URL: url.toString(), NEXT_DIST_DIR: ".next-autobody-build", CI: "1" }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
const log = result.stdout + result.stderr;
writeFileSync("tmp/autobody/build-log.txt", log);
writeFileSync("tmp/autobody/build-result.json", JSON.stringify({ revision, buildRoot, exitCode: result.status }, null, 2));
console.log(JSON.stringify({ revision, buildRoot, exitCode: result.status })); console.log(log.slice(0, 1500) + "\n" + log.slice(-3000)); process.exitCode = result.status ?? 1;
