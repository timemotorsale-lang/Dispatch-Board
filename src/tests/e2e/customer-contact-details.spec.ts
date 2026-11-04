import {test,expect} from "@playwright/test";
test.beforeEach(async({context,page})=>{
 expect((await context.request.post("/api/auth/login",{data:{email:"morgan.manager@local.test",password:"dispatch123!"}})).ok()).toBeTruthy();
 await page.route("**/api/coo-workbook/rhythm*",route=>route.fulfill({status:503,json:{error:"Isolated contact test"}}));
});
test("staff can reveal, call, email and hide contact details without navigating away",async({page})=>{
 let requests=0;
 await page.route("**/api/crm/v1/customers/*/contact-details",route=>{requests++;return route.fulfill({headers:{"Cache-Control":"private, no-store"},json:{contacts:[{type:"PHONE",value:"+16125550109"},{type:"EMAIL",value:"contact.reveal@example.test"}]}});});
 await page.goto("/crm-next/customers");
 const section=page.locator('[class*="customer-contact-details_contact"]').first();const show=section.getByRole("button",{name:"Show contact details",exact:true});await expect(show).toBeVisible();expect(requests).toBe(0);
 await show.focus();await page.keyboard.press("Enter");
 await expect(section).toContainText("+16125550109");await expect(section).toContainText("contact.reveal@example.test");
 await expect(section.getByRole("link",{name:"Call",exact:true})).toHaveAttribute("href","tel:+16125550109");
 await expect(section.getByRole("link",{name:"Email",exact:true})).toHaveAttribute("href","mailto:contact.reveal%40example.test");
 await expect(page).toHaveURL(/crm-next\/customers$/);
 await section.getByRole("button",{name:"Hide contact details",exact:true}).click();
 await expect(section).not.toContainText("contact.reveal@example.test");
 await section.getByRole("button",{name:"Reveal customer phone and email"}).dblclick();
 await expect(section).toContainText("contact.reveal@example.test");expect(requests).toBe(2);
});
test("a denied reveal shows a useful message and can be retried",async({page})=>{
 let denied=true;
 await page.route("**/api/crm/v1/customers/*/contact-details",route=>route.fulfill(denied?{status:403,json:{error:"This customer is not available within your access."}}:{json:{contacts:[]}}));
 await page.goto("/crm-next/customers");
 const section=page.locator('[class*="customer-contact-details_contact"]').first();const show=section.getByRole("button",{name:"Show contact details",exact:true});await show.click();
 await expect(section.getByRole("alert")).toContainText("within your access");
 denied=false;await show.click();await expect(section).toContainText("No phone number or email recorded.");
});

test("the live reveal endpoint honors the signed-in customer scope and disables caching",async({page})=>{
 await page.goto("/crm-next/customers");
 const link=page.locator('a[href^="/crm-next/customers/"]').first();await expect(link).toBeVisible();
 const href=await link.getAttribute("href"),id=decodeURIComponent(href!.split("/").pop()!.split("?")[0]);
 const response=await page.request.get(`/api/crm/v1/customers/${encodeURIComponent(id)}/contact-details`);
 expect(response.status()).toBe(200);expect(response.headers()["cache-control"]).toBe("private, no-store");
 const result=await response.json();expect(result.customerId).toBe(id);
 expect(result.contacts.every((item:{type:string;value:string})=>["PHONE","EMAIL"].includes(item.type)&&typeof item.value==="string")).toBe(true);
 expect(Object.keys(result).sort()).toEqual(["contacts","customerId"]);
});
