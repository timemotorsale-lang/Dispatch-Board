import {createHash} from "node:crypto";
import {PDFDocument} from "pdf-lib";
import {extractDocumentText} from "./text-extraction";
import {DOCUMENT_READING_PROFILES,parseDocumentReading,type DocumentReading,type DocumentReadingPurpose,type ReadPage} from "@/lib/document-reading";
export async function extractDocumentPages(input:{bytes:Uint8Array;contentType:string;fileName:string},maxPages=28,extract=extractDocumentText){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>28)throw new Error("Unsupported page limit.");
 const started=Date.now();
 const pdf=input.contentType==="application/pdf"?await PDFDocument.load(input.bytes):null,count=pdf?.getPageCount()??1;
 if(count<1||count>maxPages)throw new Error(`Use 1–${maxPages} pages. No pages were applied.`);
 const pages:ReadPage[]=[],warnings:string[]=[];
 for(let index=0;index<count;index++){
  if(Date.now()-started>240_000)throw new Error("Reading time limit reached. Split the packet into smaller files and retry. No records were applied.");
  let bytes=input.bytes;if(pdf){const single=await PDFDocument.create();const [page]=await single.copyPages(pdf,[index]);single.addPage(page);bytes=await single.save();}
  const result=await extract({bytes,contentType:input.contentType,fileName:pdf?`page-${index+1}.pdf`:input.fileName});pages.push({page:index+1,text:result.text,method:result.method});
  if(!result.text.trim())warnings.push(`Page ${index+1} could not be read; inspect the original before applying.`);
 }
 return {pages,warnings,pageCount:count,text:pages.map(p=>p.text).join("\n\n"),method:pages.some(p=>p.method==="OCR_TEXT")?"OCR_TEXT":pages[0].method};
}
export async function readStructuredDocument(purpose:DocumentReadingPurpose,file:File,extract=extractDocumentText):Promise<DocumentReading>{
 if(purpose==="EXPENSE"&&(file.size>10*1024*1024||!["application/pdf","image/jpeg","image/png"].includes(file.type)))throw new Error("Spending receipts must be PDF, JPEG or PNG files up to 10 MB.");
 if(!file.size||file.size>25*1024*1024)throw new Error("Choose a document between 1 byte and 25 MB.");
 if(!["application/pdf","image/jpeg","image/png","image/webp","text/plain"].includes(file.type))throw new Error("Choose a PDF, JPEG, PNG, WebP or text document.");
 const bytes=new Uint8Array(await file.arrayBuffer()),head=new TextDecoder().decode(bytes.slice(0,12));
 if(file.type==="application/pdf"&&!head.startsWith("%PDF-")||file.type==="image/jpeg"&&!(bytes[0]===255&&bytes[1]===216)||file.type==="image/png"&&!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)||file.type==="image/webp"&&!(head.startsWith("RIFF")&&head.slice(8,12)==="WEBP"))throw new Error("The document contents do not match its file type.");
 const {pages,warnings,pageCount:count}=await extractDocumentPages({bytes,contentType:file.type,fileName:file.name},DOCUMENT_READING_PROFILES[purpose].maxPages,extract);
 const parsed=parseDocumentReading(purpose,pages);
 return {purpose,fileName:file.name.slice(0,160),checksum:createHash("sha256").update(bytes).digest("hex"),pageCount:count,pagesRead:pages.filter(p=>p.text.trim()).length,...parsed,warnings:[...warnings,...parsed.warnings],needsReview:true};
}
