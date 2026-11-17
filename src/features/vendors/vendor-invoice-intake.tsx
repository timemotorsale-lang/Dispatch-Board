"use client";
import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { DocumentScanner } from "@/features/mobile-capture/document-scanner";
import { PurchasePdfPreview } from "@/features/inventory/purchase-pdf-preview";
import { billingCents, billingMoney } from "@/lib/vendor-billing";
import { normalizeInvoiceNumber, parseVendorInvoice, type InvoiceJob, type InvoiceScan } from "@/lib/vendor-invoice-scan";
import { formatInvoiceRanges, parseInvoiceRanges, scanPageGroup, type InvoicePage } from "@/lib/vendor-invoice-batch";
import styles from "./vendor-invoice-intake.module.css";

type Review = InvoiceScan & { unmatchedReason: string };
type Entry = { id: string; file: File; saved: boolean; skipped?:boolean; result?:Result; origin?:{documentId:string;batchId:string;pages:number[]} };
type Result = { scan: InvoiceScan; jobs: InvoiceJob[]; duplicates: Array<{number:string;status:string}>; vendor:{name:string} };
type PacketAnalysis={pages:InvoicePage[];groups:Array<{pages:number[]}>;jobs:InvoiceJob[];vendor:{name:string};documents:Array<{number:string;status:string;direction:string}>};
export type VendorInvoiceIntakeHandle={open:(files:File[])=>void;process:(document:{id:string;fileName:string})=>void};
export function VendorInvoiceIntake({vendorId, ref, onSaved, batches=[], defaultBatchId=""}: {vendorId:string;ref?:Ref<VendorInvoiceIntakeHandle>;onSaved:(batchId?:string)=>Promise<void>;batches?:Array<{id:string;batchNumber:string;title:string}>;defaultBatchId?:string}) {
  const [queue,setQueue]=useState<Entry[]>([]),[active,setActive]=useState(0),[scanner,setScanner]=useState(false),[open,setOpen]=useState(false);
  const [result,setResult]=useState<Result|null>(null),[review,setReview]=useState<Review|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[confirmed,setConfirmed]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),key=useRef(crypto.randomUUID()),locked=useRef(false);
  const pendingUploads=useRef<File[]>([]);
  const [batchSource,setBatchSource]=useState<{id:string;fileName:string}|null>(null),[targetBatch,setTargetBatch]=useState(""),[analysis,setAnalysis]=useState<PacketAnalysis|null>(null),[ranges,setRanges]=useState("");
  const [invoiceDateTerms,setInvoiceDateTerms]=useState(false);
  const endpoint=`/api/vendors/${encodeURIComponent(vendorId)}/invoice-scan`,entry=queue[active];
  function choose(files: File[]) {
    if(!files.length)return;
    if(files.length>12 || files.some(f=>!f.size || f.size>10*1024*1024 || !/\.(pdf|png|jpe?g)$/i.test(f.name)) || files.reduce((s,f)=>s+f.size,0)>40*1024*1024){setError("Choose up to 12 PDF, JPEG or PNG invoices, 10 MB each and 40 MB per batch.");return;}
    pendingUploads.current=files;
    setQueue([]);setBatchSource(null);setAnalysis(null);setActive(0);setResult(null);setReview(null);setError("");setNotice("");setInvoiceDateTerms(false);setOpen(true);setBusy(true);
    void (async()=>{try{const prepared:Entry[]=[];for(let i=0;i<files.length;i++){
      setNotice(`Reading upload ${i+1} of ${files.length}. Preparing invoice fields, page groups and work tickets…`);
      const body=new FormData();body.set("file",files[i]);body.set("batchId",defaultBatchId);
      const response=await fetch(endpoint.replace("invoice-scan","invoice-batch"),{method:"POST",body}),data=await response.json();if(!response.ok)throw new Error(data.error);
      prepared.push(...await buildEntries(data,data.source.id,defaultBatchId,data.groups.map((g:{pages:number[]})=>g.pages),false));
    }pendingUploads.current=[];setQueue(prepared);setNotice(`${prepared.length} invoice(s) prepared. Review the original pages, amounts and proposed work tickets, then approve.`);}catch(e){setError(e instanceof Error?e.message:"Could not prepare this upload. Retry; identical source files will be reused.");}finally{setBusy(false);}})();
  }
  function process(document:{id:string;fileName:string}){setBatchSource(document);setTargetBatch(defaultBatchId||batches[0]?.id||"");setAnalysis(null);setRanges("");setQueue([]);setActive(0);setReview(null);setResult(null);setError("");setNotice("");setInvoiceDateTerms(false);setOpen(true);}
  useImperativeHandle(ref,()=>({open:choose,process}));
  useEffect(()=>{if(open&&!scanner&&!dialog.current?.open)dialog.current?.showModal();},[open,scanner]);
  useEffect(()=>{if(!open||!entry||entry.saved)return;let cancelled=false;
    async function read(){setBusy(true);setError("");setResult(null);setReview(null);setConfirmed(false);key.current=crypto.randomUUID();
      try{let data=entry.result;if(!data){const body=new FormData();body.set("file",entry.file);const response=await fetch(endpoint,{method:"POST",body});data=await response.json();if(!response.ok)throw new Error((data as unknown as {error:string}).error);}if(!cancelled&&data){setResult(data);setReview({...data.scan,unmatchedReason:""});}}
      catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not read this invoice.");}finally{if(!cancelled)setBusy(false);}
    }void read();return()=>{cancelled=true;};
  },[open,entry,endpoint]);
  function edit(change:Partial<Review>){key.current=crypto.randomUUID();setConfirmed(false);setReview(current=>current?{...current,...change,...(change.dueDate!==undefined?{dueDateSource:"STAFF" as const}:{})}:null);}
  function acceptCalculatedTax(){if(!review?.taxProposal||!result)return;const candidate=parseVendorInvoice(`${review.text}\nTax ${review.taxProposal.amount}`,result.vendor.name,result.jobs);edit({tax:review.taxProposal.amount,taxBasis:"CALCULATED_REVIEW",workTicketProposal:candidate.workTicketProposal,lines:candidate.lines.map(l=>({...l,workJobId:l.workJobId||(candidate.workTicketProposal?"__NEW_INVOICE_JOB__":"")}))});}
  function applyInvoiceDateTerms(checked:boolean){setInvoiceDateTerms(checked);setConfirmed(false);setQueue(current=>current.map(item=>{
    if(item.saved||!item.result)return item;
    const scan=item.id===entry?.id&&review?review:item.result.scan;
    const next=checked&&!scan.dueDate&&scan.issueDate?{...scan,dueDate:scan.issueDate,dueDateSource:"REVIEW_POLICY" as const}:!checked&&scan.dueDateSource==="REVIEW_POLICY"?{...scan,dueDate:"",dueDateSource:undefined}:scan;
    return {...item,result:{...item.result,scan:next}};
  }));}
  function close(){if(busy)return;if(queue.some(e=>!e.saved)&&!window.confirm("Discard the remaining invoice reviews? Saved drafts will remain."))return;setOpen(false);setQueue([]);setReview(null);setResult(null);setAnalysis(null);setBatchSource(null);}
  async function readPacket(){if(!batchSource||busy)return;setBusy(true);setError("");setAnalysis(null);try{const response=await fetch(endpoint.replace("invoice-scan","invoice-batch"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:batchSource.id,batchId:targetBatch})}),data=await response.json();if(!response.ok)throw new Error(data.error);setAnalysis(data);setRanges(formatInvoiceRanges(data.groups.map((g:{pages:number[]})=>g.pages)));}catch(e){setError(e instanceof Error?e.message:"Could not read this packet.");}finally{setBusy(false);}}
  async function buildEntries(data:PacketAnalysis,documentId:string,batchId:string,groups:number[][],dateTerms:boolean){
    const response=await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/documents/${encodeURIComponent(documentId)}`,{cache:"no-store"});if(!response.ok)throw new Error("Could not open the original uploaded invoice.");
    const {PDFDocument}=await import("pdf-lib"),bytes=new Uint8Array(await response.arrayBuffer());let pdf;
    if(bytes[0]===37)pdf=await PDFDocument.load(bytes,{updateMetadata:false});else{pdf=await PDFDocument.create({updateMetadata:false});const image=bytes[0]===255?await pdf.embedJpg(bytes):await pdf.embedPng(bytes);pdf.addPage([image.width,image.height]).drawImage(image,{x:0,y:0,width:image.width,height:image.height});}
    const entries:Entry[]=[];
    for(const pages of groups){const part=await PDFDocument.create({updateMetadata:false});for(const p of await part.copyPages(pdf,pages.map(p=>p-1)))part.addPage(p);const scan=scanPageGroup(data.pages,pages,data.vendor.name,data.jobs);scan.batchId=batchId;
      if(scan.workTicketProposal)scan.lines=scan.lines.map(l=>({...l,workJobId:l.workJobId||"__NEW_INVOICE_JOB__"}));
      if(!scan.dueDate&&dateTerms&&scan.issueDate){scan.dueDate=scan.issueDate;scan.dueDateSource="REVIEW_POLICY";}
      const duplicates=data.documents.filter(d=>d.direction==="PAYABLE"&&scan.number&&normalizeInvoiceNumber(d.number)===normalizeInvoiceNumber(scan.number));
      entries.push({id:crypto.randomUUID(),file:new File([Uint8Array.from(await part.save()).buffer],`Pages ${pages[0]}-${pages[pages.length-1]}.pdf`,{type:"application/pdf"}),saved:false,origin:{documentId,batchId,pages},result:{scan,jobs:data.jobs,duplicates,vendor:data.vendor}});
    }return entries;
  }
  async function preparePacket(){if(!analysis||!batchSource||busy)return;setBusy(true);setError("");try{
    const groups=parseInvoiceRanges(ranges,analysis.pages.length),entries=await buildEntries(analysis,batchSource.id,targetBatch,groups,invoiceDateTerms);
    setQueue(entries);setActive(0);setBatchSource(null);setAnalysis(null);
  }catch(e){setError(e instanceof Error?e.message:"Check the page groups.");}finally{setBusy(false);}}
  let totalCents:number|null=null,lineCents:number|null=null;
  try{if(review){totalCents=billingCents(review.total);lineCents=review.lines.reduce((s,l)=>s+billingCents(l.amount),0)+billingCents(review.tax,true);}}catch{lineCents=null;}
  const balanced=totalCents!==null&&lineCents===totalCents&&Boolean(review?.lines.length);
  async function save(event:FormEvent){event.preventDefault();if(!entry||!review||!confirmed||!balanced||locked.current)return;locked.current=true;setBusy(true);setError("");
    try{
      const fields={commandKey:key.current,reviewed:confirmed,number:review.number,title:review.title,issueDate:review.issueDate,dueDate:review.dueDate,tax:review.tax,scannedTotal:review.total,lines:review.lines,unmatchedReason:review.unmatchedReason,workTicketProposal:review.workTicketProposal,paymentTermsBasis:review.dueDateSource||"DOCUMENT_OR_STAFF",taxBasis:review.taxBasis||"DOCUMENT_OR_STAFF",calculatedTaxConfirmed:review.taxBasis==="CALCULATED_REVIEW"};
      let response:Response;
      if(entry.origin)response=await fetch(endpoint.replace("invoice-scan","invoice-batch"),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fields,...entry.origin,autoCreateBatch:!entry.origin.batchId,pagesConfirmed:confirmed})});
      else{const body=new FormData();body.set("file",entry.file);body.set("review",JSON.stringify(fields));response=await fetch(endpoint,{method:"PUT",body});}
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save this draft. Retry this same invoice.");
      setQueue(current=>current.map(e=>e.id===entry.id?{...e,saved:true}:e));setReview(null);setNotice(`Invoice ${review.number} saved to this vendor's billing as a draft, with its original file.`);
      const appliedBatchId=data.documents?.find((d:{direction:string;number:string;batchId:string|null})=>d.direction==="PAYABLE"&&normalizeInvoiceNumber(d.number)===normalizeInvoiceNumber(review.number))?.batchId||entry.origin?.batchId;
      if(Array.isArray(data.jobs)&&appliedBatchId)setQueue(current=>current.map(item=>{
        if(item.saved||!item.result)return item;
        const origin=item.origin?{...item.origin,batchId:item.origin.batchId||appliedBatchId}:undefined;
        const jobs=data.jobs.filter((job:InvoiceJob)=>job.batchId===appliedBatchId),scan=parseVendorInvoice(item.result.scan.text,item.result.vendor.name,jobs);scan.batchId=origin?.batchId||"";
        if(item.result.scan.dueDateSource==="REVIEW_POLICY"){scan.dueDate=item.result.scan.dueDate;scan.dueDateSource="REVIEW_POLICY";}
        if(scan.workTicketProposal)scan.lines=scan.lines.map(l=>({...l,workJobId:l.workJobId||"__NEW_INVOICE_JOB__"}));
        return {...item,origin,result:{...item.result,scan,jobs}};
      }));
      const nextInvoice=queue.findIndex(item=>item.id!==entry.id&&!item.saved);if(nextInvoice>=0)setActive(nextInvoice);
      try{await onSaved(appliedBatchId);}catch{setNotice("Invoice draft saved. Refresh the vendor page to see the updated account.");}
    }catch(e){setError(e instanceof Error?e.message:"Could not save. Retry this same invoice.");}finally{setBusy(false);locked.current=false;}
  }
  const field=(name:"number"|"title"|"issueDate"|"dueDate"|"total"|"tax"|"unmatchedReason",label:string,type="text",required=true)=><label>{label}<input required={required} type={type} value={review?.[name]||""} onChange={e=>edit({[name]:e.target.value})}/></label>;
  return <div className={styles.intake}>
    <p>Read invoices into this vendor’s billing account. Review suggested fields and work matches before saving.</p>
    <div className={styles.actions}><button type="button" disabled={open} onClick={()=>setScanner(true)}>Scan invoice</button><label className={styles.picker}>Upload invoices<input aria-label="Upload invoices for automatic entry" type="file" accept="application/pdf,image/jpeg,image/png" multiple disabled={open} onChange={e=>{choose(Array.from(e.target.files||[]));e.target.value="";}}/></label></div>
    {!open&&error&&<p role="alert">{error}</p>}
    {scanner&&<DocumentScanner initialPaperSize="LETTER" onClose={()=>setScanner(false)} onComplete={file=>{setScanner(false);choose([file]);}}/>}
    {open&&<dialog ref={dialog} className={styles.dialog} aria-label="Review scanned vendor invoices" onCancel={e=>{e.preventDefault();close();}}>
      <header><div><h2>Review invoice import</h2><p>{batchSource?"Read an uploaded packet and apply reviewed invoices to an open vendor batch.":"Review each invoice and its original pages before saving."}</p></div><button disabled={busy} type="button" onClick={close}>Close</button></header>
      {batchSource&&<section className={styles.fields}><h3>{batchSource.fileName}</h3><label>Target vendor batch<select disabled={busy} value={targetBatch} onChange={e=>{setTargetBatch(e.target.value);setAnalysis(null);}}><option value="">Prepare a new intake batch on approval</option>{batches.map(b=><option key={b.id} value={b.id}>{b.batchNumber} · {b.title}</option>)}</select></label>{!batches.length&&<p>No setup needed. A new batch will be created when you approve the first invoice.</p>}<button type="button" disabled={busy} onClick={()=>void readPacket()}>Read all invoice pages</button><p>Reads up to 24 pages. Nothing is applied until you review and save each invoice.</p>{analysis&&<><p>{analysis.pages.length} original page(s) read. Suggested invoice groups need confirmation.</p><label>Invoice page groups<input value={ranges} disabled={busy} onChange={e=>setRanges(e.target.value)}/></label><p>Separate invoices with semicolons: 1-2; 3; 4-5. Include every page exactly once. Merge continuation pages or split invoices here.</p><button type="button" disabled={busy} onClick={()=>void preparePacket()}>Confirm page groups and review invoices</button></>}</section>}
      {(analysis||queue.length>0)&&<label className={styles.confirm}><input type="checkbox" disabled={busy} checked={invoiceDateTerms} onChange={e=>applyInvoiceDateTerms(e.target.checked)}/>For this intake, use the invoice date as the due date only where no due date is printed. I confirm these payment terms.</label>}
      <nav aria-label="Invoice queue">{queue.map((item,index)=><button key={item.id} type="button" disabled={busy} aria-pressed={active===index} onClick={()=>{if(active===index)return;if(review&&!window.confirm("Switch invoices and discard unsaved review edits?"))return;setReview(null);setResult(null);setActive(index);}}>{index+1}. {item.file.name} {item.skipped?"· Skipped":item.saved?"· Saved":""}</button>)}</nav>
      {!!queue.length&&<p>{queue.filter(e=>e.saved&&!e.skipped).length} saved · {queue.filter(e=>e.skipped).length} skipped · {queue.filter(e=>!e.saved).length} awaiting review</p>}
      {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
      {busy&&!review&&<p role="status">Reading invoice… This may take a minute for scanned pages.</p>}
      {!batchSource&&!busy&&!review&&!entry?.saved&&<button type="button" onClick={()=>{if(pendingUploads.current.length)choose(pendingUploads.current);else setQueue(current=>current.map((e,i)=>i===active?{...e}:e));}}>Retry reading</button>}
      {review&&result&&entry&&<div className={styles.columns}>
        <div className={styles.original} role="region" aria-label="Original invoice and extracted text">{entry.file.type==="application/pdf"||/\.pdf$/i.test(entry.file.name)?<PurchasePdfPreview file={entry.file} label="Original vendor invoice"/>:<InvoiceImage file={entry.file}/>}<details><summary>Extracted text</summary><pre>{review.text||"No readable text found."}</pre></details></div>
        <form onSubmit={save}><fieldset disabled={busy} className={styles.fields}><h3>{result.vendor.name}</h3><p>Suggested category: {review.category}</p>
          {review.multipleInvoices&&<p role="alert">Several invoice numbers are in this page group. Correct the grouping before saving.</p>}
          {!review.vendorDetected&&<p className={styles.warning}>The selected vendor name was not clearly identified. Verify the original vendor before approval.</p>}
          {!!review.warnings.length&&<details><summary>{review.warnings.length} reading and matching notes</summary>{review.warnings.map(w=><p className={styles.warning} key={w}>{w}</p>)}</details>}
          {result.duplicates.length>0&&<><p role="alert">Invoice number already exists: {result.duplicates.map(d=>`${d.number} (${d.status})`).join(", ")}. Review the existing bill.</p><button type="button" onClick={()=>{setQueue(current=>current.map(e=>e.id===entry.id?{...e,saved:true,skipped:true}:e));setReview(null);setNotice("Existing invoice skipped. No new bill was created.");}}>Skip existing invoice</button></>}
          <div className={styles.grid}>{field("number","Vendor invoice number")}{field("title","Description / category")}{field("issueDate","Invoice date","date")}{field("dueDate","Due date","date")}{field("total","Invoice total")}{field("tax","Separately stated tax (enter 0 if none)")}</div>
          {review.taxProposal&&!review.tax&&<section className={styles.warning}><p>Tax could not be read. A candidate of ${review.taxProposal.amount} is calculated from the printed total minus subtotal. It is not an extracted tax amount.</p><button type="button" onClick={acceptCalculatedTax}>I verified the original tax — use ${review.taxProposal.amount}</button></section>}
          {review.taxBasis==="CALCULATED_REVIEW"&&<p className={styles.warning}>Calculated tax candidate was explicitly verified against the original. This review basis will be retained.</p>}
          {review.dueDateSource==="REVIEW_POLICY"&&<p className={styles.warning}>Due date uses the payment terms you confirmed for this intake; it was not printed on the invoice.</p>}
          <label>Batch reference<select disabled={Boolean(entry.origin)} value={review.batchId} onChange={e=>edit({batchId:e.target.value})}><option value="">New intake batch — created on approval</option>{[...new Map([...batches.map(b=>[b.id,b.batchNumber] as const),...result.jobs.filter(j=>j.batchId).map(j=>[j.batchId!,j.batch] as const)]).entries()].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <p>{entry.origin?"This invoice will be saved against the selected batch. Match work lines to its tickets below.":"A batch filters work-ticket choices."} Invoice amounts come from the invoice, not work estimates.</p>
          {review.workTicketProposal&&review.lines.some(l=>l.workJobId==="__NEW_INVOICE_JOB__")&&<section className={styles.line}><h4>Prepared work ticket — created on approval</h4><label>Printed vehicle reference<input required value={review.workTicketProposal.vehicleReference} onChange={e=>edit({workTicketProposal:{...review.workTicketProposal!,vehicleReference:e.target.value}})}/></label><label>Proposed service date (from invoice date)<input type="date" required value={review.workTicketProposal.serviceDate} onChange={e=>edit({workTicketProposal:{...review.workTicketProposal!,serviceDate:e.target.value}})}/></label><p>Category: {review.workTicketProposal.workType}. Inventory identity and accepted work/QC will still need verification before financial approval.</p></section>}
          {review.lines.map((line,index)=><div className={styles.line} key={index}><label>Line description<input required value={line.description} onChange={e=>edit({lines:review.lines.map((l,i)=>i===index?{...l,description:e.target.value}:l)})}/></label><label>Amount before tax<input required value={line.amount} onChange={e=>edit({lines:review.lines.map((l,i)=>i===index?{...l,amount:e.target.value}:l)})}/></label><label>Work ticket<select value={line.workJobId} onChange={e=>edit({lines:review.lines.map((l,i)=>i===index?{...l,workJobId:e.target.value}:l)})}><option value="">Unmatched / non-vehicle expense</option>{review.workTicketProposal&&<option value="__NEW_INVOICE_JOB__">Create prepared ticket · {review.workTicketProposal.vehicleReference}</option>}{result.jobs.filter(j=>j.status!=="CANCELLED"&&(!review.batchId||j.batchId===review.batchId||j.id===line.workJobId)).map(j=><option key={j.id} value={j.id}>{j.number} · {j.vehicle} · {j.batch}</option>)}</select></label><button type="button" onClick={()=>edit({lines:review.lines.filter((_,i)=>i!==index)})}>Remove line</button></div>)}
          {!review.lines.length&&review.total&&review.tax&&<button type="button" onClick={()=>{try{const subtotal=billingCents(review.total)-billingCents(review.tax,true);if(subtotal>0)edit({lines:[{description:review.title,amount:(subtotal/100).toFixed(2),workJobId:""}]});}catch{setError("Confirm total and tax first.");}}}>Use invoice total as one line</button>}
          <button type="button" onClick={()=>edit({lines:[...review.lines,{description:"",amount:"",workJobId:""}]})}>Add invoice line</button>
          {field("unmatchedReason","Reason for unmatched / non-work lines","text",review.lines.some(l=>!l.workJobId))}
          <p aria-live="polite">Lines + tax: {lineCents===null?"Check amounts":billingMoney(lineCents)} · Invoice: {totalCents===null?"Check total":billingMoney(totalCents)}{!balanced?" · Must match before saving":" · Balanced"}</p>
          <label className={styles.confirm}><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked the original pages, vendor, dates, totals and work-ticket matches.</label>
          <button type="submit" disabled={busy||!confirmed||!balanced||review.multipleInvoices}>{busy?"Saving…":entry.origin?"Apply reviewed invoice to batch":"Save reviewed invoice draft"}</button><p>Creates a received bill and retains its original file. Manager approval and payment remain separate.</p>
        </fieldset></form>
      </div>}
    </dialog>}
  </div>;
}
function InvoiceImage({file}:{file:File}){return <img ref={element=>{if(!element)return;const url=URL.createObjectURL(file);element.src=url;return()=>URL.revokeObjectURL(url);}} className={styles.image} alt="Original vendor invoice"/>;} // eslint-disable-line @next/next/no-img-element
