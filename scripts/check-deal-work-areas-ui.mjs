import fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = fs.mkdtempSync(join(tmpdir(), "deal-work-areas-"));
const bundle = await esbuild.build({ stdin: { contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {SavedDealsLibrary} from './src/features/crm-next/saved-deals-library';
import {belongsToDealArea,DEAL_WORK_AREAS} from './src/lib/deal-work-areas';
import {reportingRange,summarizeDeals} from './src/lib/deal-dashboard';
const rows=[
 {id:'working',pathway:'retail-sale',status:'IN_PROGRESS'},
 {id:'sold',pathway:'bhph',status:'SOLD',soldDate:'2026-10-01'},
 {id:'lease',pathway:'lease-to-own',status:'COMPLETED',stage:'Completed',packetState:'CLOSED'},
 {id:'rental',pathway:'daily-rental',status:'IN_PROGRESS'},
 {id:'repair',pathway:'repairs',status:'IN_PROGRESS'},
 {id:'drive',pathway:'test-drive',status:'IN_PROGRESS'},
 {id:'lost',pathway:'retail-sale',status:'LOST'},
].map(row=>({draftId:row.id,draftRevision:1,jacketId:'packet-'+row.id,dealNumber:'D-'+row.id,
 customerName:'Synthetic '+row.id,vehicleReference:'2024 Synthetic vehicle',ownerId:'staff',ownerName:'Test Staff',
 packetState:null,stage:'Working',nextAction:'Review deal',dueAt:null,taskHref:null,
 documentsTotal:3,documentsReady:0,completedDate:null,createdDate:'2026-10-01',updatedAt:'2026-11-01T12:00:00Z',needsAttention:false,...(row.status==='SOLD'?{stage:'Sold · paperwork pending',outstandingItems:['Documents','Funding','Delivery','Title']}:{}),...row}));
window.fetch=async(input,options)=>{
 const query=new URL(String(input),location.origin).searchParams;
 if(options?.signal?.aborted)throw new DOMException('Aborted','AbortError');
 if(query.get('view')==='operations')return Response.json({draftId:query.get('draftId'),jacketId:null,customerName:'Synthetic account',staff:[],tasks:[],financialEntries:[],financials:{agreedCents:null,outstandingCents:null,creditCents:0,collectedCents:0,refundedCents:0,netCents:0},milestones:{},history:[],inactive:false,canManage:false,canEdit:true});
 const area=query.get('area')||'all';
 const filtered=rows.filter(row=>(query.get('pathway')==='ALL'||row.pathway===query.get('pathway'))&&(!query.get('search')||row.customerName.includes(query.get('search'))));
 const selected=filtered.filter(row=>belongsToDealArea(row,area));
 const range=reportingRange(query.get('date')||'2026-11-08',query.get('period')||'month');
 return Response.json({items:selected,total:selected.length,page:1,pages:1,counts:{},dashboard:{area,areaCounts:Object.fromEntries(Object.keys(DEAL_WORK_AREAS).map(key=>[key,filtered.filter(row=>belongsToDealArea(row,key)).length])),range,summary:summarizeDeals(selected,range),owners:[{id:'staff',name:'Test Staff'}],canManage:false,actorId:'staff',workspace:'ACCESSIBLE',financials:null,taxes:{available:false,message:'Test fixture'},scope:'Synthetic accessible transactions'}});
};
createRoot(document.getElementById('root')).render(<SavedDealsLibrary title='Deals' disabled={false} refreshKey='test' onOpen={id=>window.openedDeal=id}/>);
`, loader: "tsx", resolveDir: root }, bundle: true, write: false, outdir: output, jsx: "automatic" });
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined, headless: true });
try {
  if (process.env.DEAL_WORK_AREAS_LIVE_URL) {
    const baseURL = process.env.DEAL_WORK_AREAS_LIVE_URL;
    for (const width of [1860, 390]) {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 1000 } });
      const login = await context.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
      expect(login.ok()).toBe(true);
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      // Exclude the unrelated daily-rhythm reminder without completing staff work or changing its records.
      await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside the compact layout review" } }));
      await page.goto("/crm-next/deals?area=sold", { timeout: 60000 });
      const library = page.getByRole("region", { name: "Saved deals library" });
      const rows = library.locator("tbody tr");
      await expect(rows.first()).toBeVisible();
      if (width === 1860) {
        const heights = await rows.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
        expect(Math.max(...heights)).toBeLessThan(160);
        console.log(`Full app desktop row heights: ${heights.join(", ")}px`);
      }
      const before = (await rows.first().boundingBox()).height;
      await rows.first().getByRole("button", { name: /^Status details for / }).click();
      const panel = page.getByRole("dialog", { name: /^Status details for / });
      await expect(panel).toContainText("Title");
      expect((await rows.first().boundingBox()).height).toBeCloseTo(before, 0);
      await page.keyboard.press("Escape");
      await page.screenshot({ path: join(root, "..", `deal-compact-live-${width}.png`), fullPage: true });
      await context.close();
    }
  }
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("https://deals.test/**", route => route.fulfill({ contentType: "text/html", body: '<html lang="en"><head><title>Transaction work areas review</title></head><body><main id="root"></main></body></html>' }));
    async function mount(query = "") {
      await page.goto(`https://deals.test/${query}`);
      await page.addScriptTag({ content: 'window.process={env:{NODE_ENV:"test"}}' });
      await page.addStyleTag({ content: `body{margin:0;padding:16px;background:#f3f6fa;font:15px Arial}*{box-sizing:border-box}${bundle.outputFiles.find(file => file.path.endsWith(".css")).text}` });
      await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith(".js")).text });
    }
    await mount();
    const library = page.getByRole("region", { name: "Saved deals library" });
    await expect(page.getByRole("heading", { name: "Working Deals", exact: true })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "D-working" })).toBeVisible();
    await page.getByRole("tab", {name:/^Working Deals /}).click();
    await expect(page.getByRole("button", {name:"Refresh saved deals"})).toBeEnabled();
    await expect(page.getByRole("row").filter({ hasText: "D-sold" })).toHaveCount(0);
    for (const [label, id] of [["Sold Deals", "sold"], ["Rentals & Loaners", "rental"], ["Repairs & Services", "repair"], ["Test Drives", "drive"], ["Archive", "lost"]]) {
      await page.getByRole("tab", { name: new RegExp(`^${label} \\(`) }).click();
      await expect(page.getByRole("row").filter({ hasText: `D-${id}` })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "D-working" })).toHaveCount(0);
    }
    await page.getByRole("tab", { name: /^Active Accounts / }).click();
    await expect(page.getByRole("row").filter({ hasText: "D-lease" })).toBeVisible();
    await expect(library).toContainText("Recorded outstanding: Not recorded");
    await page.getByRole("button", {name:"Actions for Synthetic sold",exact:true}).click();
    await page.getByRole("menuitem", { name: "Review account money",exact:true }).click();
    const drawer = page.getByRole("dialog", { name: "Deal details · Synthetic sold" });
    await expect(drawer.getByRole("tab", { name: "Money", exact: true })).toHaveAttribute("aria-selected", "true");
    await drawer.getByRole("tab", { name: "Completion", exact: true }).click();
    await expect(drawer.getByRole("heading", {name:"Delivery, funding and title",exact:true})).toBeVisible();
    await expect(drawer.getByText("A manager can record verification evidence here.",{exact:false})).toBeVisible();
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: /^Sold Deals / }).click();
    await expect(library).toContainText("Sold 2026-10-01");
    const soldRow=page.getByRole("row").filter({hasText:"D-sold"});
    const compactHeight=(await soldRow.boundingBox()).height;
    if(width===1440)expect(compactHeight).toBeLessThan(150);
    await page.getByRole("button",{name:"Status details for Synthetic sold",exact:true}).click();
    const statusPanel=page.getByRole("dialog",{name:"Status details for Synthetic sold",exact:true});
    await expect(statusPanel).toContainText("Title");
    await expect(statusPanel).toContainText("Outstanding: Documents · Funding · Delivery · Title");
    expect((await soldRow.boundingBox()).height).toBeCloseTo(compactHeight,0);
    await statusPanel.getByRole("button",{name:"Review outstanding checks",exact:true}).click();
    await expect(page.getByRole("dialog",{name:"Deal details · Synthetic sold"}).getByRole("tab",{name:"Completion",exact:true})).toHaveAttribute("aria-selected","true");
    await page.getByRole("dialog",{name:"Deal details · Synthetic sold"}).getByRole("button",{name:"Close",exact:true}).click();
    await expect(page.getByRole("row").filter({ hasText: "D-lease" })).toHaveCount(0);
    await page.locator("summary").filter({hasText:"Filters, pathway and personal views"}).click();
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sold Deals", exact: true })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export visible rows" }).click();
    expect((await download).suggestedFilename()).toContain("deal-visible-rows");
    await mount();
    await expect(page.getByRole("heading", { name: "Sold Deals", exact: true })).toBeVisible();
    await mount("?area=drives&pathway=test-drive");
    await expect(page.getByRole("heading", { name: "Test Drives", exact: true })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "D-drive" })).toBeVisible();
    expect(await library.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(item => ["critical", "serious"].includes(item.impact));
    expect(violations.map(item => `${item.id}: ${item.description}`)).toEqual([]);
    expect(errors).toEqual([]);
    await page.getByRole("tab", { name: /^Sold Deals / }).click();
    await expect(page.getByRole("heading", { name: "Sold Deals", exact: true })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "D-sold" })).toBeVisible();
    await page.locator("summary").filter({hasText:"Filters, pathway and personal views"}).evaluate(element=>element.parentElement.open=false);
    await page.screenshot({ path: join(root, "..", `deal-work-areas-${width}.png`), fullPage: true });
    await context.close();
  }
  console.log("PASS: desktop/mobile work areas, original links, account review, filters, session restore, deep links, CSV, layout, accessibility and browser errors");
} finally { await browser.close(); }
