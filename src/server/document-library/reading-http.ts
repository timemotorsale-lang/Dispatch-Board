import {NextResponse} from "next/server";
import {MoneyError} from "@/lib/money-resources";
export const readingHeaders={"Cache-Control":"private, no-store","Pragma":"no-cache","X-Content-Type-Options":"nosniff"};
export function checkReadingRequest(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin||request.headers.get("sec-fetch-site")==="cross-site")throw new MoneyError("Open document reading from this app.",403);
 if(Number(request.headers.get("content-length"))>25*1024*1024+65536)throw new MoneyError("Use a file up to 25 MB.",413);
}
export function readingFailure(error:unknown){
 const known=error instanceof MoneyError;
 return NextResponse.json({error:known?error.message:"This document could not be saved or read. Retry, or ask a manager to check document storage."},{status:known?error.status:422,headers:readingHeaders});
}
