import {getCurrentUser} from "@/server/auth/current-user";
import {readJobOriginal} from "@/server/document-library/reading-jobs";
import {checkReadingRequest,readingFailure,readingHeaders} from "@/server/document-library/reading-http";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{jobId:string}>}){try{
 checkReadingRequest(request);
 const {jobId}=await context.params,result=await readJobOriginal(await getCurrentUser(),jobId);
 return new Response(new Uint8Array(result.bytes),{headers:{...readingHeaders,"Content-Type":result.contentType,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,"Content-Security-Policy":"sandbox; default-src 'none'"}});
}catch(error){return readingFailure(error);}}
