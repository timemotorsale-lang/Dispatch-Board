import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { canAddVendorNote } from "./vendor-policy";
import { getVendorDocumentDownload } from "./vendor-service";
import { commandVendorBilling, readVendorBilling, requireVendorBillingUser, preparedInvoiceBatchNumber } from "./vendor-billing-service";
import { invoiceDocumentPdf, invoicePdfSubset, loadInvoicePdf, readInvoicePdfPages } from "./invoice-pdf";
import { billingText, VendorBillingError } from "@/lib/vendor-billing";
import { invoiceGroups } from "@/lib/vendor-invoice-batch";
let reading=false;
export async function receiveVendorInvoiceUpload(user:AuthenticatedUser|null,vendorId:string,file:File){
  requireVendorBillingUser(user);if(!canAddVendorNote(user))throw new VendorBillingError("Vendor document access is required.",403);
  if(!(file instanceof File)||!file.size||file.size>10*1024*1024)throw new VendorBillingError("Choose an invoice no larger than 10 MB.",413);
  const bytes=new Uint8Array(await file.arrayBuffer());await loadInvoicePdf(await invoiceDocumentPdf(bytes));
  return prisma.$transaction(async db=>{
    await db.$queryRaw`SELECT "id" FROM "Vendor" WHERE "organizationId"=${INITIAL_ORGANIZATION.id} AND "id"=${vendorId} FOR UPDATE`;
    const vendor=await db.vendor.findFirst({where:{id:vendorId,organizationId:INITIAL_ORGANIZATION.id,archivedAt:null}});if(!vendor)throw new VendorBillingError("Vendor not found.",404);
    if(vendor.status!=="ACTIVE")throw new VendorBillingError("Review this inactive vendor before invoice intake.",409);
    const prior=await db.vendorDocument.findFirst({where:{organizationId:INITIAL_ORGANIZATION.id,vendorId,fileData:Buffer.from(bytes)},select:{id:true,fileName:true}});if(prior)return {...prior,reused:true};
    const pdf=Buffer.from(bytes.subarray(0,5)).toString()==="%PDF-",document=await db.vendorDocument.create({data:{organizationId:INITIAL_ORGANIZATION.id,vendorId,title:file.name.slice(0,160),documentType:"GENERAL",fileName:file.name.slice(0,180),contentType:pdf?"application/pdf":bytes[0]===255?"image/jpeg":"image/png",fileData:Buffer.from(bytes),fileSizeBytes:bytes.length,uploadedByUserId:user.id},select:{id:true,fileName:true}});
    await db.vendorActivity.create({data:{organizationId:INITIAL_ORGANIZATION.id,vendorId,actorUserId:user.id,type:"DOCUMENT_UPLOADED",message:"Invoice source uploaded for automated intake review",metadata:{documentId:document.id}}});return {...document,reused:false};
  });
}
export async function processVendorInvoicePacket(user:AuthenticatedUser|null,vendorId:string,raw:Record<string,unknown>,save=false) {
  requireVendorBillingUser(user);
  if(!canAddVendorNote(user))throw new VendorBillingError("Vendor document access is required.",403);
  const batchId=billingText(raw.batchId,"Target batch",150,true),documentId=billingText(raw.documentId,"Uploaded document",150);
  const batch=batchId?await prisma.vendorInvoiceBatch.findFirst({where:{id:batchId,vendorId,organizationId:INITIAL_ORGANIZATION.id,status:"OPEN"}}):null;
  if(batchId&&!batch)throw new VendorBillingError("Select an open batch belonging to this vendor.",409);
  let original;
  try{original=await getVendorDocumentDownload(user,vendorId,documentId);}catch{throw new VendorBillingError("Uploaded document not found for this vendor.",404);}
  if(original.fileSizeBytes>10*1024*1024)throw new VendorBillingError("Choose an uploaded invoice no larger than 10 MB.");
  const bytes=await invoiceDocumentPdf(new Uint8Array(original.fileData));
  if(save){
    if(raw.reviewed!==true||raw.pagesConfirmed!==true)throw new VendorBillingError("Confirm the original page group and invoice fields before applying.");
    if(!batchId&&raw.autoCreateBatch!==true)throw new VendorBillingError("Confirm creation of the prepared intake batch.");
    const pdf=await loadInvoicePdf(bytes);
    const pages=raw.pages;
    if(!Array.isArray(pages)||!pages.length||pages.some(p=>typeof p!=="number"))throw new VendorBillingError("Check the original invoice page range.");
    const part=await invoicePdfSubset(pdf,pages);
    return commandVendorBilling(user,vendorId,{...raw,action:"CREATE_DOCUMENT",direction:"PAYABLE"},{bytes:part,fileName:`invoice-${pages[0]}-${pages[pages.length-1]}.pdf`,contentType:"application/pdf",batchId:batchId||undefined,autoCreateBatch:!batchId&&raw.autoCreateBatch===true,sourceDocumentId:documentId,pages});
  }
  if(reading)throw new VendorBillingError("Another invoice packet is being read. Retry shortly.",429);
  reading=true;
  try{
    const model=await readVendorBilling(user,vendorId),pages=await readInvoicePdfPages(bytes);
    const prepared=batch||await prisma.vendorInvoiceBatch.findFirst({where:{organizationId:INITIAL_ORGANIZATION.id,vendorId,batchNumber:preparedInvoiceBatchNumber(vendorId,documentId),status:"OPEN"}});
    const jobs=model.jobs.filter(job=>prepared&&job.batchId===prepared.id);
    return {pages,groups:invoiceGroups(pages,model.vendor.name,jobs),jobs,documents:model.documents,vendor:model.vendor,batch:batch?{id:batch.id,number:batch.batchNumber}:null,source:{id:documentId,fileName:original.fileName}};
  }finally{reading=false;}
}
