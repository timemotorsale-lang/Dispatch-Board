import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve,sep} from "node:path";
import {PDFDocument} from "pdf-lib";
const mock=vi.hoisted(()=>({extract:vi.fn(),org:"reading-test-org",active:true}));
vi.mock("@/server/document-library/text-extraction",()=>({extractDocumentText:mock.extract}));
vi.mock("@/server/money-resources/service",()=>({moneyAccess:async(actor:{id:string;isActive:boolean}|null)=>{if(!actor?.isActive)throw Object.assign(new Error("Inactive account"),{status:401});return {actor,organizationId:mock.org,manager:true};}}));
vi.mock("@/server/auth/store",()=>({createPrismaAuthStore:()=>({findUserByEmail:async()=>({...actor,isActive:mock.active})})}));
import {prisma} from "@/server/db/client";
import {createReadingJob,readingJobView,readJobOriginal,retryReadingJob,runReadingJob,saveReadingReview,scopedReadingJob} from "@/server/document-library/reading-jobs";
import {attachReadingReceipt,readMoneyReceipt} from "@/server/money-resources/receipts";
const actor={id:"reading-test-staff",name:"Fictional Staff",email:"reading-test@example.test",isActive:true,roles:["General Manager"],duties:{all:[],direct:[],roleDefaults:[]}};
const suite=process.env.RUN_DOCUMENT_READING_DATABASE==="1"?describe:describe.skip;
let root="";
const textFile=(text:string)=>new File([text],"fictional-document.txt",{type:"text/plain"});
async function pdfFile(count:number){const pdf=await PDFDocument.create();for(let i=0;i<count;i++)pdf.addPage();return new File([Uint8Array.from(await pdf.save()).buffer],`fictional-${count}.pdf`,{type:"application/pdf"});}
suite("durable reading with real isolated PostgreSQL",()=>{
 beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),"document-reading-it-"));process.env.DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT=root;await prisma.user.create({data:{id:actor.id,name:actor.name,email:actor.email,passwordHash:"not-a-real-account"}});await prisma.organization.create({data:{id:mock.org,name:"Fictional Company",code:"READING-IT"}});});
 beforeEach(()=>{mock.org="reading-test-org";mock.active=true;mock.extract.mockReset().mockResolvedValue({text:"Buyer name: Fictional Buyer\nTotal 108.00",method:"PLAIN_TEXT",warnings:[]});});
 afterAll(async()=>{await prisma.$disconnect();if(root&&resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes("document-reading-it-"))await rm(root,{recursive:true,force:true});});
 it("retains an immutable original, deduplicates concurrent uploads, and saves reviewed corrections with conflict detection",async()=>{
  const file=textFile("Buyer name: Fictional Buyer\nTotal 108.00");
  const [first,second]=await Promise.all([createReadingJob(actor,"SALES",file),createReadingJob(actor,"SALES",file)]);
  expect(first.id).toBe(second.id);expect([first.reused,second.reused].sort()).toEqual([false,true]);
  expect((await readJobOriginal(actor,first.id)).bytes.toString()).toBe(await file.text());
  await runReadingJob(first.id);const view=await readingJobView(actor,first.id);expect(view.status).toBe("READY");expect(view.pagesCompleted).toBe(1);
  const fields=Object.fromEntries(view.reading!.fields.map(f=>[f.key,f.value]));fields.signer="Corrected Buyer";
  expect(await saveReadingReview(actor,first.id,{version:0,review:{fields,lines:[],confirmed:true}})).toEqual({version:1});
  await expect(saveReadingReview(actor,first.id,{version:0,review:{fields,lines:[],confirmed:true}})).rejects.toMatchObject({status:409});
  expect((await readingJobView(actor,first.id)).review).toMatchObject({fields:{signer:"Corrected Buyer"}});
  expect((await createReadingJob(actor,"SALES",file)).id).toBe(first.id);expect(mock.extract).toHaveBeenCalledTimes(1);
  const originalCount=await prisma.documentLibraryDocument.count({where:{checksumSha256:view.reading!.checksum}});
  await createReadingJob(actor,"TITLE",file);expect(await prisma.documentLibraryDocument.count({where:{checksumSha256:view.reading!.checksum}})).toBe(originalCount);
 });
 it("checkpoints completed pages and retries only the failed page without duplicated pages",async()=>{
  const job=await createReadingJob(actor,"SALES",await pdfFile(2));
  mock.extract.mockResolvedValueOnce({text:"Buyer name: First page",method:"PDF_TEXT",warnings:[]}).mockRejectedValueOnce(new Error("private-engine-path"));
  await runReadingJob(job.id);let view=await readingJobView(actor,job.id);expect(view).toMatchObject({status:"FAILED",pagesCompleted:1});expect(view.lastError).not.toContain("private-engine-path");
  await retryReadingJob(actor,job.id);await runReadingJob(job.id);view=await readingJobView(actor,job.id);expect(view).toMatchObject({status:"READY",pagesCompleted:2});expect(mock.extract).toHaveBeenCalledTimes(3);
  expect(await prisma.documentReadingEvent.count({where:{jobId:job.id,action:"PAGE_READ"}})).toBe(2);
 });
 it("recovers an expired lease and never runs two workers on the same active lease",async()=>{
  const job=await createReadingJob(actor,"TITLE",textFile("Title number: Recovery-1"));
  await prisma.documentReadingJob.update({where:{id:job.id},data:{status:"PROCESSING",leaseToken:"expired",leaseExpiresAt:new Date(0)}});
  await Promise.all([runReadingJob(job.id),runReadingJob(job.id)]);expect(mock.extract).toHaveBeenCalledTimes(1);expect((await readingJobView(actor,job.id)).status).toBe("READY");
 });
 it("keeps queued work after a bounded run and rejects other staff, companies, revoked accounts and tampered originals",async()=>{
  const job=await createReadingJob(actor,"TITLE",textFile("Title number: Private-2"));await runReadingJob(job.id,-1);expect((await readingJobView(actor,job.id)).status).toBe("QUEUED");
  await expect(scopedReadingJob({...actor,id:"other-staff"},job.id)).rejects.toMatchObject({status:404});mock.org="another-company";await expect(scopedReadingJob(actor,job.id)).rejects.toMatchObject({status:404});mock.org="reading-test-org";
  mock.active=false;await runReadingJob(job.id);expect((await readingJobView(actor,job.id)).status).toBe("FAILED");expect(mock.extract).not.toHaveBeenCalled();mock.active=true;
  const stored=await scopedReadingJob(actor,job.id);const target=resolve(root,stored.originalDocument.storageReference.slice(16));expect(target.startsWith(resolve(root)+sep)).toBe(true);await writeFile(target,"tampered");await expect(readJobOriginal(actor,job.id)).rejects.toMatchObject({status:409});
 });
 it("rejects forged uploads and packets beyond the purpose page limit before retaining anything",async()=>{
  await expect(createReadingJob(actor,"SALES",new File(["fake PDF"],"fake.pdf",{type:"application/pdf"}))).rejects.toThrow("contents");await expect(createReadingJob(actor,"SALES",await pdfFile(29))).rejects.toThrow("1–28");
 });
 it("links a reviewed receipt to spending without copying its bytes or approving it, and prevents duplicate reuse",async()=>{
  const bytes=Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==","base64"));
  mock.extract.mockResolvedValue({text:"Vendor: Fictional Parts\nTotal 108.00",method:"OCR_TEXT",warnings:[]});
  const job=await createReadingJob(actor,"EXPENSE",new File([bytes.buffer],"fictional-receipt.png",{type:"image/png"}));await runReadingJob(job.id);
  const create=()=>prisma.moneyEntry.create({data:{organizationId:mock.org,employeeId:actor.id,kind:"EXPENSE",amountCents:10800,businessDate:"2026-11-07",merchant:"Fictional Parts",purpose:"Test only",category:"PARTS",paymentMethod:"CASH"}});
  const entry=await create();await expect(attachReadingReceipt(actor,entry.id,job.id)).rejects.toThrow("reviewing");
  const view=await readingJobView(actor,job.id);await saveReadingReview(actor,job.id,{version:0,review:{fields:Object.fromEntries(view.reading!.fields.map(f=>[f.key,f.value])),lines:[],confirmed:true}});
  const count=await prisma.documentLibraryDocument.count();const linked=await attachReadingReceipt(actor,entry.id,job.id);expect(linked.documentId).toBe(view.reading!.originalDocumentId);expect(await prisma.documentLibraryDocument.count()).toBe(count);
  expect((await prisma.moneyEntry.findUniqueOrThrow({where:{id:entry.id}})).approvalStatus).toBe("PENDING");expect((await readMoneyReceipt(actor,entry.id)).bytes).toEqual(Buffer.from(bytes));expect((await attachReadingReceipt(actor,entry.id,job.id)).duplicate).toBe(true);
  const duplicate=await create();await expect(attachReadingReceipt(actor,duplicate.id,job.id)).rejects.toMatchObject({status:409});
 });
});
