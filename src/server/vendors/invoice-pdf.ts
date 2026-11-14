import { PDFDocument } from "pdf-lib";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { MAX_INVOICE_BATCH_PAGES, type InvoicePage } from "@/lib/vendor-invoice-batch";
import { VendorBillingError } from "@/lib/vendor-billing";
import { parseVendorInvoice } from "@/lib/vendor-invoice-scan";
export async function invoiceDocumentPdf(bytes:Uint8Array) {
  if(Buffer.from(bytes.subarray(0,5)).toString()==="%PDF-")return bytes;
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,png=Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(!jpeg&&!png)throw new VendorBillingError("Choose a PDF, JPEG or PNG invoice.");
  try{const pdf=await PDFDocument.create({updateMetadata:false}),image=jpeg?await pdf.embedJpg(bytes):await pdf.embedPng(bytes);pdf.addPage([image.width,image.height]).drawImage(image,{x:0,y:0,width:image.width,height:image.height});return await pdf.save();}catch{throw new VendorBillingError("This invoice image could not be read. Choose a clear photo or PDF.");}
}

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
    const input={bytes:await invoicePdfSubset(pdf,[page]),contentType:"application/pdf",fileName:`invoice-page-${page}.pdf`};
    let result=await extract(input);
    if(extract===extractDocumentText&&result.method==="OCR_TEXT"){
      const scan=parseVendorInvoice(result.text,"");
      if(!scan.number||!scan.tax||!scan.total||!scan.issueDate){
        const retry=await extractDocumentText(input,{pdfOcrDpi:320});
        const score=(text:string)=>{const s=parseVendorInvoice(text,"");return [s.number,s.tax,s.total,s.issueDate].filter(Boolean).length+(s.lines.length?2:0);};
        if(score(retry.text)>score(result.text))result=retry;
      }
    }
    pages.push({page,text:result.text,readable:Boolean(result.text.trim())});
  }
  return pages;
}
