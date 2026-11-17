import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { parseVendorInvoice } from "@/lib/vendor-invoice-scan";
import { readInvoicePdfPages } from "@/server/vendors/invoice-pdf";
import { invoiceGroups } from "@/lib/vendor-invoice-batch";
describe.skipIf(process.env.RUN_INVOICE_OCR!=="1")("actual invoice OCR engines",()=>{
 it("reads all four pages of a scanned packet and separates invoices with a continuation page",async()=>{
  const pdf=await PDFDocument.create();
  for(const lines of [["EXAMPLE REPAIR LLC","Invoice #: A-100","Repair 100.00","Tax 0.00","Total 100.00"],["Continuation of repair invoice","Approved repair scope attached"],["EXAMPLE REPAIR LLC","Invoice #: B-200","Parts 50.00","Tax 0.00","Total 50.00"],["EXAMPLE REPAIR LLC","Invoice #: C-300","Repair 200.00","Tax 0.00","Total 200.00"]]){
    const canvas=createCanvas(1400,1600),ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,1400,1600);ctx.fillStyle="black";ctx.font="40px Arial";lines.forEach((line,index)=>ctx.fillText(line,100,150+index*110));const image=await pdf.embedPng(canvas.toBuffer("image/png"));pdf.addPage([700,800]).drawImage(image,{x:0,y:0,width:700,height:800});
  }
  const pages=await readInvoicePdfPages(await pdf.save());expect(pages).toHaveLength(4);expect(pages.every(p=>p.readable)).toBe(true);
  const groups=invoiceGroups(pages,"EXAMPLE REPAIR LLC",[]);expect(groups.map(g=>g.pages)).toEqual([[1,2],[3],[4]]);expect(groups.map(g=>g.scan.number)).toEqual(["A-100","B-200","C-300"]);
 },180000);
 it("reads a photo and a scanned PDF into invoice suggestions without external services",async()=>{
  const canvas=createCanvas(1400,1600),context=canvas.getContext("2d");context.fillStyle="white";context.fillRect(0,0,1400,1600);context.fillStyle="black";context.font="40px Arial";
  ["EXAMPLE REPAIR LLC","Invoice #: INV-123","Invoice Date: 11/06/2026","Due Date: 12/06/2026","Repair labor 100.00","Parts 50.00","Sales Tax 10.25","Invoice Total 160.25"].forEach((text,index)=>context.fillText(text,100,140+index*110));
  const image=canvas.toBuffer("image/png"),pdf=await PDFDocument.create(),embedded=await pdf.embedPng(image);pdf.addPage([700,800]).drawImage(embedded,{x:0,y:0,width:700,height:800});
  for(const [bytes,contentType,fileName] of [[image,"image/png","sample.png"],[await pdf.save(),"application/pdf","sample.pdf"]] as const){
   const extracted=await extractDocumentText({bytes,contentType,fileName});expect(extracted.method,JSON.stringify(extracted.warnings)).toBe("OCR_TEXT");
   const scan=parseVendorInvoice(extracted.text,"EXAMPLE REPAIR LLC");expect(scan).toMatchObject({number:"INV-123",issueDate:"2026-11-06",dueDate:"2026-12-06",total:"160.25",tax:"10.25"});expect(scan.lines).toHaveLength(2);
  }
 },180000);
});
