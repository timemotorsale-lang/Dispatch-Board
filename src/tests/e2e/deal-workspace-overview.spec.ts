import { test, expect, type Page } from "@playwright/test";

async function mockDrafts(page: Page, initial: Array<Record<string, unknown>> = []) {
 const drafts = new Map(initial.map(draft=>[String(draft.id),draft]));
 const writes: Array<Record<string, unknown>>=[];
 await page.route("**/api/coo-workbook/rhythm*",route=>route.fulfill({status:503,json:{error:"Outside the workspace review"}}));
 await page.route("**/api/crm/v1/deal-drafts*",async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==="POST"){
   const body=request.postDataJSON();writes.push(body);
   const saved={...body,revision:body.revision+1,updatedAt:"2026-11-03T17:00:00.000Z"};drafts.set(body.id,saved);await route.fulfill({json:saved});
  }else if(url.searchParams.get("view")==="operations")await route.fulfill({json:{history:[]}});
  else if(url.searchParams.has("id"))await route.fulfill({json:drafts.get(url.searchParams.get("id")!)??{}});
  else await route.fulfill({json:[...drafts.values()]});
 });
 return {drafts,writes};
}
test.beforeEach(async({context})=>{
 const response=await context.request.post("/api/auth/login",{data:{email:"morgan.manager@local.test",password:"dispatch123!"}});
 expect(response.ok()).toBeTruthy();
});
test("new overview offers pathways, creates no draft on navigation, and retains edited terms",async({page})=>{
 const {writes}=await mockDrafts(page);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/crm-next/deals/start?new=1");
 await expect(page.getByRole("heading",{name:"Step 1 · Choose the revenue pathway"})).toBeVisible();
 expect(writes).toHaveLength(0);
 await page.getByLabel("Revenue pathway",{exact:true}).selectOption("retail-cash-one-pay");
 await page.getByRole("button",{name:"Continue to customer & vehicle"}).click();
 await expect(page.getByRole("heading",{name:"Deal overview",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"New deal",exact:true})).toBeEnabled();
 await page.getByRole("tab",{name:"Documents",exact:true}).click();
 await page.getByRole("tab",{name:"Completion",exact:true}).click();
 await page.getByRole("tab",{name:"Overview",exact:true}).click();
 await expect(page.getByLabel("Revenue pathway chooser")).toHaveAttribute("open","");
 await page.getByRole("button",{name:"Lease-to-Own",exact:true}).click();
 await expect(page.getByLabel("Deal identity summary")).toContainText("Lease-to-Own");
 await page.getByRole("tab",{name:"Terms & Payments",exact:true}).click();
 await page.waitForTimeout(1300);
 expect(writes).toHaveLength(0);
 const note=page.getByPlaceholder("Optional context staff needs before working this lease-to-own deal");
 await note.fill("Workspace navigation regression note");
 await expect.poll(()=>writes.length).toBeGreaterThan(0);
 await page.getByRole("tab",{name:"Documents",exact:true}).click();
 await page.getByRole("button",{name:"Choose forms & generate packet",exact:true}).click();
 const packet=page.getByRole("complementary",{name:"Lease-to-own packet drawer"});await expect(packet).toBeVisible();
 await packet.getByRole("button",{name:"Close",exact:true}).click();
 await page.getByRole("tab",{name:"Terms & Payments",exact:true}).click();
 await expect(note).toHaveValue("Workspace navigation regression note");
 await page.setViewportSize({width:390,height:844});
 await page.getByRole("tab",{name:"Overview",exact:true}).click();
 const width=await page.evaluate(()=>({view:innerWidth,page:document.documentElement.scrollWidth}));expect(width.page).toBeLessThanOrEqual(width.view+1);
 expect(errors).toEqual([]);
});
test("customer entry chooses among active deals and resumes the selected exact record",async({page,context})=>{
 const response=await context.request.get("/api/crm/v1/deal-identities?q=");const customers=await response.json();
 const customer=customers.items[0];expect(customer?.id).toBeTruthy();
 const make=(id:string,pathway:string,vehicle:string)=>({id,customerId:customer.id,customerName:customer.name,pathway,vehicleReference:vehicle,status:"IN_PROGRESS",revision:1,updatedAt:"2026-11-03T17:00:00.000Z",snapshot:{"desk:form":{customerId:customer.id,ownerUserId:"manager",vehicle,note:"",amount:""},"desk:workflowId":pathway}});
 const {writes}=await mockDrafts(page,[make("workspace-sale-001","retail-sale","Sale vehicle"),make("workspace-rental-001","daily-rental","Rental vehicle")]);
 await page.goto(`/crm-next/deals/start?customerId=${encodeURIComponent(customer.id)}`);
 const chooser=page.getByRole("region",{name:"Choose customer deal"});await expect(chooser).toBeVisible();
 expect(writes).toHaveLength(0);
 await chooser.getByRole("button").filter({hasText:"Rental vehicle"}).click();
 await expect(chooser).not.toBeVisible();
 await expect(page.getByLabel("Deal identity summary")).toContainText("Daily Rental");
 await expect(page.getByLabel("Deal identity summary")).toContainText("Rental vehicle");
 expect(writes.every(write=>write.id==="workspace-rental-001")).toBeTruthy();
});
test("coordinator gets the overview and customer list inside its identity section",async({page,context})=>{
 await context.request.post("/api/auth/logout");
 expect((await context.request.post("/api/auth/login",{data:{email:"avery.ops@local.test",password:"dispatch123!"}})).ok()).toBeTruthy();
 const {writes}=await mockDrafts(page);
 await page.goto("/crm-next/deals/start?new=1&pathway=daily-rental");
 await expect(page.getByRole("heading",{name:"Deal overview",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Choose customer",exact:true}).click();
 const customers=page.getByRole("region",{name:"Shared customer selector",exact:true});await expect(customers).toBeVisible();
 await expect.poll(()=>customers.locator("ul button").count()).toBeGreaterThan(0);
 await page.getByRole("tab",{name:"Overview",exact:true}).click();await page.waitForTimeout(1200);
 expect(writes).toHaveLength(0);
});

test("Deals Home quick actions and reporting shortcuts filter the existing workbench",async({page})=>{
 await page.route("**/api/coo-workbook/rhythm*",route=>route.fulfill({status:503,json:{error:"Outside the workspace review"}}));
 const reads:URL[]=[];page.on("request",request=>{if(request.url().includes("/api/crm/v1/deal-drafts?")&&new URL(request.url()).searchParams.get("view")==="workbench")reads.push(new URL(request.url()));});
 await page.goto("/crm-next/deals");
 await page.getByRole("tab",{name:"Overview",exact:true}).click();
 const quick=page.getByRole("region",{name:"Deal quick actions"});await expect(quick).toBeVisible();
 await expect(quick.getByRole("link",{name:"Start Deal",exact:true})).toHaveAttribute("href","/crm-next/deals/start?new=1");
 await page.getByLabel("Quick reporting range",{exact:true}).selectOption("yesterday");
 await expect.poll(()=>reads.at(-1)?.searchParams.get("period")).toBe("day");
 await quick.getByRole("button",{name:"Rental / loaner returns",exact:true}).click();
 await expect.poll(()=>reads.at(-1)?.searchParams.get("bucket")).toBe("returns");
 await expect(page.getByRole("tab",{name:/Rentals & Loaners/})).toHaveAttribute("aria-selected","true");
});
