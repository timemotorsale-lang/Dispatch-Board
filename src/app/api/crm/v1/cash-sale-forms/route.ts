import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { requireSalesDocumentsUser } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { cashSigningTemplate, cashSigningTemplateSource } from "@/server/services/cash-signing-templates";
export async function GET(request:Request){
  try{
    requireSalesDocumentsUser(await getCurrentUser());
    const id=new URL(request.url).searchParams.get("id") || "";
    if(!cashSigningTemplate(id))return NextResponse.json({error:"Signing form was not found."},{status:404});
    const {bytes,template}=cashSigningTemplateSource(id);
    return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${template.file}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){return NextResponse.json({error:error instanceof SalesDocumentsError ? error.message : "The signing form could not be opened. Try again."},{status:error instanceof SalesDocumentsError ? error.status : 503});}
}
