import {NextResponse} from "next/server";
import {MoneyError} from "@/lib/money-resources";
export const readingHeaders={"Cache-Control":"private, no-store","Pragma":"no-cache","X-Content-Type-Options":"nosniff"};
export function checkReadingRequest(request:Request){
 const origin=request.headers.get("origin");
 const host=request.headers.get("host")||new URL(request.url).host;
 if(request.headers.get("sec-fetch-site")==="cross-site")throw new MoneyError("Open document reading from this app.",403);
 if(origin){
  let source:URL;try{source=new URL(origin);}catch{throw new MoneyError("Open document reading from this app.",403);}
  if(!["http:","https:"].includes(source.protocol)||source.username||source.password||source.host.toLowerCase()!==host.toLowerCase())throw new MoneyError("Open document reading from this app.",403);
 }
 if(Number(request.headers.get("content-length"))>25*1024*1024+65536)throw new MoneyError("Use a file up to 25 MB.",413);
}
export function readingFailure(error:unknown){
 const known=error instanceof MoneyError;
 return NextResponse.json({error:known?error.message:"This document could not be saved or read. Retry, or ask a manager to check document storage."},{status:known?error.status:422,headers:readingHeaders});
}
