import AxeBuilder from "@axe-core/playwright";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import http from "node:http";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const bundle = await build({ absWorkingDir: root, stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {AutobodyEstimatingWorkspace} from './src/features/autobody-estimating/workspace';createRoot(document.getElementById('root')).render(<AutobodyEstimatingWorkspace initialRepairOrderId="fixture-ro" userId="fixture-user"/>);`, resolveDir: root, loader: "tsx" }, bundle: true, write: false, outdir: path.join(root, "test-results/autobody/browser"), jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "next-link-fixture", setup(builder) { builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next/link", namespace: "fixture" })); builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ loader: "js", contents: 'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}', resolveDir: root })); } }] });
const records = new Map(), receipts = new Map(), revisions = new Map(); let saveAttempts = 0, lostResponse = true;
const context = { repairOrderId: "fixture-ro", locationId: "fixture-location", vehicleId: "fixture-vehicle", label: "RO-SAMPLE-001", vehicle: "Sample sedan · synthetic fixture", vin: "Sample non-VIN", customer: "Sample customer", payer: "CUSTOMER", closed: false, estimates: [] };
const server = http.createServer(async (request, response) => {
  if (request.url.startsWith("/api/")) {
    response.setHeader("Content-Type", "application/json");
    if (!request.url.startsWith("/api/autobody-estimating")) { response.end(JSON.stringify({ parts: [] })); return; }
    if (request.method === "GET") {
      const query = new URL(request.url, "http://fixture").searchParams;
      if (query.has("id")) { response.end(JSON.stringify({ record: records.get(query.get("id")), revisions: revisions.get(query.get("id")) ?? [] })); return; }
      response.end(JSON.stringify({ locations: [{ id: "fixture-location", name: "Sample company site" }], vehicles: [], orders: [], drafts: [...records.values()].map(record => ({ ...record, updatedAt: new Date().toISOString() })), context, rateCents: 15000, canOverrideRates: true, coverage: { operations: 249, visualBindings: 249 } })); return;
    }
    let raw = ""; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    if (body.action === "SAVE") {
      saveAttempts++;
      if (!receipts.has(body.idempotencyKey)) { const record = { id: body.id, version: body.expectedVersion + 1, content: body.content, locationId: body.locationId, status: "DRAFT", estimateId: null }; records.set(body.id, record); receipts.set(body.idempotencyKey, record); revisions.set(body.id, [{ ...record, createdAt: new Date().toISOString() }]); }
      if (lostResponse) { lostResponse = false; response.statusCode = 503; response.end(JSON.stringify({ error: "Synthetic lost save response" })); return; }
      response.end(JSON.stringify({ record: receipts.get(body.idempotencyKey) })); return;
    }
    if (body.action === "PRESENT") { const record = { ...records.get(body.id), status: "PRESENTED", estimateId: "fixture-estimate" }; records.set(body.id, record); context.estimates = [{ id: "fixture-estimate", version: 1, totalCents: 22500, presentedAt: new Date().toISOString() }]; response.end(JSON.stringify({ record, estimateId: record.estimateId })); return; }
    if (body.action === "SUPPLEMENT") { const record = records.get(body.id); response.end(JSON.stringify({ content: { ...record.content, priorEstimateId: record.estimateId, supplementReason: "" }, locationId: record.locationId })); return; }
    response.statusCode = 400; response.end(JSON.stringify({ error: "Unsupported fixture action" })); return;
  }
  const suffix = request.url === "/bundle.js" ? ".js" : request.url === "/bundle.css" ? ".css" : null;
  response.setHeader("Content-Type", suffix === ".js" ? "text/javascript" : suffix === ".css" ? "text/css" : "text/html");
  response.end(suffix ? bundle.outputFiles.find(file => file.path.endsWith(suffix)).text : '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic autobody UI verification</title><link rel="stylesheet" href="/bundle.css"></head><body style="margin:0"><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error("UI error:", error.message); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await expect(page.getByRole("heading", { name: "Point to the damage. Build the estimate.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Expand diagram", exact: true }).click();
  const modal = page.getByRole("dialog"); await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Zoom in", exact: true }).click(); await expect(modal.getByText("125%", { exact: true })).toBeVisible();
  await modal.getByRole("button", { name: "Detail inset", exact: true }).click();
  await expect(modal.getByText("1. Outer cover", { exact: true })).toBeVisible();
  await expect(modal.getByText("2. Absorber example", { exact: true })).toBeVisible();
  await modal.getByLabel("Absorber example", {exact:true}).uncheck(); await expect(modal.getByText("2. Absorber example", {exact:true})).not.toBeVisible(); await modal.getByLabel("Absorber example", {exact:true}).check();
  await page.keyboard.press("Escape"); await expect(modal).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Expand diagram", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Assembly", exact: true }).click();
  await page.getByRole("button", { name: "Select Rear bumper cover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rear bumper cover", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Select Front bumper cover", exact: true }).click();
  await page.getByRole("button", { name: "Replace +", exact: true }).click();
  const work = page.getByRole("region", { name: "Selected work", exact: true });
  await work.getByLabel("Labor hours", { exact: true }).fill("1.5");
  await work.getByLabel("Allowance basis", { exact: true }).fill("Synthetic estimator allowance");
  await work.getByLabel("Vehicle applicability review", { exact: true }).fill("Synthetic vehicle scope checked");
  await work.getByRole("button", { name: "Open operation diagram", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Front bumper cover", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "2 Review · 1 lines", exact: true }).click();
  await page.getByText("Rate, material and tax policy", { exact: true }).click();
  await page.getByLabel("Tax rate %", { exact: true }).fill("0");
  await page.getByLabel("Tax decision / source", { exact: true }).fill("Synthetic zero-tax fixture");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Synthetic lost save response");
  await expect(work.getByLabel("Labor hours", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry unchanged save", exact: true }).click();
  await expect(page.getByText("Saved v1", { exact: true })).toBeVisible();
  assert.equal(records.size, 1); assert.equal(saveAttempts, 2); assert.equal(receipts.size, 1);
  await page.getByRole("button", { name: "Generate estimate", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open estimate / Print / Save PDF", exact: true })).toHaveAttribute("href", "/repair-estimate?repairOrderId=fixture-ro&estimateId=fixture-estimate");
  await expect(work.getByLabel("Labor hours", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Start supplement", exact: true }).click();
  await expect(work.getByLabel("Labor hours", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "2 Review · 1 lines", exact: true }).click();
  await expect(page.getByLabel("Supplement explanation", { exact: true })).toBeVisible();
  await page.getByLabel("Supplement explanation", { exact: true }).fill("Synthetic hidden damage supplement");
  await page.getByRole("button", { name: "1 Build", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Catalog family", exact: true }).locator("option")).toHaveCount(16);
  await page.getByRole("combobox", { name: "Catalog family", exact: true }).selectOption("closures");
  await page.getByRole("button", { name: "Left front door", exact: true }).click();
  await page.getByRole("button", { name: "Detail inset", exact: true }).click();
  await expect(page.getByText("2. Glass / opening", { exact: true })).toBeVisible();
  await page.getByRole("button", {name:"Fit / reset",exact:true}).click();
  const picture = page.locator('svg[aria-label*=" detail diagram"]'); await picture.scrollIntoViewIfNeeded();
  const box = await picture.boundingBox(), touch = await context.newCDPSession(page);
  const points = [{x:box.x+box.width*.4,y:box.y+box.height*.5,id:1},{x:box.x+box.width*.6,y:box.y+box.height*.5,id:2}];
  await touch.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:points});
  await touch.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[points[0],{...points[1],x:box.x+box.width*.7}]});
  await touch.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
  await expect(page.getByText("150%",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Fit / reset",exact:true}).click();
  const desktopAccessibility = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze(); assert.deepEqual(desktopAccessibility.violations.map(item=>item.id),[]);
  await mkdir("test-results/autobody/browser", { recursive: true });
  await page.screenshot({ path: "test-results/autobody/browser/desktop.png", fullPage: true });
  await page.setViewportSize({width:1024,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Tablet overflowed");
  await page.screenshot({path:"test-results/autobody/browser/tablet.png",fullPage:true});
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Phone page overflowed horizontally");
  await page.screenshot({ path: "test-results/autobody/browser/mobile.png", fullPage: true });
  const accessibility = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(accessibility.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, data: "synthetic HTTP fixtures only", checks: ["expand/zoom/detail layers", "Escape/focus", "operation diagram", "editing and review", "lost save response recovery", "frozen generated scope", "supplement", "15 catalog families", "390px layout", "no browser errors"] }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
