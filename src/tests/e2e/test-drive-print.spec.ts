import {test,expect,type Page} from "@playwright/test";
import {PDFDocument,StandardFonts} from "pdf-lib";
async function fixture(page:Page,verified=true){
 const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage().drawText("TEST DRIVE AGREEMENT - PRINT CHECK",{font});const bytes=await pdf.saveAsBase64();
 const facts={driverLicense:"A123-456-789-012",licenseState:"MN",licenseExpiration:"2028-01-01",licenseVerified:verified,driverPhone:"612-555-0100",salesperson:"Pat Employee",accompanyingEmployee:"Pat Employee",driveMode:"SUPERVISED",insuranceBasis:"DEALER_REVIEW",insuranceVerified:true,testDriveDate:"2026-11-03",startTime:"12:00",durationMinutes:"30",mileageAllowance:"20",departureMileage:"45000",fuelOut:"Full",departureCondition:"Good",approvedRoute:"Local route",vin:"1NXBR32E85Z123456",stockNumber:"123456",year:"2005",make:"Toyota",model:"Corolla",returnAt:"",returnMileage:"",returnCondition:"",fuelIn:"",receivedBy:"",keysReturned:false};
 const vehicle={id:"print-vehicle",label:"2005 Toyota Corolla",vin:facts.vin,stockNumber:facts.stockNumber,year:facts.year,make:facts.make,model:facts.model};
 let draft={id:"test-drive-print-fixture",dealNumber:1234,revision:1,customerId:"print-customer",customerName:"Print Driver",vehicleReference:vehicle.label,pathway:"test-drive",status:"IN_PROGRESS",updatedAt:new Date().toISOString(),snapshot:{"desk:form":{customerId:"print-customer",vehicle:vehicle.label,amount:"0"},"desk:identity":{customerId:"print-customer",vehicleId:vehicle.id,vehicle},"desk:workflowId":"test-drive","test-drive:facts":facts}};
 await page.route("**/api/coo-workbook/rhythm*",route=>route.fulfill({status:503,json:{error:"Isolated test"}}));
 await page.route("**/api/crm/v1/deal-identities*",route=>route.fulfill({json:{id:"print-customer",name:"Print Driver",customerNumber:"CUS-PRINT"}}));
 await page.route("**/api/crm/v1/deal-drafts*",async route=>{if(route.request().method()==="POST"){draft={...draft,...route.request().postDataJSON(),revision:draft.revision+1};await route.fulfill({json:draft});}else await route.fulfill({json:new URL(route.request().url()).searchParams.has("id")?draft:[draft]});});
 await page.route("**/api/crm/v1/contract-packets*",route=>route.request().method()==="POST"?route.fulfill({json:{packetId:"print-packet",packetNumber:"1234",documents:[{id:"print-doc",formId:"test-drive-agreement",label:"Test drive agreement",contentType:"application/pdf",contentBase64:bytes,downloadFileName:"test-drive-1234.pdf",html:"<html><body><h1>TEST DRIVE AGREEMENT</h1><p>Print Driver</p></body></html>"}]}}):route.fulfill({status:404,json:{error:"No prior packet"}}));
 return bytes;
}
test.beforeEach(async({context})=>{expect((await context.request.post("/api/auth/login",{data:{email:"morgan.manager@local.test",password:"dispatch123!"}})).ok()).toBeTruthy();});
async function open(page:Page,review=false){await page.goto("/crm-next/deals/start?draftId=test-drive-print-fixture"+(review?"&review=test-drive":""));await page.getByRole("tab",{name:"Terms & Payments",exact:true}).click();}
test("test-drive print opens a PDF blob with the agreement bytes instead of about:blank",async({page})=>{
 const bytes=await fixture(page);await open(page);
 await page.getByRole("button",{name:"Generate agreement",exact:true}).click();
 await expect(page.getByRole("button",{name:"Print agreement",exact:true})).toBeEnabled();
 const popupPromise=page.waitForEvent("popup");await page.getByRole("button",{name:"Print agreement",exact:true}).click();const popup=await popupPromise;
 await expect.poll(()=>popup.url()).toMatch(/^blob:/);
 const blob=await page.evaluate(async url=>{const response=await fetch(url);return {type:response.headers.get("content-type"),bytes:Array.from(new Uint8Array(await response.arrayBuffer()))};},popup.url());
 expect(blob.type).toBe("application/pdf");expect(Buffer.from(blob.bytes).toString("base64")).toBe(bytes);expect((await PDFDocument.load(new Uint8Array(blob.bytes))).getPageCount()).toBe(1);await popup.close();
});
test("valid license input points staff to the exact verification checkbox and clears after verification",async({page})=>{
 await fixture(page,false);await open(page);
 await expect(page.getByRole("alert").filter({hasText:'The license number is entered.'})).toBeVisible();
 await page.getByRole("button",{name:"Go to blocker",exact:true}).click();
 const check=page.getByRole("checkbox",{name:"Valid license verified",exact:true});await expect(check).toBeFocused();await check.check();
 await expect(page.getByText('The license number is entered.',{exact:false})).toHaveCount(0);
 await page.getByRole("button",{name:"Generate agreement",exact:true}).click();await expect(page.getByRole("button",{name:"Print agreement",exact:true})).toBeEnabled();
});

test("correction opens the driver panel when checks are collapsed",async({page})=>{
 await fixture(page,false);await open(page,true);
 await page.getByRole("button",{name:/Agreement and proof/}).click();
 await page.getByRole("button",{name:"Go to blocker",exact:true}).click();
 const check=page.getByRole("checkbox",{name:"Valid license verified",exact:true});
 await expect(check).toBeVisible();await expect(check).toBeFocused();
 await expect(page.getByLabel("Driver license",{exact:true})).toHaveValue("A123-456-789-012");
});
