import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.cwd());
async function main(){
 const {runReadingQueue}=await import("../src/server/document-library/reading-jobs");
 const once=process.argv.includes("--once");
 let stopped=false;
 process.on("SIGINT",()=>{stopped=true;});process.on("SIGTERM",()=>{stopped=true;});
 do{try{await runReadingQueue();}catch{console.error("Document reader temporarily unavailable; retrying without exposing document content.");}if(!once&&!stopped)await new Promise(resolve=>setTimeout(resolve,5000));}while(!once&&!stopped);
 const {prisma}=await import("../src/server/db/client");await prisma.$disconnect();
}
void main().catch(()=>{console.error("Document reader could not start.");process.exitCode=1;});
