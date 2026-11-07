import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { processVendorInvoicePacket, receiveVendorInvoiceUpload } from "@/server/vendors/invoice-batch-service";
import { VendorBillingError } from "@/lib/vendor-billing";
export const runtime="nodejs";
export const maxDuration=300;
const headers={"Cache-Control":"private, no-store"};
async function handle(request:Request,context:{params:Promise<{vendorId:string}>},save:boolean){
  try{
    const origin=request.headers.get("origin"),host=request.headers.get("host")||new URL(request.url).host;
    if(request.headers.get("sec-fetch-site")==="cross-site")throw new VendorBillingError("Open invoice processing from the vendor page.",403);
    if(origin){let source:URL;try{source=new URL(origin);}catch{throw new VendorBillingError("Reload the vendor page.",403);}if(!["http:","https:"].includes(source.protocol)||source.host!==host||source.origin!==origin)throw new VendorBillingError("Open invoice processing from the vendor page.",403);}
    const user=await getCurrentUser();if(!user)throw new VendorBillingError("Sign in to process invoices.",401);
    if(!save&&request.headers.get("content-type")?.startsWith("multipart/form-data")){
      if(Number(request.headers.get("content-length"))>11*1024*1024)throw new VendorBillingError("Choose an invoice no larger than 10 MB.",413);
      const data=await request.formData(),file=data.get("file");if(!(file instanceof File))throw new VendorBillingError("Choose an invoice file.");
      const {vendorId}=await context.params,source=await receiveVendorInvoiceUpload(user,vendorId,file);
      return NextResponse.json({...await processVendorInvoicePacket(user,vendorId,{documentId:source.id,batchId:String(data.get("batchId")||"")}),source},{headers});
    }
    if(Number(request.headers.get("content-length"))>128000)throw new VendorBillingError("This invoice review is too large.",413);
    const text=await request.text();if(text.length>128000)throw new VendorBillingError("This invoice review is too large.",413);
    let raw;try{raw=JSON.parse(text);}catch{throw new VendorBillingError("Choose an uploaded document and target batch.");}
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new VendorBillingError("Choose an uploaded document and target batch.");
    return NextResponse.json(await processVendorInvoicePacket(user,(await context.params).vendorId,raw,save),{headers});
  }catch(error){return NextResponse.json({error:error instanceof VendorBillingError?error.message:"Invoice processing could not finish. The original upload is preserved; retry this review."},{status:error instanceof VendorBillingError?error.status:503,headers});}
}
export const POST=(request:Request,context:{params:Promise<{vendorId:string}>})=>handle(request,context,false);
export const PUT=(request:Request,context:{params:Promise<{vendorId:string}>})=>handle(request,context,true);
