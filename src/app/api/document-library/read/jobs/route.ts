import {after,NextResponse} from "next/server";
import {getCurrentUser} from "@/server/auth/current-user";
import {isDocumentReadingPurpose} from "@/lib/document-reading";
import {MoneyError} from "@/lib/money-resources";
import {createReadingJob,listReadingJobs,runReadingJob} from "@/server/document-library/reading-jobs";
import {checkReadingRequest,readingFailure,readingHeaders} from "@/server/document-library/reading-http";
export const runtime="nodejs";
export const maxDuration=300;
export async function GET(request:Request){try{
 const purpose=new URL(request.url).searchParams.get("purpose");
 if(!isDocumentReadingPurpose(purpose))throw new MoneyError("Choose a reading purpose.");
 return NextResponse.json(await listReadingJobs(await getCurrentUser(),purpose),{headers:readingHeaders});
}catch(error){return readingFailure(error);}}
export async function POST(request:Request){try{
 checkReadingRequest(request);
 const user=await getCurrentUser();
 if(!user?.isActive)throw new MoneyError("Sign in with an active staff account.",401);
 const form=await request.formData(),purpose=form.get("purpose"),file=form.get("file");
 if(!isDocumentReadingPurpose(purpose)||!(file instanceof File))throw new MoneyError("Choose a document and reading purpose.");
 const job=await createReadingJob(user,purpose,file);
 after(()=>runReadingJob(job.id));
 return NextResponse.json(job,{status:202,headers:readingHeaders});
}catch(error){return readingFailure(error);}}
