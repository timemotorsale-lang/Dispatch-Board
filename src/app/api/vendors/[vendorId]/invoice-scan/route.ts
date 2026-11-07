import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { canAddVendorNote } from "@/server/vendors/vendor-policy";
import { commandVendorBilling, readVendorBilling } from "@/server/vendors/vendor-billing-service";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { VendorBillingError } from "@/lib/vendor-billing";
import { parseVendorInvoice } from "@/lib/vendor-invoice-scan";

export const runtime = "nodejs";
export const maxDuration = 300;
let reading = false;
const headers = {"Cache-Control":"private, no-store"};
async function receive(request: Request, context: {params:Promise<{vendorId:string}>}, save: boolean) {
  try {
    const origin=request.headers.get("origin"),host=request.headers.get("host")||new URL(request.url).host;
    if(request.headers.get("sec-fetch-site")==="cross-site")throw new VendorBillingError("Open invoice scanning from the vendor page.",403);
    if(origin){let source:URL;try{source=new URL(origin);}catch{throw new VendorBillingError("Reload the vendor page before scanning.",403);}if(!["http:","https:"].includes(source.protocol)||source.host!==host||source.origin!==origin)throw new VendorBillingError("Open invoice scanning from the vendor page.",403);}
    const user=await getCurrentUser();
    if(!user)throw new VendorBillingError("Sign in to scan invoices.",401);
    if(!user.isActive || !canAddVendorNote(user))throw new VendorBillingError("Vendor document access is required.",403);
    const {vendorId}=await context.params;
    const model=await readVendorBilling(user,vendorId);
    if(Number(request.headers.get("content-length"))>11*1024*1024)throw new VendorBillingError("Choose invoices no larger than 10 MB.",413);
    const data=await request.formData(),file=data.get("file");
    if(!(file instanceof File) || !file.size || file.size>10*1024*1024)throw new VendorBillingError("Choose a PDF, JPEG or PNG invoice no larger than 10 MB.",413);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const prefix=Buffer.from(bytes.subarray(0,8));
    const contentType=prefix.subarray(0,5).toString()==="%PDF-"?"application/pdf":prefix[0]===255&&prefix[1]===216&&prefix[2]===255?"image/jpeg":prefix.equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":"";
    if(!contentType)throw new VendorBillingError("Only PDF, JPEG and PNG invoices are supported.");
    if(save){
      let raw;try{raw=JSON.parse(String(data.get("review")));}catch{throw new VendorBillingError("Review the invoice fields before saving.");}
      if(!raw || raw.reviewed!==true)throw new VendorBillingError("Confirm the invoice and vendor before saving.");
      const {reviewed: _reviewed,...fields}=raw;
      void _reviewed;
      const result=await commandVendorBilling(user,vendorId,{...fields,action:"CREATE_DOCUMENT",direction:"PAYABLE"},{bytes,fileName:file.name.slice(0,180),contentType});
      return NextResponse.json(result,{headers});
    }
    if(reading)throw new VendorBillingError("Another invoice is being read. Retry shortly.",429);
    reading=true;
    try{
      const extracted=await extractDocumentText({bytes,contentType,fileName:file.name});
      const scan=parseVendorInvoice(extracted.text,model.vendor.name,model.jobs);
      // Never expose OCR engine paths or subprocess diagnostics to staff.
      if(!extracted.text)scan.warnings.push("Automatic reading was unavailable or found no text. Retry a clear photo or complete the review fields.");
      if(extracted.method==="OCR_TEXT" && contentType==="application/pdf")scan.warnings.push("PDF OCR may read only the first configured pages (default 3). Check every page and the final invoice total.");
      const duplicates=model.documents.filter(d=>d.direction==="PAYABLE" && scan.number && d.number.normalize("NFKC").replace(/\s+/g,"").toUpperCase()===scan.number.normalize("NFKC").replace(/\s+/g,"").toUpperCase()).map(d=>({number:d.number,status:d.status}));
      return NextResponse.json({scan,jobs:model.jobs,duplicates,vendor:model.vendor},{headers});
    }finally{reading=false;}
  }catch(error){
    return NextResponse.json({error:error instanceof VendorBillingError?error.message:"Invoice scanning could not finish. Your files have not been discarded; retry from the vendor page."},{status:error instanceof VendorBillingError?error.status:503,headers});
  }
}
export const POST=(request:Request,context:{params:Promise<{vendorId:string}>})=>receive(request,context,false);
export const PUT=(request:Request,context:{params:Promise<{vendorId:string}>})=>receive(request,context,true);
