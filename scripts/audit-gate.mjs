#!/usr/bin/env node
/**
 * Dependency Security Gate (used by CI).
 *
 * Same rule as `npm audit --audit-level=high`: any high or critical advisory fails the build.
 * The one difference: an advisory can be temporarily accepted here when NO fixed version exists
 * yet, with a written reason and a review date. After the review date it blocks again, so it
 * can't be forgotten. Never add an entry for an advisory that has a fix: upgrade instead.
 */
import { spawnSync } from "node:child_process";

const ACCEPTED = [
  {
    id: "GHSA-fc5q-39xc-vjpf",
    package: "picomatch",
    reason:
      "ReDoS in glob matching. No fixed version exists (all versions <= 4.0.7 affected). picomatch is only used by " +
      "developer and test tools (vitest, vite, eslint's tinyglobby) with our own glob patterns, never by the production " +
      "app: `npm audit --omit=dev` is clean.",
    reviewBy: "2026-12-31"
  }
];

const BLOCKING = new Set(["high", "critical"]);
const today = new Date().toISOString().slice(0, 10);

const run = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error("Could not read the npm audit report.", run.stderr);
  process.exit(1);
}
if (report.error) {
  console.error("npm audit failed:", report.error.summary ?? report.error);
  process.exit(1);
}

// Collect the root advisories (the "via" entries that are objects) with their severity.
const advisories = new Map();
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== "object" || !via.url) continue;
    const id = via.url.split("/").pop();
    advisories.set(id, { id, package: via.name ?? name, severity: via.severity, title: via.title, url: via.url });
  }
}

const blocking = [];
const accepted = [];
for (const advisory of advisories.values()) {
  if (!BLOCKING.has(advisory.severity)) continue;
  const entry = ACCEPTED.find(item => item.id === advisory.id && item.package === advisory.package);
  if (entry && today <= entry.reviewBy) accepted.push({ ...advisory, entry });
  else blocking.push({ ...advisory, expired: Boolean(entry) });
}

for (const item of accepted) {
  console.log(`Accepted until ${item.entry.reviewBy}: ${item.severity} ${item.package} ${item.id} (${item.title}). ${item.entry.reason}`);
}
if (blocking.length) {
  console.error(`\n${blocking.length} high or critical advisory(ies) must be fixed:`);
  for (const item of blocking) console.error(`- ${item.severity} ${item.package}: ${item.title} ${item.url}${item.expired ? " (its acceptance review date has passed)" : ""}`);
  process.exit(1);
}
console.log(`Dependency Security Gate passed (${advisories.size} advisories reviewed, ${accepted.length} temporarily accepted, none blocking).`);
