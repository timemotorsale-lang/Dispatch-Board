import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import http from "node:http";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const nextFixture = {
  name: "next-fixtures",
  setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, args => ({ path: args.path, namespace: "next-fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "next-fixture" }, () => ({ loader: "js", contents: 'export function useRouter(){return {push(href){window.location.assign(href)},refresh(){window.location.reload()}}}' }));
  }
};

const root = process.cwd();
const bundle = await build({ absWorkingDir: root, stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client"; import "./src/app/globals.css"; import {RepairExplorer} from "./src/features/prototype/repair-explorer/repair-explorer"; import {RepairCoverageReview} from "./src/features/prototype/repair-explorer/repair-coverage-review"; const params=new URLSearchParams(location.search); createRoot(document.getElementById("root")).render(location.pathname.endsWith("repair-coverage") ? <RepairCoverageReview/> : <RepairExplorer storageKey="catalog-expansion-fixture" initialSystemId={params.get("system")} initialGroupId={params.get("group")}/>);`, resolveDir: root, loader: "tsx" }, bundle: true, write: false, outdir: path.join(root, "test-results", "catalog-expansion-bundle"), jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [nextFixture, { name: "local-assets", setup(builder) { builder.onResolve({ filter: /^\// }, args => ({ path: args.path, external: true })); } }] });
const server = http.createServer((request, response) => {
  const suffix = request.url === "/bundle.js" ? ".js" : request.url === "/bundle.css" ? ".css" : null;
  if (suffix) { response.setHeader("Content-Type", suffix === ".js" ? "text/javascript" : "text/css"); response.end(bundle.outputFiles.find(file => file.path.endsWith(suffix)).text); }
  else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ten-system catalog fixture</title><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.LABOR_PILOT_BROWSER_CHANNEL ? { channel: process.env.LABOR_PILOT_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/prototype/repair-coverage`);
  await expect(page.getByRole("heading", { name: "Ten-system catalog expansion" })).toBeVisible();
  await expect(page.locator("details")).toHaveCount(6);
  for (const details of await page.locator("details").all()) await details.locator("summary").click();
  const coverageAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(coverageAudit.violations, []);
  await page.getByRole("link", { name: "Engine assembly & mounts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Replace engine assembly", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Replace engine assembly", exact: true }).click();
  await page.getByRole("button", { name: "Add Replace engine long block", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("incompatible alternative");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("catalog-expansion-fixture")));
  assert.equal(before.lines.length, 1);
  await page.reload();
  await page.getByRole("button", { name: "Load saved draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("loaded");
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("catalog-expansion-fixture")));
  assert.deepEqual(after, before);
  await page.getByRole("button", { name: "Find it visually", exact: true }).click();
  await page.getByRole("button", { name: /Block, pistons & crankshaft ·/ }).click();
  await expect(page.getByRole("button", { name: "Add Replace crankshaft", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diagnose a concern", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Diagnose piston or bearing noise", exact: true })).toBeVisible();
  const groups = [
    ["maintenance", "maintenance-service"], ["engine", "engine-commissioning"], ["electrical", "electrical-waveform"], ["transmission", "transmission-verification"], ["hvac", "hvac-heatpump"],
    ["exhaust", "exhaust-evap"], ["tires", "tires-tpms"], ["safety", "safety-verification"], ["body", "body-water"], ["ev", "ev-verification"]
  ];
  for (const [system, group] of groups) {
    await page.goto(`${origin}/prototype/repair-explorer?system=${system}&group=${group}`);
    await expect(page.getByRole("button", { name: "Choose a repair", exact: true })).toBeVisible();
    await expect(page.getByText("unvalidated planning hours", { exact: false }).first()).toBeAttached();
    await page.getByRole("button", { name: "Diagnose a concern", exact: true }).click();
    assert.ok(await page.locator('button[aria-label^="Add "]').count());
  }
  await page.goto(`${origin}/prototype/repair-explorer?system=engine&group=engine-assembly`);
  const explorerAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(explorerAudit.violations, []);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const output = path.join(root, "test-results", "labor-pilot-ui"); await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, "catalog-expansion-mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: ten-system navigation, six-group coverage, engine alternatives, persisted preview amounts, diagram-to-subsystem discovery, diagnostic paths, responsive/accessibility checks. Isolated browser fixture only; no live DB, authorizations or verified times.");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
