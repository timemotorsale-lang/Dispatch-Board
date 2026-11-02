import fs from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import esbuild from "esbuild";
import {chromium,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const root=fileURLToPath(new URL("..",import.meta.url)),output=fs.mkdtempSync(join(tmpdir(),"vendor-billing-ui-"));
const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {VendorBilling} from './src/features/vendors/vendor-billing';createRoot(document.getElementById('root')).render(<VendorBilling vendorId='fixture' documents={[]}/>);`,resolveDir:root,loader:"tsx"},bundle:true,write:false,outdir:output,jsx:"automatic",plugins:[{name:"shared-picker-fixture",setup(build){build.onResolve({filter:/shared-deal-identities$/},()=>({path:"picker",namespace:"fixture"}));build.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:`import React from 'react';export function SharedDealVehiclePicker({onSelect,label}){return <label>{label}<select onChange={()=>onSelect({id:'vehicle-1',displayName:'Synthetic Toyota'})}><option value=''>Choose vehicle</option><option value='vehicle-1'>Synthetic Toyota</option></select></label>}`,loader:"tsx",resolveDir:root}));}}]});
const browser=await chromium.launch({channel:process.platform==="win32"?"msedge":undefined,headless:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],commands=[];
  page.on("pageerror",e=>errors.push(e.message));
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const makeDoc=(id,direction,amountCents,status="POSTED")=>({id,direction,amountCents,status,kind:"INVOICE",number:id,title:"Synthetic obligation",issueDate:today,dueDate:today,taxCents:0,version:1,balanceCents:amountCents,appliedCents:0,sourceReference:"Original source",unmatchedReason:"Building expense",agreementId:null,periodKey:null,lines:[{id:`line-${id}`,description:"Monthly amount",amountCents,workJobId:null}],dueItems:[{dueDate:today,amountCents,outstandingCents:amountCents}],allocations:[]});
  const model={vendor:{id:"fixture",name:"Synthetic dual-role vendor",number:"V-TEST"},today,canManage:true,documents:[makeDoc("RENT-1","RECEIVABLE",100000),makeDoc("REPAIR-1","PAYABLE",60000),makeDoc("DRAFT-1","PAYABLE",30000,"DRAFT")],agreements:[],settlements:[],events:[],missingRecurring:[],jobs:[{id:"work-1",number:"VJ-1",vehicle:"Synthetic Toyota",description:"Replace tires",batch:"VB-1",batchId:"batch-1",serviceDate:today,amountCents:60000,status:"BATCHED",review:null,reviewCurrent:false}],summary:{receivableCents:100000,payableCents:60000,receivableDueCents:100000,payableDueCents:60000,draftCount:1,disputedCount:0,unmatchedWork:1},templateVersion:1};
  let rejectNext=true;
  await page.route("https://vendors.test/**",async route=>{
   if(!route.request().url().includes("/api/"))return route.fulfill({contentType:"text/html",body:'<html lang="en"><head><title>Vendor billing review</title></head><body><main id="root"></main></body></html>'});
   if(route.request().method()==="GET")return route.fulfill({json:model});
   const data=route.request().postDataJSON();commands.push(data);
   if(rejectNext){rejectNext=false;return route.fulfill({status:409,json:{error:"This invoice number already exists. Use the original or correct the number."}});}
   if(data.action==="CREATE_DOCUMENT")model.documents.push(makeDoc(data.number,data.direction,20000,"DRAFT"));
   return route.fulfill({json:model});
  });
  await page.goto("https://vendors.test/");await page.addStyleTag({content:`body{margin:0;padding:12px;background:#f3f6fa;font:15px Arial}*{box-sizing:border-box}${bundle.outputFiles.find(f=>f.path.endsWith('.css')).text}`});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await expect(page.getByText("$1,000.00",{exact:true}).first()).toBeVisible();
  await page.getByLabel("New vendor billing action").selectOption("BILL");let dialog=page.getByRole("dialog",{name:"Bill vendor",exact:true});
  await dialog.getByLabel("Our invoice number").fill("NEW-1");await dialog.getByLabel("Description",{exact:true}).first().fill("Monthly rent");await dialog.getByLabel("Original invoice / agreement reference").fill("Lease record");await dialog.getByLabel("Description",{exact:true}).last().fill("Rent installment");await dialog.getByLabel("Amount",{exact:true}).fill("200");
  await dialog.getByRole("button",{name:"Bill vendor",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("already exists");await expect(dialog.getByLabel("Our invoice number")).toHaveValue("NEW-1");
  await dialog.getByRole("button",{name:"Bill vendor",exact:true}).click();await expect(dialog).toHaveCount(0);expect(commands[0].commandKey).toBe(commands[1].commandKey);expect(commands[1].direction).toBe("RECEIVABLE");
  await page.getByLabel("Actions for DRAFT-1",{exact:true}).selectOption("EDIT_DOCUMENT");dialog=page.getByRole("dialog",{name:"Edit draft invoice"});await expect(dialog.getByLabel("Vendor invoice number")).toHaveValue("DRAFT-1");await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await page.getByLabel("New vendor billing action").selectOption("RECEIVE_BILL");dialog=page.getByRole("dialog",{name:"Receive vendor bill",exact:true});await dialog.getByLabel("Fill lines from a batch").selectOption("batch-1");await expect(dialog.getByLabel("Amount",{exact:true})).toHaveValue("600.00");await expect(dialog.getByRole("combobox",{name:/^Work ticket/})).toHaveValue("work-1");await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await page.getByLabel("New vendor billing action").selectOption("CREATE_AGREEMENT");dialog=page.getByRole("dialog",{name:"Monthly agreement / repayment"});await dialog.getByLabel("Agreement name").fill("Monthly rent");await dialog.getByLabel("Monthly amount / installment").fill("1000");await dialog.getByLabel("Agreement terms / source reference").fill("Signed lease 001");await dialog.getByRole("button",{name:"Monthly agreement / repayment",exact:true}).click();expect(commands.at(-1).kind).toBe("RENT");
  await page.getByLabel("New vendor billing action").selectOption("OFFSET");dialog=page.getByRole("dialog",{name:"Approve offset",exact:true});await dialog.getByLabel("Amount to offset in each direction").fill("300");await dialog.getByLabel("Mutual offset agreement reference").fill("Written agreement");await dialog.getByLabel("Purpose / explanation").fill("Approved mutual offset");await dialog.getByLabel("They owe us - invoice").selectOption("RENT-1");await dialog.getByLabel("We owe them - bill").selectOption("REPAIR-1");await dialog.getByRole("checkbox").check();await dialog.getByRole("button",{name:"Approve offset",exact:true}).click();expect(commands.at(-1).allocations).toHaveLength(2);expect(commands.at(-1).agreed).toBe(true);
  await page.getByRole("button",{name:"Work review",exact:true}).click();await page.getByRole("button",{name:"Review work",exact:true}).click();dialog=page.getByRole("dialog",{name:"Review work and approved amount"});await dialog.getByLabel("Work vehicle").selectOption("vehicle-1");await dialog.getByLabel("Approved work amount",{exact:false}).fill("600");await dialog.getByLabel("Approved estimate / supplement and acceptance evidence").fill("Estimate 1; QC passed");await dialog.getByRole("checkbox").check();await dialog.getByRole("button",{name:"Review work and approved amount",exact:true}).click();expect(commands.at(-1).vehicleId).toBe("vehicle-1");expect(commands.at(-1).accepted).toBe(true);
  await page.getByRole("button",{name:"Invoices",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,description:v.description}))).toEqual([]);expect(errors).toEqual([]);
  await page.screenshot({path:join(output,`vendor-billing-${width}.png`),fullPage:true});console.log(`Vendor billing browser checks passed at ${width}px`);await context.close();
 }
 console.log(`Review screenshots: ${output}`);
}finally{await browser.close();}
