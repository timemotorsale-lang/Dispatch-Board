import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { commandVendorBilling, readVendorBilling } from "@/server/vendors/vendor-billing-service";
import { VendorBillingError } from "@/lib/vendor-billing";
import { vendorBillingPrint } from "@/server/vendors/vendor-billing-print";
function failure(error: unknown) {
  if(error instanceof VendorBillingError)return NextResponse.json({error:error.message},{status:error.status});
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
  const reference=crypto.randomUUID().slice(0,8);console.error("Vendor billing request failed",{reference,code});
  return NextResponse.json({error:code==="P2021"||code==="P2022"?"Vendor billing needs its database update. Ask an administrator to apply the pending migration; your form entries remain here.":`Vendor billing is unavailable. Retry this same request. Support reference: ${reference}.`},{status:503});
}
export async function GET(request: Request,context:{params:Promise<{vendorId:string}>}){
  try { const {vendorId}=await context.params,model=await readVendorBilling(await getCurrentUser(),vendorId),params=new URL(request.url).searchParams;
    if(params.has("print"))return new NextResponse(vendorBillingPrint(model,params),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'","X-Content-Type-Options":"nosniff"}});
    return NextResponse.json(model,{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return failure(error);}
}
export async function POST(request: Request,context:{params:Promise<{vendorId:string}>}){
  try {
    const origin=request.headers.get("origin"),host=request.headers.get("host")||new URL(request.url).host;
    if(request.headers.get("sec-fetch-site")==="cross-site")throw new VendorBillingError("Open this financial action from the application.",403);
    if(origin){let source:URL;try{source=new URL(origin);}catch{throw new VendorBillingError("Reload the vendor page before saving.",403);}if(!["https:","http:"].includes(source.protocol)||source.host!==host||source.origin!==origin)throw new VendorBillingError("Open this financial action from the application.",403);}
    const raw=await request.json().catch(()=>null);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new VendorBillingError("Enter a vendor billing action.");
    const {vendorId}=await context.params;return NextResponse.json(await commandVendorBilling(await getCurrentUser(),vendorId,raw));
  }catch(error){return failure(error);}
}
