import {createHash,randomUUID} from "node:crypto";
import {readFile,realpath} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {PDFDocument} from "pdf-lib";
import {Prisma} from "@prisma/client";
import {prisma} from "@/server/db/client";
import {createPrismaAuthStore,type AuthenticatedUser} from "@/server/auth/store";
import {moneyAccess} from "@/server/money-resources/service";
import {isManager} from "@/server/policies/access";
import {MoneyError} from "@/lib/money-resources";
import {DOCUMENT_READING_PROFILES,isDocumentReadingPurpose,parseDocumentReading,type DocumentReading,type DocumentReadingPurpose} from "@/lib/document-reading";
import {validateDocumentReview,type SavedDocumentReview} from "@/lib/document-reading-review";
import {canOpenDocumentLibrary} from "./permission-policy";
import {resolveDocumentStorageRuntimeFromEnv} from "./storage-config";
import {extractDocumentText} from "./text-extraction";

const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
const digest=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
export async function readingAccess(actor:AuthenticatedUser|null,purpose:DocumentReadingPurpose){
 const access=await moneyAccess(actor);
 if(purpose==="STATEMENT"&&!isManager(access.actor)||!["EXPENSE","STATEMENT"].includes(purpose)&&!canOpenDocumentLibrary(access.actor))throw new MoneyError("You do not have access to this document workflow.",403);
 return access;
}
export async function scopedReadingJob(actor:AuthenticatedUser|null,id:string){
 if(!actor?.isActive)throw new MoneyError("Sign in with an active staff account.",401);
 const job=await prisma.documentReadingJob.findFirst({where:{id,createdByUserId:actor.id},include:{originalDocument:true}});
 if(!job||!isDocumentReadingPurpose(job.purpose))throw new MoneyError("This saved read is not available.",404);
 const access=await readingAccess(actor,job.purpose);
 if(job.organizationId!==access.organizationId)throw new MoneyError("This saved read is not available.",404);
 return job;
}
export async function readingJobView(actor:AuthenticatedUser|null,id:string){
 const job=await scopedReadingJob(actor,id);
 const pages=await prisma.documentReadingPage.findMany({where:{jobId:id},orderBy:{page:"asc"},select:{page:true,text:true,method:true}});
 const reading=job.reading as DocumentReading|null;
 // Check duplicates again when reopened, since another expense may have been saved meanwhile.
 if(reading&&job.purpose==="EXPENSE"){
  const access=await moneyAccess(actor);
  const matches=await prisma.moneyEntry.findMany({where:{organizationId:access.organizationId,...(!access.manager?{employeeId:access.actor.id}:{}),kind:"EXPENSE",approvalStatus:{not:"SUPERSEDED"},receiptDocument:{checksumSha256:job.checksumSha256}},select:{merchant:true,businessDate:true,amountCents:true},take:10});
  reading.duplicateMatches=matches.map(m=>({label:`${m.merchant||"Existing spending"} · ${m.businessDate} · $${(m.amountCents/100).toFixed(2)}`,href:`/money-resources?date=${encodeURIComponent(m.businessDate)}&action=review`}));
 }
 return {id:job.id,fileName:job.fileName,status:job.status,pageCount:job.pageCount,pagesCompleted:pages.length,lastError:job.lastError,reading,review:job.review,reviewVersion:job.reviewVersion,pages,updatedAt:job.updatedAt};
}
export async function listReadingJobs(actor:AuthenticatedUser|null,purpose:DocumentReadingPurpose){
 const access=await readingAccess(actor,purpose);
 return prisma.documentReadingJob.findMany({where:{organizationId:access.organizationId,createdByUserId:access.actor.id,purpose},orderBy:{updatedAt:"desc"},take:20,select:{id:true,fileName:true,status:true,pageCount:true,updatedAt:true}});
}
export async function createReadingJob(actor:AuthenticatedUser|null,purpose:DocumentReadingPurpose,file:File){
 const access=await readingAccess(actor,purpose);
 if(!file.size||file.size>25*1024*1024||!["application/pdf","image/jpeg","image/png","image/webp","text/plain"].includes(file.type))throw new MoneyError("Choose a PDF, image or text document up to 25 MB.");
 if(purpose==="EXPENSE"&&(file.size>10*1024*1024||!["application/pdf","image/jpeg","image/png"].includes(file.type)))throw new MoneyError("Spending receipts must be PDF, JPEG or PNG up to 10 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer()),head=Buffer.from(bytes.slice(0,12));
 if(file.type==="application/pdf"&&!head.toString().startsWith("%PDF-")||file.type==="image/jpeg"&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||file.type==="image/png"&&!head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||file.type==="image/webp"&&!(head.toString().startsWith("RIFF")&&head.toString().slice(8,12)==="WEBP"))throw new MoneyError("The document contents do not match its file type.");
 const count=file.type==="application/pdf"?(await PDFDocument.load(bytes)).getPageCount():1;
 if(count<1||count>DOCUMENT_READING_PROFILES[purpose].maxPages)throw new MoneyError(`Use 1–${DOCUMENT_READING_PROFILES[purpose].maxPages} pages.`);
 const checksum=digest(bytes),storage=resolveDocumentStorageRuntimeFromEnv();
 if(!storage.adapter||!storage.localPrivateRoot)throw new MoneyError("Private document storage must be connected before saving a read.",503);
 const adapter=storage.adapter;
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reading:${access.organizationId}:${access.actor.id}`}))`;
  const existing=await tx.documentReadingJob.findFirst({where:{organizationId:access.organizationId,createdByUserId:access.actor.id,purpose,checksumSha256:checksum}});
  if(existing)return {id:existing.id,reused:true};
  if(await tx.documentReadingJob.count({where:{organizationId:access.organizationId,createdByUserId:access.actor.id,status:{in:["QUEUED","PROCESSING"]}}})>=3)throw new MoneyError("Finish or retry your current documents before adding more.",429);
  const id=randomUUID(),documentId=randomUUID();
  // One retained original can support several reading purposes for the same staff member.
  const original=await tx.documentLibraryDocument.findFirst({where:{organizationId:access.organizationId,createdByUserId:access.actor.id,ownerType:"DOCUMENT_READING",checksumSha256:checksum}});
  if(!original){
   const stored=await adapter.writeObject({bytes,contentType:file.type,documentId,expectedChecksumSha256:checksum,fileName:file.name.slice(0,160),organizationId:access.organizationId,owner:{id,label:"Document reading",type:"DOCUMENT_READING"},version:1});
   await tx.documentLibraryDocument.create({data:{id:documentId,organizationId:access.organizationId,ownerType:"DOCUMENT_READING",ownerId:id,ownerLabel:"Saved document reading",documentType:"READING_ORIGINAL",fileName:stored.fileName,contentType:file.type,sensitivity:"RESTRICTED",source:"MANUAL_UPLOAD",retentionCategory:"SOURCE_DOCUMENT",storageProvider:"INTERNAL",storageReference:stored.reference,checksumSha256:checksum,sizeBytes:bytes.length,createdByUserId:access.actor.id,updatedByUserId:access.actor.id,versions:{create:{organizationId:access.organizationId,version:1,storageProvider:"INTERNAL",storageReference:stored.reference,fileName:stored.fileName,contentType:file.type,sizeBytes:bytes.length,checksumSha256:checksum,createdByUserId:access.actor.id}}}});
  }
  await tx.documentReadingJob.create({data:{id,organizationId:access.organizationId,createdByUserId:access.actor.id,purpose,checksumSha256:checksum,originalDocumentId:original?.id??documentId,fileName:file.name.slice(0,160),contentType:file.type,pageCount:count,events:{create:{actorId:access.actor.id,action:"ORIGINAL_RETAINED",detail:{checksum,pageCount:count}}}}});
  return {id,reused:false};
 },{timeout:30000});
}
async function storedOriginal(job:Awaited<ReturnType<typeof scopedReadingJob>>){
 const root=resolveDocumentStorageRuntimeFromEnv().localPrivateRoot,reference=job.originalDocument.storageReference;
 if(!root||!reference.startsWith("local-private://"))throw new MoneyError("Private document storage is unavailable.",503);
 const canonicalRoot=await realpath(root),target=await realpath(resolve(root,reference.slice(16)));
 if(!target.startsWith(canonicalRoot+sep))throw new MoneyError("This document is not available.",404);
 const bytes=await readFile(target);
 if(digest(bytes)!==job.checksumSha256)throw new MoneyError("The original failed its integrity check. Ask a manager to review storage.",409);
 return bytes;
}
export async function readJobOriginal(actor:AuthenticatedUser|null,id:string){
 const job=await scopedReadingJob(actor,id),bytes=await storedOriginal(job);
 await prisma.documentReadingEvent.create({data:{jobId:id,actorId:actor!.id,action:"ORIGINAL_VIEWED",detail:{}}});
 return {bytes,contentType:job.contentType,fileName:job.fileName};
}
export async function saveReadingReview(actor:AuthenticatedUser|null,id:string,input:unknown){
 const job=await scopedReadingJob(actor,id);
 if(job.status!=="READY"||!job.reading)throw new MoneyError("Wait for the document to finish reading.",409);
 const request=input as {version?:unknown;review?:unknown};
 if(!request||!Number.isInteger(request.version)||request.version!==job.reviewVersion)throw new MoneyError("This review changed in another window. Your entries remain here; reopen the saved read to compare.",409);
 let review:SavedDocumentReview;
 try{review=validateDocumentReview(request.review,job.reading as DocumentReading);}catch(error){throw new MoneyError(error instanceof Error?error.message:"Check the reviewed values.");}
 return prisma.$transaction(async tx=>{
  const updated=await tx.documentReadingJob.updateMany({where:{id,reviewVersion:job.reviewVersion,status:"READY"},data:{review:json(review),reviewVersion:{increment:1}}});
  if(!updated.count)throw new MoneyError("This review changed in another window. Reopen it before saving.",409);
  await tx.documentReadingEvent.create({data:{jobId:id,actorId:actor!.id,action:"REVIEW_SAVED",detail:json({version:job.reviewVersion+1,before:job.review,after:review})}});
  return {version:job.reviewVersion+1};
 });
}
export async function retryReadingJob(actor:AuthenticatedUser|null,id:string){
 await scopedReadingJob(actor,id);
 return prisma.$transaction(async tx=>{
  const updated=await tx.documentReadingJob.updateMany({where:{id,status:"FAILED"},data:{status:"QUEUED",lastError:null}});
  if(updated.count)await tx.documentReadingEvent.create({data:{jobId:id,actorId:actor!.id,action:"RETRY_REQUESTED",detail:{}}});
 });
}

