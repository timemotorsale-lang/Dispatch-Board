import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { canAddVendorNote } from "./vendor-policy";
import { getVendorDocumentDownload } from "./vendor-service";
import { commandVendorBilling, readVendorBilling, requireVendorBillingUser } from "./vendor-billing-service";
import { invoicePdfSubset, loadInvoicePdf, readInvoicePdfPages } from "./invoice-pdf";
import { billingText, VendorBillingError } from "@/lib/vendor-billing";
import { invoiceGroups } from "@/lib/vendor-invoice-batch";
let reading=false;
export async function processVendorInvoicePacket(user:AuthenticatedUser|null,vendorId:string,raw:Record<string,unknown>,save=false) {
  requireVendorBillingUser(user);
  if(!canAddVendorNote(user))throw new VendorBillingError("Vendor document access is required.",403);
  const batchId=billingText(raw.batchId,"Target batch",150),documentId=billingText(raw.documentId,"Uploaded document",150);
  const batch=await prisma.vendorInvoiceBatch.findFirst({where:{id:batchId,vendorId,organizationId:INITIAL_ORGANIZATION.id,status:"OPEN"}});
  if(!batch)throw new VendorBillingError("Select an open batch belonging to this vendor.",409);
  let original;
  try{original=await getVendorDocumentDownload(user,vendorId,documentId);}catch{throw new VendorBillingError("Uploaded document not found for this vendor.",404);}
  if(original.fileSizeBytes>10*1024*1024||Buffer.from(original.fileData).subarray(0,5).toString()!=="%PDF-")throw new VendorBillingError("Choose an uploaded PDF packet no larger than 10 MB.");
  const bytes=new Uint8Array(original.fileData);
  if(save){
    if(raw.reviewed!==true||raw.pagesConfirmed!==true)throw new VendorBillingError("Confirm the original page group and invoice fields before applying.");
    const pdf=await loadInvoicePdf(bytes);
    const pages=raw.pages;
    if(!Array.isArray(pages)||!pages.length||pages.some(p=>typeof p!=="number"))throw new VendorBillingError("Check the original invoice page range.");
    const part=await invoicePdfSubset(pdf,pages);
    return commandVendorBilling(user,vendorId,{...raw,action:"CREATE_DOCUMENT",direction:"PAYABLE"},{bytes:part,fileName:`invoice-${pages[0]}-${pages[pages.length-1]}.pdf`,contentType:"application/pdf",batchId,sourceDocumentId:documentId,pages});
  }
  if(reading)throw new VendorBillingError("Another invoice packet is being read. Retry shortly.",429);
  reading=true;
  try{
    const model=await readVendorBilling(user,vendorId),pages=await readInvoicePdfPages(bytes);
    const jobs=model.jobs.filter(job=>job.batchId===batchId);
    return {pages,groups:invoiceGroups(pages,model.vendor.name,jobs),jobs,documents:model.documents,vendor:model.vendor,batch:{id:batch.id,number:batch.batchNumber}};
  }finally{reading=false;}
}
