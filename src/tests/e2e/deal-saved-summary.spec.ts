import { test, expect, type Page } from "@playwright/test";
import { EMPTY_CASH_SALE } from "../../lib/cash-retail-sale";

async function fixture(page: Page, finalized = false) {
  let failSave = false, failChecklist = false;
  const writes: Array<Record<string, unknown>> = [];
  const vehicle = {id:"vehicle-summary",inventoryUnitId:"inventory-summary",label:"2024 Toyota RAV4",vin:"2T3W1RFVXRW333586",stockNumber:"333586",year:"2024",make:"Toyota",model:"RAV4",color:"Silver",licensePlate:""};
  let draft = {id:"saved-summary-deal",revision:4,customerId:"customer-summary",customerName:"Summary Buyer",vehicleReference:vehicle.label,pathway:"retail-sale",status:"SOLD",updatedAt:"2026-11-03T17:00:00.000Z",snapshot:{"desk:form":{amount:"20000",customerId:"customer-summary",ownerUserId:"summary-staff",vehicle:vehicle.label,note:"Deliver with two keys"},"desk:workflowId":"retail-sale","desk:identity":{customerId:"customer-summary",vehicleId:vehicle.id,inventoryUnitId:vehicle.inventoryUnitId,vehicle},"retail-sale:cashSaleFacts":{...EMPTY_CASH_SALE,paymentReceived:"5000",buyerEmail:"",buyerPhone:""},"retail-sale:cashPacketBuyer":"Summary Buyer","retail-sale:vehicleFacts":{...vehicle,trim:""},jackets:{"retail-sale":"summary-jacket"}}};
  await page.route("**/api/coo-workbook/rhythm*",route=>route.fulfill({status:503,json:{error:"Outside this deal-summary fixture"}}));
  await page.route("**/api/crm/v1/deal-identities*",route=>new URL(route.request().url()).searchParams.get("id")==="customer-summary" ? route.fulfill({json:{id:"customer-summary",name:"Summary Buyer",customerNumber:"CUS-SUMMARY"}}) : route.continue());
  await page.route("**/api/crm/v1/contract-packets*",route=>route.fulfill({status:404,json:{error:"No generated packet in this isolated fixture"}}));
  await page.route("**/api/sales-documents/summary-jacket",route=>route.fulfill({json:{id:"summary-jacket",dealNumber:"DD-SUMMARY",state:finalized ? "CLOSED" : "DRAFT",revision:1,documents:[],checklist:finalized ? [] : [{id:"signed-purchase",label:"Signed purchase agreement",blocker:"Upload and review the signed purchase agreement"},{id:"insurance",label:"Insurance proof",blocker:"Upload insurance proof"}]}}));
  await page.route("**/api/crm/v1/deal-drafts*",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==="POST"){
      const body=request.postDataJSON();writes.push(body);
      if(failSave){await route.fulfill({status:503,json:{error:"Save unavailable for this test. Your entries remain here."}});return;}
      draft={...draft,...body,customerName:"Summary Buyer",revision:draft.revision+1};await route.fulfill({json:draft});
    }else if(url.searchParams.get("view")==="operations"){
      await route.fulfill(failChecklist ? {status:503,json:{error:"Checklist temporarily unavailable"}} : {json:{draftId:draft.id,draftRevision:draft.revision,jacketId:"summary-jacket",ownerId:"summary-staff",staff:[{id:"summary-staff",name:"Assigned Salesperson"}],tasks:[{id:"reminder-one",title:"Collect signed title",dueAt:"2026-11-04T16:00:00Z",status:"OPEN",ownerName:"Assigned Salesperson"}],history:[]}});
    }else if(url.searchParams.has("id"))await route.fulfill({json:draft});
    else if(url.searchParams.get("view")==="workbench")await route.continue();
    else await route.fulfill({json:[draft]});
  });
  return {writes,failSave:(value:boolean)=>{failSave=value;},failChecklist:(value:boolean)=>{failChecklist=value;}};
}

