import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { commandVendorBilling, readVendorBilling } from "@/server/vendors/vendor-billing-service";
import { vendorBillingPrint } from "@/server/vendors/vendor-billing-print";
import { chicagoDate, monthlyDate } from "@/lib/vendor-billing";
import { createVendorRepository } from "@/server/vendors/vendor-repository";
import { openVendorInvoiceBatch, recordVendorWorkJob, getVendorInvoiceBatchJobs } from "@/server/vendors/vendor-service";
import type { AuthenticatedUser } from "@/server/auth/store";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { processVendorInvoicePacket, receiveVendorInvoiceUpload } from "@/server/vendors/invoice-batch-service";

const enabled=process.env.RUN_VENDOR_BILLING_DATABASE==="1";
const org="org-time-motor-sales",today=chicagoDate(),first=today.slice(0,7)+"-01";
const actor:AuthenticatedUser={id:"vendor-test-manager",name:"Billing Test Manager",email:"vendor-billing@example.test",isActive:true,roles:["General Manager"],duties:{direct:[],roleDefaults:[],all:[]}};
const staff={...actor,roles:["Salesperson"]};
const command=(vendorId:string,action:string,values:Record<string,unknown>={},user=actor)=>commandVendorBilling(user,vendorId,{action,commandKey:randomUUID(),...values});
async function partner(){return prisma.vendor.create({data:{organizationId:org,vendorNumber:randomUUID(),name:"Synthetic dual-role vendor",normalizedName:randomUUID(),category:"TIRE_VENDOR"}});}
async function draft(vendorId:string,direction="RECEIVABLE",amount="1000",extra:Record<string,unknown>={}){
 const number=randomUUID();const model=await command(vendorId,"CREATE_DOCUMENT",{direction,number,title:"Rent <script>unsafe</script>",issueDate:first,dueDate:first,tax:"0",sourceReference:"Synthetic original",lines:[{description:"Monthly obligation",amount}],...extra});
 return model.documents.find(d=>d.number===number)!;
}
async function post(vendorId:string,documentId:string,version=1){return command(vendorId,"POST_DOCUMENT",{documentId,version,reason:"Verified source and approved"});}