// Lease tokens fence late workers. Each page commits independently; restarts skip completed pages.
export async function runReadingJob(id:string,budgetMs=210000){
 const token=randomUUID(),started=Date.now();
 const claimed=await prisma.documentReadingJob.updateMany({where:{id,OR:[{status:"QUEUED"},{status:"PROCESSING",leaseExpiresAt:{lt:new Date()}}]},data:{status:"PROCESSING",leaseToken:token,leaseExpiresAt:new Date(Date.now()+300000),attempts:{increment:1}}});
 if(!claimed.count)return;
 try{
  const initial=await prisma.documentReadingJob.findUniqueOrThrow({where:{id}}),user=await prisma.user.findUnique({where:{id:initial.createdByUserId},select:{email:true}}),actor=user?await createPrismaAuthStore(prisma).findUserByEmail(user.email):null;
  const job=await scopedReadingJob(actor,id),bytes=await storedOriginal(job),pdf=job.contentType==="application/pdf"?await PDFDocument.load(bytes):null;
  const completed=new Set((await prisma.documentReadingPage.findMany({where:{jobId:id},select:{page:true}})).map(p=>p.page));
  for(let page=1;page<=job.pageCount;page++){
   if(completed.has(page))continue;
   if(Date.now()-started>budgetMs)break;
   // Recheck current account and company grants on every page.
   const fresh=user?await createPrismaAuthStore(prisma).findUserByEmail(user.email):null;
   await scopedReadingJob(fresh,id);
   let pageBytes:Uint8Array=bytes;
   if(pdf){const single=await PDFDocument.create();const [copied]=await single.copyPages(pdf,[page-1]);single.addPage(copied);pageBytes=await single.save();}
   const result=await extractDocumentText({bytes:pageBytes,contentType:job.contentType,fileName:pdf?`page-${page}.pdf`:job.fileName});
   if(!result.text.trim())throw new Error("No readable text on this page.");
   const saved=await prisma.$transaction(async tx=>{
    const owned=await tx.documentReadingJob.updateMany({where:{id,status:"PROCESSING",leaseToken:token},data:{leaseExpiresAt:new Date(Date.now()+300000)}});
    if(!owned.count)return false;
    await tx.documentReadingPage.upsert({where:{jobId_page:{jobId:id,page}},create:{jobId:id,page,text:result.text.slice(0,200000),method:result.method,warnings:json(result.warnings)},update:{}});
    await tx.documentReadingEvent.create({data:{jobId:id,actorId:job.createdByUserId,action:"PAGE_READ",detail:{page,method:result.method}}});
    return true;
   });
   if(!saved)return;
  }
  const pages=await prisma.documentReadingPage.findMany({where:{jobId:id},orderBy:{page:"asc"}});
  const ready=pages.length===job.pageCount;
  const parsed=ready?parseDocumentReading(job.purpose as DocumentReadingPurpose,pages):null;
  const reading=parsed?{...parsed,purpose:job.purpose,fileName:job.fileName,checksum:job.checksumSha256,pageCount:job.pageCount,pagesRead:pages.length,needsReview:true,jobId:id,originalDocumentId:job.originalDocumentId,warnings:[...parsed.warnings,...pages.flatMap(p=>(p.warnings as string[]).map(w=>`Page ${p.page}: ${w}`))]}:undefined;
  await prisma.documentReadingJob.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{status:ready?"READY":"QUEUED",leaseToken:null,leaseExpiresAt:null,...(reading?{reading:json(reading),completedAt:new Date()}:{}),lastError:null}});
 }catch{
  await prisma.$transaction(async tx=>{
   const failed=await tx.documentReadingJob.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{status:"FAILED",leaseToken:null,leaseExpiresAt:null,lastError:"Reading stopped. Completed pages and the original are saved. Retry, or use a clearer scan if it stops again."}});
   if(failed.count)await tx.documentReadingEvent.create({data:{jobId:id,actorId:"DOCUMENT_READING_WORKER",action:"READING_STOPPED",detail:{retryable:true}}});
  });
 }
}
export async function runReadingQueue(){
 const jobs=await prisma.documentReadingJob.findMany({where:{OR:[{status:"QUEUED"},{status:"PROCESSING",leaseExpiresAt:{lt:new Date()}}]},orderBy:{createdAt:"asc"},take:10,select:{id:true}});
 for(const job of jobs)await runReadingJob(job.id);
 return jobs.length;
}