test.beforeEach(async({context})=>{
  expect((await context.request.post("/api/auth/login",{data:{email:"morgan.manager@local.test",password:"dispatch123!"}})).ok()).toBeTruthy();
});

test("saved sold deal opens a compact summary with exact figures, checklist and packet tools",async({page})=>{
  const {writes}=await fixture(page);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/crm-next/deals/start?draftId=saved-summary-deal");
  await expect(page.getByRole("heading",{name:"Deal summary",exact:true})).toBeVisible();
  const summary=page.getByRole("region",{name:"Saved deal summary",exact:true});
  await expect(summary).toContainText("Summary Buyer");await expect(summary).toContainText("Assigned Salesperson");
  await expect(summary.getByRole("region",{name:"Saved payment summary"})).toContainText("$21,675.00");
  await expect(summary.getByRole("region",{name:"Saved payment summary"})).toContainText("$16,675.00");
  await expect(summary).toContainText("2 checklist items pending");await expect(summary).toContainText("Collect signed title");
  await expect(summary.getByRole("link",{name:"Upload / review signed documents"})).toHaveAttribute("href","/sales-documents?jacketId=summary-jacket");
  await page.screenshot({path:test.info().outputPath("saved-deal-summary-desktop.png"),fullPage:true});
  await summary.getByRole("button",{name:"Prepare / print signing packet",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Cash sale packet",exact:true})).toBeVisible();
  await page.getByRole("dialog",{name:"Cash sale packet",exact:true}).getByRole("button",{name:"Close",exact:true}).click();
  await page.getByRole("tab",{name:"Overview",exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  await page.screenshot({path:test.info().outputPath("saved-deal-summary-mobile.png"),fullPage:true});
  expect(writes.every(write=>write.id==="saved-summary-deal")).toBeTruthy();expect(errors).toEqual([]);
});

test("save and review keeps one deal and save failure keeps entered changes on screen",async({page})=>{
  const state=await fixture(page);await page.goto("/crm-next/deals/start?draftId=saved-summary-deal");
  await page.getByRole("tab",{name:"Terms & Payments",exact:true}).click();
  state.failSave(true);
  await page.getByLabel("Agreed vehicle price",{exact:true}).fill("25000");
  await page.getByRole("button",{name:"Save & review",exact:true}).click();
  await expect(page.getByRole("region",{name:"Saved deal drafts"})).toContainText("Save unavailable for this test");
  await expect(page.getByLabel("Agreed vehicle price",{exact:true})).toHaveValue("25000");
  await page.getByRole("tab",{name:"Overview",exact:true}).click();
  const summary=page.getByRole("region",{name:"Saved deal summary",exact:true});
  await expect(summary).toContainText("last saved version");await expect(summary.getByRole("button",{name:"Prepare / print signing packet",exact:true})).toBeDisabled();
  await summary.getByRole("button",{name:"Save & close",exact:true}).click();await expect(page).toHaveURL(/draftId=saved-summary-deal/);
  state.failSave(false);
  await page.getByRole("button",{name:"Save & review",exact:true}).click();
  await expect(summary.getByRole("region",{name:"Saved deal structure"})).toContainText("$25,000.00");
  await expect(summary).not.toContainText("last saved version");expect(state.writes.every(write=>write.id==="saved-summary-deal")).toBeTruthy();
});

test("final paperwork stays finalized and failed checklist loading can be retried",async({page})=>{
  const state=await fixture(page,true);state.failChecklist(true);
  await page.goto("/crm-next/deals/start?draftId=saved-summary-deal");
  const summary=page.getByRole("region",{name:"Saved deal summary",exact:true});
  await expect(summary).toContainText("Checklist temporarily unavailable");
  state.failChecklist(false);await summary.getByRole("button",{name:"Refresh checklist",exact:true}).click();
  await expect(summary.getByRole("button",{name:"Review final paperwork",exact:true})).toBeVisible();
  await expect(summary).toContainText("Final paperwork is preserved");
  await expect(summary.getByRole("button",{name:"Mark deal sold",exact:true})).toHaveCount(0);
});
