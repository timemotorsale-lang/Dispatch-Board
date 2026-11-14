import {after,NextResponse} from "next/server";
import {getCurrentUser} from "@/server/auth/current-user";
import {readingJobView,retryReadingJob,runReadingJob,saveReadingReview} from "@/server/document-library/reading-jobs";
import {checkReadingRequest,readingFailure,readingHeaders} from "@/server/document-library/reading-http";
export const runtime="nodejs";
export const maxDuration=300;
type Context={params:Promise<{jobId:string}>};
export async function GET(request:Request,context:Context){try{
 checkReadingRequest(request);
 const {jobId}=await context.params,view=await readingJobView(await getCurrentUser(),jobId);
 if(view.status==="QUEUED"||view.status==="PROCESSING")after(()=>runReadingJob(jobId));
 return NextResponse.json(view,{headers:readingHeaders});
}catch(error){return readingFailure(error);}}
export async function PATCH(request:Request,context:Context){try{
 checkReadingRequest(request);
 const {jobId}=await context.params;
 if(Number(request.headers.get("content-length"))>1024*1024)return NextResponse.json({error:"This review is too large."},{status:413,headers:readingHeaders});
 return NextResponse.json(await saveReadingReview(await getCurrentUser(),jobId,await request.json()),{headers:readingHeaders});
}catch(error){return readingFailure(error);}}
export async function POST(request:Request,context:Context){try{
 checkReadingRequest(request);
 const {jobId}=await context.params;
 await retryReadingJob(await getCurrentUser(),jobId);
 after(()=>runReadingJob(jobId));
 return NextResponse.json({ok:true},{headers:readingHeaders});
}catch(error){return readingFailure(error);}}
