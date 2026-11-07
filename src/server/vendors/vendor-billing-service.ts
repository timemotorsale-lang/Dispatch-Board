import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { isManager } from "@/server/policies/access";
import { VendorBillingError, billingCents, billingDate, billingDirection, billingText, chicagoDate, dueBalances, monthlyDate, normalizeBillingLines, repaymentSchedule } from "@/lib/vendor-billing";
import { invoiceBatchMarker } from "@/lib/vendor-invoice-batch";

const organizationId = INITIAL_ORGANIZATION.id;
type Tx = Prisma.TransactionClient;
const date = (value: string) => new Date(value + "T00:00:00Z");
const iso = (value: Date) => value.toISOString().slice(0,10);
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
  return value;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export const preparedInvoiceBatchNumber=(vendorId:string,documentId:string)=>`VI-${hash({vendorId,source:documentId}).slice(0,14).toUpperCase()}`;
export function requireVendorBillingUser(user: AuthenticatedUser | null, manage = false): asserts user is AuthenticatedUser {
  if (!user) throw new VendorBillingError("Sign in to open vendor billing.",401);
  if (!user.isActive || (manage && !isManager(user))) throw new VendorBillingError("Manager permission is required for this financial action.",403);
}
const jobSnapshot = (job: { vehicleReference: string; workType: string; workDescription: string | null; serviceDate: Date; amount: Prisma.Decimal | null }) => ({ vehicleReference: job.vehicleReference, workType: job.workType, workDescription: job.workDescription, serviceDate: iso(job.serviceDate), amount: job.amount?.toString() ?? null });
async function vendor(db: Tx | typeof prisma, vendorId: string) {
  const result = await db.vendor.findFirst({ where: { id: vendorId, organizationId, archivedAt: null } });
  if (!result) throw new VendorBillingError("Vendor is not available in this organization.",404);
  return result;
}
async function invoice(db: Tx, vendorId: string, id: unknown, version?: unknown) {
  const document = await db.vendorBillingDocument.findFirst({ where: { id: billingText(id,"Invoice",150), organizationId, vendorId }, include: { lines: true, allocations: { include: { settlement: true } } } });
  if (!document) throw new VendorBillingError("Invoice not found for this vendor.",404);
  if (version !== undefined && document.version !== version) throw new VendorBillingError("This invoice changed. Refresh it before continuing.",409);
  return document;
}
const applied = (doc: { allocations: Array<{ amountCents: number }> }) => doc.allocations.reduce((sum,a) => sum + a.amountCents,0);
async function matchWork(db: Tx, vendorId: string, document: Awaited<ReturnType<typeof invoice>>) {
  if (document.direction !== "PAYABLE") return;
  for (const line of document.lines) {
    if (!line.workJobId) { if (!document.unmatchedReason) throw new VendorBillingError("Match repair lines to work tickets or record why this bill is not for vehicle work."); continue; }
    const job = await db.vendorWorkJob.findFirst({ where: { id: line.workJobId, organizationId, vendorId, status: { not: "CANCELLED" } } });
    const review = await db.vendorBillingWorkReview.findUnique({ where: { organizationId_vendorId_workJobId: { organizationId, vendorId, workJobId: line.workJobId } } });
    if (!job || !review?.accepted || hash(review.scopeSnapshot) !== hash(jobSnapshot(job))) throw new VendorBillingError("Review the approved amount, linked vehicle and accepted work/QC for each repair ticket before posting this bill.");
    const allLines = await db.vendorBillingLine.findMany({ where: { organizationId, vendorId, workJobId: job.id, document: { status: { in: ["POSTED","DISPUTED"] }, id: { not: document.id } } } });
    const current = document.lines.filter(l => l.workJobId === job.id).reduce((sum,l) => sum + l.amountCents,0);
    if (allLines.reduce((sum,l) => sum + l.amountCents,0) + current > review.approvedAmountCents) throw new VendorBillingError(`The billed total exceeds the approved work amount for ${job.jobNumber}. Review any supplement first.`);
  }
}
async function createDocument(db: Tx, vendorId: string, actorId: string, raw: Record<string, unknown>, extra: { agreementId?: string; periodKey?: string; kind?: string; status?: string } = {}, existing?: Awaited<ReturnType<typeof invoice>>) {
  const direction = billingDirection(raw.direction), lines = normalizeBillingLines(raw.lines), taxCents = billingCents(raw.tax || "0",true);
  const amountCents = lines.reduce((sum,line) => sum + line.amountCents,0) + taxCents;
  if (amountCents > 1000000000) throw new VendorBillingError("The total including tax exceeds $10,000,000.");
  const number = billingText(raw.number,"Invoice number",100), issueDate = billingDate(raw.issueDate), dueDate = billingDate(raw.dueDate);
  if (dueDate < issueDate) throw new VendorBillingError("The due date cannot be earlier than the invoice date.");
  for (const line of lines) if (line.workJobId && !await db.vendorWorkJob.findFirst({ where: { id: line.workJobId, organizationId, vendorId, status: { not: "CANCELLED" } } })) throw new VendorBillingError("Choose a work ticket belonging to this vendor.");
  const values = { direction, number, normalizedNumber: number.normalize("NFKC").replace(/\s+/g, "").toLocaleUpperCase("en-US"), title: billingText(raw.title,"Description",300), issueDate: date(issueDate), dueDate: date(dueDate), amountCents, taxCents, sourceReference: billingText(raw.sourceReference,"Agreement or original document reference",500), unmatchedReason: billingText(raw.unmatchedReason,"Non-work bill explanation",1000,true), };
  if (existing) {
    await db.vendorBillingLine.deleteMany({where:{organizationId,vendorId,documentId:existing.id}});
    await db.vendorBillingDueItem.deleteMany({where:{organizationId,vendorId,documentId:existing.id}});
  }
  const document = existing
    ? await db.vendorBillingDocument.update({where:{id:existing.id},data:{...values,version:{increment:1},lines:{create:lines}}})
    : await db.vendorBillingDocument.create({data:{organizationId,vendorId,...values,createdById:actorId,...extra,lines:{create:lines}}});
  if (extra.kind !== "OPENING_BALANCE") await db.vendorBillingDueItem.create({ data: { organizationId,vendorId,documentId:document.id,agreementId:existing?.agreementId||extra.agreementId,periodKey:existing?.periodKey||extra.periodKey || "invoice",dueDate:date(dueDate),amountCents } });
  return document;
}
export async function readVendorBilling(user: AuthenticatedUser | null, vendorId: string) {
  requireVendorBillingUser(user); const partner = await vendor(prisma,vendorId);
  const [documents,agreements,settlements,events,jobs,reviews,batchLinks] = await prisma.$transaction([
    prisma.vendorBillingDocument.findMany({ where:{ organizationId,vendorId }, include:{ lines:true,dueItems:{orderBy:{dueDate:"asc"}},allocations:true }, orderBy:{createdAt:"desc"} }),
    prisma.vendorBillingAgreement.findMany({where:{organizationId,vendorId},orderBy:{createdAt:"desc"}}),
    prisma.vendorBillingSettlement.findMany({where:{organizationId,vendorId},include:{allocations:true},orderBy:[{date:"desc"},{createdAt:"desc"}]}),
    prisma.vendorBillingEvent.findMany({where:{organizationId,vendorId},orderBy:{createdAt:"desc"},take:100}),
    prisma.vendorWorkJob.findMany({where:{organizationId,vendorId},include:{batch:{select:{batchNumber:true}}},orderBy:{serviceDate:"desc"}}),
    prisma.vendorBillingWorkReview.findMany({where:{organizationId,vendorId}}),
    prisma.vendorRecordLink.findMany({where:{organizationId,vendorId,recordType:"OTHER",relationshipType:{startsWith:"INVOICE_BATCH:"}},select:{recordId:true,relationshipType:true}})
  ],{isolationLevel:"RepeatableRead"});
  const rows = documents.map(doc => ({...doc,batchId:batchLinks.find(link=>link.recordId===doc.id)?.relationshipType.slice("INVOICE_BATCH:".length)||null,issueDate:iso(doc.issueDate),dueDate:iso(doc.dueDate),createdAt:doc.createdAt.toISOString(),appliedCents:applied(doc),balanceCents:doc.amountCents - applied(doc),dueItems:dueBalances(doc.dueItems.map(item => ({dueDate:iso(item.dueDate),amountCents:item.amountCents})),applied(doc))}));
  const today=chicagoDate();
  const missingRecurring: Array<{agreementId:string;title:string;dueDate:string;amountCents:number;direction:string}>=[];
  for(const a of agreements.filter(a=>a.active&&a.kind!=="REPAYMENT"))for(let n=0;n<600;n++){
    const dueDate=monthlyDate(iso(a.startDate),n);if(dueDate>today||(a.endDate&&dueDate>iso(a.endDate)))break;
    if(!documents.some(d=>d.agreementId===a.id&&d.periodKey===dueDate.slice(0,7)))missingRecurring.push({agreementId:a.id,title:a.title,dueDate,amountCents:a.amountCents,direction:a.direction});
  }
  const staff=await prisma.user.findMany({where:{id:{in:[...new Set(events.map(e=>e.actorId))]}},select:{id:true,name:true}});
  const posted=rows.filter(d=>["POSTED","DISPUTED"].includes(d.status));
  const balance=(direction:string)=>posted.filter(d=>d.direction===direction).reduce((sum,d)=>sum+d.balanceCents,0);
  const due=(direction:string)=>posted.filter(d=>d.direction===direction).flatMap(d=>d.dueItems).filter(i=>i.dueDate<=today).reduce((sum,i)=>sum+i.outstandingCents,0);
  return {vendor:{id:partner.id,name:partner.name,number:partner.vendorNumber,address:partner.addressSummary,email:partner.primaryEmail},today,canManage:isManager(user),documents:rows,agreements:agreements.map(a=>({...a,startDate:iso(a.startDate),endDate:a.endDate?iso(a.endDate):null})),settlements:settlements.map(s=>({...s,date:iso(s.date),reversed:settlements.some(r=>r.reversalOfId===s.id),unappliedCents:["RECEIPT","PAYMENT"].includes(s.kind) && !settlements.some(r=>r.reversalOfId===s.id)?s.amountCents-s.allocations.reduce((sum,a)=>sum+a.amountCents,0):0})),events:events.map(e=>({...e,actorName:staff.find(u=>u.id===e.actorId)?.name||"Former staff"})),missingRecurring,jobs:jobs.map(job=>({id:job.id,number:job.jobNumber,vehicle:job.vehicleReference,description:job.workDescription||job.workType,batch:job.batch?.batchNumber||"Unbatched",batchId:job.batchId,serviceDate:iso(job.serviceDate),amountCents:job.amount?Math.round(Number(job.amount)*100):null,status:job.status,review:reviews.find(r=>r.workJobId===job.id),reviewCurrent:reviews.some(r=>r.workJobId===job.id&&hash(r.scopeSnapshot)===hash(jobSnapshot(job)))})),summary:{receivableCents:balance("RECEIVABLE"),payableCents:balance("PAYABLE"),receivableDueCents:due("RECEIVABLE"),payableDueCents:due("PAYABLE"),draftCount:rows.filter(d=>d.status==="DRAFT").length,disputedCount:rows.filter(d=>d.status==="DISPUTED").length,unmatchedWork:jobs.filter(j=>j.status!=="CANCELLED"&&!reviews.some(r=>r.workJobId===j.id&&r.accepted&&hash(r.scopeSnapshot)===hash(jobSnapshot(j)))).length},templateVersion:1};
}
export type ScannedInvoiceSource = { bytes: Uint8Array; fileName: string; contentType: string; batchId?:string; autoCreateBatch?:boolean; sourceDocumentId?:string; pages?:number[] };
export async function commandVendorBilling(user: AuthenticatedUser | null,vendorId:string,raw:Record<string,unknown>,source?:ScannedInvoiceSource) {
  const action=billingText(raw.action,"Action",40); requireVendorBillingUser(user,action!=="CREATE_DOCUMENT");
  if(source && (action!=="CREATE_DOCUMENT" || raw.direction!=="PAYABLE"))throw new VendorBillingError("Scans create received invoice drafts only.");
  const sourceHash=source?createHash("sha256").update(source.bytes).digest("hex"):null;
  const commandKey=billingText(raw.commandKey,"Request reference",100), requestHash=hash(source?{...raw,sourceHash,fileName:source!.fileName,contentType:source!.contentType,batchId:source.batchId||null,autoCreateBatch:source.autoCreateBatch||false,sourceDocumentId:source.sourceDocumentId||null,pages:source.pages||null}:raw);
  if(!/^[\w-]{8,100}$/.test(commandKey)) throw new VendorBillingError("Refresh the request reference before retrying.");
  try {
    await prisma.$transaction(async db=>{
      await db.$queryRaw(Prisma.sql`SELECT "id" FROM "Vendor" WHERE "organizationId"=${organizationId} AND "id"=${vendorId} FOR UPDATE`);
      const partner=await vendor(db,vendorId);
      const replay=await db.vendorBillingEvent.findUnique({where:{organizationId_vendorId_commandKey:{organizationId,vendorId,commandKey}}});
      if(replay){if(replay.requestHash!==requestHash)throw new VendorBillingError("This request reference was already used for different details.",409);return;}
      if(["INACTIVE","DO_NOT_USE"].includes(partner.status) && ["CREATE_DOCUMENT","CREATE_AGREEMENT","GENERATE_DUE","POST_DOCUMENT"].includes(action)) throw new VendorBillingError("Review this inactive or blocked vendor before creating new billing obligations.",409);
      let detail:unknown;
      if(action==="CREATE_DOCUMENT") {
        let values=raw;
        let importedBatchId=source?.batchId,preparedJobId:string|undefined;
        if(source){
          if(raw.taxBasis==="CALCULATED_REVIEW"&&raw.calculatedTaxConfirmed!==true)throw new VendorBillingError("Verify the calculated tax candidate against the original invoice before applying.");
          const reviewedTotal=billingCents(raw.scannedTotal);
          if(normalizeBillingLines(raw.lines).reduce((sum,line)=>sum+line.amountCents,0)+billingCents(raw.tax,true)!==reviewedTotal)throw new VendorBillingError("Invoice lines and tax must match the reviewed invoice total.");
          let notes=`Invoice scan SHA256: ${sourceHash}`;
          if(await db.vendorDocument.findFirst({where:{organizationId,vendorId,notes:{startsWith:notes}}}))throw new VendorBillingError("This exact invoice file was already received. Review the existing bill before importing again.",409);
          if(source.autoCreateBatch){
            if(!source.sourceDocumentId)throw new VendorBillingError("An original uploaded packet is required to prepare a batch.");
            const batchNumber=preparedInvoiceBatchNumber(vendorId,source.sourceDocumentId);
            const prior=await db.vendorInvoiceBatch.findFirst({where:{organizationId,vendorId,batchNumber}});
            const prepared=prior||await db.vendorInvoiceBatch.create({data:{organizationId,vendorId,batchNumber,title:`Invoice intake · ${partner.name}`.slice(0,160),createdByUserId:user.id}});
            if(prepared.status!=="OPEN")throw new VendorBillingError("The prepared intake batch is closed. Select an open batch explicitly.",409);
            importedBatchId=prepared.id;
          }
          if(importedBatchId){
            const batch=await db.vendorInvoiceBatch.findFirst({where:{id:importedBatchId,organizationId,vendorId,status:"OPEN"}});
            if(!batch)throw new VendorBillingError("The target batch is no longer open for this vendor.",409);
            if(raw.workTicketProposal&&typeof raw.workTicketProposal==="object"&&normalizeBillingLines(raw.lines).some(l=>l.workJobId==="__NEW_INVOICE_JOB__")){
              const proposal=raw.workTicketProposal as Record<string,unknown>;
              const vehicleReference=billingText(proposal.vehicleReference,"Printed vehicle reference",160),serviceDate=billingDate(proposal.serviceDate);
              if(await db.vendorWorkJob.findFirst({where:{organizationId,vendorId,batchId:batch.id,vehicleReference,status:{not:"CANCELLED"}}}))throw new VendorBillingError("This batch already has a ticket for that vehicle reference. Refresh and select the existing ticket.",409);
              const job=await db.vendorWorkJob.create({data:{organizationId,vendorId,batchId:batch.id,jobNumber:`VJ-I-${hash({vendorId,number:raw.number,source:source.sourceDocumentId,pages:source.pages}).slice(0,14).toUpperCase()}`,vehicleReference,workType:billingText(proposal.workType,"Work category",80),workDescription:billingText(proposal.workDescription,"Work description",500),serviceDate:date(serviceDate),amount:normalizeBillingLines(raw.lines).filter(l=>l.workJobId==="__NEW_INVOICE_JOB__").reduce((sum,l)=>sum+l.amountCents,0)/100,status:"BATCHED",notes:`Prepared from reviewed invoice ${String(raw.number)}; original ${source.sourceDocumentId}. Inventory identity, approved estimate and accepted-work/QC remain unverified.`,createdByUserId:user.id}});
              preparedJobId=job.id;
              values={...raw,lines:(raw.lines as Array<Record<string,unknown>>).map(l=>l.workJobId==="__NEW_INVOICE_JOB__"?{...l,workJobId:job.id}:l)};
            }
            for(const line of normalizeBillingLines(values.lines))if(line.workJobId&&!await db.vendorWorkJob.findFirst({where:{id:line.workJobId,organizationId,vendorId,batchId:batch.id,status:{not:"CANCELLED"}}}))throw new VendorBillingError("Match work lines to tickets in the selected batch; no tickets have been moved.");
            if(!source.sourceDocumentId||!source.pages?.length)throw new VendorBillingError("Original uploaded pages are required for batch imports.");
            const imports=await db.vendorDocument.findMany({where:{organizationId,vendorId,notes:{contains:JSON.stringify({sourceDocumentId:source.sourceDocumentId}).slice(1,-1)}},select:{notes:true}});
            for(const imported of imports){let metadata;try{metadata=JSON.parse(imported.notes?.split("\n")[1]||"{}");}catch{continue;}if(metadata.sourceDocumentId===source.sourceDocumentId&&Array.isArray(metadata.pages)&&metadata.pages.some((p:number)=>source.pages!.includes(p)))throw new VendorBillingError("These original pages were already imported. Review the existing draft instead of importing them again.",409);}
            notes+=`\n${JSON.stringify({sourceDocumentId:source.sourceDocumentId,pages:source.pages,batchId:batch.id,paymentTermsBasis:billingText(raw.paymentTermsBasis||"DOCUMENT_OR_STAFF","Payment terms basis",60),taxBasis:billingText(raw.taxBasis||"DOCUMENT_OR_STAFF","Tax review basis",60)})}`;
          }
          const original=await db.vendorDocument.create({data:{organizationId,vendorId,uploadedByUserId:user.id,title:billingText(raw.number,"Invoice number",100),documentType:"BILL_STATEMENT",fileName:source.fileName,contentType:source.contentType,fileSizeBytes:source.bytes.length,fileData:Buffer.from(source.bytes),notes}});
          values={...values,sourceReference:`Vendor document ${original.id}: ${original.title}${importedBatchId?` ${invoiceBatchMarker(importedBatchId)} Source:${source.sourceDocumentId} Pages:${source.pages!.join(",")}`:""}`};
        }
        const created=await createDocument(db,vendorId,user.id,values);
        if(importedBatchId)await db.vendorRecordLink.create({data:{organizationId,vendorId,recordType:"OTHER",recordId:created.id,relationshipType:`INVOICE_BATCH:${importedBatchId}`,labelSnapshot:`Invoice ${String(raw.number)} · batch ${importedBatchId}`,createdByUserId:user.id}});
        detail={...created,...(preparedJobId?{preparedJobId}:{}),...(importedBatchId?{batchId:importedBatchId}:{})};
      }
      else if(action==="EDIT_DOCUMENT"){
        if(!Number.isInteger(raw.version))throw new VendorBillingError("Refresh the invoice version.",409);
        const before=await invoice(db,vendorId,raw.documentId,raw.version);
        if(before.status!=="DRAFT")throw new VendorBillingError("Only drafts can be edited. Posted invoices require an adjustment.",409);
        if(raw.direction!==before.direction)throw new VendorBillingError("The billing direction cannot change on an existing draft.");
        const batchLink=await db.vendorRecordLink.findFirst({where:{organizationId,vendorId,recordType:"OTHER",recordId:before.id,relationshipType:{startsWith:"INVOICE_BATCH:"}}});
        if(batchLink)for(const line of normalizeBillingLines(raw.lines))if(line.workJobId&&!await db.vendorWorkJob.findFirst({where:{id:line.workJobId,organizationId,vendorId,batchId:batchLink.relationshipType.slice("INVOICE_BATCH:".length),status:{not:"CANCELLED"}}}))throw new VendorBillingError("This invoice belongs to a batch. Match edited work lines to that batch's tickets.");
        detail={before,after:await createDocument(db,vendorId,user.id,raw,{},before)};
      } else if(["POST_DOCUMENT","DISPUTE_DOCUMENT","RESOLVE_DISPUTE","VOID_DRAFT"].includes(action)){
        if(!Number.isInteger(raw.version))throw new VendorBillingError("Refresh the invoice version.",409);
        const doc=await invoice(db,vendorId,raw.documentId,raw.version);
        const reason=billingText(raw.reason,"Review note",1000);
        if(action==="POST_DOCUMENT") {if(doc.status!=="DRAFT")throw new VendorBillingError("Only a draft can be approved and posted.",409);await matchWork(db,vendorId,doc);}
        if(action==="DISPUTE_DOCUMENT"&&doc.status!=="POSTED")throw new VendorBillingError("Choose a posted invoice to dispute.",409);
        if(action==="RESOLVE_DISPUTE"&&doc.status!=="DISPUTED")throw new VendorBillingError("This invoice has no open dispute.",409);
        if(action==="VOID_DRAFT"&&doc.status!=="DRAFT")throw new VendorBillingError("Posted invoices require a credit or adjustment; their original terms are retained.",409);
        detail=await db.vendorBillingDocument.update({where:{id:doc.id},data:{status:action==="VOID_DRAFT"?"VOID":action==="DISPUTE_DOCUMENT"?"DISPUTED":"POSTED",disputeReason:action==="DISPUTE_DOCUMENT"?reason:"",approvedById:user.id,version:{increment:1}}});
      } else if(action==="REVIEW_WORK"){
        const job=await db.vendorWorkJob.findFirst({where:{id:billingText(raw.workJobId,"Work ticket",150),organizationId,vendorId,status:{not:"CANCELLED"}}});
        const vehicle=await db.vehicle.findFirst({where:{id:billingText(raw.vehicleId,"Canonical vehicle ID",150),organizationId}});
        if(!job||!vehicle)throw new VendorBillingError("Choose this vendor's work ticket and a shared vehicle from this organization.");
        const repairOrderId=billingText(raw.repairOrderId,"Repair order",150,true)||null;
        if(repairOrderId&&!await db.repairOrder.findFirst({where:{id:repairOrderId,organizationId,vehicleId:vehicle.id}}))throw new VendorBillingError("The repair order must belong to the selected vehicle.");
        const approvedAmountCents=billingCents(raw.approvedAmount),evidenceReference=billingText(raw.evidenceReference,"Approval / accepted-work evidence",1000);
        if(typeof raw.accepted!=="boolean")throw new VendorBillingError("Choose whether the actual work passed acceptance/QC.");
        const values={vehicleId:vehicle.id,repairOrderId,approvedAmountCents,accepted:raw.accepted,evidenceReference,scopeSnapshot:jobSnapshot(job),reviewedById:user.id,reviewedAt:new Date()};
        detail=await db.vendorBillingWorkReview.upsert({where:{organizationId_vendorId_workJobId:{organizationId,vendorId,workJobId:job.id}},create:{organizationId,vendorId,workJobId:job.id,...values},update:{...values,version:{increment:1}}});
      } else if(action==="CREATE_AGREEMENT"){
        const kind=billingText(raw.kind,"Agreement type",30);if(!["RENT","SERVICE","REPAYMENT"].includes(kind))throw new VendorBillingError("Choose rent, recurring service, or repayment of an existing balance.");
        const amountCents=billingCents(raw.amount),startDate=billingDate(raw.startDate),endDate=raw.endDate?billingDate(raw.endDate):null;
        if(endDate&&endDate<startDate)throw new VendorBillingError("The agreement end date cannot precede its start.");
        if(await db.vendorBillingAgreement.findFirst({where:{organizationId,vendorId,kind,terms:billingText(raw.terms,"Agreement / source terms",1500)}}))throw new VendorBillingError("An agreement with this source reference and terms already exists. Review it before importing another balance or schedule.",409);
        const principalCents=kind==="REPAYMENT"?billingCents(raw.principal):null;
        const schedule=principalCents?repaymentSchedule(startDate,principalCents,amountCents):[];
        const agreement=await db.vendorBillingAgreement.create({data:{organizationId,vendorId,direction:billingDirection(raw.direction),kind,title:billingText(raw.title,"Agreement title",300),amountCents,principalCents,startDate:date(startDate),endDate:endDate?date(endDate):null,ownerUserId:user.id,terms:billingText(raw.terms,"Agreement / source terms",1500)}});
        if(principalCents){
          const opening=await createDocument(db,vendorId,user.id,{direction:agreement.direction,number:`OPEN-${agreement.id}`,title:agreement.title,issueDate:startDate,dueDate:startDate,sourceReference:agreement.terms,lines:[{description:"Existing principal - not a new recurring charge",amount:(principalCents/100).toFixed(2)}]}, {agreementId:agreement.id,periodKey:"opening",kind:"OPENING_BALANCE",status:"POSTED"});
          await db.vendorBillingDueItem.createMany({data:schedule.map(item=>({organizationId,vendorId,documentId:opening.id,agreementId:agreement.id,periodKey:item.periodKey,dueDate:date(item.dueDate),amountCents:item.amountCents}))});
        }
        detail=agreement;
      } else if(action==="SET_AGREEMENT_ACTIVE"){
        const agreement=await db.vendorBillingAgreement.findFirst({where:{id:billingText(raw.agreementId,"Agreement",150),organizationId,vendorId}});
        if(!agreement||agreement.version!==raw.version)throw new VendorBillingError("Refresh the agreement before changing it.",409);
        if(typeof raw.active!=="boolean")throw new VendorBillingError("Choose pause or resume.");
        detail={reason:billingText(raw.reason,"Pause / resume reason",1000),agreement:await db.vendorBillingAgreement.update({where:{id:agreement.id},data:{active:raw.active,version:{increment:1}}})};
      } else if(action==="GENERATE_DUE"){
        const through=billingDate(raw.through),agreements=await db.vendorBillingAgreement.findMany({where:{organizationId,vendorId,active:true,kind:{in:["RENT","SERVICE"]}}});
        const ids:string[]=[];
        for(const a of agreements){
          let n=0;
          for(;n<600;n++){
            const due=monthlyDate(iso(a.startDate),n);if(due>through||(a.endDate&&due>iso(a.endDate)))break;
            const periodKey=due.slice(0,7);
            if(await db.vendorBillingDocument.findUnique({where:{agreementId_periodKey:{agreementId:a.id,periodKey}}}))continue;
            if(ids.length>=100)throw new VendorBillingError("Generate a smaller date range; at most 100 due invoices can be created per request.");
            const d=await createDocument(db,vendorId,user.id,{direction:a.direction,number:`REC-${a.id}-${periodKey}`,title:`${a.title} / ${periodKey}`,issueDate:due,dueDate:due,sourceReference:a.terms,unmatchedReason:"Recurring agreement, not a vehicle repair bill",lines:[{description:a.title,amount:(a.amountCents/100).toFixed(2)}]}, {agreementId:a.id,periodKey});ids.push(d.id);
          }
          if(n===600)throw new VendorBillingError("Review this agreement; recurring generation is limited to 600 months.");
        }
        detail={through,createdInvoiceIds:ids};
      } else if(["RECEIPT","PAYMENT","OFFSET","CREDIT"].includes(action)){
        if(["RECEIPT","PAYMENT"].includes(action)&&raw.confirmed!==true)throw new VendorBillingError("Confirm that this actual payment occurred before recording it.");
        const amountCents=billingCents(raw.amount),reference=billingText(raw.reference,"Payment / agreement reference",300),reason=billingText(raw.reason,"Payment / adjustment note",1000),effectiveDate=billingDate(raw.date);
        const existingReference=await db.vendorBillingSettlement.findFirst({where:{organizationId,vendorId,kind:action,reference:{equals:reference,mode:"insensitive"}}});
        if(existingReference)throw new VendorBillingError("This payment or adjustment reference already exists. Review the original before recording another.",409);
        if(effectiveDate>chicagoDate())throw new VendorBillingError("Record actual payments and offsets on or before today; future items belong in a schedule.");
        const allocations=Array.isArray(raw.allocations)?raw.allocations as Array<Record<string,unknown>>:[];
        if(allocations.length>100)throw new VendorBillingError("Apply at most 100 invoices at a time.");
        const seen=new Set<string>(),rows:Array<{documentId:string;amountCents:number;direction:string}>=[];
        for(const item of allocations){const doc=await invoice(db,vendorId,item.documentId);if(seen.has(doc.id))throw new VendorBillingError("Select each invoice only once.");seen.add(doc.id);
          if(doc.status!=="POSTED"&&!(action==="CREDIT"&&doc.status==="DISPUTED"))throw new VendorBillingError("Resolve the dispute and approve the invoice before allocating money or offsetting it.");
          if(["PAYMENT","OFFSET"].includes(action)&&doc.direction==="PAYABLE")await matchWork(db,vendorId,doc);
          if(action==="RECEIPT"&&doc.direction!=="RECEIVABLE"||action==="PAYMENT"&&doc.direction!=="PAYABLE")throw new VendorBillingError("The payment direction does not match this invoice.");
          if(effectiveDate<iso(doc.issueDate))throw new VendorBillingError("A payment before invoice issue must be recorded as unapplied cash first.");
          const amount=billingCents(item.amount);if(amount>doc.amountCents-applied(doc))throw new VendorBillingError("The allocation exceeds the invoice's outstanding balance.",409);
          rows.push({documentId:doc.id,amountCents:amount,direction:doc.direction});
        }
        const sum=(direction?:string)=>rows.filter(r=>!direction||r.direction===direction).reduce((total,r)=>total+r.amountCents,0);
        if(action==="OFFSET"){if(raw.agreed!==true||sum("RECEIVABLE")!==amountCents||sum("PAYABLE")!==amountCents)throw new VendorBillingError("Confirm the offset agreement and select equal amounts owed in each direction.");}
        else if(action==="CREDIT"&&new Set(rows.map(r=>r.direction)).size>1)throw new VendorBillingError("Apply one credit to a single billing direction.");
        else if(sum()>amountCents||(action==="CREDIT"&&(!rows.length||sum()!==amountCents)))throw new VendorBillingError("Check the allocation total; a credit must be fully applied.");
        const settlement=await db.vendorBillingSettlement.create({data:{organizationId,vendorId,kind:action,date:date(effectiveDate),amountCents,reference,reason,createdById:user.id,allocations:{create:rows.map(({documentId,amountCents})=>({documentId,amountCents,effectiveDate:date(effectiveDate)}))}}});
        detail=settlement;
      } else if(action==="APPLY_CASH"){
        const settlement=await db.vendorBillingSettlement.findFirst({where:{id:billingText(raw.settlementId,"Payment record",150),organizationId,vendorId,kind:{in:["RECEIPT","PAYMENT"]}},include:{allocations:true}});
        if(!settlement||await db.vendorBillingSettlement.findUnique({where:{reversalOfId:settlement.id}}))throw new VendorBillingError("Choose a payment record that has not been reversed.");
        const doc=await invoice(db,vendorId,raw.documentId),amountCents=billingCents(raw.amount);
        if(doc.status!=="POSTED"||doc.direction!==(settlement.kind==="RECEIPT"?"RECEIVABLE":"PAYABLE"))throw new VendorBillingError("Choose an approved invoice matching this payment direction.");
        if(settlement.kind==="PAYMENT")await matchWork(db,vendorId,doc);
        if(amountCents>settlement.amountCents-settlement.allocations.reduce((s,a)=>s+a.amountCents,0)||amountCents>doc.amountCents-applied(doc))throw new VendorBillingError("The allocation exceeds available payment or invoice balance.",409);
        const allocationDate=billingDate(raw.date);
        if(allocationDate>chicagoDate()||allocationDate<iso(doc.issueDate)||allocationDate<iso(settlement.date))throw new VendorBillingError("Use an allocation date between the invoice/payment dates and today.");
        await db.vendorBillingAllocation.create({data:{organizationId,vendorId,settlementId:settlement.id,documentId:doc.id,amountCents,effectiveDate:date(allocationDate)}});
        detail={settlementId:settlement.id,documentId:doc.id,amountCents};
      } else if(action==="REVERSE_SETTLEMENT"){
        const original=await db.vendorBillingSettlement.findFirst({where:{id:billingText(raw.settlementId,"Payment record",150),organizationId,vendorId},include:{allocations:true}});
        if(!original||original.kind==="REVERSAL"||await db.vendorBillingSettlement.findUnique({where:{reversalOfId:original.id}}))throw new VendorBillingError("This payment record cannot be reversed again.",409);
        const reversalDate=billingDate(raw.date);
        if(reversalDate>chicagoDate()||reversalDate<iso(original.date)||original.allocations.some(a=>iso(a.effectiveDate)>reversalDate))throw new VendorBillingError("Use a reversal date on or after the original payment and allocations, and no later than today.");
        detail=await db.vendorBillingSettlement.create({data:{organizationId,vendorId,kind:"REVERSAL",date:date(reversalDate),amountCents:original.amountCents,reference:billingText(raw.reference,"Reversal reference",300),reason:billingText(raw.reason,"Reversal reason",1000),createdById:user.id,reversalOfId:original.id,allocations:{create:original.allocations.map(a=>({documentId:a.documentId,amountCents:-a.amountCents,effectiveDate:date(reversalDate)}))}}});
      } else if(action==="RECONCILE"){
        const original=await db.vendorBillingSettlement.findFirst({where:{id:billingText(raw.settlementId,"Payment record",150),organizationId,vendorId}});
        if(!original||!["RECEIPT","PAYMENT"].includes(original.kind)||await db.vendorBillingSettlement.findUnique({where:{reversalOfId:original.id}}))throw new VendorBillingError("Only an unreversed receipt or payment can be reconciled to bank evidence.");
        if(original.reconciledAt)throw new VendorBillingError("This payment already has reconciliation evidence. Review its history before correcting it.",409);
        detail=await db.vendorBillingSettlement.update({where:{id:original.id},data:{reconciledAt:new Date(),reconciliationReference:billingText(raw.reference,"Bank statement evidence",500)}});
      } else throw new VendorBillingError("Choose a supported vendor billing action.");
      await db.vendorBillingEvent.create({data:{organizationId,vendorId,commandKey,requestHash,action,actorId:user.id,detail:JSON.parse(JSON.stringify(detail)) as Prisma.InputJsonValue}});
    },{isolationLevel:"Serializable",maxWait:10000,timeout:20000});
  }catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")throw new VendorBillingError("This invoice number or request already exists. Refresh before retrying.",409);if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2034")throw new VendorBillingError("Another financial action completed at the same time. Retry this same request.",409);throw error;}
  return readVendorBilling(user,vendorId);
}
