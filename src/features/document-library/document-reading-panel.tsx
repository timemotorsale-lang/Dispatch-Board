"use client";
import {useEffect,useRef,useState} from "react";
import Image from "next/image";
import {DocumentScanner} from "@/features/mobile-capture/document-scanner";
import {DOCUMENT_READING_PROFILES,readingReconciliation,type DocumentReading,type DocumentReadingPurpose} from "@/lib/document-reading";
import {sourceTextSegments,documentReadingIssues,type SavedDocumentReview} from "@/lib/document-reading-review";
import type {ReadingChecks} from "@/lib/document-reading-matches";
import styles from "./document-reading-panel.module.css";
export function applyReadingToForm(form:HTMLFormElement|null,fields:Record<string,string>,mapping:Record<string,string>){
 if(!form)return false;
 const changes=Object.entries(mapping).flatMap(([source,target])=>{const control=form.elements.namedItem(target);return fields[source]&& (control instanceof HTMLInputElement||control instanceof HTMLTextAreaElement||control instanceof HTMLSelectElement)?[{control,value:fields[source]}]:[];});
 const conflicts=changes.filter(({control,value})=>control.value.trim()&&control.value!==value);
 if(conflicts.length&&!window.confirm(`Replace these existing entries with reviewed document values: ${conflicts.map(x=>x.control.name).join(", ")}?`))return false;
 for(const {control,value} of changes){if(control instanceof HTMLSelectElement&&![...control.options].some(o=>o.value===value))continue;control.value=value;control.dispatchEvent(new Event("input",{bubbles:true}));control.dispatchEvent(new Event("change",{bubbles:true}));}
 return true;
}
export function DocumentReadingPanel({purpose,onApply,disabled=false,label,initialJobId}:{purpose:DocumentReadingPurpose;onApply?:(reading:DocumentReading,fields:Record<string,string>,file:File)=>void|Promise<void>;disabled?:boolean;label?:string;initialJobId?:string}){
 const [file,setFile]=useState<File|null>(null),[reading,setReading]=useState<DocumentReading|null>(null),[fields,setFields]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[scanner,setScanner]=useState(false),[preview,setPreview]=useState("");
 type JobView={id:string;fileName:string;status:string;pageCount:number;pagesCompleted:number;lastError:string|null;reading:DocumentReading|null;review:SavedDocumentReview|null;reviewVersion:number;pages:Array<{page:number;text:string}>};
 const [job,setJob]=useState<JobView|null>(null),[savedJobs,setSavedJobs]=useState<Array<{id:string;fileName:string;status:string}>>([]),[saveStatus,setSaveStatus]=useState(""),[source,setSource]=useState<{page:number;text:string}|null>(null);
 const [checksResult,setChecksResult]=useState<{key:string;data:ReadingChecks}|null>(null);
 const version=useRef(0),lastSaved=useRef(""),saveQueue=useRef<Promise<void>>(Promise.resolve()),saveConflict=useRef(false);
 const requestRef=useRef<AbortController|null>(null),active=useRef(true),viewRequest=useRef(0);
 const sourceRef=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(source)sourceRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[source]);
 useEffect(()=>{active.current=true;return()=>{active.current=false;requestRef.current?.abort();};},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 async function refreshJobs(){const response=await fetch(`/api/document-library/read/jobs?purpose=${purpose}`,{cache:"no-store"});if(response.ok&&active.current)setSavedJobs(await response.json());}
 useEffect(()=>{void refreshJobs().catch(()=>{});},[purpose]); // eslint-disable-line react-hooks/exhaustive-deps
 function choose(next:File|null){viewRequest.current++;setFile(next);setPreview(next?URL.createObjectURL(next):"");setReading(null);setJob(null);setSource(null);setFields({});setConfirmed(false);setNotice("");setError("");setSaveStatus("");}
 async function openJob(id:string){
  const requestId=++viewRequest.current;
  const response=await fetch(`/api/document-library/read/jobs/${id}`,{cache:"no-store"}),data=await response.json() as JobView&{error?:string};if(!response.ok)throw new Error(data.error);
  if(!active.current||viewRequest.current!==requestId)return;
  if(data.reading&&data.reading.purpose!==purpose)throw new Error("Open this saved read from its matching document purpose.");
  setJob(data);setSource(null);setReading(data.reading);setFile(null);setPreview("");version.current=data.reviewVersion;saveConflict.current=false;
  const restored=data.review??{fields:Object.fromEntries(data.reading?.fields.map(f=>[f.key,f.value])??[]),lines:data.reading?.lines??[],confirmed:false};
  lastSaved.current=JSON.stringify(restored);setFields(restored.fields);setConfirmed(restored.confirmed);if(data.reading)setReading({...data.reading,lines:restored.lines});
  setSaveStatus(data.review?"Saved review restored":"");setError("");setNotice(data.reading?"Ready to review. The original is saved privately.":"Reading in the background. You can return to this saved read later.");
 }
 useEffect(()=>{if(!initialJobId)return;const timer=setTimeout(()=>{void openJob(initialJobId).catch(error=>setError(error.message));},0);return()=>clearTimeout(timer);},[initialJobId]); // eslint-disable-line react-hooks/exhaustive-deps
 const fieldsKey=JSON.stringify(fields);
 const checksKey=`${job?.id}:${job?.reviewVersion}:${fieldsKey}`,checks=checksResult?.key===checksKey?checksResult.data:null,checking=Boolean(job?.status==="READY"&&reading&&!checks);
 useEffect(()=>{
  if(!job||job.status!=="READY"||!reading)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{void (async()=>{try{const response=await fetch(`/api/document-library/read/jobs/${job.id}/checks`,{method:"POST",headers:{"Content-Type":"application/json"},body:fieldsKey,signal:controller.signal}),data=await response.json();if(!response.ok)throw new Error();if(!controller.signal.aborted)setChecksResult({key:checksKey,data});}catch{if(!controller.signal.aborted)setChecksResult({key:checksKey,data:{matches:[],duplicates:[],notes:["Matching checks are unavailable. Review existing records before saving."]}});}})();},700);
  return()=>{controller.abort();clearTimeout(timer);};
 },[job?.id,job?.status,checksKey]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  if(!job||!["QUEUED","PROCESSING"].includes(job.status))return;
  let cancelled=false;
  const timer=setTimeout(()=>{void (async()=>{try{const response=await fetch(`/api/document-library/read/jobs/${job.id}`,{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error);if(cancelled||!active.current)return;if(data.status==="READY")await openJob(job.id);else setJob(data);}catch(error){if(!cancelled)setError(error instanceof Error?error.message:"Could not check progress. Reopen the saved read to continue.");}})();},2000);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[job]); // eslint-disable-line react-hooks/exhaustive-deps
 async function read(){if(!file||busy)return;setBusy(true);setError("");setNotice("Saving the original and starting the reader…");const controller=new AbortController();requestRef.current=controller;
  try{const body=new FormData();body.set("file",file);body.set("purpose",purpose);const response=await fetch("/api/document-library/read/jobs",{method:"POST",body,signal:controller.signal}),data=await response.json();if(!response.ok)throw new Error(data.error);await openJob(data.id);await refreshJobs();}
  catch(error){if(active.current&&!controller.signal.aborted)setError(error instanceof Error?error.message:"Reading failed. Retry the same file.");}finally{if(active.current)setBusy(false);}
 }
 function persist(){
  if(!job||!reading||job.status!=="READY")return Promise.resolve();
  const jobId=job.id,snapshot=JSON.stringify({fields,lines:reading.lines,confirmed});
  const next=saveQueue.current.then(async()=>{
   if(saveConflict.current)throw new Error("Reopen the saved read to compare changes from the other window.");
   if(snapshot===lastSaved.current){setSaveStatus("Review saved");return;}
   setSaveStatus("Saving review…");
   const response=await fetch(`/api/document-library/read/jobs/${jobId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:version.current,review:JSON.parse(snapshot)})}),data=await response.json();
   if(!response.ok){if(response.status===409)saveConflict.current=true;setSaveStatus("Review not saved — keep this page open");throw new Error(data.error);}
   version.current=data.version;lastSaved.current=snapshot;if(active.current)setSaveStatus("Review saved");
  });
  saveQueue.current=next.catch(()=>{});return next;
 }
 useEffect(()=>{if(!job||!reading)return;const snapshot=JSON.stringify({fields,lines:reading.lines,confirmed});if(snapshot!==lastSaved.current)setSaveStatus("Saving review…");const timer=setTimeout(()=>{void persist().catch(error=>setError(error instanceof Error?error.message:"Your review could not be saved. Keep this page open and retry."));},600);const beforeUnload=(event:BeforeUnloadEvent)=>{if(snapshot!==lastSaved.current){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",beforeUnload);return()=>{clearTimeout(timer);window.removeEventListener("beforeunload",beforeUnload);};},[fields,reading,confirmed,job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
 async function originalFile(){if(file)return file;if(!job)throw new Error("Reopen the saved original.");const response=await fetch(`/api/document-library/read/jobs/${job.id}/original`);if(!response.ok)throw new Error("The original could not be opened. Your review is saved; retry.");const blob=await response.blob();return new File([blob],job.fileName,{type:blob.type});}
 const reconciliation=reading?documentReadingIssues(reading,fields).join(" "):readingReconciliation(fields);
 async function apply(){if(!reading||!confirmed||busy||reconciliation||reading.duplicateMatches?.length)return;setBusy(true);setError("");try{await persist();await onApply?.(reading,fields,await originalFile());setNotice("Review finished. Check the destination form and save it separately.");}catch(error){setError(error instanceof Error?error.message:"The destination could not accept the reviewed values. Your review is retained.");}finally{setBusy(false);}}
 function exportReview(){if(!reading)return;const quote=(value:unknown)=>`"${String(value??"").replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;const rows=[["File","Page","Field","Reviewed value","Source checksum"],...reading.fields.map(f=>[reading.fileName,f.page,f.label,fields[f.key],reading.checksum]),...reading.lines.map(l=>[reading.fileName,l.page,l.partNumber||l.unitCost,[l.description,l.quantity,l.amount].join(" | "),reading.checksum])];const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="reviewed-document-information.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className={styles.panel} aria-label={label||`Read ${DOCUMENT_READING_PROFILES[purpose].label.toLowerCase()}`}>
  <h3>{label||`Scan / read ${DOCUMENT_READING_PROFILES[purpose].label.toLowerCase()}`}</h3>
  <p>Read up to {DOCUMENT_READING_PROFILES[purpose].maxPages} pages. Review suggestions before applying them. Reading does not approve, pay, verify signatures or complete delivery.</p>
  <p>Your original and review are saved privately. Return through <strong>Continue a saved read</strong> if interrupted.</p>
  <details onToggle={event=>{if(event.currentTarget.open)void refreshJobs().catch(()=>setError("Saved reads could not be loaded. Retry."));}}><summary>Continue a saved read</summary>{savedJobs.length?savedJobs.map(saved=><p key={saved.id}><button type="button" disabled={busy} onClick={()=>void (async()=>{await persist();await openJob(saved.id);})().catch(error=>setError(error.message))}>{saved.fileName} · {saved.status==="READY"?"Ready to review":saved.status==="FAILED"?"Retry available":"Reading"}</button></p>):<p>No saved reads for this workflow yet.</p>}</details>
  <div className={styles.actions}><button type="button" disabled={disabled||busy} onClick={()=>void persist().then(()=>setScanner(true)).catch(error=>setError(error.message))}>Scan with camera</button><label>Choose document<input type="file" disabled={disabled||busy} accept={purpose==="EXPENSE"?"application/pdf,image/jpeg,image/png":"application/pdf,image/jpeg,image/png,image/webp,text/plain"} onChange={event=>{const next=event.target.files?.[0]||null;void persist().then(()=>choose(next)).catch(error=>setError(error.message));}} /></label><button type="button" disabled={disabled||busy||!file} onClick={()=>void read()}>{busy?"Preparing…":"Read document"}</button></div>
  {scanner&&<DocumentScanner maxPages={DOCUMENT_READING_PROFILES[purpose].maxPages} onClose={()=>setScanner(false)} onComplete={next=>{choose(next);setScanner(false);}} />}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  {job&&<div><p role="status">{job.status==="READY"?"Ready to review":`Read ${job.pagesCompleted} of ${job.pageCount} pages`}</p>{job.status==="FAILED"&&<><p role="alert">{job.lastError}</p><button type="button" disabled={busy} onClick={()=>void fetch(`/api/document-library/read/jobs/${job.id}`,{method:"POST"}).then(async response=>{if(!response.ok)throw new Error("Retry could not start.");await openJob(job.id);}).catch(error=>setError(error.message))}>Retry remaining pages</button></>}<details><summary>View saved original · {job.fileName}</summary><a href={`/api/document-library/read/jobs/${job.id}/original`} target="_blank" rel="noreferrer">Open original</a></details></div>}
  {file&&preview&&<details><summary>View original · {file.name}</summary>{file.type==="application/pdf"?<iframe src={preview} title="Original document for OCR review" className={styles.preview}/>:file.type.startsWith("image/")?<Image src={preview} unoptimized alt="Original document for review" width={900} height={1000} className={styles.image}/>:<a href={preview} target="_blank" rel="noreferrer">View original text</a>}</details>}
  {source&&job&&<aside ref={sourceRef} className={styles.source} aria-label="Source evidence"><h4>Source · page {source.page}</h4><a href={`/api/document-library/read/jobs/${job.id}/original#page=${source.page}`} target="_blank" rel="noreferrer">Open original at page {source.page}</a><p>Highlighted text is the reader’s transcription. Check it against the original.</p><pre>{(()=>{const parts=sourceTextSegments(job.pages.find(p=>p.page===source.page)?.text??"",source.text);return <>{parts.before}<mark>{parts.match}</mark>{parts.after}</>;})()}</pre><button type="button" onClick={()=>setSource(null)}>Close source</button></aside>}
  {reading&&<><p>{reading.fields.length} {reading.fields.length===1?"field":"fields"} · {reading.lines.length} {reading.lines.length===1?"row":"rows"} · {reconciliation?"Corrections needed":"Ready for your review"}</p>{checking&&<p role="status">Checking matches and possible duplicates…</p>}{checks&&<details open={checks.duplicates.length>0}><summary>Matches and duplicate checks · {checks.matches.length} {checks.matches.length===1?"match":"matches"} · {checks.duplicates.length} possible {checks.duplicates.length===1?"duplicate":"duplicates"}{checks.notes.some(note=>/unavailable|not available/.test(note))?" · Some checks unavailable":""}</summary>{checks.duplicates.length>0&&<p role="alert">This may already be recorded. Review the matching documents before applying; no records have been merged or deleted.</p>}{checks.duplicates.map((match,index)=><p key={`duplicate-${index}`}><a href={match.href} target="_blank" rel="noreferrer">{match.label}</a><br/>{match.reason}</p>)}{checks.matches.map((match,index)=><p key={`match-${index}`}><a href={match.href} target="_blank" rel="noreferrer">{match.label}</a><br/>{match.reason}</p>)}{checks.notes.map((note,index)=><p key={`note-${index}`}>{note}</p>)}</details>}<div className={styles.fields}>{reading.fields.map(field=><div key={field.key}><label>{field.label}<input value={fields[field.key]||""} disabled={busy} maxLength={500} placeholder={field.alternatives?.length?"Conflicting values — check original":"Not read"} onChange={event=>{setFields(current=>({...current,[field.key]:event.target.value}));setConfirmed(false);}}/><small>Page {field.page}: {field.source}{field.alternatives?.length?` · Candidates: ${field.alternatives.join(" / ")}`:""}</small></label><button type="button" onClick={()=>setSource({page:field.page,text:field.source})}>View source for {field.label}</button>{fields[field.key]!==field.value&&<small>Original read: {field.value||"not found"}</small>}</div>)}</div>
   {reading.lines.length>0&&<div className={styles.scroll}><table><thead><tr><th>Part number</th><th>Description / merchant</th><th>Quantity</th><th>Unit cost / date</th><th>Amount</th><th>Source page</th></tr></thead><tbody>{reading.lines.map((line,index)=><tr key={index}>{(["partNumber","description","quantity","unitCost","amount"] as const).map(key=><td key={key}><input aria-label={`Row ${index+1} ${key}`} disabled={busy} value={line[key]} maxLength={200} onChange={event=>{setReading(current=>current?{...current,lines:current.lines.map((item,row)=>row===index?{...item,[key]:event.target.value}:item)}:current);setConfirmed(false);}}/></td>)}<td>{line.page} <button type="button" onClick={()=>setSource({page:line.page,text:line.source??""})}>View source for row {index+1}</button></td></tr>)}</tbody></table></div>}
   {reading.duplicateMatches?.length?<div role="alert"><strong>This exact receipt is already attached to spending. Open the existing record instead of creating another expense.</strong>{reading.duplicateMatches.map((match,index)=><p key={index}><a href={match.href}>{match.label}</a></p>)}</div>:null}
   {reading.warnings.map((warning,index)=><p key={index}>{warning}</p>)}{reconciliation&&<p role="alert">{reconciliation}</p>}
   <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>I reviewed these values, all pages and any exceptions against the original.</label>
   <p role="status">{saveStatus}</p><div className={styles.actions}><button type="button" disabled={busy} onClick={()=>void persist().catch(error=>setError(error.message))}>Save review for later</button>{onApply&&<button type="button" disabled={!confirmed||busy||disabled||Boolean(reconciliation)||Boolean(reading.duplicateMatches?.length)} onClick={()=>void apply()}>Use reviewed information</button>}<button type="button" disabled={!confirmed||busy||Boolean(reconciliation)} onClick={()=>void persist().then(exportReview).catch(error=>setError(error.message))}>Download reviewed information</button></div>
  </>}
 </section>;
}
