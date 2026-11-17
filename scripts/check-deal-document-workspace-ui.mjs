import fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const root = fileURLToPath(new URL("..", import.meta.url)), output = fs.mkdtempSync(join(tmpdir(), "deal-document-workspace-"));
const bundle = await esbuild.build({ stdin: { contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {DealOperationsDrawer} from './src/features/crm-next/deal-operations-drawer';function App(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Details & actions</button>{open&&<DealOperationsDrawer deal={{draftId:'draft',jacketId:'jacket',pathway:'retail-sale',customerName:'Synthetic Buyer'}} onClose={()=>setOpen(false)} onChanged={()=>{}}/>}</>};createRoot(document.getElementById('root')).render(<App/>);`, loader: "tsx", resolveDir: root }, bundle: true, write: false, outdir: output, jsx: "automatic" });
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined, headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage(), commands = [], errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const proof = { id: "proof", type: "signed-agreement", fileName: "signed.pdf", reviewed: false, signed: true, source: "MANUAL_UPLOAD", checksum: "checksum", contentType: "application/pdf" };
    const requirement = { id: "signed-agreement", label: "Final signed agreement", phase: "CLOSING", required: true, signed: true };
    const jacket = { id: "jacket", revision: 1, state: "WORKING", pathway: "retail-sale", phase: "CLOSING", customerName: "Synthetic Buyer", vin: "TESTVIN", stockNumber: "S1", documents: [], checklist: [{ ...requirement, ready: false, documentId: null, blocker: "Signed copy needs review" }], requirements: [requirement], versions: [], history: [], excludedDocumentCount: 0 };
    let review = { fields: { vin: "WRONGVIN", signer: "Different Buyer" }, lines: [], confirmed: false };
    const reading = { purpose: "SALES", fileName: "signed.pdf", checksum: "checksum", jobId: "job", needsReview: true, fields: [{ key: "vin", label: "VIN", value: "WRONGVIN", page: 1, source: "VIN: WRONGVIN" }, { key: "signer", label: "Printed signer name", value: "Different Buyer", page: 1, source: "Buyer name: Different Buyer" }], lines: [], warnings: [], pageCount: 1, pagesRead: 1 };
    const job = () => ({ id: "job", fileName: "signed.pdf", status: "READY", pageCount: 1, pagesCompleted: 1, reviewVersion: 1, reading, review, pages: [{ page: 1, text: "VIN: WRONGVIN" }] });
    await page.route("https://documents.test/**", async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      if (path === "/") return route.fulfill({ contentType: "text/html", body: '<html lang="en"><head><title>Deal document review</title></head><body><main id="root"></main></body></html>' });
      if (path.includes("/api/crm/v1/deal-drafts")) return route.fulfill({ json: { draftId: "draft", jacketId: "jacket", draftRevision: 1, jacketRevision: jacket.revision, pathway: "retail-sale", customerName: "Synthetic Buyer", staff: [], tasks: [], history: [], milestones: {}, canManage: true, canEdit: true, inactive: false } });
      if (path === "/api/sales-documents/jacket/documents" && request.method() === "POST") { commands.push({ action: "UPLOAD" }); jacket.documents = [{ ...proof }]; jacket.revision++; return route.fulfill({ json: jacket }); }
      if (path === "/api/sales-documents/jacket/documents/proof") return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4\nsynthetic original" });
      if (path === "/api/sales-documents/jacket" && request.method() === "PATCH") {
        const body = request.postDataJSON(); commands.push(body); expect(body.revision).toBe(jacket.revision); jacket.revision++;
        if (body.action === "REVIEW") { expect(body.signed).toBe(true); jacket.documents[0].reviewed = true; jacket.checklist[0].ready = true; jacket.checklist[0].documentId = "proof"; }
        if (body.action === "EXCLUDE_DOCUMENT") { jacket.documents = []; jacket.excludedDocumentCount++; jacket.checklist[0].ready = false; jacket.checklist[0].documentId = null; }
        return route.fulfill({ json: jacket });
      }
      if (path === "/api/sales-documents/jacket") return route.fulfill({ json: jacket });
      if (path.endsWith("/checks")) return route.fulfill({ json: { matches: [], duplicates: [], notes: [] } });
      if (path === "/api/document-library/read/jobs") return route.fulfill({ json: request.method() === "POST" ? job() : [] });
      if (path === "/api/document-library/read/jobs/job") { if (request.method() === "PATCH") { review = request.postDataJSON().review; return route.fulfill({ json: { version: 2 } }); } return route.fulfill({ json: job() }); }
      if (path.endsWith("/original")) return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4\nsynthetic original" });
      return route.fulfill({ status: 404, json: { error: "Outside this review" } });
    });
    await page.goto("https://documents.test/"); await page.addScriptTag({ content: 'window.process={env:{NODE_ENV:"test"}}' });
    await page.addStyleTag({ content: `body{font:14px Arial;margin:0;padding:16px}*{box-sizing:border-box}${bundle.outputFiles.find(file => file.path.endsWith(".css")).text}` });
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith(".js")).text });
    await page.getByRole("button", { name: "Details & actions", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Deal details · Synthetic Buyer" });
    await expect(drawer.getByRole("heading", { name: "Required documents & proofs", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Read document", exact: true })).toHaveCount(0);
    await drawer.getByRole("button", { name: "Upload / scan", exact: true }).click();
    const upload = drawer.getByRole("region", { name: "Upload deal proof" });
    await upload.getByLabel("Proof file").setInputFiles({ name: "signed.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nsynthetic") });
    await upload.getByRole("button", { name: "Upload proof", exact: true }).click();
    await expect(drawer).toContainText("Uploaded — review needed");
    await drawer.locator("summary").filter({ hasText: /^File actions$/ }).click();
    await drawer.getByRole("button", { name: "Review & accept", exact: true }).first().click();
    const accept = drawer.getByRole("form", { name: "Accept deal document" });
    await accept.getByRole("checkbox").first().check();
    await accept.getByLabel("Required signatures verified", {exact:true}).check();
    await accept.getByRole("button", { name: "Accept reviewed document", exact: true }).click();
    await expect(drawer).toContainText("Accepted");
    await drawer.getByRole("button", { name: "Perform document review", exact: true }).first().click();
    await expect(drawer.getByRole("button", { name: "Read document", exact: true })).toBeEnabled();
    await drawer.getByRole("button", { name: "Read document", exact: true }).click();
    await expect(drawer.getByLabel("Printed signer name", { exact: false })).toBeVisible();
    await drawer.getByRole("checkbox", { name: /I reviewed/ }).check();
    await drawer.getByRole("button", { name: "Save document audit", exact: true }).click();
    await expect(drawer.getByRole("heading", { name: "Possible wrong deal", exact: true })).toBeVisible();
    expect(commands.filter(command => command.action === "UPLOAD")).toHaveLength(1);
    expect(commands.find(command => command.action === "DOCUMENT_AUDIT")).toMatchObject({ documentId: "proof", jobId: "job" });
    await drawer.getByRole("button", { name: "Replace", exact: true }).first().click();
    const correction = drawer.getByRole("form", { name: "Correct mistaken attachment" });
    await correction.getByLabel("Reason", { exact: true }).fill("This signed agreement belongs to another deal.");
    await correction.getByRole("button", { name: "Exclude & choose replacement", exact: true }).click();
    await expect(drawer).toContainText("Mistaken attachment excluded");
    await expect(drawer.getByRole("region", { name: "Upload deal proof" })).toBeVisible();
    expect(commands.find(command => command.action === "EXCLUDE_DOCUMENT")).toMatchObject({ documentId: "proof" });
    await drawer.getByRole("button", { name: "Cancel upload", exact: true }).click();
    expect(await drawer.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(item => ["serious", "critical"].includes(item.impact));
    expect(violations.map(item => item.id)).toEqual([]); expect(errors).toEqual([]);
    await page.screenshot({ path: join(root, "..", `deal-document-workspace-${width}.png`), fullPage: true });
    await context.close();
  }
  console.log("PASS: Documents drawer desktop/phone upload, acceptance, optional saved-file audit, mismatch findings, correction/replacement, layout and accessibility");
} finally { await browser.close(); }
