import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import http from "node:http";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const bundle = await build({ absWorkingDir: root, stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client"; import "./src/app/globals.css"; import {EnterpriseLaborGuideConsole} from "./src/features/diagnostics/enterprise-labor-guide-console"; import {LABOR_OPERATION_TAXONOMY} from "./src/server/diagnostics/labor-operation-taxonomy"; createRoot(document.getElementById("root")).render(<EnterpriseLaborGuideConsole connectedExplorer activeRepairOrder={{id:"fixture-ro",repairOrderNumber:"FIXTURE-RO",openedAt:"2026-10-16T10:00:00Z",customer:"Fixture customer",concern:"Fixture brake and suspension concern",vehicle:{id:"fixture-vehicle",label:"Selected fixture vehicle",vin:"FIXTURE-VIN"}}} catalog={[]} laborAddOns={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY}/>);`, resolveDir: root, loader: "tsx" }, bundle: true, write: false, outdir: path.join(root, "test-results", "labor-pilot-bundle"), jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "next-fixtures", setup(builder) { builder.onResolve({ filter: /^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: "next-fixture" })); builder.onLoad({ filter: /.*/, namespace: "next-fixture" }, args => ({ loader: "js", contents: args.path.endsWith("link") ? 'import React from "react"; export default function Link({children,...props}){return React.createElement("a",props,children)}' : 'export function useRouter(){return {push(){},refresh(){}}}', resolveDir: root })); builder.onResolve({ filter: /^\// }, args => ({ path: args.path, external: true })); } }] });
const writes = [];
let drafts = [];
const server = http.createServer(async (request, response) => {
  if (request.url.startsWith("/api/")) {
    response.setHeader("Content-Type", "application/json");
    if (request.method !== "GET") {
      let text = ""; for await (const chunk of request) text += chunk;
      const body = JSON.parse(text); writes.push({ url: request.url, body });
      if (request.url.includes("workspace-drafts")) { drafts = [{ ...body, version: body.version + 1 }]; response.end(JSON.stringify({ version: body.version + 1 })); }
      else response.end(JSON.stringify({ result: { id: "fixture-estimate" } }));
    } else if (request.url.includes("workspace-drafts")) response.end(JSON.stringify({ drafts }));
    else if (request.url.includes("diagnostic-workspace")) response.end(JSON.stringify({ state: "EMPTY", cases: [], workspace: null }));
    else if (request.url.includes("/planning")) response.end(JSON.stringify({ version: 1, stage: "ESTIMATE", nextAction: "Review", diagnosisVersions: [], inspectionVersions: [], estimateVersions: [], repairJobs: [] }));
    else response.end(JSON.stringify({ items: [], parts: [] }));
    return;
  }
  const suffix = request.url === "/bundle.js" ? ".js" : request.url === "/bundle.css" ? ".css" : null;
  if (suffix) { response.setHeader("Content-Type", suffix === ".js" ? "text/javascript" : "text/css"); response.end(bundle.outputFiles.find(file => file.path.endsWith(suffix)).text); }
  else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connected labor pilot fixture</title><link rel="stylesheet" href="/bundle.css"></head><body><main><div id="root"></div></main><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.LABOR_PILOT_BROWSER_CHANNEL ? { channel: process.env.LABOR_PILOT_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => { errors.push(error.message); console.error("Browser runtime error:", error.message); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("button", { name: "Labor lookup", exact: true }).click();
  await page.getByRole("button", { name: "Add work / parts", exact: true }).click();
  const explorer = page.getByRole("region", { name: "Connected Repair Explorer", exact: true });
  await expect(explorer).toContainText("Selected fixture vehicle");
  await explorer.getByRole("navigation", { name: "Connected vehicle systems" }).getByRole("button", { name: "Pads, rotors & calipers", exact: true }).click();
  await explorer.getByRole("button", { name: "Add Replace front pads & rotors to workspace", exact: true }).click();
  await explorer.getByRole("button", { name: "Steering & suspension", exact: true }).click();
  await explorer.getByRole("navigation", { name: "Connected vehicle systems" }).getByRole("button", { name: "Shocks, struts & springs", exact: true }).click();
  await explorer.getByRole("button", { name: "Add Replace front left complete loaded strut to workspace", exact: true }).click();
  await expect(explorer.getByRole("complementary", { name: "Selected connected work" })).toContainText("2 lines");
  await expect(explorer.getByRole("button", { name: "Engine · approval pending", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Generate / Print Estimate", exact: true }).click();
  await expect(page.getByText("Enter the missing part prices.", { exact: true })).toBeVisible();
  const prices = page.getByRole("region", { name: "Guided estimate", exact: true }).locator('input[aria-label$="unit price"]');
  await expect(prices).toHaveCount(3);
  for (const input of await prices.all()) await input.fill("100");
  await page.getByRole("button", { name: "Generate / Print Estimate", exact: true }).click();
  await expect.poll(() => writes.filter(item => item.body.action === "PRESENT_ESTIMATE").length).toBe(1);
  await expect(page.getByText("Estimate saved. Opening the issued estimate for printing.", { exact: true })).toBeVisible();
  const presentation = writes.find(item => item.body.action === "PRESENT_ESTIMATE").body;
  assert.equal(presentation.estimateWorkflow, "STAFF_QUOTE");
  assert.equal("manualLaborReview" in presentation, false);
  assert.equal(presentation.lineItems.filter(line => line.type === "LABOR").length, 2);
  assert.equal(presentation.lineItems.some(line => line.key === "labor-front-brake-pads-rotors"), true);
  assert.equal(presentation.estimateControls.pricing.laborRate, 125);
  assert.ok(drafts[0].content.labor.every(line => line.rowId && line.system));
  assert.equal(writes.some(item => /AUTHORIZATION|CREATE_.*JOB/.test(item.body.action ?? "")), false);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const audit = await new AxeBuilder({ page }).include('section[aria-label="Connected Repair Explorer"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(audit.violations.map(issue => issue.id), []);
  assert.deepEqual(errors, []);
  const artifacts = process.env.LABOR_PILOT_ARTIFACT_DIR || path.join(root, "test-results", "labor-pilot-ui");
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, "connected-pilot-mobile.png"), fullPage: true });
  console.log("PASS: connected brake/steering selection, canonical persisted draft payload, inherited pricing, required part prices, direct staff-quote presentation without questionnaires, estimate-only presentation, responsive/accessibility checks. Fixture HTTP only; not staging/database proof.");
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
