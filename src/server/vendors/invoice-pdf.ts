import { PDFDocument } from "pdf-lib";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { MAX_INVOICE_BATCH_PAGES, type InvoicePage } from "@/lib/vendor-invoice-batch";
import { VendorBillingError } from "@/lib/vendor-billing";

export async function loadInvoicePdf(bytes:Uint8Array) {
  let pdf:PDFDocument;
  try{pdf=await PDFDocument.load(bytes,{updateMetadata:false});}catch{throw new VendorBillingError("Choose a readable, unencrypted PDF invoice packet.");}
  if(pdf.getPageCount()>MAX_INVOICE_BATCH_PAGES)throw new VendorBillingError("Split packets larger than 24 pages into smaller files. No pages were imported.");
  return pdf;
}
export async function invoicePdfSubset(pdf:PDFDocument,pages:number[]) {
  if(!pages.length||pages.some((p,i)=>!Number.isInteger(p)||p<1||p>pdf.getPageCount()||(i>0&&p!==pages[i-1]+1)))throw new VendorBillingError("Choose a continuous, valid original page range.");
  const part=await PDFDocument.create({updateMetadata:false});
  for(const page of await part.copyPages(pdf,pages.map(p=>p-1)))part.addPage(page);
  return part.save();
}
export async function readInvoicePdfPages(bytes:Uint8Array,extract=extractDocumentText):Promise<InvoicePage[]> {
  const pdf=await loadInvoicePdf(bytes),pages:InvoicePage[]=[];
  for(let page=1;page<=pdf.getPageCount();page++){
    // Each extraction contains exactly one page: the shared OCR page cap cannot truncate this packet.
    const result=await extract({bytes:await invoicePdfSubset(pdf,[page]),contentType:"application/pdf",fileName:`invoice-page-${page}.pdf`});
    pages.push({page,text:result.text,readable:Boolean(result.text.trim())});
  }
  return pages;
}
