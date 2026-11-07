import {NextResponse} from "next/server";
import {getCurrentUser} from "@/server/auth/current-user";
import {checkReadingReferences} from "@/server/document-library/reading-checks";
import {checkReadingRequest,readingFailure,readingHeaders} from "@/server/document-library/reading-http";
import {MoneyError} from "@/lib/money-resources";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{jobId:string}>}){try{
 checkReadingRequest(request);
 if(Number(request.headers.get("content-length"))>65536)throw new MoneyError("This review request is too large.",413);
 const {jobId}=await context.params;
 return NextResponse.json(await checkReadingReferences(await getCurrentUser(),jobId,await request.json()),{headers:readingHeaders});
}catch(error){return readingFailure(error);}}