describe.skipIf(!enabled)("vendor billing isolated PostgreSQL workflows",()=>{
 it("prepares intake without a batch, reuses identical uploads, then atomically creates the reviewed batch/job/bill",async()=>{
  const v=await partner(),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),page=pdf.addPage();
  ["Invoice #: AUTO-100","Invoice Date: 2026-11-07","2020 TOYOTA CAMRY","Engine repair 100.00","Subtotal 100.00","Tax 8.00","Total 108.00"].forEach((text,index)=>page.drawText(text,{x:40,y:740-index*40,font,size:18}));
  const bytes=await pdf.save(),file=new File([Uint8Array.from(bytes).buffer],"intake.pdf",{type:"application/pdf"});
  const source=await receiveVendorInvoiceUpload(actor,v.id,file),again=await receiveVendorInvoiceUpload(actor,v.id,new File([Uint8Array.from(bytes).buffer],"renamed.pdf",{type:"application/pdf"}));
  expect(again.id).toBe(source.id);expect(again.reused).toBe(true);expect(await prisma.vendorDocument.count({where:{vendorId:v.id}})).toBe(1);
  const preview=await processVendorInvoicePacket(actor,v.id,{documentId:source.id,batchId:""}) as {groups:Array<{scan:{number:string;workTicketProposal:unknown}}>};expect(preview.groups[0].scan.number).toBe("AUTO-100");expect(preview.groups[0].scan.workTicketProposal).toBeTruthy();
  expect(await prisma.vendorInvoiceBatch.count({where:{vendorId:v.id}})).toBe(0);expect(await prisma.vendorWorkJob.count({where:{vendorId:v.id}})).toBe(0);
  const review={documentId:source.id,batchId:"",autoCreateBatch:true,pages:[1],pagesConfirmed:true,reviewed:true,commandKey:randomUUID(),number:"AUTO-100",title:"Engine repair",issueDate:"2026-11-07",dueDate:"2026-11-07",tax:"8.00",scannedTotal:"108.00",paymentTermsBasis:"REVIEW_POLICY",workTicketProposal:preview.groups[0].scan.workTicketProposal,lines:[{description:"Engine repair",amount:"100.00",workJobId:"__NEW_INVOICE_JOB__"}]};
  let model=await processVendorInvoicePacket(actor,v.id,review,true) as Awaited<ReturnType<typeof readVendorBilling>>;
  expect(model.documents[0]).toMatchObject({status:"DRAFT",amountCents:10800});expect(model.documents[0].batchId).toBeTruthy();expect(model.jobs).toHaveLength(1);expect(model.jobs[0]).toMatchObject({vehicle:"2020 TOYOTA CAMRY",amountCents:10000,status:"BATCHED",review:undefined});expect(model.documents[0].lines[0].workJobId).toBe(model.jobs[0].id);
  model=await processVendorInvoicePacket(actor,v.id,review,true) as typeof model;expect(model.jobs).toHaveLength(1);expect(await prisma.vendorInvoiceBatch.count({where:{vendorId:v.id}})).toBe(1);
  await expect(post(v.id,model.documents[0].id,model.documents[0].version)).rejects.toThrow("Review the approved amount");
  const other=await partner(),otherSource=await receiveVendorInvoiceUpload(actor,other.id,file);
  await expect(processVendorInvoicePacket(actor,other.id,{...review,documentId:otherSource.id,commandKey:randomUUID(),number:"ROLLBACK",tax:"7.00"},true)).rejects.toThrow("must match");
  expect(await prisma.vendorInvoiceBatch.count({where:{vendorId:other.id}})).toBe(0);expect(await prisma.vendorWorkJob.count({where:{vendorId:other.id}})).toBe(0);
 });
 it("applies original invoice pages to a batch atomically, survives retry, and preserves the link through draft edits",async()=>{
  const v=await partner(),batch=await prisma.vendorInvoiceBatch.create({data:{organizationId:org,vendorId:v.id,batchNumber:randomUUID(),title:"Synthetic invoice import",createdByUserId:actor.id}});
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);for(const number of ["A-100","B-200"]){const page=pdf.addPage();page.drawText(`Invoice #: ${number}`,{x:40,y:700,font,size:20});}
  const bytes=await pdf.save(),original=await prisma.vendorDocument.create({data:{organizationId:org,vendorId:v.id,title:"Original combined upload",documentType:"GENERAL",fileName:"combined.pdf",contentType:"application/pdf",fileSizeBytes:bytes.length,fileData:Buffer.from(bytes),uploadedByUserId:actor.id}});
  const raw={documentId:original.id,batchId:batch.id,pages:[1],pagesConfirmed:true,reviewed:true,commandKey:randomUUID(),number:"A-100",title:"Repair supplies",issueDate:first,dueDate:first,tax:"0",scannedTotal:"100.00",lines:[{description:"Supplies",amount:"100.00",workJobId:""}],unmatchedReason:"Non-vehicle supplies"};
  let model=await processVendorInvoicePacket(actor,v.id,raw,true) as Awaited<ReturnType<typeof readVendorBilling>>;
  expect(model.documents).toHaveLength(1);expect(model.documents[0]).toMatchObject({batchId:batch.id,status:"DRAFT",amountCents:10000});
  model=await processVendorInvoicePacket(actor,v.id,raw,true) as typeof model;expect(model.documents).toHaveLength(1);expect(await prisma.vendorDocument.count({where:{vendorId:v.id}})).toBe(2);
  await expect(processVendorInvoicePacket(actor,v.id,{...raw,commandKey:randomUUID(),number:"OVERLAP"},true)).rejects.toMatchObject({status:409});expect(await prisma.vendorDocument.count({where:{vendorId:v.id}})).toBe(2);
  const bill=model.documents[0];model=await command(v.id,"EDIT_DOCUMENT",{...raw,commandKey:randomUUID(),documentId:bill.id,sourceReference:"Corrected source description",direction:"PAYABLE",version:bill.version});expect(model.documents[0].batchId).toBe(batch.id);
  const unbatched=await prisma.vendorWorkJob.create({data:{organizationId:org,vendorId:v.id,jobNumber:randomUUID(),vehicleReference:"Other vehicle",workType:"Repair",serviceDate:new Date(first)}});
  await expect(command(v.id,"EDIT_DOCUMENT",{...raw,commandKey:randomUUID(),documentId:bill.id,sourceReference:"Incorrect ticket",direction:"PAYABLE",version:model.documents[0].version,lines:[{description:"Other repair",amount:"100.00",workJobId:unbatched.id}]})).rejects.toThrow("that batch's tickets");
  await expect(processVendorInvoicePacket(actor,v.id,{...raw,commandKey:randomUUID(),pages:[2],number:"B-200",scannedTotal:"200.00"},true)).rejects.toThrow("must match");expect(await prisma.vendorDocument.count({where:{vendorId:v.id}})).toBe(2);expect(await prisma.vendorBillingDocument.count({where:{vendorId:v.id}})).toBe(1);
  await prisma.vendorInvoiceBatch.update({where:{id:batch.id},data:{status:"CLOSED"}});await expect(processVendorInvoicePacket(actor,v.id,{...raw,pages:[2]},true)).rejects.toMatchObject({status:409});
  expect((await prisma.vendorDocument.findUniqueOrThrow({where:{id:original.id}})).documentType).toBe("GENERAL");
 });
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);if(!/^vendor_billing_it_[a-f0-9]{32}$/.test(url.searchParams.get("schema")||""))throw new Error("Isolated schema required");
  await prisma.organization.create({data:{id:org,code:"VENDOR-BILLING-TEST",name:"Isolated vendor test"}});
  await prisma.user.create({data:{id:actor.id,name:actor.name,email:actor.email,passwordHash:"not-a-login"}});
 });
 afterAll(()=>prisma.$disconnect());
 it("generates rent once, records repayment principal once, and protects imports",async()=>{
  const v=await partner();
  await command(v.id,"CREATE_AGREEMENT",{kind:"RENT",direction:"RECEIVABLE",title:"Monthly premises rent <script>unsafe</script>",amount:"1000",startDate:first,terms:"Synthetic lease 001"});
  expect((await readVendorBilling(actor,v.id)).missingRecurring).toHaveLength(1);
  let model=await command(v.id,"GENERATE_DUE",{through:today});expect(model.documents).toHaveLength(1);expect(model.summary.receivableCents).toBe(0);
  model=await command(v.id,"GENERATE_DUE",{through:today});expect(model.documents).toHaveLength(1);
  await post(v.id,model.documents[0].id);
  const repayment={kind:"REPAYMENT",direction:"RECEIVABLE",title:"Existing debt repayment",amount:"1200",principal:"5000",startDate:first,terms:"Synthetic original debt 001"};
  model=await command(v.id,"CREATE_AGREEMENT",repayment);
  const opening=model.documents.find(d=>d.kind==="OPENING_BALANCE")!;
  expect(opening.dueItems.map(i=>i.amountCents)).toEqual([120000,120000,120000,120000,20000]);
  expect(model.summary.receivableCents).toBe(600000);expect(model.summary.receivableDueCents).toBe(220000);
  await expect(command(v.id,"CREATE_AGREEMENT",repayment)).rejects.toThrow(/already exists/);
  model=await command(v.id,"GENERATE_DUE",{through:today});expect(model.documents).toHaveLength(2);expect(model.missingRecurring).toHaveLength(0);
  const statement=vendorBillingPrint(model,new URLSearchParams({from:first,through:today}));
  expect(statement).toContain("$6,000.00");expect(statement).not.toContain("<script>unsafe</script>");expect(vendorBillingPrint(model,new URLSearchParams({documentId:model.documents.find(d=>d.kind==="INVOICE")!.id}))).toContain("&lt;script&gt;");
 });
 it("requires work approval, supports partial batch bills, prevents overbilling and stale acceptance",async()=>{
  const v=await partner();const other=await partner();
  const vehicle=await prisma.vehicle.create({data:{organizationId:org,vehicleNumber:randomUUID(),make:"Toyota",model:"Camry"}});
  const job=await prisma.vendorWorkJob.create({data:{organizationId:org,vendorId:v.id,jobNumber:`TEST-${randomUUID()}`,vehicleReference:"Synthetic Toyota",workType:"Tires",serviceDate:new Date(first),amount:600}});
  const d=await draft(v.id,"PAYABLE","400",{lines:[{description:"Partial tire bill",amount:"400",workJobId:job.id}]});
  await expect(post(v.id,d.id)).rejects.toThrow(/Review the approved/);
  await command(v.id,"REVIEW_WORK",{workJobId:job.id,vehicleId:vehicle.id,approvedAmount:"600",evidenceReference:"Approved estimate and accepted tires",accepted:true});
  await post(v.id,d.id);
  const second=await draft(v.id,"PAYABLE","200",{lines:[{description:"Final tire bill",amount:"200",workJobId:job.id}]});await post(v.id,second.id);
  const excess=await draft(v.id,"PAYABLE","1",{lines:[{description:"Duplicate extra charge",amount:"1",workJobId:job.id}]});
  await expect(post(v.id,excess.id)).rejects.toThrow(/exceeds the approved/);
  await expect(draft(other.id,"PAYABLE","2",{lines:[{description:"Wrong vendor",amount:"2",workJobId:job.id}]})).rejects.toThrow(/belonging/);
  await prisma.vendorWorkJob.update({where:{id:job.id},data:{workDescription:"Unapproved new scope"}});
  await expect(post(v.id,excess.id)).rejects.toThrow(/Review the approved/);
  expect((await readVendorBilling(actor,v.id)).jobs[0].reviewCurrent).toBe(false);
  await expect(command(v.id,"PAYMENT",{confirmed:true,amount:"400",date:today,reference:"stale-work-payment",reason:"Actual payment",allocations:[{documentId:d.id,amount:"400"}]})).rejects.toThrow(/Review the approved/);
 });
 it("keeps both balances separate, requires approved offsets, and reverses immutably",async()=>{
  const v=await partner();const ar=await draft(v.id),ap=await draft(v.id,"PAYABLE","1400",{unmatchedReason:"Building maintenance, not vehicle work"});
  await post(v.id,ar.id);let model=await post(v.id,ap.id);expect(model.summary.receivableCents).toBe(100000);expect(model.summary.payableCents).toBe(140000);
  const allocations=[{documentId:ar.id,amount:"1000"},{documentId:ap.id,amount:"1000"}];
  await expect(command(v.id,"OFFSET",{amount:"1000",date:today,reference:"offset-1",reason:"Mutual written agreement",allocations})).rejects.toThrow(/Confirm the offset/);
  model=await command(v.id,"OFFSET",{agreed:true,amount:"1000",date:today,reference:"offset-1",reason:"Mutual written agreement",allocations});
  expect(model.summary.receivableCents).toBe(0);expect(model.summary.payableCents).toBe(40000);
  const payment={amount:"400",date:today,reference:"bank-400",reason:"Actual bank payment",allocations:[{documentId:ap.id,amount:"400"}]};
  await expect(command(v.id,"PAYMENT",payment)).rejects.toThrow(/actual payment/);
  model=await command(v.id,"PAYMENT",{...payment,confirmed:true});expect(model.summary.payableCents).toBe(0);
  const original=model.settlements.find(s=>s.kind==="PAYMENT")!;
  await command(v.id,"RECONCILE",{settlementId:original.id,reference:"Bank statement line 40"});
  await expect(command(v.id,"RECONCILE",{settlementId:original.id,reference:"Overwrite"})).rejects.toThrow(/already has/);
  model=await command(v.id,"REVERSE_SETTLEMENT",{settlementId:original.id,date:today,reference:"correction-1",reason:"Ledger correction"});
  expect(model.summary.payableCents).toBe(40000);expect(model.settlements.find(s=>s.id===original.id)?.reversed).toBe(true);
  await expect(command(v.id,"REVERSE_SETTLEMENT",{settlementId:original.id,date:today,reference:"correction-2",reason:"Double reversal"})).rejects.toThrow(/again/);
  expect(model.events.every(e=>e.actorName===actor.name)).toBe(true);
 });
 it("retains unapplied cash, allocates by actual date, and prevents duplicate receipts",async()=>{
  const v=await partner(),d=await draft(v.id,"RECEIVABLE","500");await post(v.id,d.id);
  const raw={action:"RECEIPT",commandKey:randomUUID(),confirmed:true,amount:"600",date:first,reference:"actual-bank-reference",reason:"Paid in advance",allocations:[]};
  let model=await commandVendorBilling(actor,v.id,raw);const s=model.settlements[0];
  model=await commandVendorBilling(actor,v.id,raw);expect(model.settlements).toHaveLength(1);
  await expect(commandVendorBilling(actor,v.id,{...raw,amount:"601"})).rejects.toThrow(/different details/);
  await expect(command(v.id,"RECEIPT",{...raw,commandKey:randomUUID()})).rejects.toThrow(/reference already exists/);
  model=await command(v.id,"APPLY_CASH",{settlementId:s.id,documentId:d.id,amount:"200",date:today});
  expect(model.summary.receivableCents).toBe(30000);expect(model.settlements[0].unappliedCents).toBe(40000);
  expect(model.settlements[0].allocations[0].effectiveDate.toISOString().slice(0,10)).toBe(today);
  await expect(command(v.id,"APPLY_CASH",{settlementId:s.id,documentId:d.id,amount:"301",date:today})).rejects.toThrow(/exceeds/);
  await expect(command(v.id,"RECEIPT",{confirmed:true,amount:"1",date:monthlyDate(today,1),reference:"future",reason:"not actual"})).rejects.toThrow(/future items/);
 });
 it("enforces permissions, duplicate invoice checks, disputes and concurrent balance protection",async()=>{
  const v=await partner();const d=await draft(v.id,"RECEIVABLE","500",{},);
  await expect(post(v.id,d.id,9)).rejects.toThrow(/changed/);
  await expect(command(v.id,"POST_DOCUMENT",{documentId:d.id,version:1,reason:"not allowed"},staff)).rejects.toThrow(/Manager/);
  await expect(commandVendorBilling(null,v.id,{action:"CREATE_DOCUMENT"})).rejects.toThrow(/Sign in/);
  await expect(draft(v.id,"RECEIVABLE","1",{number:d.number.toUpperCase()})).rejects.toThrow(/already exists/);
  await post(v.id,d.id);
  let model=await command(v.id,"DISPUTE_DOCUMENT",{documentId:d.id,version:2,reason:"Review charge"});
  await expect(command(v.id,"RECEIPT",{confirmed:true,amount:"1",date:today,reference:"disputed",reason:"test",allocations:[{documentId:d.id,amount:"1"}]})).rejects.toThrow(/Resolve the dispute/);
  model=await command(v.id,"RESOLVE_DISPUTE",{documentId:d.id,version:model.documents[0].version,reason:"Charge confirmed"});
  const results=await Promise.allSettled([1,2].map(n=>command(v.id,"RECEIPT",{confirmed:true,amount:"400",date:today,reference:`concurrent-${n}`,reason:"Actual receipt",allocations:[{documentId:d.id,amount:"400"}]})));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  model=await readVendorBilling(actor,v.id);expect(model.summary.receivableCents).toBe(10000);
  model=await command(v.id,"CREDIT",{amount:"100",date:today,reference:"credit-100",reason:"Approved adjustment",allocations:[{documentId:d.id,amount:"100"}]});
  expect(model.summary.receivableCents).toBe(0);expect(model.documents[0].amountCents).toBe(50000);
  await expect(command(v.id,"VOID_DRAFT",{documentId:d.id,version:model.documents[0].version,reason:"Delete posted"})).rejects.toThrow(/original terms/);
 });
 it("corrects drafts without changing identity and preserves a dated statement's opening balance",async()=>{
  const v=await partner();let d=await draft(v.id,"RECEIVABLE","100");
  let model=await command(v.id,"EDIT_DOCUMENT",{documentId:d.id,version:1,direction:d.direction,number:d.number,title:"Corrected rent",issueDate:first,dueDate:first,tax:"0",sourceReference:"Original corrected source",lines:[{description:"Correct rent",amount:"200"}]});
  d=model.documents[0];expect(d.version).toBe(2);expect(d.amountCents).toBe(20000);expect(d.lines).toHaveLength(1);expect(d.dueItems).toHaveLength(1);
  await expect(post(v.id,d.id,1)).rejects.toThrow(/changed/);await post(v.id,d.id,2);
  await expect(command(v.id,"EDIT_DOCUMENT",{documentId:d.id,version:3})).rejects.toThrow(/Only drafts/);
  const prior=monthlyDate(first,-1);
  await command(v.id,"RECEIPT",{confirmed:true,amount:"200",date:prior,reference:"prior-month-cash",reason:"Advance",allocations:[]});
  model=await readVendorBilling(actor,v.id);const payment=model.settlements[0];
  model=await command(v.id,"APPLY_CASH",{settlementId:payment.id,documentId:d.id,amount:"200",date:today});
  expect(model.settlements[0].allocations[0].effectiveDate.toISOString().slice(0,10)).toBe(today);
  const priorStatement=vendorBillingPrint(model,new URLSearchParams({from:prior,through:new Date(Date.parse(first)-86400000).toISOString().slice(0,10)}));
  expect(priorStatement).not.toContain("prior-month-cash</td>");expect(model.summary.receivableCents).toBe(0);
 });
 it("reserves distinct contiguous ticket ranges under concurrent batch entry",async()=>{
  const repository=createVendorRepository();
  const starts=await Promise.all(Array.from({length:12},()=>repository.getNextVendorJobNumber(org,5)));
  const numbers=starts.flatMap(start=>Array.from({length:5},(_,i)=>Number(start.slice(3))+i));
  expect(new Set(numbers).size).toBe(60);
 });
 it("keeps multiple open batches and each batch's tickets distinct",async()=>{
  const v=await partner();
  const a=await openVendorInvoiceBatch(actor,v.id,{title:"Batch A"}),b=await openVendorInvoiceBatch(actor,v.id,{title:"Batch B"});
  const batchA=a.vendor.invoiceBatches.find(x=>x.title==="Batch A")!,batchB=b.vendor.invoiceBatches.find(x=>x.title==="Batch B")!;
  expect(batchA.id).not.toBe(batchB.id);
  await recordVendorWorkJob(actor,v.id,{batchId:batchA.id,vehicleReference:"Vehicle A",workType:"Tire work",serviceDate:today,amount:"100"});
  await recordVendorWorkJob(actor,v.id,{batchId:batchB.id,vehicleReference:"Vehicle B",workType:"Tire work",serviceDate:today,amount:"200"});
  await expect(recordVendorWorkJob(actor,v.id,{vehicleReference:"Ambiguous",workType:"Tire work",serviceDate:today})).rejects.toThrow(/Choose an open batch/);
  const onlyA=await getVendorInvoiceBatchJobs(actor,v.id,batchA.id),onlyB=await getVendorInvoiceBatchJobs(actor,v.id,batchB.id);
  expect(onlyA.jobs.map(j=>j.vehicleReference)).toEqual(["Vehicle A"]);expect(onlyB.jobs.map(j=>j.vehicleReference)).toEqual(["Vehicle B"]);
  expect(onlyA.jobs[0].jobNumber).not.toBe(onlyB.jobs[0].jobNumber);
 });
});
