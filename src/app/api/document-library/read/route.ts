import {NextResponse} from "next/server";
import {getCurrentUser} from "@/server/auth/current-user";
import {canOpenDocumentLibrary} from "@/server/document-library/permission-policy";
import {isManager} from "@/server/policies/access";
import {moneyAccess} from "@/server/money-resources/service";
import {readStructuredDocument} from "@/server/document-library/read-document";
import {isDocumentReadingPurpose} from "@/lib/document-reading";
import {checkReadingRequest,readingFailure} from "@/server/document-library/reading-http";
export const runtime="nodejs";
export const maxDuration=300;
const headers={"Cache-Control":"no-store","Pragma":"no-cache"};
const activeReaders=new Set<string>();
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in to read documents."},{status:401,headers});
 if(!user.isActive)return NextResponse.json({error:"An active account is required."},{status:403,headers});
 try{checkReadingRequest(request);}catch(error){return readingFailure(error);}
 try{
  const form=await request.formData(),purpose=form.get("purpose"),file=form.get("file");
  if(!isDocumentReadingPurpose(purpose)||!(file instanceof File))return NextResponse.json({error:"Choose a document and its review purpose."},{status:400,headers});
  if(purpose==="EXPENSE"||purpose==="STATEMENT"){await moneyAccess(user);if(purpose==="STATEMENT"&&!isManager(user))return NextResponse.json({error:"Manager permission is required to read financial statements."},{status:403,headers});}
  else if(!canOpenDocumentLibrary(user))return NextResponse.json({error:"Document reading is not available for your role."},{status:403,headers});
  if(activeReaders.has(user.id))return NextResponse.json({error:"A document is already being read for your account. Wait for it to finish, then retry."},{status:429,headers});
  activeReaders.add(user.id);
  try{
   const reading=await readStructuredDocument(purpose,file);
   if(purpose==="EXPENSE"){
    const access=await moneyAccess(user),{prisma}=await import("@/server/db/client");
    const matches=await prisma.moneyEntry.findMany({where:{organizationId:access.organizationId,...(!access.manager?{employeeId:user.id}:{}),kind:"EXPENSE",approvalStatus:{not:"SUPERSEDED"},receiptDocument:{checksumSha256:reading.checksum}},select:{merchant:true,businessDate:true,amountCents:true},take:10});
    reading.duplicateMatches=matches.map(match=>({label:`${match.merchant||"Existing spending"} · ${match.businessDate} · $${(match.amountCents/100).toFixed(2)}`,href:`/money-resources?date=${encodeURIComponent(match.businessDate)}&action=review`}));
   }
   return NextResponse.json(reading,{headers});
  }finally{activeReaders.delete(user.id);}
 }catch(error){const status=error&&typeof error==="object"&&"status" in error?Number(error.status):422;return NextResponse.json({error:status===403?"You do not have access to this document workflow.":"Document reading could not finish. Check the file type, size and page limit, or retry a clearer scan. No records were changed."},{status:[400,401,403,413].includes(status)?status:422,headers});}
}
